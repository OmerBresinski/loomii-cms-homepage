import { useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/ui/accordion";
import { Badge } from "@/ui/badge";
import { IconLoader2 } from "@tabler/icons-react";
import { sectionDetailQuery } from "@/lib/queries";
import { ElementRow } from "./ElementRow";

interface SectionRowProps {
    section: any;
    projectId: string;
    searchTerm: string;
}

export function SectionRow({ section, projectId, searchTerm }: SectionRowProps) {
  const queryClient = useQueryClient();
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
                    <ElementRow 
                        key={`${element.id}-${element.currentValue}`} // Force reset on value change
                        element={element}
                        projectId={projectId}
                    />
                  ))
                )
            )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
