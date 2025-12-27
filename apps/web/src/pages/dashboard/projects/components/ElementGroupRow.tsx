import { useState } from "react";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { IconStack, IconPlus, IconTrash } from "@tabler/icons-react";
import { ElementRow } from "./ElementRow";
import { AddItemDialog } from "./AddItemDialog";
import { cn } from "@/lib/utils";
import type { ElementWithPendingEdit } from "@/api/common";

interface ElementGroup {
  id: string;
  name: string;
  description?: string | null;
  itemCount: number;
  templateCode?: string;
  placeholders?: Array<{
    name: string;
    description: string;
    type: string;
  }>;
}

interface ElementGroupRowProps {
  group: ElementGroup;
  elements: ElementWithPendingEdit[];
  sectionId: string;
  sectionName: string;
  onAddItem?: (groupId: string, values: Record<string, string>) => void;
  onDeleteItem?: (groupId: string, elementId: string) => void;
}

export function ElementGroupRow({
  group,
  elements,
  sectionId,
  sectionName,
  onAddItem,
  onDeleteItem,
}: ElementGroupRowProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const hasTemplate = !!group.templateCode;

  // Get element type from first element in group (for determining Add dialog fields)
  const elementType = elements[0]?.type;

  const handleAddItem = (values: Record<string, string>) => {
    onAddItem?.(group.id, values);
    setShowAddDialog(false);
  };

  return (
    <div className="border-l-2 border-dashed border-primary/30 ml-4 pl-4 space-y-2">
      {/* Group Header */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <IconStack className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">{group.name}</span>
          <Badge variant="outline" className="text-[10px]">
            {elements.length} item{elements.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {hasTemplate && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowAddDialog(true)}
          >
            <IconPlus className="w-3 h-3 mr-1" />
            Add Item
          </Button>
        )}
      </div>

      {/* Group Description */}
      {group.description && (
        <p className="text-xs text-muted-foreground -mt-1 mb-2">
          {group.description}
        </p>
      )}

      {/* Elements in Group */}
      <div className="space-y-2">
        {elements.map((element) => (
          <div key={element.id} className="relative group/item">
            <ElementRow
              element={element}
              sectionId={sectionId}
              sectionName={sectionName}
            />
            {/* Delete button overlay */}
            {onDeleteItem && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "absolute -right-1 -top-1 h-6 w-6 p-0",
                  "opacity-0 group-hover/item:opacity-100 transition-opacity",
                  "bg-destructive/10 hover:bg-destructive/20 text-destructive"
                )}
                onClick={() => onDeleteItem(group.id, element.id)}
              >
                <IconTrash className="w-3 h-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Add Item Dialog */}
      {hasTemplate && (
        <AddItemDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          groupName={group.name}
          placeholders={group.placeholders || []}
          elementType={elementType}
          onAdd={handleAddItem}
        />
      )}
    </div>
  );
}
