import { useRef, useEffect, useCallback, useState } from "react";
import { Spinner } from "@/ui/spinner";

interface PreviewChange {
  selector: string;
  value: string;
}

interface LivePreviewProps {
  url: string;
  changes?: PreviewChange[];
  selectedSelector?: string;
  onSelectElement?: (selector: string) => void;
  className?: string;
}

export function LivePreview({
  url,
  changes = [],
  selectedSelector,
  onSelectElement,
  className = "",
}: LivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Apply changes to the iframe content
  const applyChanges = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;

    try {
      for (const change of changes) {
        const element = iframe.contentDocument.querySelector(change.selector);
        if (element) {
          if (element.tagName === "IMG") {
            (element as HTMLImageElement).src = change.value;
          } else {
            element.textContent = change.value;
          }
          // Add visual indicator for changed elements
          (element as HTMLElement).style.outline = "2px solid #6366f1";
          (element as HTMLElement).style.outlineOffset = "2px";
        }
      }
    } catch (err) {
      console.error("Failed to apply changes:", err);
    }
  }, [changes]);

  // Highlight selected element
  const highlightSelected = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument || !selectedSelector) return;

    try {
      // Remove previous highlights
      const highlighted = iframe.contentDocument.querySelectorAll(
        "[data-cms-highlight]"
      );
      highlighted.forEach((el) => {
        (el as HTMLElement).style.outline = "";
        el.removeAttribute("data-cms-highlight");
      });

      // Add new highlight
      const element = iframe.contentDocument.querySelector(selectedSelector);
      if (element) {
        (element as HTMLElement).style.outline = "3px solid #22c55e";
        (element as HTMLElement).style.outlineOffset = "4px";
        element.setAttribute("data-cms-highlight", "true");
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } catch (err) {
      console.error("Failed to highlight element:", err);
    }
  }, [selectedSelector]);

  // Set up click handler for element selection
  const setupClickHandler = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument || !onSelectElement) return;

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement;
      if (!target) return;

      // Generate a selector for the clicked element
      const selector = generateSelector(target);
      if (selector) {
        onSelectElement(selector);
      }
    };

    iframe.contentDocument.addEventListener("click", handleClick);

    return () => {
      iframe.contentDocument?.removeEventListener("click", handleClick);
    };
  }, [onSelectElement]);

  // Handle iframe load
  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
    applyChanges();
    highlightSelected();
    setupClickHandler();
  };

  // Handle iframe error
  const handleError = () => {
    setIsLoading(false);
    setError("Failed to load preview. The site may block embedding.");
  };

  // Reapply changes when they update
  useEffect(() => {
    if (!isLoading) {
      applyChanges();
    }
  }, [changes, isLoading, applyChanges]);

  // Update highlight when selection changes
  useEffect(() => {
    if (!isLoading) {
      highlightSelected();
    }
  }, [selectedSelector, isLoading, highlightSelected]);

  return (
    <div className={`relative bg-background-secondary rounded-xl overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background-tertiary">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-error/50" />
            <div className="w-3 h-3 rounded-full bg-warning/50" />
            <div className="w-3 h-3 rounded-full bg-success/50" />
          </div>
          <span className="text-xs text-foreground-muted font-mono truncate max-w-[300px]">
            {url}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {changes.length > 0 && (
            <span className="badge badge-accent">
              {changes.length} change{changes.length !== 1 ? "s" : ""}
            </span>
          )}
          <button
            onClick={() => iframeRef.current?.contentWindow?.location.reload()}
            className="btn-ghost p-1"
            title="Refresh preview"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Preview content */}
      <div className="relative" style={{ height: "calc(100% - 44px)" }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background-secondary z-10">
            <div className="flex flex-col items-center gap-3">
              <Spinner className="size-8 text-accent" />
              <p className="text-sm text-foreground-muted">Loading preview...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background-secondary z-10">
            <div className="text-center px-6">
              <svg className="w-12 h-12 mx-auto mb-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-foreground-muted">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                  iframeRef.current?.contentWindow?.location.reload();
                }}
                className="btn-secondary mt-4"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={url}
          className="w-full h-full border-0"
          onLoad={handleLoad}
          onError={handleError}
          sandbox="allow-same-origin allow-scripts"
          title="Live Preview"
        />
      </div>
    </div>
  );
}

// Generate a CSS selector for an element
function generateSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${element.id}`;
  }

  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector = `#${current.id}`;
      path.unshift(selector);
      break;
    }

    if (current.className && typeof current.className === "string") {
      const classes = current.className.trim().split(/\s+/).slice(0, 2);
      if (classes.length > 0) {
        selector += `.${classes.join(".")}`;
      }
    }

    // Add nth-child if there are siblings
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child) => child.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(" > ");
}

