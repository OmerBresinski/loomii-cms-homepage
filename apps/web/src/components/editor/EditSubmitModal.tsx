import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { Item, ItemGroup, ItemContent, ItemTitle, ItemMedia } from "@/components/ui/item";
import { Info, Send, Type, Image as ImageIcon, Link as LinkIcon, RefreshCw } from "lucide-react";

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
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-card border-border">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DialogHeader className="p-6 border-b bg-muted/20">
            <DialogTitle className="text-xl font-bold">Submit Changes</DialogTitle>
            <DialogDescription>
              Create a pull request with your content changes. A developer will review and merge them.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Changes ({edits.length})
              </label>
              <ScrollArea className="h-48 rounded-xl border bg-muted/10">
                <ItemGroup className="gap-0">
                  {edits.map((edit) => (
                    <Item key={edit.id} className="px-4 py-3 border-b last:border-0 rounded-none bg-transparent">
                      <ItemMedia variant="icon" className="w-8 h-8 rounded-lg border bg-background">
                        {edit.element.type === "text" ? <Type className="w-3.5 h-3.5" /> :
                         edit.element.type === "image" ? <ImageIcon className="w-3.5 h-3.5" /> :
                         <LinkIcon className="w-3.5 h-3.5" />}
                      </ItemMedia>
                      <ItemContent className="ml-3">
                        <ItemTitle className="text-xs font-semibold">{edit.element.name}</ItemTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground line-through opacity-50 truncate max-w-[150px]">
                            {edit.oldValue || "empty"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">→</span>
                          <span className="text-[10px] text-emerald-500 font-medium truncate max-w-[150px]">
                            {edit.newValue}
                          </span>
                        </div>
                      </ItemContent>
                    </Item>
                  ))}
                </ItemGroup>
              </ScrollArea>
            </div>

            <div className="space-y-6">
              <Field>
                <FieldLabel>Pull Request Title</FieldLabel>
                <FieldContent>
                  <Input 
                    value={prTitle}
                    onChange={(e) => setPrTitle(e.target.value)}
                    placeholder="Enter PR title..."
                    required
                    disabled={isLoading}
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Description (optional)</FieldLabel>
                <FieldContent>
                  <Textarea 
                    value={prDescription}
                    onChange={(e) => setPrDescription(e.target.value)}
                    placeholder="Add a description for reviewers..."
                    className="min-h-[100px]"
                    disabled={isLoading}
                  />
                </FieldContent>
              </Field>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-blue-500/80">
                This will create a new branch and pull request in your GitHub repository. 
                A developer will need to review and merge the changes before they appear on your live site.
              </p>
            </div>
          </div>

          <DialogFooter className="p-6 border-t bg-muted/20 sm:justify-end gap-3">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !prTitle.trim()}>
              {isLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Create Pull Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
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
