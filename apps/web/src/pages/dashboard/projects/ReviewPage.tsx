import { useParams, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { projectDetailQuery } from "@/lib/queries";
import { usePublishEdits } from "@/lib/mutations";
import { useProjectContext, type PendingEdit } from "./context/ProjectContext";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Badge } from "@/ui/badge";
import {
  IconChevronRight,
  IconArrowLeft,
  IconFile,
  IconGitPullRequest,
  IconLoader2,
  IconCheck,
  IconGitBranch,
  IconFileText,
} from "@tabler/icons-react";
import { Separator } from "@/ui/separator";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

// Parse source context to get individual lines with their numbers
function parseSourceContext(context: string): Array<{ lineNum: number; content: string }> {
  if (!context) return [];
  return context.split("\n").map(line => {
    const match = line.match(/^(\d+)\|(.*)$/);
    if (match) {
      return { lineNum: parseInt(match[1]!, 10), content: match[2]! };
    }
    return { lineNum: 0, content: line };
  });
}

// Component to render a single file's changes
function FileDiff({
  filePath,
  edits
}: {
  filePath: string;
  edits: PendingEdit[];
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const fileName = filePath.split("/").pop() || filePath;

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="py-3 px-4 bg-muted/50 cursor-pointer flex-row items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <IconFile className="w-4 h-4 text-muted-foreground" />
          <div>
            <CardTitle className="text-sm font-mono">{fileName}</CardTitle>
            <p className="text-xs text-muted-foreground font-mono">{filePath}</p>
          </div>
        </div>
        <Badge variant="outline" className="ml-auto">
          {edits.length} change{edits.length !== 1 ? "s" : ""}
        </Badge>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-0">
          {edits.map((edit, idx) => (
            <div key={edit.elementId} className={cn(idx > 0 && "border-t")}>
              {/* Edit header */}
              <div className="px-4 py-2 bg-muted/30 border-b flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{edit.elementName}</span>
                  {" "}in{" "}
                  <span className="font-medium text-foreground">{edit.sectionName}</span>
                  {" "}• Line {edit.sourceLine}
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {edit.pageUrl}
                </Badge>
              </div>

              {/* Diff view */}
              <div className="font-mono text-xs overflow-x-auto">
                <DiffLines edit={edit} />
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

// Component to render the diff lines
function DiffLines({ edit }: { edit: PendingEdit }) {
  const lines = parseSourceContext(edit.sourceContext);
  const valueChanged = (edit.originalValue || "") !== (edit.newValue || "");
  const hrefChanged = (edit.originalHref || "") !== (edit.newHref || "");

  if (lines.length === 0) {
    // Fallback if no context available
    return (
      <div className="p-3 space-y-2">
        {valueChanged && (
          <>
            <div className="flex">
              <span className="w-10 text-right pr-2 text-muted-foreground select-none">-</span>
              <span className="flex-1 bg-red-500/10 text-red-700 dark:text-red-400 px-2 py-0.5">
                {edit.originalValue}
              </span>
            </div>
            <div className="flex">
              <span className="w-10 text-right pr-2 text-muted-foreground select-none">+</span>
              <span className="flex-1 bg-green-500/10 text-green-700 dark:text-green-400 px-2 py-0.5">
                {edit.newValue}
              </span>
            </div>
          </>
        )}
        {hrefChanged && (
          <>
            <div className="text-[10px] uppercase text-muted-foreground pt-1">Link Target</div>
            <div className="flex">
              <span className="w-10 text-right pr-2 text-muted-foreground select-none">-</span>
              <span className="flex-1 bg-red-500/10 text-red-700 dark:text-red-400 px-2 py-0.5 font-mono">
                href="{edit.originalHref}"
              </span>
            </div>
            <div className="flex">
              <span className="w-10 text-right pr-2 text-muted-foreground select-none">+</span>
              <span className="flex-1 bg-green-500/10 text-green-700 dark:text-green-400 px-2 py-0.5 font-mono">
                href="{edit.newHref}"
              </span>
            </div>
          </>
        )}
      </div>
    );
  }

  // Track which lines have changes for rendering
  const changedLines = new Set<number>();

  // Pre-scan to find which lines have which changes
  for (const line of lines) {
    const hasContent = valueChanged && edit.originalValue && line.content.includes(edit.originalValue);
    const hasHref = hrefChanged && edit.originalHref && line.content.includes(edit.originalHref);
    if (hasContent || hasHref) {
      changedLines.add(line.lineNum);
    }
  }

  // Check if content/href were found in the context
  const contentFoundInContext = valueChanged && edit.originalValue &&
    lines.some(l => l.content.includes(edit.originalValue));
  const hrefFoundInContext = hrefChanged && edit.originalHref &&
    lines.some(l => l.content.includes(edit.originalHref));

  return (
    <div>
      <div className="divide-y divide-border/50">
        {lines.map((line, idx) => {
          // Check if this line contains the content being changed
          const hasContentChange = valueChanged && edit.originalValue && line.content.includes(edit.originalValue);
          // Check if this line contains the href being changed
          const hasHrefChange = hrefChanged && edit.originalHref && line.content.includes(edit.originalHref);

          if (hasContentChange || hasHrefChange) {
            let removedLine = line.content;
            let addedLine = line.content;

            // Build list of highlights for this line
            const removedHighlights: string[] = [];
            const addedHighlights: string[] = [];

            if (hasContentChange) {
              addedLine = addedLine.replace(edit.originalValue, edit.newValue);
              removedHighlights.push(edit.originalValue);
              addedHighlights.push(edit.newValue);
            }
            if (hasHrefChange) {
              addedLine = addedLine.replace(edit.originalHref!, edit.newHref!);
              removedHighlights.push(edit.originalHref!);
              addedHighlights.push(edit.newHref!);
            }

            return (
              <div key={idx}>
                {/* Removed line */}
                <div className="flex bg-red-500/10">
                  <span className="w-12 text-right pr-2 py-0.5 text-red-600 dark:text-red-400 select-none bg-red-500/20">
                    {line.lineNum}
                  </span>
                  <span className="w-6 text-center py-0.5 text-red-600 dark:text-red-400 select-none">-</span>
                  <span className="flex-1 py-0.5 pr-2 whitespace-pre text-red-700 dark:text-red-300">
                    {highlightMultiple(removedLine, removedHighlights, "removed")}
                  </span>
                </div>
                {/* Added line */}
                <div className="flex bg-green-500/10">
                  <span className="w-12 text-right pr-2 py-0.5 text-green-600 dark:text-green-400 select-none bg-green-500/20">
                    {line.lineNum}
                  </span>
                  <span className="w-6 text-center py-0.5 text-green-600 dark:text-green-400 select-none">+</span>
                  <span className="flex-1 py-0.5 pr-2 whitespace-pre text-green-700 dark:text-green-300">
                    {highlightMultiple(addedLine, addedHighlights, "added")}
                  </span>
                </div>
              </div>
            );
          }

          // Context line (unchanged)
          return (
            <div key={idx} className="flex">
              <span className="w-12 text-right pr-2 py-0.5 text-muted-foreground select-none bg-muted/30">
                {line.lineNum}
              </span>
              <span className="w-6 text-center py-0.5 text-muted-foreground select-none"> </span>
              <span className="flex-1 py-0.5 pr-2 whitespace-pre text-muted-foreground">
                {line.content}
              </span>
            </div>
          );
        })}
      </div>

      {/* Always show summary sections for clarity */}
      {(valueChanged || hrefChanged) && (
        <div className="border-t border-border/50 px-3 py-2 bg-muted/20 space-y-3">
          {valueChanged && (
            <div>
              <div className="text-[10px] uppercase text-muted-foreground mb-1.5 font-medium flex items-center gap-2">
                Content
                {!contentFoundInContext && <span className="text-yellow-600">(not in visible context)</span>}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 dark:text-red-400">-</span>
                  <span className="bg-red-500/10 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded">
                    {edit.originalValue}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400">+</span>
                  <span className="bg-green-500/10 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">
                    {edit.newValue}
                  </span>
                </div>
              </div>
            </div>
          )}

          {hrefChanged && (
            <div>
              <div className="text-[10px] uppercase text-muted-foreground mb-1.5 font-medium flex items-center gap-2">
                Link Target
                {!hrefFoundInContext && <span className="text-yellow-600">(not in visible context)</span>}
              </div>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 dark:text-red-400">-</span>
                  <span className="bg-red-500/10 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded">
                    {edit.originalHref}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400">+</span>
                  <span className="bg-green-500/10 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">
                    {edit.newHref}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Highlight multiple changes in a line
function highlightMultiple(line: string, changes: string[], type: "removed" | "added") {
  if (changes.length === 0) return line;

  // Sort changes by their position in the line (to process left to right)
  const sortedChanges = changes
    .map(change => ({ change, idx: line.indexOf(change) }))
    .filter(c => c.idx !== -1)
    .sort((a, b) => a.idx - b.idx);

  if (sortedChanges.length === 0) return line;

  const result: React.ReactNode[] = [];
  let lastEnd = 0;

  for (const { change, idx } of sortedChanges) {
    // Skip if this change overlaps with a previous one
    if (idx < lastEnd) continue;

    // Add text before this change
    if (idx > lastEnd) {
      result.push(line.slice(lastEnd, idx));
    }

    // Add highlighted change
    result.push(
      <span
        key={idx}
        className={cn(
          "px-0.5 rounded",
          type === "removed" ? "bg-red-500/30" : "bg-green-500/30"
        )}
      >
        {change}
      </span>
    );

    lastEnd = idx + change.length;
  }

  // Add remaining text after last change
  if (lastEnd < line.length) {
    result.push(line.slice(lastEnd));
  }

  return <>{result}</>;
}

// Highlight the changed part of a line (single change)
function highlightChange(line: string, change: string, type: "removed" | "added") {
  const idx = line.indexOf(change);
  if (idx === -1) return line;

  const before = line.slice(0, idx);
  const after = line.slice(idx + change.length);

  return (
    <>
      {before}
      <span className={cn(
        "px-0.5 rounded",
        type === "removed" ? "bg-red-500/30" : "bg-green-500/30"
      )}>
        {change}
      </span>
      {after}
    </>
  );
}

export function ReviewPage() {
  const { projectId } = useParams({ from: "/dashboard/projects/$projectId/review" });
  const navigate = useNavigate();
  const { editCount, getEditsByFile, clearAllEdits, pendingEdits } = useProjectContext();
  const [createdPR, setCreatedPR] = useState<{
    url: string;
    number: number;
    title: string;
    branchName: string;
    editCount: number;
    fileCount: number;
  } | null>(null);

  const { data: projectData } = useQuery(projectDetailQuery(projectId));
  const project = projectData?.project;

  const publishEdits = usePublishEdits(projectId);

  const editsByFile = getEditsByFile();
  const files = Array.from(editsByFile.keys()).sort();

  const handlePublish = () => {
    // Convert pending edits to the format expected by the API
    const editsArray = Array.from(pendingEdits.values()).map((edit) => ({
      elementId: edit.elementId,
      originalValue: edit.originalValue,
      newValue: edit.newValue,
      originalHref: edit.originalHref,
      newHref: edit.newHref,
    }));

    const fileCount = files.length;
    const totalEdits = editsArray.length;

    publishEdits.mutate(
      { edits: editsArray },
      {
        onSuccess: (data) => {
          setCreatedPR({
            url: data.pullRequest.githubPrUrl,
            number: data.pullRequest.githubPrNumber,
            title: data.pullRequest.title,
            branchName: data.pullRequest.branchName,
            editCount: totalEdits,
            fileCount,
          });
          clearAllEdits();
          toast.success(`Pull request #${data.pullRequest.githubPrNumber} created!`);
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Failed to create PR");
        },
      }
    );
  };

  const handleGoBack = () => {
    navigate({ to: `/dashboard/projects/${projectId}` });
  };

  if (createdPR) {
    return (
      <div className="p-6 min-h-screen flex items-start justify-center pt-20">
        <Card className="w-full max-w-md">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                <IconCheck className="w-5 h-5 text-green-500" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg">Pull Request Created</CardTitle>
                <p className="text-sm text-muted-foreground truncate">
                  {createdPR.title}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <IconFileText className="w-4 h-4" />
                <span>{createdPR.editCount} edit{createdPR.editCount !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <IconFile className="w-4 h-4" />
                <span>{createdPR.fileCount} file{createdPR.fileCount !== 1 ? "s" : ""}</span>
              </div>
            </div>

            <Separator />

            {/* PR Details */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">PR Number</span>
                <Badge variant="secondary">#{createdPR.number}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Branch</span>
                <div className="flex items-center gap-1.5 text-xs font-mono bg-muted px-2 py-0.5 rounded">
                  <IconGitBranch className="w-3 h-3" />
                  <span className="truncate max-w-[180px]">{createdPR.branchName}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <a
              href={createdPR.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 h-8 px-3 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
            >
              <IconGitPullRequest className="w-4 h-4 shrink-0" />
              View Pull Request
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (editCount === 0) {
    return (
      <div className="p-6 min-h-screen">
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold mb-2">No Changes to Review</h2>
          <p className="text-muted-foreground mb-6">
            You haven't made any edits yet. Go back to the project and edit some content.
          </p>
          <Button onClick={handleGoBack}>
            <IconArrowLeft className="w-4 h-4 mr-2" />
            Back to Project
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 pb-24 min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            to="/dashboard/projects"
            className="hover:text-primary transition-colors"
          >
            Projects
          </Link>
          <IconChevronRight className="w-3 h-3" />
          <Link
            to={`/dashboard/projects/${projectId}`}
            className="hover:text-primary transition-colors"
          >
            {project?.name || "Project"}
          </Link>
          <IconChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">Review Changes</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold tracking-tight text-title">Review Changes</h1>
            <p className="text-muted-foreground mt-1">
              {editCount} edit{editCount !== 1 ? "s" : ""} across {files.length} file{files.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleGoBack}>
              <IconArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button variant="outline" onClick={clearAllEdits}>
              Discard All
            </Button>
            <Button onClick={handlePublish} disabled={publishEdits.isPending}>
              {publishEdits.isPending ? (
                <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <IconGitPullRequest className="w-4 h-4 mr-2" />
              )}
              {publishEdits.isPending ? "Publishing..." : "Publish"}
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">{editCount}</span> additions
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">{editCount}</span> deletions
              </span>
            </div>
            <div className="flex items-center gap-2">
              <IconFile className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">{files.length}</span> files changed
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Diffs */}
      <div className="space-y-4">
        {files.map(filePath => {
          const edits = editsByFile.get(filePath) || [];
          return <FileDiff key={filePath} filePath={filePath} edits={edits} />;
        })}
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
        <div className="flex items-center justify-between px-6">
          <p className="text-sm text-muted-foreground">
            Review your changes before creating a pull request
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={clearAllEdits}>
              Discard All
            </Button>
            <Button onClick={handlePublish} size="lg" disabled={publishEdits.isPending}>
              {publishEdits.isPending ? (
                <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <IconGitPullRequest className="w-4 h-4 mr-2" />
              )}
              {publishEdits.isPending ? "Publishing..." : "Publish"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
