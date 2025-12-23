import { Outlet } from "@tanstack/react-router";
import { ProjectProvider } from "./context/ProjectContext";

export function ProjectLayout() {
  return (
    <ProjectProvider>
      <Outlet />
    </ProjectProvider>
  );
}
