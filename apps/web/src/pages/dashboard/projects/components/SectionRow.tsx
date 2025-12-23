import { useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/ui/accordion";
import { IconLoader2 } from "@tabler/icons-react";
import { sectionDetailQuery } from "@/lib/queries";
import { ElementRow } from "./ElementRow";
import { Empty, EmptyDescription } from "@/ui/empty";

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
    <AccordionItem value={section.id}>
      <AccordionTrigger
        onMouseEnter={onMouseEnter}
        onClick={() => setIsOpen(true)}
      >
        <div className="text-left">
          <div className="font-medium">{section.name}</div>
          <div className="text-muted-foreground text-xs">
            {section.elementCount || elements.length} components
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-2 pt-2">
          {elements.length === 0 && isOpen ? (
            <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-xs">
              <IconLoader2 className="w-3 h-3 animate-spin" />
              Loading elements...
            </div>
          ) : displayedElements.length === 0 ? (
            <Empty className="py-4">
              <EmptyDescription>No elements matching search.</EmptyDescription>
            </Empty>
          ) : (
            displayedElements.map((element: any) => (
              <ElementRow
                key={`${element.id}-${element.currentValue}`}
                element={element}
                projectId={projectId}
              />
            ))
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
