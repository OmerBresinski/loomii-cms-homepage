import { useParams, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { projectDetailQuery } from "@/lib/queries";
import { useProjectContext, type PendingEdit } from "./context/ProjectContext";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Badge } from "@/ui/badge";
import {
  IconChevronRight,
  IconArrowLeft,
  IconFile,
  IconGitPullRequest,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
  const valueChanged = edit.originalValue !== edit.newValue;
  const hrefChanged = edit.originalHref !== edit.newHref;

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

  return (
    <div className="divide-y divide-border/50">
      {lines.map((line, idx) => {
        const isChangedLine = line.lineNum === edit.sourceLine;

        if (isChangedLine) {
          // Show removed line
          const removedLine = line.content.replace(edit.originalValue, edit.originalValue);
          // Show added line
          const addedLine = line.content.replace(edit.originalValue, edit.newValue);

          return (
            <div key={idx}>
              {/* Removed line */}
              <div className="flex bg-red-500/10">
                <span className="w-12 text-right pr-2 py-0.5 text-red-600 dark:text-red-400 select-none bg-red-500/20">
                  {line.lineNum}
                </span>
                <span className="w-6 text-center py-0.5 text-red-600 dark:text-red-400 select-none">-</span>
                <span className="flex-1 py-0.5 pr-2 whitespace-pre text-red-700 dark:text-red-300">
                  {highlightChange(removedLine, edit.originalValue, "removed")}
                </span>
              </div>
              {/* Added line */}
              <div className="flex bg-green-500/10">
                <span className="w-12 text-right pr-2 py-0.5 text-green-600 dark:text-green-400 select-none bg-green-500/20">
                  {line.lineNum}
                </span>
                <span className="w-6 text-center py-0.5 text-green-600 dark:text-green-400 select-none">+</span>
                <span className="flex-1 py-0.5 pr-2 whitespace-pre text-green-700 dark:text-green-300">
                  {highlightChange(addedLine, edit.newValue, "added")}
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
  );
}

// Highlight the changed part of a line
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
  const { editCount, getEditsByFile, clearAllEdits } = useProjectContext();

  const { data: projectData } = useQuery(projectDetailQuery(projectId));
  const project = projectData?.project;

  const editsByFile = getEditsByFile();
  const files = Array.from(editsByFile.keys()).sort();

  const handleCreatePR = () => {
    // TODO: Implement PR creation
    console.log("Creating PR with edits:", editsByFile);
    alert("PR creation coming soon!");
  };

  const handleGoBack = () => {
    navigate({ to: `/dashboard/projects/${projectId}` });
  };

  if (editCount === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
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
    <div className="p-8 max-w-5xl mx-auto space-y-6 pb-24">
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
            <h1 className="text-3xl font-bold tracking-tight">Review Changes</h1>
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
            <Button onClick={handleCreatePR}>
              <IconGitPullRequest className="w-4 h-4 mr-2" />
              Create Pull Request
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
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Review your changes before creating a pull request
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={clearAllEdits}>
              Discard All
            </Button>
            <Button onClick={handleCreatePR} size="lg">
              <IconGitPullRequest className="w-4 h-4 mr-2" />
              Create Pull Request
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
