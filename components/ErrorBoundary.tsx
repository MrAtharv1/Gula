"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./ui/Button";
import { AlertCircle, RotateCcw } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 sm:p-10 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-center max-w-lg mx-auto my-8 space-y-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5" />
          </div>

          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              {this.props.fallbackTitle || "Couldn't load this section"}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm mx-auto leading-relaxed">
              {this.props.fallbackMessage ||
                "An unexpected view error occurred. Your health records are safe in local storage."}
            </p>
          </div>

          <div className="pt-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={this.handleReset}
            >
              Try again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
