
import React, { createContext, useContext, useState, useCallback } from "react";

// Edit information for the review page
export interface PendingEdit {
    elementId: string;
    elementName: string;
    sectionId: string;
    sectionName: string;
    originalValue: string;
    newValue: string;
    originalHref?: string;  // For link elements
    newHref?: string;       // For link elements
    sourceFile: string;
    sourceLine: number;
    sourceContext: string;  // 3 lines before/after for diff view
    pageUrl: string;
}

interface ProjectContextType {
    isDirty: boolean;
    editCount: number;
    pendingEdits: Map<string, PendingEdit>;
    saveEdit: (edit: PendingEdit) => void;
    removeEdit: (elementId: string) => void;
    hasEdit: (elementId: string) => boolean;
    getEdit: (elementId: string) => PendingEdit | undefined;
    clearAllEdits: () => void;
    getEditsByFile: () => Map<string, PendingEdit[]>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
    const [pendingEdits, setPendingEdits] = useState<Map<string, PendingEdit>>(new Map());

    const saveEdit = useCallback((edit: PendingEdit) => {
        setPendingEdits(prev => {
            const next = new Map(prev);
            // Check if value or href actually changed (normalize empty/undefined)
            const valueChanged = (edit.originalValue || "") !== (edit.newValue || "");
            const hrefChanged = (edit.originalHref || "") !== (edit.newHref || "");

            if (valueChanged || hrefChanged) {
                next.set(edit.elementId, edit);
            } else {
                // If reverted to original, remove the edit
                next.delete(edit.elementId);
            }
            return next;
        });
    }, []);

    const removeEdit = useCallback((elementId: string) => {
        setPendingEdits(prev => {
            const next = new Map(prev);
            next.delete(elementId);
            return next;
        });
    }, []);

    const hasEdit = useCallback((elementId: string) => {
        return pendingEdits.has(elementId);
    }, [pendingEdits]);

    const getEdit = useCallback((elementId: string) => {
        return pendingEdits.get(elementId);
    }, [pendingEdits]);

    const clearAllEdits = useCallback(() => {
        setPendingEdits(new Map());
    }, []);

    // Group edits by source file for the review page
    const getEditsByFile = useCallback(() => {
        const byFile = new Map<string, PendingEdit[]>();
        for (const edit of pendingEdits.values()) {
            const existing = byFile.get(edit.sourceFile) || [];
            existing.push(edit);
            byFile.set(edit.sourceFile, existing);
        }
        // Sort edits within each file by line number
        for (const [file, edits] of byFile) {
            byFile.set(file, edits.sort((a, b) => a.sourceLine - b.sourceLine));
        }
        return byFile;
    }, [pendingEdits]);

    const isDirty = pendingEdits.size > 0;
    const editCount = pendingEdits.size;

    return (
        <ProjectContext.Provider value={{
            isDirty,
            editCount,
            pendingEdits,
            saveEdit,
            removeEdit,
            hasEdit,
            getEdit,
            clearAllEdits,
            getEditsByFile,
        }}>
            {children}
        </ProjectContext.Provider>
    );
}

export function useProjectContext() {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error("useProjectContext must be used within a ProjectProvider");
    }
    return context;
}
