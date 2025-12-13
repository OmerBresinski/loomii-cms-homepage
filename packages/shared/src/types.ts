// Core domain types

export type ProjectStatus =
  | "pending"
  | "analyzing"
  | "ready"
  | "error"
  | "archived";

export type ElementType =
  | "text"
  | "heading"
  | "paragraph"
  | "image"
  | "link"
  | "button"
  | "section"
  | "list"
  | "navigation"
  | "footer"
  | "hero"
  | "card"
  | "custom";

export type EditStatus = "draft" | "pending_review" | "approved" | "rejected";

export type PullRequestStatus =
  | "open"
  | "merged"
  | "closed"
  | "draft"
  | "conflict";

export type TeamRole = "owner" | "admin" | "editor" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  githubId: string;
  githubAccessToken: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  githubRepo: string;
  githubBranch: string;
  deploymentUrl: string;
  status: ProjectStatus;
  lastAnalyzedAt: Date | null;
  analysisError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Element {
  id: string;
  projectId: string;
  name: string;
  type: ElementType;
  selector: string;
  xpath: string | null;
  sourceFile: string | null;
  sourceLine: number | null;
  sourceColumn: number | null;
  currentValue: string | null;
  schema: Record<string, unknown> | null;
  parentId: string | null;
  pageUrl: string;
  screenshotUrl: string | null;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Edit {
  id: string;
  elementId: string;
  userId: string;
  oldValue: string | null;
  newValue: string;
  status: EditStatus;
  pullRequestId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PullRequest {
  id: string;
  projectId: string;
  userId: string;
  githubPrNumber: number;
  githubPrUrl: string;
  title: string;
  description: string | null;
  status: PullRequestStatus;
  mergedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: string;
  projectId: string;
  userId: string;
  role: TeamRole;
  invitedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalysisPage {
  url: string;
  title: string;
  screenshotUrl: string | null;
  elements: Element[];
  analyzedAt: Date;
}

export interface AnalysisResult {
  projectId: string;
  pages: AnalysisPage[];
  totalElements: number;
  duration: number;
  completedAt: Date;
}

