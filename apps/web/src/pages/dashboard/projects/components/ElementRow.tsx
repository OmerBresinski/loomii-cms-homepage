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
    const [isDirty, setIsDirty] = useState(false);
    const updateElement = useUpdateElement(projectId);
    const { setElementDirty } = useProjectContext();

    // Report dirty state to global context
    useEffect(() => {
        setElementDirty(element.id, isDirty);
        // Clean up on unmount
        return () => setElementDirty(element.id, false);
    }, [element.id, isDirty, setElementDirty]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setValue(newValue);
        setIsDirty(newValue !== (element.currentValue || ""));
    };

    const handleSave = () => {
        updateElement.mutate({
            elementId: element.id,
            content: value
        }, {
            onSuccess: () => {
                setIsDirty(false);
            }
        });
    };

    return (
        <Card className="p-3 shadow-sm hover:shadow-md transition-shadow group/card">
            <div className="flex flex-col gap-1.5">
                {/* Header Row: Key and Alt */}
                <div className="flex items-center justify-between pl-[100px]"> 
                    <Label htmlFor={`input-${element.id}`} className="text-xs font-semibold text-muted-foreground truncate flex items-center gap-2">
                        {element.key}
                        {element.type === 'image' && (
                            <Badge variant="outline" className="text-[9px] h-3 px-1 py-0 border-primary/20 text-primary/80">
                                IMG
                            </Badge>
                        )}
                    </Label>
                    {element.alt && (
                        <span className="text-[9px] text-muted-foreground italic truncate max-w-[150px]" title={element.alt}>
                            Alt: {element.alt}
                        </span>
                    )}
                </div>

                {/* Interaction Row: Toggle, Input, and Save */}
                <div className="flex items-center gap-4">
                    {/* Visibility Toggle */}
                    <div className="flex items-center gap-2 shrink-0 w-[84px] justify-start">
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
                    <div className="flex-1 flex items-center gap-2">
                        <Input 
                            id={`input-${element.id}`}
                            className="h-8 text-sm flex-1 bg-background/50 focus:bg-background transition-colors" 
                            value={value} 
                            onChange={handleChange}
                            placeholder="No content"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && isDirty) {
                                    handleSave();
                                }
                            }}
                        />
                        
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
                </div>
            </div>
        </Card>
    );
}
