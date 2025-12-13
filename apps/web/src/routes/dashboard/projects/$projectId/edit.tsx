import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { elementListQuery, projectDetailQuery } from "@/lib/queries";
import { useCreateEdit, useSubmitEdits } from "@/lib/mutations";
import { ElementEditor } from "@/components/editor/ElementEditor";
import { LivePreview } from "@/components/editor/LivePreview";
import { EditSubmitModal } from "@/components/editor/EditSubmitModal";

export const Route = createFileRoute("/dashboard/projects/$projectId/edit")({
  component: ProjectEditorPage,
});

interface ElementData {
  id: string;
  name: string;
  type: string;
  selector: string;
  currentValue: string | null;
  pageUrl: string;
  confidence: number;
}

function ProjectEditorPage() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();

  // State
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedPageUrl, setSelectedPageUrl] = useState<string>("/");
  const [draftEdits, setDraftEdits] = useState<
    Map<string, { oldValue: string | null; newValue: string }>
  >(new Map());
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Queries
  const { data: projectData, isLoading: isLoadingProject } = useQuery(
    projectDetailQuery(projectId)
  );
  const { data: elementsData, isLoading: isLoadingElements } = useQuery(
    elementListQuery(projectId, { page: 1 })
  );

  // Mutations
  const createEditMutation = useCreateEdit(projectId);
  const submitEditsMutation = useSubmitEdits(projectId);

  // Computed values
  const project = projectData?.project;
  const elements: ElementData[] = (elementsData?.elements || []).map((e: any) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    selector: e.selector || '',
    currentValue: e.currentValue,
    pageUrl: e.pageUrl || '/',
    confidence: e.confidence || 0,
  }));

  const pageUrls = useMemo(() => {
    const urls = [...new Set(elements.map((e) => e.pageUrl))];
    return urls.sort();
  }, [elements]);

  const filteredElements = useMemo(() => {
    return elements.filter((e) => e.pageUrl === selectedPageUrl);
  }, [elements, selectedPageUrl]);

  const selectedElement = useMemo(() => {
    return elements.find((e) => e.id === selectedElementId);
  }, [elements, selectedElementId]);

  // Preview changes
  const previewChanges = useMemo(() => {
    return Array.from(draftEdits.entries())
      .map(([elementId, edit]) => {
        const element = elements.find((e) => e.id === elementId);
        if (!element) return null;
        return {
          selector: element.selector,
          value: edit.newValue,
        };
      })
      .filter((c): c is { selector: string; value: string } => c !== null);
  }, [draftEdits, elements]);

  // Draft edits for submit
  const pendingEdits = useMemo(() => {
    return Array.from(draftEdits.entries()).map(([elementId, edit]) => {
      const element = elements.find((e) => e.id === elementId)!;
      return {
        id: elementId,
        element: { name: element.name, type: element.type },
        oldValue: edit.oldValue,
        newValue: edit.newValue,
      };
    });
  }, [draftEdits, elements]);

  // Handlers
  const handleSaveEdit = (elementId: string, newValue: string) => {
    const element = elements.find((e) => e.id === elementId);
    if (!element) return;

    setDraftEdits((prev) => {
      const next = new Map(prev);
      next.set(elementId, {
        oldValue: element.currentValue,
        newValue,
      });
      return next;
    });

    setSelectedElementId(null);
  };

  const handleSubmitEdits = async (prTitle: string, prDescription: string) => {
    // First, create all drafts as edits in the API
    const editIds: string[] = [];

    for (const [elementId, edit] of draftEdits.entries()) {
      try {
        const result = await createEditMutation.mutateAsync({
          elementId,
          newValue: edit.newValue,
        });
        editIds.push(result.edit.id);
      } catch (error) {
        console.error("Failed to create edit:", error);
      }
    }

    if (editIds.length === 0) {
      return;
    }

    // Then submit them as a PR
    try {
      await submitEditsMutation.mutateAsync({
        editIds,
        prTitle,
        prDescription,
      });

      // Clear drafts and close modal
      setDraftEdits(new Map());
      setShowSubmitModal(false);

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["ai-cms", "edits", projectId] });
    } catch (error) {
      console.error("Failed to submit edits:", error);
    }
  };

  if (isLoadingProject || isLoadingElements) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-foreground-muted">Project not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{project.name}</h1>
          <p className="text-sm text-foreground-muted">Visual Editor</p>
        </div>
        <div className="flex items-center gap-3">
          {draftEdits.size > 0 && (
            <>
              <span className="badge badge-warning">
                {draftEdits.size} unsaved change{draftEdits.size !== 1 ? "s" : ""}
              </span>
              <button
                onClick={() => setShowSubmitModal(true)}
                className="btn-primary"
              >
                Submit Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Elements list */}
        <div className="w-80 border-r border-border flex flex-col">
          {/* Page selector */}
          <div className="p-4 border-b border-border">
            <label className="block text-sm font-medium mb-2">Page</label>
            <select
              value={selectedPageUrl}
              onChange={(e) => setSelectedPageUrl(e.target.value)}
              className="input text-sm"
            >
              {pageUrls.map((url) => (
                <option key={url} value={url}>
                  {url}
                </option>
              ))}
            </select>
          </div>

          {/* Elements list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <p className="text-xs text-foreground-subtle mb-2">
              {filteredElements.length} editable elements
            </p>
            {filteredElements.map((element) => (
              <button
                key={element.id}
                onClick={() => setSelectedElementId(element.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedElementId === element.id
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-border-hover hover:bg-background-tertiary"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge badge-accent text-xs">
                    {element.type}
                  </span>
                  {draftEdits.has(element.id) && (
                    <span className="badge bg-warning/20 text-warning text-xs">
                      edited
                    </span>
                  )}
                </div>
                <p className="font-medium text-sm truncate">{element.name}</p>
                <p className="text-xs text-foreground-muted truncate">
                  {draftEdits.get(element.id)?.newValue ||
                    element.currentValue ||
                    "No content"}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Main area - Preview + Editor */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Preview */}
          <div className="flex-1 p-4 overflow-hidden">
            <LivePreview
              url={`${project.deploymentUrl}${selectedPageUrl}`}
              changes={previewChanges}
              selectedSelector={selectedElement?.selector}
              className="h-full"
            />
          </div>

          {/* Editor panel */}
          {selectedElement && (
            <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-border p-4 overflow-y-auto">
              <ElementEditor
                element={selectedElement}
                onSave={handleSaveEdit}
                onCancel={() => setSelectedElementId(null)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Submit modal */}
      {showSubmitModal && pendingEdits.length > 0 && (
        <EditSubmitModal
          edits={pendingEdits}
          onSubmit={handleSubmitEdits}
          onCancel={() => setShowSubmitModal(false)}
          isLoading={submitEditsMutation.isPending}
        />
      )}
    </div>
  );
}
