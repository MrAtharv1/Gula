import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ThemeToggle } from "@/components/ThemeToggle";

describe("Phase 0 Base Components", () => {
  it("renders Button with primary variant and handles click", () => {
    const handleClick = vi.fn();
    render(<Button variant="primary" onClick={handleClick}>Upload report</Button>);
    const btn = screen.getByRole("button", { name: /upload report/i });
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("disables Button when isLoading is true", () => {
    render(<Button isLoading>Saving...</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveProperty("disabled", true);
  });

  it("renders Badge with normal, borderline, and abnormal variants", () => {
    const { rerender } = render(<Badge variant="normal">Normal</Badge>);
    expect(screen.getByText("Normal")).toBeDefined();

    rerender(<Badge variant="borderline">Borderline</Badge>);
    expect(screen.getByText("Borderline")).toBeDefined();

    rerender(<Badge variant="abnormal">Abnormal</Badge>);
    expect(screen.getByText("Abnormal")).toBeDefined();
  });

  it("renders Card with title and content", () => {
    render(
      <Card>
        <CardTitle>Health Card</CardTitle>
        <CardContent>Metric Value 95 mg/dL</CardContent>
      </Card>
    );
    expect(screen.getByText("Health Card")).toBeDefined();
    expect(screen.getByText("Metric Value 95 mg/dL")).toBeDefined();
  });

  it("renders Skeleton with proper aria attributes", () => {
    const { container } = render(<Skeleton className="w-24 h-6" />);
    const el = container.querySelector('[aria-hidden="true"]');
    expect(el).toBeDefined();
  });

  it("renders EmptyState with actions", () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        icon={<span>Icon</span>}
        title="No reports yet"
        description="Upload a PDF report to get started"
        actionLabel="Upload now"
        onAction={handleAction}
      />
    );
    expect(screen.getByText("No reports yet")).toBeDefined();
    expect(screen.getByText("Upload a PDF report to get started")).toBeDefined();
    const actionBtn = screen.getByRole("button", { name: /upload now/i });
    fireEvent.click(actionBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it("renders ThemeToggle with light, auto, and dark radios", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("radiogroup", { name: /theme preference/i })).toBeDefined();
    expect(screen.getByRole("radio", { name: /light/i })).toBeDefined();
    expect(screen.getByRole("radio", { name: /auto/i })).toBeDefined();
    expect(screen.getByRole("radio", { name: /dark/i })).toBeDefined();
  });
});
