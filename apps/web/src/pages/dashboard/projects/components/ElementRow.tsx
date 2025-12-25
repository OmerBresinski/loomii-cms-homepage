import { useState, useEffect } from "react";
import { Item, ItemContent, ItemTitle, ItemActions } from "@/ui/item";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { Label } from "@/ui/label";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/ui/tooltip";
import { IconDeviceFloppy, IconCheck, IconGitPullRequest, IconLock, IconExternalLink } from "@tabler/icons-react";
import { useProjectContext } from "../context/ProjectContext";
import { cn } from "@/lib/utils";
import type { ElementWithPendingEdit } from "@/api/common";

// Map element types to colors (all unique)
const elementTypeColors: Record<string, string> = {
  heading: "text-purple-500",
  text: "text-emerald-500",
  paragraph: "text-sky-500",
  link: "text-blue-500",
  button: "text-orange-500",
  image: "text-pink-500",
  list: "text-teal-500",
  section: "text-indigo-500",
  navigation: "text-cyan-500",
  footer: "text-slate-500",
  hero: "text-violet-500",
  card: "text-amber-500",
  custom: "text-gray-500",
};

interface ElementRowProps {
  element: ElementWithPendingEdit;
  sectionId: string;
  sectionName: string;
}

export function ElementRow({ element, sectionId, sectionName }: ElementRowProps) {
  const { saveEdit, hasEdit, getEdit } = useProjectContext();

  // Check if this element has a pending PR (blocks editing)
  const hasPendingPR = !!element.pendingEdit;

  // Get existing edit if any
  const existingEdit = getEdit(element.id);

  // Original values
  const originalValue = element.currentValue || "";
  const originalHref = element.schema?.href || "";

  // Initialize with edited value if exists, otherwise use original
  const [value, setValue] = useState(existingEdit?.newValue ?? originalValue);
  const [hrefValue, setHrefValue] = useState(existingEdit?.newHref ?? originalHref);

  // Check if current value differs from original (normalize empty/undefined)
  const valueChanged = (value || "") !== (originalValue || "");
  const hrefChanged = (hrefValue || "") !== (originalHref || "");
  const isDirty = valueChanged || hrefChanged;
  const hasSavedEdit = hasEdit(element.id);

  // Sync state when element prop changes (e.g. after refetch)
  useEffect(() => {
    // Only reset if there's no pending edit for this element
    if (!hasEdit(element.id)) {
      setValue(element.currentValue || "");
      setHrefValue(element.schema?.href || "");
    }
  }, [element.id, element.currentValue, element.schema, hasEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleHrefChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHrefValue(e.target.value);
  };

  const handleSave = () => {
    // Save edit locally (not to backend)
    saveEdit({
      elementId: element.id,
      elementName: element.name || "Untitled Element",
      sectionId,
      sectionName,
      originalValue,
      newValue: value,
      originalHref: element.type === "link" ? originalHref : undefined,
      newHref: element.type === "link" ? hrefValue : undefined,
      sourceFile: element.sourceFile || "",
      sourceLine: element.sourceLine || 0,
      sourceContext: element.sourceContext || "",
      pageUrl: element.pageUrl || "/",
    });
  };

  // Determine button state - check if current values differ from saved edit values
  const savedValue = existingEdit?.newValue ?? originalValue;
  const savedHref = existingEdit?.newHref ?? originalHref;
  const hasUnsavedChanges = (value !== savedValue) || (hrefValue !== savedHref);
  const needsSave = isDirty && !hasSavedEdit;

  return (
    <Item
      variant="outline"
      className={cn(
        "flex-col items-stretch transition-colors",
        hasSavedEdit && "border-l-2 border-l-primary bg-primary/5",
        hasPendingPR && "border-l-2 border-l-amber-500 bg-amber-500/5"
      )}
    >
      <div className="flex items-center gap-3 w-full">
        <ItemContent className="flex-1">
          <div className="flex items-center gap-2">
            <ItemTitle>{element.name || "Untitled Element"}</ItemTitle>
            {hasPendingPR && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="warning" className="text-[10px] gap-1">
                    <IconGitPullRequest className="w-3 h-3" />
                    PR #{element.pendingEdit!.pullRequest.githubPrNumber}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-sm p-3">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-2">
                    <IconGitPullRequest className="w-3.5 h-3.5" />
                    <span className="font-semibold text-zinc-100">{element.pendingEdit!.pullRequest.title}</span>
                  </div>

                  <div className="font-mono text-xs space-y-0.5">
                    {/* Content change */}
                    {element.currentValue !== element.pendingEdit!.newValue && (
                      <>
                        <div className="text-green-400">
                          <span className="text-green-500/70 select-none">+ </span>
                          {element.pendingEdit!.newValue}
                        </div>
                        <div className="text-red-400">
                          <span className="text-red-500/70 select-none">- </span>
                          {element.currentValue}
                        </div>
                      </>
                    )}

                    {/* Href change for links */}
                    {element.pendingEdit!.oldHref && element.pendingEdit!.newHref && element.pendingEdit!.oldHref !== element.pendingEdit!.newHref && (
                      <>
                        {element.currentValue !== element.pendingEdit!.newValue && (
                          <div className="border-t border-zinc-700 my-1.5" />
                        )}
                        <div className="text-green-400 break-all">
                          <span className="text-green-500/70 select-none">+ </span>
                          {element.pendingEdit!.newHref}
                        </div>
                        <div className="text-red-400 break-all">
                          <span className="text-red-500/70 select-none">- </span>
                          {element.pendingEdit!.oldHref}
                        </div>
                      </>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
            {!hasPendingPR && hasSavedEdit && (
              <Badge variant="default" className="text-[10px] bg-primary/20 text-primary">
                Edited
              </Badge>
            )}
          </div>
        </ItemContent>

        {element.type && (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] uppercase tracking-wide",
              elementTypeColors[element.type] || "text-gray-500"
            )}
          >
            {element.type}
          </Badge>
        )}

        <ItemActions>
          {hasPendingPR ? (
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger>
                  <IconLock className="w-3.5 h-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  Editing blocked until PR is merged or closed
                </TooltipContent>
              </Tooltip>
              <Button
                size="sm"
                variant="ghost"
                className="hover:bg-zinc-800 hover:text-zinc-100 text-zinc-400 transition-colors"
                render={
                  <a
                    href={element.pendingEdit!.pullRequest.githubPrUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }}
                  />
                }
              >
                View PR
                <IconExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant={needsSave || hasUnsavedChanges ? "default" : hasSavedEdit ? "outline" : "ghost"}
              onClick={handleSave}
              disabled={!isDirty}
            >
              {hasSavedEdit && !hasUnsavedChanges ? (
                <IconCheck className="w-3.5 h-3.5" />
              ) : (
                <IconDeviceFloppy className="w-3.5 h-3.5" />
              )}
              {hasSavedEdit && !hasUnsavedChanges ? "Saved" : "Save"}
            </Button>
          )}
        </ItemActions>
      </div>

      {/* Content Input */}
      <div className="flex flex-col gap-2 w-full pt-1">
        <div className="flex flex-col gap-1">
          <Label
            htmlFor={`input-${element.id}`}
            className="text-xs text-muted-foreground"
          >
            Content
          </Label>
          <Input
            id={`input-${element.id}`}
            value={hasPendingPR ? (element.currentValue || "") : value}
            onChange={handleChange}
            placeholder="No content"
            disabled={hasPendingPR}
            className={cn(
              hasSavedEdit && "border-primary/50",
              hasPendingPR && "opacity-60 cursor-not-allowed"
            )}
          />
        </div>

        {element.type === "link" && (
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Links to</Label>
            <Input
              value={hasPendingPR ? (element.schema?.href || "") : hrefValue}
              onChange={handleHrefChange}
              placeholder="Target URL (e.g. /features, https://...)"
              disabled={hasPendingPR}
              className={cn(
                "font-mono",
                hasPendingPR && "opacity-60 cursor-not-allowed"
              )}
            />
          </div>
        )}
      </div>
    </Item>
  );
}
