import { useState, useMemo } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/ui/accordion";
import { Spinner } from "@/ui/spinner";
import { sectionDetailQuery } from "@/lib/queries";
import { ElementRow } from "./ElementRow";
import { ElementGroupRow } from "./ElementGroupRow";
import { Empty, EmptyDescription } from "@/ui/empty";
import { Badge } from "@/ui/badge";
import { useProjectContext } from "../context/ProjectContext";
import { useAddGroupItem, useDeleteGroupItem } from "@/api/useGroups";
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

  const addItemMutation = useAddGroupItem();
  const deleteItemMutation = useDeleteGroupItem();

  const handleAddItem = (groupId: string, values: Record<string, string>) => {
    addItemMutation.mutate({ projectId, groupId, values });
  };

  const handleDeleteItem = (groupId: string, elementId: string) => {
    deleteItemMutation.mutate({ projectId, groupId, elementId });
  };

  // Prefetch on hover
  const onMouseEnter = () => {
    queryClient.prefetchQuery(sectionDetailQuery(projectId, section.id));
  };

  // Fetch only when open
  const { data: sectionDetail } = useQuery({
    ...sectionDetailQuery(projectId, section.id),
    enabled: isOpen,
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

  // Group elements by groupId
  const { groupedElements, ungroupedElements, groups } = useMemo(() => {
    const grouped = new Map<string, any[]>();
    const ungrouped: any[] = [];
    const groupInfo = new Map<string, any>();

    for (const el of displayedElements) {
      if (el.groupId) {
        const existing = grouped.get(el.groupId) || [];
        existing.push(el);
        grouped.set(el.groupId, existing);
        // Store group info from first element (they should all have same group)
        if (!groupInfo.has(el.groupId) && el.group) {
          groupInfo.set(el.groupId, el.group);
        }
      } else {
        ungrouped.push(el);
      }
    }

    // Sort grouped elements by groupIndex
    for (const [, elems] of grouped) {
      elems.sort((a: any, b: any) => (a.groupIndex || 0) - (b.groupIndex || 0));
    }

    return {
      groupedElements: grouped,
      ungroupedElements: ungrouped,
      groups: groupInfo,
    };
  }, [displayedElements]);

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
            {(section.groupCount ?? groupedElements.size) > 0 &&
              `, ${section.groupCount ?? groupedElements.size} list${(section.groupCount ?? groupedElements.size) !== 1 ? 's' : ''}`}
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
            <>
              {/* Render ungrouped elements */}
              {ungroupedElements.map((element: any) => (
                <ElementRow
                  key={`${element.id}-${element.currentValue}`}
                  element={element}
                  sectionId={section.id}
                  sectionName={section.name}
                />
              ))}

              {/* Render grouped elements */}
              {Array.from(groupedElements.entries()).map(([groupId, groupElems]) => {
                const groupInfo = groups.get(groupId) || {
                  id: groupId,
                  name: "Group",
                  itemCount: groupElems.length,
                };
                return (
                  <ElementGroupRow
                    key={groupId}
                    group={groupInfo}
                    elements={groupElems}
                    sectionId={section.id}
                    sectionName={section.name}
                    onAddItem={handleAddItem}
                    onDeleteItem={handleDeleteItem}
                  />
                );
              })}
            </>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
