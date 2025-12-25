import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { projectDetailQuery } from "@/lib/queries";
import { useUpdateElement } from "@/lib/mutations";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter
} from "@/ui/sheet";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { Label } from "@/ui/label";
import { Badge } from "@/ui/badge";
import { Field, FieldLabel, FieldContent, FieldDescription } from "@/ui/field";
import { IconDeviceFloppy, IconTypography, IconPhoto, IconLink } from "@tabler/icons-react";
import { Spinner } from "@/ui/spinner";

interface ElementEditorProps {
  projectId: string;
  elementId: string;
  onClose: () => void;
}


function ElementEditorForm({ 
  element, 
  projectId, 
  onClose 
}: { 
  element: any;
  projectId: string;
  onClose: () => void;
}) {
  const [content, setContent] = useState(element.content || "");
  const [alt, setAlt] = useState(element.alt || "");
  const [isDirty, setIsDirty] = useState(false);

  const updateElement = useUpdateElement(projectId);
  
  const handleSave = () => {
    updateElement.mutate({ 
      elementId: element.id, 
      content, 
      alt: element?.type === "image" ? alt : undefined
    }, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <div className="flex flex-col h-full"> 
       {/* Re-using the content from the previous render but now as a child of the Sheet */}
        <SheetHeader className="p-6 border-b bg-muted/20">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <SheetTitle className="text-xl font-bold">Edit Element</SheetTitle>
              <SheetDescription className="text-xs">
                Make changes to this content piece. Changes are saved as drafts.
              </SheetDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Badge variant="outline" className="gap-1.5 py-1 px-2.5 bg-background font-mono text-[10px] uppercase tracking-wider">
               {element.type === "text" ? <IconTypography className="w-3 h-3" /> :
                element.type === "image" ? <IconPhoto className="w-3 h-3" /> :
                <IconLink className="w-3 h-3" />}
               {element.type}
            </Badge>
            <span className="text-[10px] text-muted-foreground font-mono">{element.key}</span>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <Field>
            <FieldLabel>Content</FieldLabel>
            <FieldContent>
              {element.type === "text" ? (
                <Textarea 
                  value={content}
                  onChange={(e) => { setContent(e.target.value); setIsDirty(true); }}
                  placeholder="Enter content..."
                  className="min-h-[160px] text-sm leading-relaxed"
                />
              ) : (
                <Input 
                  value={content}
                  onChange={(e) => { setContent(e.target.value); setIsDirty(true); }}
                  placeholder="Enter URL..."
                  className="text-sm"
                />
              )}
            </FieldContent>
            <FieldDescription>
              {element.type === "image" ? "The direct source URL for the image." : "The text content displayed on the page."}
            </FieldDescription>
          </Field>

          {element.type === "image" && (
            <Field>
              <FieldLabel>Alt Text</FieldLabel>
              <FieldContent>
                <Input 
                  value={alt}
                  onChange={(e) => { setAlt(e.target.value); setIsDirty(true); }}
                  placeholder="Describe the image..."
                  className="text-sm"
                />
              </FieldContent>
              <FieldDescription>
                Important for SEO and accessibility.
              </FieldDescription>
            </Field>
          )}

          {element.type === "image" && content && (
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Preview</Label>
              <div className="rounded-xl overflow-hidden border bg-muted/10 p-2">
                <img 
                  src={content} 
                  alt="Preview" 
                  className="w-full h-auto rounded-lg shadow-sm max-h-[300px] object-contain bg-white"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://placehold.co/400x300?text=Invalid+Image+URL"; }}
                />
              </div>
            </div>
          )}

          <div className="pt-4 border-t space-y-3">
             <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Original Source</Label>
             <div className="bg-muted/50 rounded-lg p-3 text-[10px] font-mono break-all text-muted-foreground border border-dashed">
                {element.selector}
             </div>
          </div>
        </div>

        <SheetFooter className="p-6 border-t bg-muted/20 sm:flex-row flex-row gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button 
             className="flex-1" 
             disabled={!isDirty || updateElement.isPending} 
             onClick={handleSave}
          >
            {updateElement.isPending ? (
              <Spinner className="size-4 mr-2" />
            ) : (
              <IconDeviceFloppy className="w-4 h-4 mr-2" />
            )}
            Save Draft
          </Button>
        </SheetFooter>
    </div>
  );
}

export function ElementEditor({ projectId, elementId, onClose }: ElementEditorProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const queryClient = useQueryClient();
  const { data: project, isLoading } = useQuery(projectDetailQuery(projectId));
  
  const element = project?.sections
    .flatMap(s => s.elements)
    .find(e => e.id === elementId);

  // Close if element disappears or project fails to load
  // Actually, better to just return null. The parent controls "open" state often.
  
  return (
    <Sheet open={!!elementId} onOpenChange={(open) => !open && onClose()}>
       <SheetContent className="sm:max-w-md flex flex-col h-full p-0 gap-0 border-l border-border bg-card">
          {(isLoading || !element) ? (
             <div className="flex h-full items-center justify-center p-6 text-muted-foreground">
                <Spinner className="size-6" />
             </div>
          ) : (
             <ElementEditorForm 
               key={element.id} // <--- CRITICAL: This resets state when element changes
               element={element}
               projectId={projectId}
               onClose={onClose}
             />
          )}
       </SheetContent>
    </Sheet>
  );
}
