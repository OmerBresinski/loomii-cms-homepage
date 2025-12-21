
import { useState } from "react";
import { Card } from "@/ui/card";
import { Checkbox } from "@/ui/checkbox";
import { Label } from "@/ui/label";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { IconDeviceFloppy, IconLoader2 } from "@tabler/icons-react";
import { useUpdateElement } from "@/lib/mutations";

interface ElementRowProps {
    element: any;
    projectId: string;
}

export function ElementRow({ element, projectId }: ElementRowProps) {
    const [value, setValue] = useState(element.currentValue || "");
    const [isDirty, setIsDirty] = useState(false);
    const updateElement = useUpdateElement(projectId);

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
                <div className="flex items-center justify-between pl-[88px]"> {/* 72px (toggle) + 16px (gap) */}
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
                    <div className="flex items-center gap-2 shrink-0 w-[72px]">
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

                    {/* Input Field */}
                    <div className="relative group/input flex-1 flex items-center gap-2">
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
                        
                        {/* Save Button */}
                        <Button
                            size="sm"
                            variant={isDirty ? "default" : "ghost"}
                            className={`h-8 px-3 shrink-0 transition-all gap-2 ${isDirty ? "opacity-100" : "opacity-50 hover:opacity-100"}`}
                            onClick={handleSave}
                            disabled={!isDirty || updateElement.isPending}
                            title={isDirty ? "Save changes" : "No changes to save"}
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
