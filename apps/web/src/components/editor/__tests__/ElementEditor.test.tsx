import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ElementEditor } from "../ElementEditor";

describe("ElementEditor", () => {
  const defaultElement = {
    id: "test-id",
    name: "Test Element",
    type: "heading",
    currentValue: "Original Value",
    selector: ".test-selector",
    confidence: 0.95,
  };

  it("renders element information", () => {
    render(
      <ElementEditor
        element={defaultElement}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText("Test Element")).toBeInTheDocument();
    expect(screen.getByText("heading")).toBeInTheDocument();
    expect(screen.getByText("95% confidence")).toBeInTheDocument();
    expect(screen.getByText(".test-selector")).toBeInTheDocument();
  });

  it("shows current value in input", () => {
    render(
      <ElementEditor
        element={defaultElement}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const input = screen.getByDisplayValue("Original Value");
    expect(input).toBeInTheDocument();
  });

  it("shows unsaved badge when value changes", () => {
    render(
      <ElementEditor
        element={defaultElement}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const input = screen.getByDisplayValue("Original Value");
    fireEvent.change(input, { target: { value: "New Value" } });

    expect(screen.getByText("Unsaved")).toBeInTheDocument();
  });

  it("calls onSave with new value", () => {
    const onSave = vi.fn();
    render(
      <ElementEditor
        element={defaultElement}
        onSave={onSave}
        onCancel={vi.fn()}
      />
    );

    const input = screen.getByDisplayValue("Original Value");
    fireEvent.change(input, { target: { value: "New Value" } });

    const saveButton = screen.getByText("Save Draft");
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith("test-id", "New Value");
  });

  it("calls onCancel when cancel button clicked", () => {
    const onCancel = vi.fn();
    render(
      <ElementEditor
        element={defaultElement}
        onSave={vi.fn()}
        onCancel={onCancel}
      />
    );

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  it("disables save button when value unchanged", () => {
    render(
      <ElementEditor
        element={defaultElement}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const saveButton = screen.getByText("Save Draft");
    expect(saveButton).toBeDisabled();
  });

  it("renders textarea for paragraph type", () => {
    const paragraphElement = {
      ...defaultElement,
      type: "paragraph",
    };

    render(
      <ElementEditor
        element={paragraphElement}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const textarea = screen.getByRole("textbox");
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("shows loading state", () => {
    render(
      <ElementEditor
        element={defaultElement}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        isLoading={true}
      />
    );

    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });
});

