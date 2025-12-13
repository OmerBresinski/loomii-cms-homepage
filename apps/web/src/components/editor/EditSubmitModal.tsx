import { useState } from "react";

interface Edit {
  id: string;
  element: {
    name: string;
    type: string;
  };
  oldValue: string | null;
  newValue: string;
}

interface EditSubmitModalProps {
  edits: Edit[];
  onSubmit: (prTitle: string, prDescription: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function EditSubmitModal({
  edits,
  onSubmit,
  onCancel,
  isLoading = false,
}: EditSubmitModalProps) {
  const [prTitle, setPrTitle] = useState(generateDefaultTitle(edits));
  const [prDescription, setPrDescription] = useState(
    generateDefaultDescription(edits)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(prTitle, prDescription);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-background-secondary border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-xl font-semibold">Submit Changes</h2>
            <p className="text-sm text-foreground-muted mt-1">
              Create a pull request with your content changes
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Changes summary */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Changes ({edits.length})
              </label>
              <div className="bg-background-tertiary rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                {edits.map((edit) => (
                  <div key={edit.id} className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="badge badge-accent text-xs">
                        {edit.element.type}
                      </span>
                      <span className="font-medium text-sm">
                        {edit.element.name}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-foreground-muted">
                      <span className="line-through">
                        {truncate(edit.oldValue || "", 50)}
                      </span>
                      <span className="mx-2">→</span>
                      <span className="text-success">
                        {truncate(edit.newValue, 50)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PR Title */}
            <div className="space-y-2">
              <label htmlFor="prTitle" className="block text-sm font-medium">
                Pull Request Title
              </label>
              <input
                type="text"
                id="prTitle"
                value={prTitle}
                onChange={(e) => setPrTitle(e.target.value)}
                className="input"
                placeholder="Enter PR title..."
                required
                disabled={isLoading}
              />
            </div>

            {/* PR Description */}
            <div className="space-y-2">
              <label
                htmlFor="prDescription"
                className="block text-sm font-medium"
              >
                Description (optional)
              </label>
              <textarea
                id="prDescription"
                value={prDescription}
                onChange={(e) => setPrDescription(e.target.value)}
                className="input min-h-[100px] resize-y"
                placeholder="Add a description for reviewers..."
                disabled={isLoading}
              />
            </div>

            {/* Info */}
            <div className="flex items-start gap-3 p-3 bg-accent/10 rounded-lg">
              <svg
                className="w-5 h-5 text-accent flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-foreground-muted">
                This will create a new branch and pull request in your GitHub
                repository. A developer will need to review and merge the changes
                before they appear on your live site.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading || !prTitle.trim()}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner />
                  Creating PR...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  Create Pull Request
                </>
              )}
            </button>
          </div>
        </form>
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

function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

function generateDefaultTitle(edits: Edit[]): string {
  if (edits.length === 1 && edits[0]) {
    return `[Content] Update ${edits[0].element.name}`;
  }

  const types = [...new Set(edits.map((e) => e.element.type))];
  if (types.length === 1 && types[0]) {
    return `[Content] Update ${edits.length} ${types[0]}s`;
  }

  return `[Content] Update ${edits.length} elements`;
}

function generateDefaultDescription(edits: Edit[]): string {
  const lines = ["## Changes\n"];

  for (const edit of edits) {
    lines.push(`- **${edit.element.name}** (${edit.element.type})`);
  }

  return lines.join("\n");
}

