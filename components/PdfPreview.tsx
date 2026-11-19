"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [numPages, setNumPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const pdfDocRef = useRef<any>(null);

  // Keep stable callback refs to avoid re-triggering effect on parent re-renders
  const onPasswordRequiredRef = useRef(onPasswordRequired);
  onPasswordRequiredRef.current = onPasswordRequired;
  const onPageCountRef = useRef(onPageCount);
  onPageCountRef.current = onPageCount;

  useEffect(() => {
    let isCancelled = false;
    let localBlobUrl: string | null = null;
    let activeDoc: any = null;

    async function loadPdf() {
      setIsLoading(true);
      setRenderError(null);

      try {
        const pdfjsLib = await import("pdfjs-dist");
        if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        }

        let documentSource: any = null;

        if (url) {
          documentSource = { url };
        } else if (file) {
          localBlobUrl = URL.createObjectURL(file);
          documentSource = { url: localBlobUrl };
        } else if (data) {
          if (
            typeof Blob !== "undefined" &&
            typeof URL !== "undefined" &&
            typeof URL.createObjectURL === "function"
          ) {
            const blob =
              data instanceof Blob
                ? data
                : new Blob([data as any], { type: "application/pdf" });
            localBlobUrl = URL.createObjectURL(blob);
            documentSource = { url: localBlobUrl };
          } else {
            const bufferCopy =
              data instanceof Uint8Array ? data.slice() : data.slice(0);
            documentSource = { data: bufferCopy };
          }
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

        await renderPage(doc, 1);
      } catch (err: any) {
        if (isCancelled) return;
        console.error("PDF preview error:", err);
        if (err.name === "PasswordException") {
          if (onPasswordRequiredRef.current) onPasswordRequiredRef.current();
        } else {
          setRenderError("Couldn't render page preview.");
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
      if (localBlobUrl) {
        try {
          URL.revokeObjectURL(localBlobUrl);
        } catch {}
      }
      if (activeDoc) {
        try {
          activeDoc.destroy?.();
        } catch {}
      }
    };
  }, [url, file, data, password]);

  const renderPage = async (doc: any, pageNum: number) => {
    if (!canvasRef.current) return;
    try {
      const page = await doc.getPage(pageNum);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const baseViewport = page.getViewport({ scale: 1.0 });

      // Scale to fit container cleanly (approx 450-500px width on desktop, 320px on mobile)
      const containerWidth = Math.min(canvas.parentElement?.clientWidth || 400, 520);
      const scale = (containerWidth / baseViewport.width) * dpr;
      const viewport = page.getViewport({ scale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;

      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise;

      setCurrentPage(pageNum);
    } catch (err) {
      console.error("Page render error:", err);
    }
  };

  const handlePrev = () => {
    if (currentPage > 1 && pdfDocRef.current) {
      renderPage(pdfDocRef.current, currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < numPages && pdfDocRef.current) {
      renderPage(pdfDocRef.current, currentPage + 1);
    }
  };

  return (
    <div className={`flex flex-col items-center w-full ${className || ""}`}>
      {/* Canvas Container */}
      <div className="relative w-full max-h-[380px] sm:max-h-[440px] overflow-auto flex items-center justify-center p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-secondary)]/80 backdrop-blur-xs z-10 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
            <span className="text-[12px] text-[var(--text-muted)]">Rendering preview...</span>
          </div>
        )}

        {renderError && (
          <div className="flex flex-col items-center gap-2 p-6 text-center text-[12px] text-[var(--status-abnormal-text)]">
            <AlertCircle className="w-5 h-5" />
            <span>{renderError}</span>
          </div>
        )}

        <canvas ref={canvasRef} className="rounded-lg max-w-full" />
      </div>

      {/* Pagination Controls */}
      {numPages > 1 && (
        <div className="flex items-center justify-between w-full px-2 mt-2.5 text-xs text-[var(--text-muted)]">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentPage <= 1}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-subtle)] disabled:opacity-40 disabled:cursor-not-allowed tap-target transition-all"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>

          <span className="font-medium text-[var(--text-secondary)]">
            Page {currentPage} of {numPages}
          </span>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentPage >= numPages}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-subtle)] disabled:opacity-40 disabled:cursor-not-allowed tap-target transition-all"
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
