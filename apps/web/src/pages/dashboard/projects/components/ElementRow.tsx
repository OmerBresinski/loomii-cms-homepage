import { useState, useEffect } from "react";
import { Item, ItemContent, ItemTitle, ItemActions } from "@/ui/item";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { Label } from "@/ui/label";
import { IconDeviceFloppy, IconCheck } from "@tabler/icons-react";
import { useProjectContext } from "../context/ProjectContext";
import { cn } from "@/lib/utils";

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
  element: any;
  projectId: string;
  sectionId: string;
  sectionName: string;
}

export function ElementRow({ element, projectId, sectionId, sectionName }: ElementRowProps) {
  const { saveEdit, hasEdit, getEdit } = useProjectContext();

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
        hasSavedEdit && "border-l-2 border-l-primary bg-primary/5"
      )}
    >
      <div className="flex items-center gap-3 w-full">
        <ItemContent className="flex-1">
          <div className="flex items-center gap-2">
            <ItemTitle>{element.name || "Untitled Element"}</ItemTitle>
            {hasSavedEdit && (
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
            value={value}
            onChange={handleChange}
            placeholder="No content"
            className={cn(hasSavedEdit && "border-primary/50")}
          />
        </div>

        {element.type === "link" && (
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Links to</Label>
            <Input
              value={hrefValue}
              onChange={handleHrefChange}
              placeholder="Target URL (e.g. /features, https://...)"
              className="font-mono"
            />
          </div>
        )}
      </div>
    </Item>
  );
}
