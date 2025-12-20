import { useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/ui/accordion";
import { Badge } from "@/ui/badge";
import { Card } from "@/ui/card";
import { Checkbox } from "@/ui/checkbox";
import { Label } from "@/ui/label";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";
import { IconEdit, IconLoader2 } from "@tabler/icons-react";
import { sectionDetailQuery } from "@/lib/queries";
import { useUpdateElement } from "@/lib/mutations";

interface SectionRowProps {
    section: any;
    projectId: string;
    searchTerm: string;
    onEditElement: (id: string) => void;
}

export function SectionRow({ section, projectId, searchTerm, onEditElement }: SectionRowProps) {
  const queryClient = useQueryClient();
  const updateElement = useUpdateElement(projectId);
  const [isOpen, setIsOpen] = useState(false);

  // Prefetch on hover
  const onMouseEnter = () => {
    queryClient.prefetchQuery({
      ...sectionDetailQuery(projectId, section.id),
      staleTime: Infinity
    });
  };

  // Fetch only when open
  const { data: sectionDetail } = useQuery({
    ...sectionDetailQuery(projectId, section.id),
    enabled: isOpen,
    staleTime: Infinity 
  });

  // Use the fetched details (with elements) or fallback to basic info
  const elements = sectionDetail?.section?.elements || [];
  
  // Local filtering of elements if search term exists
  const displayedElements = elements.filter((el: any) => 
    !searchTerm || 
    (el.currentValue || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (el.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AccordionItem value={section.id} className="border border-border/60 rounded-lg bg-card/50 backdrop-blur-sm overflow-hidden mb-4">
      <AccordionTrigger 
        className="px-6 py-4 hover:bg-accent/5 hover:no-underline"
        onMouseEnter={onMouseEnter}
        onClick={() => setIsOpen(true)}
      >
        <div className="flex items-center gap-4 text-left">
          <div>
            <h3 className="text-sm font-semibold">{section.name}</h3>
            <p className="text-[10px] text-muted-foreground uppercase opacity-70">
              {section.elementCount || elements.length} components
            </p>
          </div>
          <Badge variant="secondary" className="text-[10px] h-5">Section</Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="border-t border-border/50 bg-accent/2">
        <div className="p-4 space-y-2">
            {elements.length === 0 && isOpen ? (
              <div className="p-4 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
                 <IconLoader2 className="w-3 h-3 animate-spin" />
                 Loading elements...
              </div>
            ) : (
                displayedElements.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-xs">
                        No elements matching search.
                    </div>
                ) : (
                  displayedElements.map((element: any) => (
                    <Card key={element.id} className="p-3 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center h-full">
                            <Checkbox 
                                id={`vis-${element.id}`}
                                checked={element.isVisible}
                                onCheckedChange={(checked) => updateElement.mutate({ elementId: element.id, isVisible: !!checked })}
                            />
                        </div>
                        
                        <div className="flex-1 min-w-0 grid gap-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor={`input-${element.id}`} className="text-xs font-semibold text-muted-foreground truncate flex items-center gap-2">
                                    {element.key}
                                    {element.type === 'image' && <Badge variant="outline" className="text-[9px] h-3 px-1 py-0">IMG</Badge>}
                                </Label>
                                {element.alt && (
                                    <span className="text-[9px] text-muted-foreground italic truncate max-w-[150px]" title={element.alt}>
                                        Alt: {element.alt}
                                    </span>
                                )}
                            </div>
                            <div className="relative group/input">
                                <Input 
                                    id={`input-${element.id}`}
                                    className="h-8 text-sm" 
                                    value={element.currentValue || ""} 
                                    readOnly // For now, explicit edit button
                                    placeholder="No content"
                                 />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover/input:opacity-100 transition-opacity"
                                    onClick={() => onEditElement(element.id)}
                                >
                                    <IconEdit className="w-3 h-3 text-muted-foreground" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                  ))
                )
            )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
