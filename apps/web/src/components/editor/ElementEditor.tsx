import { useState, useCallback } from "react";

interface ElementEditorProps {
  element: {
    id: string;
    name: string;
    type: string;
    currentValue: string | null;
    selector: string;
    confidence: number;
  };
  onSave: (elementId: string, newValue: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ElementEditor({
  element,
  onSave,
  onCancel,
  isLoading = false,
}: ElementEditorProps) {
  const [value, setValue] = useState(element.currentValue || "");
  const [isDirty, setIsDirty] = useState(false);

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
    setIsDirty(newValue !== element.currentValue);
  }, [element.currentValue]);

  const handleSave = () => {
    if (isDirty) {
      onSave(element.id, value);
    }
  };

  const renderEditor = () => {
    switch (element.type) {
      case "heading":
      case "button":
      case "link":
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className="input text-lg font-medium"
            placeholder={`Enter ${element.type}...`}
            disabled={isLoading}
          />
        );

      case "paragraph":
      case "text":
        return (
          <textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className="input min-h-[120px] resize-y"
            placeholder="Enter text..."
            disabled={isLoading}
          />
        );

      case "image":
        return (
          <div className="space-y-3">
            <input
              type="url"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              className="input"
              placeholder="Enter image URL..."
              disabled={isLoading}
            />
            {value && (
              <div className="rounded-lg overflow-hidden border border-border bg-background-tertiary">
                <img
                  src={value}
                  alt="Preview"
                  className="max-h-48 w-auto mx-auto"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
        );

      default:
        return (
          <textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className="input min-h-[80px] resize-y font-mono text-sm"
            placeholder="Enter content..."
            disabled={isLoading}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">{element.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="badge badge-accent">{element.type}</span>
            <span className="text-xs text-foreground-subtle">
              {Math.round(element.confidence * 100)}% confidence
            </span>
          </div>
        </div>
        {isDirty && (
          <span className="badge bg-warning/20 text-warning">Unsaved</span>
        )}
      </div>

      {/* Selector info */}
      <div className="text-xs text-foreground-subtle font-mono bg-background-tertiary px-3 py-2 rounded-lg overflow-x-auto">
        {element.selector}
      </div>

      {/* Editor */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Content</label>
        {renderEditor()}
      </div>

      {/* Original value comparison */}
      {isDirty && element.currentValue && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground-muted">
            Original value
          </label>
          <div className="text-sm text-foreground-subtle bg-background-tertiary px-3 py-2 rounded-lg line-through">
            {element.currentValue.length > 200
              ? `${element.currentValue.slice(0, 200)}...`
              : element.currentValue}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={!isDirty || isLoading}
          className="btn-primary"
        >
          {isLoading ? (
            <>
              <LoadingSpinner />
              Saving...
            </>
          ) : (
            "Save Draft"
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
