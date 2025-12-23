import { useState, useEffect } from "react";
import { Item, ItemContent, ItemTitle, ItemActions } from "@/ui/item";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";
import { Label } from "@/ui/label";
import { IconDeviceFloppy, IconLoader2 } from "@tabler/icons-react";
import { useUpdateElement } from "@/lib/mutations";
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
}

export function ElementRow({ element, projectId }: ElementRowProps) {
    const [value, setValue] = useState(element.currentValue || "");
    const [hrefValue, setHrefValue] = useState(element.schema?.href || "");
    const [isDirty, setIsDirty] = useState(false);
    const updateElement = useUpdateElement(projectId);
    const { setElementDirty } = useProjectContext();

    // Sync state when element prop changes (e.g. after refetch)
    useEffect(() => {
        setValue(element.currentValue || "");
        setHrefValue(element.schema?.href || "");
        setIsDirty(false);
    }, [element.id, element.currentValue, element.schema]);

    // Report dirty state to global context
    useEffect(() => {
        setIsDirty(value !== (element.currentValue || "") || hrefValue !== (element.schema?.href || ""));
    }, [value, hrefValue, element.currentValue, element.schema]);

    useEffect(() => {
        setElementDirty(element.id, isDirty);
        // Clean up on unmount
        return () => setElementDirty(element.id, false);
    }, [element.id, isDirty, setElementDirty]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
    };

    const handleHrefChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setHrefValue(e.target.value);
    };

    const handleSave = () => {
        updateElement.mutate({
            elementId: element.id,
            content: value,
            schema: element.type === 'link' ? { ...element.schema, href: hrefValue } : element.schema
        }, {
            onSuccess: () => {
                setIsDirty(false);
            }
        });
    };

    return (
        <Item variant="outline" className="flex-col items-stretch">
            <div className="flex items-center gap-3 w-full">
                <ItemContent className="flex-1">
                    <ItemTitle>
                        {element.name || "Untitled Element"}
                        {element.type && (
                            <span className={cn(
                                "text-[10px] uppercase tracking-wide",
                                elementTypeColors[element.type] || "text-gray-500"
                            )}>
                                {element.type}
                            </span>
                        )}
                    </ItemTitle>
                </ItemContent>

                <ItemActions>
                    <Button
                        size="sm"
                        variant={isDirty ? "default" : "ghost"}
                        onClick={handleSave}
                        disabled={!isDirty || updateElement.isPending}
                    >
                        {updateElement.isPending ? (
                            <IconLoader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <IconDeviceFloppy className="w-3.5 h-3.5" />
                        )}
                        Save
                    </Button>
                </ItemActions>
            </div>

            {/* Content Input */}
            <div className="flex flex-col gap-2 w-full pt-2">
                <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground w-16 shrink-0">Content</Label>
                    <Input
                        id={`input-${element.id}`}
                        value={value}
                        onChange={handleChange}
                        placeholder="No content"
                    />
                </div>

                {element.type === 'link' && (
                    <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground w-16 shrink-0">Links to</Label>
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
