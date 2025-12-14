import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { projectDetailQuery, elementListQuery } from "@/lib/queries";
import { useTriggerAnalysis } from "@/lib/mutations";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Loader2, Search, AlertCircle, FileText, Type, Image, MousePointer, LayoutGrid } from "lucide-react";

export function ProjectDetailPage() {
  const { projectId } = useParams({ strict: false }) as { projectId: string };
  
  const { data: projectData, isLoading: projectLoading } = useQuery({
    ...projectDetailQuery(projectId),
    refetchInterval: (query) => {
      // Poll every 2 seconds while analyzing
      const status = query.state.data?.project?.status;
      return status === "analyzing" ? 2000 : false;
    },
  });
  
  const isAnalyzing = projectData?.project?.status === "analyzing";
  
  const { data: elementsData, isLoading: elementsLoading } = useQuery({
    ...elementListQuery(projectId),
    refetchInterval: isAnalyzing ? 5000 : false, // Refetch elements while analyzing
  });
  
  const triggerAnalysis = useTriggerAnalysis(projectId);
  
  const project = projectData?.project;
  const elements = elementsData?.elements || [];
  
  const needsAnalysis = project?.status === "pending" || (!project?.lastAnalyzedAt && elements.length === 0);

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
          <p className="text-gray-400 mb-6">This project doesn't exist or you don't have access.</p>
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
        <Link to="/dashboard/projects" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">{project.name}</h1>
            <p className="text-gray-400 font-mono text-sm">{project.githubRepo}</p>
          </div>
          <StatusBadge status={project.status} />
        </div>
      </div>

      {isAnalyzing ? (
        <div className="border border-white/10 rounded-lg bg-[#111] p-12 text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
          <h2 className="text-xl font-semibold mb-2">Analyzing your website...</h2>
          <p className="text-gray-400 mb-4">We're scanning {project.deploymentUrl} to detect editable content.</p>
          <p className="text-sm text-gray-500">This may take a few minutes.</p>
        </div>
      ) : needsAnalysis ? (
        <div className="border border-white/10 rounded-lg bg-[#111] p-12 text-center">
          <Search className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h2 className="text-xl font-semibold mb-2">Ready to analyze</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">Start the analysis to scan your website and detect all editable content.</p>
          <Button onClick={() => triggerAnalysis.mutate({})} disabled={triggerAnalysis.isPending} size="lg">
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
          <p className="text-sm text-gray-500 mt-4">Target: {project.deploymentUrl}</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Elements" value={String(elements.length)} />
            <StatCard label="Pages" value="1" />
            <StatCard label="Pending Edits" value="0" />
            <StatCard label="Last Analyzed" value={project.lastAnalyzedAt ? new Date(project.lastAnalyzedAt).toLocaleDateString() : "Never"} />
          </div>

          <div className="lg:col-span-4">
            <div className="border border-white/10 rounded-lg bg-[#111] flex flex-col max-h-[calc(100vh-320px)]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                <h2 className="font-semibold text-sm">Elements ({elements.length})</h2>
                <Button variant="outline" size="sm" onClick={() => triggerAnalysis.mutate({ fullRescan: true })} disabled={triggerAnalysis.isPending}>
                  {triggerAnalysis.isPending ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Play className="w-3 h-3 mr-1.5" />}
                  Re-analyze
                </Button>
              </div>
              
              {elementsLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />)}
                </div>
              ) : elements.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <LayoutGrid className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No elements detected yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5 overflow-y-auto flex-1">
                  {elements.map((element) => <ElementRow key={element.id} element={element} />)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 rounded-lg p-4 bg-[#111]">
      <p className="text-gray-500 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
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

  return <span className={`px-3 py-1 text-sm font-medium rounded-full border ${styles[status] || styles.pending}`}>{status}</span>;
}

function ElementRow({ element }: { element: any }) {
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

  return (
    <div className="px-4 py-2 hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-3">
      <div className={`p-1.5 rounded ${typeColors[element.type] || "bg-gray-500/20 text-gray-400"}`}>
        {typeIcons[element.type] || <LayoutGrid className="w-3 h-3" />}
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <span className="text-xs text-gray-500 px-1.5 py-0.5 rounded bg-white/5 shrink-0">{element.type}</span>
        <span className="text-sm truncate">{element.currentValue || element.name}</span>
      </div>
      <span className="text-xs text-gray-500 font-mono shrink-0">{element.sourceFile?.split('/').pop()}</span>
      <span className="text-xs text-gray-500 shrink-0">{Math.round(element.confidence * 100)}%</span>
    </div>
  );
}

