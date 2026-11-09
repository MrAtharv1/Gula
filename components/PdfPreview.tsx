"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react";

interface PdfPreviewProps {
  data: ArrayBuffer;
  password?: string;
  onPasswordRequired?: () => void;
  onPageCount?: (count: number) => void;
  className?: string;
}

export function PdfPreview({
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

  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      setIsLoading(true);
      setRenderError(null);

      try {
        const pdfjsLib = await import("pdfjs-dist");
        if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        }

        const loadingTask = pdfjsLib.getDocument({
          data,
          password: password || undefined,
          useSystemFonts: true,
        });

        // Set password callback if needed
        loadingTask.onPassword = (callback: any, reason: number) => {
          if (onPasswordRequired) {
            onPasswordRequired();
          }
        };

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        if (onPageCount) {
          onPageCount(doc.numPages);
        }

        await renderPage(doc, 1);
      } catch (err: any) {
        if (isCancelled) return;
        console.error("PDF preview error:", err);
        if (err.name === "PasswordException") {
          if (onPasswordRequired) onPasswordRequired();
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
    };
  }, [data, password, onPasswordRequired, onPageCount]);

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
      <div className="relative w-full max-h-[380px] sm:max-h-[440px] overflow-auto flex items-center justify-center p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] shadow-inner">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-secondary)]/80 backdrop-blur-xs z-10 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
            <span className="text-xs text-[var(--text-muted)]">Rendering preview...</span>
          </div>
        )}

        {renderError && (
          <div className="flex flex-col items-center gap-2 p-6 text-center text-xs text-rose-500">
            <AlertCircle className="w-5 h-5" />
            <span>{renderError}</span>
          </div>
        )}

        <canvas ref={canvasRef} className="rounded-lg shadow-sm max-w-full" />
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
