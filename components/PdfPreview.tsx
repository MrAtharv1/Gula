"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react";

// Polyfill Promise.try for environments lacking ES2024 Promise.try support
if (typeof (Promise as any).try !== "function") {
  (Promise as any).try = function (fn: () => any) {
    return new Promise((resolve) => resolve(fn()));
  };
}

interface PdfPreviewProps {
  url?: string;
  file?: File | Blob;
  data?: ArrayBuffer | Uint8Array;
  password?: string;
  onPasswordRequired?: () => void;
  onPageCount?: (count: number) => void;
  className?: string;
}

export function PdfPreview({
  url,
  file,
  data,
  password,
  onPasswordRequired,
  onPageCount,
  className,
}: PdfPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageElementsRef = useRef<{ [page: number]: HTMLDivElement | null }>({});
  const canvasRefs = useRef<{ [page: number]: HTMLCanvasElement | null }>({});

  const [numPages, setNumPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);

  const [pageWidth, setPageWidth] = useState<number>(380);
  const [pageHeight, setPageHeight] = useState<number>(530);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());

  const pdfDocRef = useRef<any>(null);
  const renderTasksRef = useRef<Map<number, any>>(new Map());
  const renderingSetRef = useRef<Set<number>>(new Set());
  const renderedSetRef = useRef<Set<number>>(new Set());
  const scrollRafRef = useRef<number | null>(null);

  // Keep stable callback refs to avoid re-triggering effect on parent re-renders
  const onPasswordRequiredRef = useRef(onPasswordRequired);
  onPasswordRequiredRef.current = onPasswordRequired;
  const onPageCountRef = useRef(onPageCount);
  onPageCountRef.current = onPageCount;

  // Render a specific page onto its canvas
  const renderPage = async (
    doc: any,
    pageNum: number,
    targetWidth: number,
    dpr: number
  ) => {
    if (renderedSetRef.current.has(pageNum) || renderingSetRef.current.has(pageNum)) {
      return;
    }

    const canvas = canvasRefs.current[pageNum];
    if (!canvas) return;

    renderingSetRef.current.add(pageNum);

    try {
      const page = await doc.getPage(pageNum);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const baseViewport = page.getViewport({ scale: 1.0 });
      const scale = (targetWidth / Math.max(baseViewport.width, 1)) * dpr;
      const viewport = page.getViewport({ scale: Math.max(0.2, scale) });

      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      canvas.style.width = `${Math.round(viewport.width / dpr)}px`;
      canvas.style.height = `${Math.round(viewport.height / dpr)}px`;

      const renderTask = page.render({
        canvasContext: ctx,
        viewport,
      });
      renderTasksRef.current.set(pageNum, renderTask);

      await renderTask.promise;

      renderedSetRef.current.add(pageNum);
      setRenderedPages((prev) => new Set(prev).add(pageNum));
    } catch (err: any) {
      if (err?.name === "RenderingCancelledException") return;
      console.error(`Page ${pageNum} render error:`, err);
    } finally {
      renderingSetRef.current.delete(pageNum);
      renderTasksRef.current.delete(pageNum);
    }
  };

  // Inspect visible pages in the scroll container and render them lazily
  const checkAndRenderVisiblePages = (doc?: any) => {
    const activeDoc = doc || pdfDocRef.current;
    const container = containerRef.current;
    if (!activeDoc || !container) return;

    const containerTop = container.scrollTop;
    const containerBottom = containerTop + container.clientHeight;
    const buffer = 350; // Pre-render buffer above & below

    const containerCenter = containerTop + container.clientHeight / 2;
    let closestPage = 1;
    let minDistance = Infinity;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const currentWidth =
      pageWidth || Math.min(Math.max((container.clientWidth || 400) - 24, 280), 520);

    const total = activeDoc.numPages || numPages;

    for (let p = 1; p <= total; p++) {
      const el = pageElementsRef.current[p];
      if (!el) continue;

      const elTop = el.offsetTop;
      const elHeight = el.clientHeight || pageHeight || 500;
      const elBottom = elTop + elHeight;

      // Determine active page by proximity to container center
      const elCenter = elTop + elHeight / 2;
      const distance = Math.abs(elCenter - containerCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestPage = p;
      }

      // Check visibility for lazy rendering
      const isVisible =
        elBottom >= containerTop - buffer && elTop <= containerBottom + buffer;

      if (
        isVisible &&
        !renderedSetRef.current.has(p) &&
        !renderingSetRef.current.has(p)
      ) {
        renderPage(activeDoc, p, currentWidth, dpr);
      }
    }

    if (closestPage !== currentPage) {
      setCurrentPage(closestPage);
    }
  };

  // Throttled scroll listener
  const handleScroll = () => {
    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      checkAndRenderVisiblePages();
    });
  };

  useEffect(() => {
    let isCancelled = false;
    let activeDoc: any = null;

    // Reset page states
    renderedSetRef.current.clear();
    renderingSetRef.current.clear();
    setRenderedPages(new Set());
    setCurrentPage(1);

    async function loadPdf() {
      setIsLoading(true);
      setRenderError(null);

      try {
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
        if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        }

        let documentSource: any = null;

        if (file) {
          const buffer = await file.arrayBuffer();
          const bufferCopy = new Uint8Array(buffer).slice();
          documentSource = { data: bufferCopy };
        } else if (data) {
          const bufferCopy =
            data instanceof Uint8Array
              ? data.slice()
              : new Uint8Array(data).slice();
          documentSource = { data: bufferCopy };
        } else if (url) {
          documentSource = { url };
        }

        if (!documentSource) {
          if (!isCancelled) {
            setRenderError("No document data provided.");
            setIsLoading(false);
          }
          return;
        }

        const loadingTask = pdfjsLib.getDocument({
          ...documentSource,
          password: password || undefined,
          useSystemFonts: true,
        });

        // Set password callback if needed
        loadingTask.onPassword = (callback: any, reason: number) => {
          if (onPasswordRequiredRef.current) {
            onPasswordRequiredRef.current();
          }
        };

        const doc = await loadingTask.promise;
        if (isCancelled) {
          try {
            (doc as any).destroy?.();
          } catch {}
          return;
        }

        activeDoc = doc;
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);

        if (onPageCountRef.current) {
          onPageCountRef.current(doc.numPages);
        }

        // Measure page 1 aspect ratio to set stable card heights across all pages
        const firstPage = await doc.getPage(1);
        const firstViewport = firstPage.getViewport({ scale: 1.0 });

        const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
        const containerWidth = containerRef.current?.clientWidth || 400;
        const targetWidth = Math.min(Math.max(containerWidth - 24, 280), 520);
        const calculatedHeight = Math.round(
          (firstViewport.height / Math.max(firstViewport.width, 1)) * targetWidth
        );

        setPageWidth(targetWidth);
        setPageHeight(calculatedHeight);

        // Render Page 1 immediately
        await renderPage(doc, 1, targetWidth, dpr);

        if (!isCancelled) {
          setIsLoading(false);
          // Check if subsequent pages are partially visible in container
          requestAnimationFrame(() => {
            checkAndRenderVisiblePages(doc);
          });
        }
      } catch (err: any) {
        if (isCancelled) return;
        console.error("PDF preview error:", err);
        if (err?.name === "PasswordException") {
          if (onPasswordRequiredRef.current) onPasswordRequiredRef.current();
        } else {
          setRenderError(
            err?.message?.includes("module factory is not available")
              ? "Browser cache is stale. Please press Ctrl+Shift+R (or Cmd+Shift+R) to refresh."
              : "Couldn't render page preview."
          );
        }
        setIsLoading(false);
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
      }
      renderTasksRef.current.forEach((task) => {
        try {
          task.cancel();
        } catch {}
      });
      renderTasksRef.current.clear();
      renderingSetRef.current.clear();
      renderedSetRef.current.clear();
      if (activeDoc) {
        try {
          activeDoc.destroy?.();
        } catch {}
      }
    };
  }, [url, file, data, password]);

  // Navigate to previous page with smooth scroll
  const handlePrev = () => {
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      const el = pageElementsRef.current[prevPage];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setCurrentPage(prevPage);
    }
  };

  // Navigate to next page with smooth scroll
  const handleNext = () => {
    if (currentPage < numPages) {
      const nextPage = currentPage + 1;
      const el = pageElementsRef.current[nextPage];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setCurrentPage(nextPage);
    }
  };

  return (
    <div className={`flex flex-col items-center w-full ${className || ""}`}>
      {/* Scrollable Canvas Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        tabIndex={0}
        aria-label="PDF Preview Pages (Scrollable)"
        className="relative w-full max-h-[380px] sm:max-h-[460px] overflow-y-auto overflow-x-hidden p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-3.5 focus:outline-hidden focus:ring-1 focus:ring-[var(--accent)]/30"
      >
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-secondary)]/85 backdrop-blur-xs z-20 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
            <span className="text-[12px] font-medium text-[var(--text-muted)]">
              Loading document preview...
            </span>
          </div>
        )}

        {renderError && (
          <div className="flex flex-col items-center gap-2 p-6 text-center text-[12px] text-[var(--status-abnormal-text)]">
            <AlertCircle className="w-5 h-5" />
            <span>{renderError}</span>
          </div>
        )}

        {/* Render each page card */}
        {Array.from({ length: numPages }, (_, idx) => {
          const pageIndex = idx + 1;
          const isRendered = renderedPages.has(pageIndex);

          return (
            <div
              key={pageIndex}
              ref={(el) => {
                pageElementsRef.current[pageIndex] = el;
              }}
              className="relative flex flex-col items-center justify-center mx-auto rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xs overflow-hidden transition-all"
              style={{
                width: pageWidth ? `${pageWidth}px` : "100%",
                minHeight: pageHeight ? `${pageHeight}px` : "320px",
              }}
            >
              <canvas
                ref={(el) => {
                  canvasRefs.current[pageIndex] = el;
                }}
                className="rounded-lg max-w-full block"
              />

              {/* Lazy-load placeholder spinner if page is not yet rendered */}
              {!isRendered && !renderError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-card)]/90 text-[var(--text-muted)] gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
                  <span className="text-[11px]">Loading page {pageIndex}...</span>
                </div>
              )}

              {/* Page Number Badge */}
              {numPages > 1 && (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-[var(--bg-card)]/90 backdrop-blur-xs border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-secondary)] shadow-xs pointer-events-none">
                  {pageIndex} / {numPages}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation & Page Controls */}
      {numPages > 1 && (
        <div className="flex items-center justify-between w-full px-2 mt-2.5 text-xs text-[var(--text-muted)]">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentPage <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-subtle)] disabled:opacity-40 disabled:cursor-not-allowed tap-target transition-all font-medium"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>

          <div className="flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
            <span>Page {currentPage} of {numPages}</span>
            <span className="hidden sm:inline text-[11px] text-[var(--text-muted)]">
              (or scroll)
            </span>
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentPage >= numPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-subtle)] disabled:opacity-40 disabled:cursor-not-allowed tap-target transition-all font-medium"
            aria-label="Next page"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
