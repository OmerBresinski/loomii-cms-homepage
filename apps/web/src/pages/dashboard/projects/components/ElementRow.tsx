import { useState, useEffect } from "react";
import { Card } from "@/ui/card";
import { Checkbox } from "@/ui/checkbox";
import { Label } from "@/ui/label";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { IconDeviceFloppy, IconLoader2 } from "@tabler/icons-react";
import { useUpdateElement } from "@/lib/mutations";
import { useProjectContext } from "../context/ProjectContext";

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
        <Card className="p-3 shadow-sm hover:shadow-md transition-shadow group/card">
            <div className="flex flex-col gap-1.5">
                {/* Header Row: Element Title */}
                <div className="flex items-center justify-between pl-[100px]"> 
                    <Label htmlFor={`input-${element.id}`} className="text-xs font-semibold text-foreground truncate flex items-center gap-2">
                        {element.name || "Untitled Element"}
                        {element.type && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 py-0 border-muted-foreground/30 text-muted-foreground font-normal">
                                {element.type}
                            </Badge>
                        )}
                    </Label>
                </div>

                {/* Interaction Row: Toggle, Input, and Save */}
                <div className="flex items-start gap-4">
                    {/* Visibility Toggle */}
                    <div className="flex items-center gap-2 shrink-0 w-[84px] justify-start mt-2">
                        <Checkbox 
                            id={`vis-${element.id}`}
                            checked={element.isVisible ?? true}
                            onCheckedChange={(checked) => updateElement.mutate({ elementId: element.id, isVisible: !!checked })}
                            className="w-4 h-4"
                        />
                        <Label 
                            htmlFor={`vis-${element.id}`} 
                            className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 cursor-pointer group-hover/card:text-primary transition-colors leading-none"
                        >
                            Visible
                        </Label>
                    </div>

                    {/* Input Field and Save Button */}
                    <div className="flex-1 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <div className="flex-1 relative group">
                                <Label className="absolute -top-1.5 left-2 px-1 bg-background text-[9px] text-muted-foreground opacity-0 group-focus-within:opacity-100 transition-opacity">Content</Label>
                                <Input 
                                    id={`input-${element.id}`}
                                    className="h-8 text-sm flex-1 bg-background/50 focus:bg-background transition-colors" 
                                    value={value} 
                                    onChange={handleChange}
                                    placeholder="No content"
                                />
                            </div>
                            
                            <Button
                                size="sm"
                                variant={isDirty ? "default" : "ghost"}
                                className={`h-8 px-3 shrink-0 transition-all gap-2 ${isDirty ? "opacity-100" : "opacity-40 hover:opacity-100"}`}
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
                        </div>

                        {element.type === 'link' && (
                            <div className="flex items-center gap-2 ml-0">
                                <div className="flex-1 relative group">
                                    <Label className="absolute -top-1.5 left-2 px-1 bg-background text-[9px] text-muted-foreground uppercase font-black tracking-widest">Links To</Label>
                                    <Input 
                                        className="h-8 text-xs flex-1 border-primary/20 bg-primary/5 focus:bg-background transition-colors font-mono" 
                                        value={hrefValue} 
                                        onChange={handleHrefChange}
                                        placeholder="Target URL (e.g. /features, https://...)"
                                    />
                                </div>
                                <div className="w-[74px] shrink-0" /> {/* Spacer to align with Save button */}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
