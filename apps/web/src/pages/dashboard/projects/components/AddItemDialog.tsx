import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/ui/dialog";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { IconPlus } from "@tabler/icons-react";

interface Placeholder {
  name: string;
  description: string;
  type: string;
}

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  placeholders: Placeholder[];
  elementType?: string;
  onAdd: (values: Record<string, string>) => void;
}

// Match placeholder names flexibly
function isTextPlaceholder(name: string): boolean {
  const upper = name.toUpperCase();
  return upper.includes("TEXT") || upper.includes("LABEL") || upper.includes("CONTENT") || upper.includes("TITLE");
}

function isHrefPlaceholder(name: string): boolean {
  const upper = name.toUpperCase();
  return upper.includes("HREF") || upper.includes("URL") || upper.includes("LINK");
}

export function AddItemDialog({
  open,
  onOpenChange,
  groupName,
  placeholders,
  elementType,
  onAdd,
}: AddItemDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  // Reset values when dialog opens
  useEffect(() => {
    if (open) {
      setValues({});
    }
  }, [open]);

  // Filter and simplify placeholders based on element type
  const displayPlaceholders = useMemo(() => {
    const isLink = elementType === "link";

    const textPlaceholder = placeholders.find(p => isTextPlaceholder(p.name));
    const hrefPlaceholder = placeholders.find(p => isHrefPlaceholder(p.name));

    const result: Array<Placeholder & { friendlyName: string }> = [];

    // Always show text/label field
    if (textPlaceholder) {
      result.push({ ...textPlaceholder, friendlyName: "Label" });
    } else {
      // Fallback: create a default text placeholder
      result.push({ name: "TEXT", description: "Text content", type: "text", friendlyName: "Label" });
    }

    // For links, always show URL field
    if (isLink) {
      if (hrefPlaceholder) {
        result.push({ ...hrefPlaceholder, friendlyName: "URL" });
      } else {
        // Fallback: create a default href placeholder
        result.push({ name: "HREF", description: "Link URL", type: "href", friendlyName: "URL" });
      }
    }

    return result;
  }, [placeholders, elementType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(values);
    setValues({});
  };

  const handleChange = (name: string, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const isValid = displayPlaceholders.every(
    p => values[p.name] && values[p.name].trim() !== ""
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Add to {groupName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {displayPlaceholders.map(placeholder => (
            <div key={placeholder.name} className="space-y-1.5">
              <Label htmlFor={placeholder.name} className="text-xs font-medium">
                {placeholder.friendlyName}
              </Label>
              <Input
                id={placeholder.name}
                value={values[placeholder.name] || ""}
                onChange={e => handleChange(placeholder.name, e.target.value)}
                placeholder={isHrefPlaceholder(placeholder.name) ? "https://..." : "Enter text"}
                className="h-8 text-sm"
              />
            </div>
          ))}


          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!isValid}
            >
              <IconPlus className="w-3.5 h-3.5 mr-1" />
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
