
import React, { createContext, useContext, useState, useCallback } from "react";

interface ProjectContextType {
    isDirty: boolean;
    setElementDirty: (elementId: string, dirty: boolean) => void;
    clearDirtyStates: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
    const [dirtyElements, setDirtyElements] = useState<Set<string>>(new Set());

    const setElementDirty = useCallback((elementId: string, dirty: boolean) => {
        setDirtyElements(prev => {
            const next = new Set(prev);
            if (dirty) {
                next.add(elementId);
            } else {
                next.delete(elementId);
            }
            return next;
        });
    }, []);

    const clearDirtyStates = useCallback(() => {
        setDirtyElements(new Set());
    }, []);

    const isDirty = dirtyElements.size > 0;

    return (
        <ProjectContext.Provider value={{ isDirty, setElementDirty, clearDirtyStates }}>
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
