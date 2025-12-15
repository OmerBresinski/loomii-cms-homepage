import { useState, useEffect } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  projectDetailQuery,
  sectionListQuery,
  sectionDetailQuery,
} from "@/lib/queries";
import { useTriggerAnalysis } from "@/lib/mutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Play,
  Loader2,
  Search,
  AlertCircle,
  FileText,
  Type,
  Image,
  MousePointer,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  GitPullRequest,
  Layers,
} from "lucide-react";

// Track local changes before publishing
interface ElementChange {
  newValue: string;
  visible: boolean;
  originalValue: string;
}

export function ProjectDetailPage() {
  const { projectId } = useParams({ strict: false }) as { projectId: string };
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(
    null
  );
  const [pendingChanges, setPendingChanges] = useState<
    Record<string, ElementChange>
  >({});
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [wasAnalyzing, setWasAnalyzing] = useState(false);

  const { data: projectData, isLoading: projectLoading } = useQuery({
    ...projectDetailQuery(projectId),
    refetchInterval: (query) => {
      const status = query.state.data?.project?.status;
      return status === "analyzing" || isReanalyzing ? 10000 : false;
    },
  });

  const isAnalyzing = projectData?.project?.status === "analyzing";

  // Track when we enter analyzing state
  useEffect(() => {
    if (isAnalyzing) {
      setWasAnalyzing(true);
    }
  }, [isAnalyzing]);

  // Stop the reanalyze spinner when analysis completes (was analyzing, now ready)
  useEffect(() => {
    if (
      wasAnalyzing &&
      !isAnalyzing &&
      projectData?.project?.status === "ready"
    ) {
      setIsReanalyzing(false);
      setWasAnalyzing(false);
    }
  }, [wasAnalyzing, isAnalyzing, projectData?.project?.status]);

  // Show spinner if user clicked reanalyze OR if backend is analyzing
  const showReanalyzeSpinner = isReanalyzing || isAnalyzing;

  const { data: sectionsData, isLoading: sectionsLoading } = useQuery({
    ...sectionListQuery(projectId),
    refetchInterval: showReanalyzeSpinner ? 10000 : false,
  });

  const triggerAnalysis = useTriggerAnalysis(projectId);

  // Handle re-analyze click
  const handleReanalyze = () => {
    setIsReanalyzing(true);
    setWasAnalyzing(false);
    setExpandedSectionId(null);
    setPendingChanges({}); // Clear pending changes since element IDs will change
    triggerAnalysis.mutate({ fullRescan: true });
  };

  const project = projectData?.project;
  const sections = sectionsData?.sections || [];

  const totalElements = sections.reduce((acc, s) => acc + s.elementCount, 0);

  const needsAnalysis =
    project?.status === "pending" ||
    (!project?.lastAnalyzedAt && sections.length === 0);

  const pendingCount = Object.keys(pendingChanges).length;

  const handleSaveChange = (elementId: string, change: ElementChange) => {
    if (change.newValue !== change.originalValue || !change.visible) {
      setPendingChanges((prev) => ({ ...prev, [elementId]: change }));
    } else {
      setPendingChanges((prev) => {
        const next = { ...prev };
        delete next[elementId];
        return next;
      });
    }
  };

  const handlePublish = () => {
    console.log("Publishing changes:", pendingChanges);
  };

  if (projectLoading) {
    return (
      <div className="p-8 animate-in">
        <div className="h-8 w-48 bg-white/5 rounded animate-pulse mb-4" />
        <div className="h-4 w-64 bg-white/5 rounded animate-pulse" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 animate-in">
        <div className="text-center py-16">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-semibold mb-2">Project not found</h2>
          <p className="text-gray-400 mb-6">
            This project doesn't exist or you don't have access.
          </p>
          <Button asChild variant="outline">
            <Link to="/dashboard/projects">Back to Projects</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 animate-in">
      <div className="mb-8">
        <Link
          to="/dashboard/projects"
          className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">{project.name}</h1>
            <p className="text-gray-400 font-mono text-sm">
              {project.githubRepo}
            </p>
          </div>
          <StatusBadge status={project.status} />
        </div>
      </div>

      {isAnalyzing ? (
        <div className="border border-white/10 rounded-lg bg-[#111] p-12 text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
          <h2 className="text-xl font-semibold mb-2">
            Analyzing your website...
          </h2>
          <p className="text-gray-400 mb-4">
            We're scanning your repository to detect editable content.
          </p>
          <p className="text-sm text-gray-500">This may take a few minutes.</p>
        </div>
      ) : needsAnalysis ? (
        <div className="border border-white/10 rounded-lg bg-[#111] p-12 text-center">
          <Search className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h2 className="text-xl font-semibold mb-2">Ready to analyze</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Start the analysis to scan your repository and detect all editable
            content.
          </p>
          <Button
            onClick={() => triggerAnalysis.mutate({})}
            disabled={triggerAnalysis.isPending}
            size="lg"
          >
            {triggerAnalysis.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Begin Analysis
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Sections" value={String(sections.length)} />
            <StatCard label="Elements" value={String(totalElements)} />
            <StatCard
              label="Pending Edits"
              value={String(pendingCount)}
              highlight={pendingCount > 0}
            />
            <StatCard
              label="Last Analyzed"
              value={
                project.lastAnalyzedAt
                  ? new Date(project.lastAnalyzedAt).toLocaleDateString()
                  : "Never"
              }
            />
          </div>

          {/* Header with actions */}
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              Content Sections ({showReanalyzeSpinner ? "..." : sections.length}
              )
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReanalyze}
                disabled={showReanalyzeSpinner}
              >
                {showReanalyzeSpinner ? (
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                ) : (
                  <Play className="w-3 h-3 mr-1.5" />
                )}
                {showReanalyzeSpinner ? "Analyzing..." : "Re-analyze"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePublish}
                disabled={pendingCount === 0 || showReanalyzeSpinner}
                className={
                  pendingCount > 0
                    ? "border-primary text-primary hover:bg-primary/10"
                    : ""
                }
              >
                <GitPullRequest className="w-3 h-3 mr-1.5" />
                Publish {pendingCount > 0 && `(${pendingCount})`}
              </Button>
            </div>
          </div>

          {/* Sections */}
          {showReanalyzeSpinner ? (
            <div className="border border-white/10 rounded-lg bg-[#111] p-12 text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
              <h3 className="text-lg font-semibold mb-2">Re-analyzing...</h3>
              <p className="text-gray-400 text-sm">
                Scanning your repository for content changes.
              </p>
            </div>
          ) : sectionsLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-white/5 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : sections.length === 0 ? (
            <div className="border border-white/10 rounded-lg bg-[#111] p-12 text-center">
              <Layers className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">No content sections detected yet.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sections.map((section) => (
                <SectionRow
                  key={section.id}
                  projectId={projectId}
                  section={section}
                  isExpanded={expandedSectionId === section.id}
                  onToggle={() =>
                    setExpandedSectionId(
                      expandedSectionId === section.id ? null : section.id
                    )
                  }
                  pendingChanges={pendingChanges}
                  onSaveChange={handleSaveChange}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`border rounded-lg p-4 bg-[#111] ${highlight ? "border-primary/50" : "border-white/10"}`}
    >
      <p className="text-gray-500 text-sm mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? "text-primary" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ready: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    analyzing: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    pending: "bg-gray-500/10 text-gray-400 border-gray-500/30",
    error: "bg-red-500/10 text-red-400 border-red-500/30",
  };

  return (
    <span
      className={`px-3 py-1 text-sm font-medium rounded-full border ${styles[status] || styles.pending}`}
    >
      {status}
    </span>
  );
}

interface SectionProps {
  projectId: string;
  section: {
    id: string;
    name: string;
    description: string | null;
    sourceFile: string | null;
    elementCount: number;
  };
  isExpanded: boolean;
  onToggle: () => void;
  pendingChanges: Record<string, ElementChange>;
  onSaveChange: (elementId: string, change: ElementChange) => void;
}

function SectionRow({
  projectId,
  section,
  isExpanded,
  onToggle,
  pendingChanges,
  onSaveChange,
}: SectionProps) {
  // Fetch section elements when expanded
  const { data: sectionData, isLoading: elementsLoading } = useQuery({
    ...sectionDetailQuery(projectId, section.id),
    enabled: isExpanded,
  });

  const elements = sectionData?.section?.elements || [];
  const pendingInSection = elements.filter((e) => pendingChanges[e.id]).length;

  return (
    <div className="border border-white/10 rounded-lg bg-[#111] overflow-hidden">
      {/* Section header */}
      <div
        className="px-4 py-4 hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-3"
        onClick={onToggle}
      >
        <div className="text-gray-500">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
        <div className="p-2 rounded bg-violet-500/20 text-violet-400">
          <Layers className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{section.name}</span>
            {pendingInSection > 0 && (
              <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                {pendingInSection} modified
              </span>
            )}
          </div>
          {section.description && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {section.description}
            </p>
          )}
        </div>
        <span className="text-sm text-gray-500">
          {section.elementCount} elements
        </span>
        {section.sourceFile && (
          <span className="text-xs text-gray-500 font-mono">
            {section.sourceFile.split("/").pop()}
          </span>
        )}
      </div>

      {/* Expanded section content */}
      {isExpanded && (
        <div className="border-t border-white/10 bg-[#0a0a0a]">
          {elementsLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-10 bg-white/5 rounded animate-pulse"
                />
              ))}
            </div>
          ) : elements.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              No elements in this section
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {elements.map((element) => (
                <ElementInput
                  key={element.id}
                  element={element}
                  pendingChange={pendingChanges[element.id]}
                  onSaveChange={(change) => onSaveChange(element.id, change)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ElementInputProps {
  element: {
    id: string;
    name: string;
    type: string;
    sourceFile: string | null;
    sourceLine: number | null;
    currentValue: string | null;
  };
  pendingChange?: ElementChange;
  onSaveChange: (change: ElementChange) => void;
}

function ElementInput({
  element,
  pendingChange,
  onSaveChange,
}: ElementInputProps) {
  const [editValue, setEditValue] = useState(
    pendingChange?.newValue ?? element.currentValue ?? ""
  );
  const [isVisible, setIsVisible] = useState(pendingChange?.visible ?? true);
  const hasChanges = pendingChange !== undefined;

  // Sync with pendingChange when it changes
  useEffect(() => {
    setEditValue(pendingChange?.newValue ?? element.currentValue ?? "");
    setIsVisible(pendingChange?.visible ?? true);
  }, [pendingChange, element.currentValue]);

  const typeIcons: Record<string, React.ReactNode> = {
    heading: <Type className="w-3 h-3" />,
    paragraph: <FileText className="w-3 h-3" />,
    text: <FileText className="w-3 h-3" />,
    image: <Image className="w-3 h-3" />,
    button: <MousePointer className="w-3 h-3" />,
    link: <MousePointer className="w-3 h-3" />,
  };

  const typeColors: Record<string, string> = {
    heading: "bg-blue-500/20 text-blue-400",
    paragraph: "bg-green-500/20 text-green-400",
    text: "bg-green-500/20 text-green-400",
    button: "bg-purple-500/20 text-purple-400",
    image: "bg-orange-500/20 text-orange-400",
    link: "bg-cyan-500/20 text-cyan-400",
  };

  const handleSave = () => {
    onSaveChange({
      newValue: editValue,
      visible: isVisible,
      originalValue: element.currentValue || "",
    });
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border ${hasChanges ? "border-primary/50 bg-primary/5" : "border-white/5 bg-white/[0.02]"}`}
    >
      <div
        className={`p-1.5 rounded shrink-0 ${typeColors[element.type] || "bg-gray-500/20 text-gray-400"}`}
      >
        {typeIcons[element.type] || <LayoutGrid className="w-3 h-3" />}
      </div>

      <div className="flex-1 min-w-0">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="bg-[#111] border-white/10 text-sm h-8"
          placeholder={element.name}
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Checkbox
          id={`visible-${element.id}`}
          checked={isVisible}
          onCheckedChange={(checked) => setIsVisible(checked === true)}
        />
        <label
          htmlFor={`visible-${element.id}`}
          className="text-xs text-gray-400 cursor-pointer"
        >
          visible
        </label>
      </div>

      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs shrink-0"
        onClick={handleSave}
      >
        Save
      </Button>

      <span className="text-[10px] text-gray-500 font-mono shrink-0 w-24 truncate text-right">
        {element.sourceFile?.split("/").pop()}:{element.sourceLine}
      </span>
    </div>
  );
}
