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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface ElementChange {
  newValue: string;
  visible: boolean;
  originalValue: string;
}

export function ProjectDetailPage() {
  const { projectId } = useParams({ strict: false }) as { projectId: string };
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, ElementChange>>({});
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

  useEffect(() => {
    if (isAnalyzing) {
      setWasAnalyzing(true);
    }
  }, [isAnalyzing]);

  useEffect(() => {
    if (wasAnalyzing && !isAnalyzing && projectData?.project?.status === "ready") {
      setIsReanalyzing(false);
      setWasAnalyzing(false);
    }
  }, [wasAnalyzing, isAnalyzing, projectData?.project?.status]);

  const showReanalyzeSpinner = isReanalyzing || isAnalyzing;

  const { data: sectionsData, isLoading: sectionsLoading } = useQuery({
    ...sectionListQuery(projectId),
    refetchInterval: showReanalyzeSpinner ? 10000 : false,
  });

  const triggerAnalysis = useTriggerAnalysis(projectId);

  const handleReanalyze = () => {
    setIsReanalyzing(true);
    setWasAnalyzing(false);
    setExpandedSectionId(null);
    setPendingChanges({});
    triggerAnalysis.mutate({ fullRescan: true });
  };

  const project = projectData?.project;
  const sections = sectionsData?.sections || [];
  const totalElements = sections.reduce((acc, s) => acc + s.elementCount, 0);
  const needsAnalysis = project?.status === "pending" || (!project?.lastAnalyzedAt && sections.length === 0);
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
      <div className="p-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-4" />
        <div className="h-4 w-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <Card className="text-center py-16">
          <CardContent>
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Project not found</h2>
            <p className="text-muted-foreground mb-6">This project doesn't exist or you don't have access.</p>
            <Link to="/dashboard/projects" className="inline-flex items-center gap-2 border border-border hover:bg-accent h-8 px-3 rounded-md text-sm font-medium">
              Back to Projects
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <Link
          to="/dashboard/projects"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">{project.name}</h1>
            <p className="text-muted-foreground font-mono text-sm">{project.githubRepo}</p>
          </div>
          <StatusBadge status={project.status} />
        </div>
      </div>

      {isAnalyzing ? (
        <Card className="text-center py-12">
          <CardContent>
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
            <h2 className="text-xl font-semibold mb-2">Analyzing your website...</h2>
            <p className="text-muted-foreground mb-4">We're scanning your repository to detect editable content.</p>
            <p className="text-sm text-muted-foreground">This may take a few minutes.</p>
          </CardContent>
        </Card>
      ) : needsAnalysis ? (
        <Card className="text-center py-12">
          <CardContent>
            <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Ready to analyze</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Start the analysis to scan your repository and detect all editable content.
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
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Sections</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{sections.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Elements</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{totalElements}</p>
              </CardContent>
            </Card>
            <Card className={pendingCount > 0 ? "border-primary/50" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Edits</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${pendingCount > 0 ? "text-primary" : ""}`}>{pendingCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Last Analyzed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {project.lastAnalyzedAt ? new Date(project.lastAnalyzedAt).toLocaleDateString() : "Never"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Content Sections ({showReanalyzeSpinner ? "..." : sections.length})</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReanalyze} disabled={showReanalyzeSpinner}>
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
                className={pendingCount > 0 ? "border-primary text-primary hover:bg-primary/10" : ""}
              >
                <GitPullRequest className="w-3 h-3 mr-1.5" />
                Publish {pendingCount > 0 && `(${pendingCount})`}
              </Button>
            </div>
          </div>

          {showReanalyzeSpinner ? (
            <Card className="text-center py-12">
              <CardContent>
                <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
                <h3 className="text-lg font-semibold mb-2">Re-analyzing...</h3>
                <p className="text-muted-foreground text-sm">Scanning your repository for content changes.</p>
              </CardContent>
            </Card>
          ) : sectionsLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : sections.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Layers className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No content sections detected yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {sections.map((section) => (
                <SectionRow
                  key={section.id}
                  projectId={projectId}
                  section={section}
                  isExpanded={expandedSectionId === section.id}
                  onToggle={() => setExpandedSectionId(expandedSectionId === section.id ? null : section.id)}
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

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
    ready: "success",
    analyzing: "warning",
    pending: "secondary",
    error: "destructive",
  };

  return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
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

function SectionRow({ projectId, section, isExpanded, onToggle, pendingChanges, onSaveChange }: SectionProps) {
  const { data: sectionData, isLoading: elementsLoading } = useQuery({
    ...sectionDetailQuery(projectId, section.id),
    enabled: isExpanded,
  });

  const elements = sectionData?.section?.elements || [];
  const pendingInSection = elements.filter((e) => pendingChanges[e.id]).length;

  return (
    <Card>
      <div className="px-4 py-4 hover:bg-muted transition-colors cursor-pointer flex items-center gap-3" onClick={onToggle}>
        <div className="text-muted-foreground">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
        <div className="p-2 rounded bg-violet-500/20 text-violet-400">
          <Layers className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{section.name}</span>
            {pendingInSection > 0 && (
              <Badge variant="default" className="text-xs">{pendingInSection} modified</Badge>
            )}
          </div>
          {section.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{section.description}</p>}
        </div>
        <span className="text-sm text-muted-foreground">{section.elementCount} elements</span>
        {section.sourceFile && <span className="text-xs text-muted-foreground font-mono">{section.sourceFile.split("/").pop()}</span>}
      </div>

      {isExpanded && (
        <CardContent className="border-t border-border bg-background/50 pt-4">
          {elementsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
            </div>
          ) : elements.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-6">No elements in this section</div>
          ) : (
            <div className="space-y-3">
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
        </CardContent>
      )}
    </Card>
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

function ElementInput({ element, pendingChange, onSaveChange }: ElementInputProps) {
  const [editValue, setEditValue] = useState(pendingChange?.newValue ?? element.currentValue ?? "");
  const [isVisible, setIsVisible] = useState(pendingChange?.visible ?? true);
  const hasChanges = pendingChange !== undefined;

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
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${hasChanges ? "border-primary/50 bg-primary/5" : "border-border bg-card"}`}>
      <div className={`p-1.5 rounded shrink-0 ${typeColors[element.type] || "bg-muted text-muted-foreground"}`}>
        {typeIcons[element.type] || <LayoutGrid className="w-3 h-3" />}
      </div>

      <div className="flex-1 min-w-0">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="text-sm h-8"
          placeholder={element.name}
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Checkbox
          id={`visible-${element.id}`}
          checked={isVisible}
          onCheckedChange={(checked) => setIsVisible(checked === true)}
        />
        <label htmlFor={`visible-${element.id}`} className="text-xs text-muted-foreground cursor-pointer">
          visible
        </label>
      </div>

      <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={handleSave}>
        Save
      </Button>

      <span className="text-[10px] text-muted-foreground font-mono shrink-0 w-24 truncate text-right">
        {element.sourceFile?.split("/").pop()}:{element.sourceLine}
      </span>
    </div>
  );
}
