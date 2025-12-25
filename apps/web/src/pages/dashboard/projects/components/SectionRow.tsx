import { useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/ui/accordion";
import { Spinner } from "@/ui/spinner";
import { sectionDetailQuery } from "@/lib/queries";
import { ElementRow } from "./ElementRow";
import { Empty, EmptyDescription } from "@/ui/empty";
import { Badge } from "@/ui/badge";
import { useProjectContext } from "../context/ProjectContext";
import { cn } from "@/lib/utils";

interface SectionRowProps {
    section: any;
    projectId: string;
    searchTerm: string;
    selectedPage: string | null;
}

export function SectionRow({ section, projectId, searchTerm, selectedPage }: SectionRowProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const { pendingEdits } = useProjectContext();

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

  // Count local pending edits for this section
  const localEditCount = Array.from(pendingEdits.values()).filter(
    edit => edit.sectionId === section.id
  ).length;

  // Count of elements with pending PRs (from API)
  const pendingPRCount = section.pendingEditCount || 0;

  // Filter elements by search term and selected page
  const displayedElements = elements.filter((el: any) => {
    // Filter by selected page (using pageUrl field)
    if (selectedPage !== null && el.pageUrl !== selectedPage) {
      return false;
    }
    // Filter by search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      const matchesValue = (el.currentValue || "").toLowerCase().includes(lowerSearch);
      const matchesName = (el.name || "").toLowerCase().includes(lowerSearch);
      if (!matchesValue && !matchesName) {
        return false;
      }
    }
    return true;
  });

  return (
    <AccordionItem
      value={section.id}
      className={cn(
        localEditCount > 0 && "border-l-2 border-l-primary",
        pendingPRCount > 0 && localEditCount === 0 && "border-l-2 border-l-amber-500"
      )}
    >
      <AccordionTrigger
        onMouseEnter={onMouseEnter}
        onClick={() => setIsOpen(true)}
      >
        <div className="text-left flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{section.name}</span>
            {localEditCount > 0 && (
              <Badge variant="default" className="text-[10px] bg-primary/20 text-primary">
                {localEditCount} edit{localEditCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {pendingPRCount > 0 && (
              <Badge variant="warning" className="text-[10px]">
                {pendingPRCount} pending
              </Badge>
            )}
          </div>
          <div className="text-muted-foreground text-xs">
            {section.elementCount || elements.length} components
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-2 pt-2">
          {elements.length === 0 && isOpen ? (
            <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-xs">
              <Spinner className="size-3" />
              Loading elements...
            </div>
          ) : displayedElements.length === 0 ? (
            <Empty className="py-4">
              <EmptyDescription>
                {selectedPage
                  ? "No elements on this page matching your filters."
                  : "No elements matching search."}
              </EmptyDescription>
            </Empty>
          ) : (
            displayedElements.map((element: any) => (
              <ElementRow
                key={`${element.id}-${element.currentValue}`}
                element={element}
                sectionId={section.id}
                sectionName={section.name}
              />
            ))
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
