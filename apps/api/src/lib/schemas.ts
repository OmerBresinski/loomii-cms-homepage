import { z } from "zod";

// Validation schemas using Zod

export const projectStatusSchema = z.enum([
  "pending",
  "analyzing",
  "ready",
  "error",
  "archived",
]);

export const elementTypeSchema = z.enum([
  "text",
  "heading",
  "paragraph",
  "image",
  "link",
  "button",
  "section",
  "list",
  "navigation",
  "footer",
  "hero",
  "card",
  "custom",
]);

export const editStatusSchema = z.enum([
  "draft",
  "pending_review",
  "approved",
  "rejected",
]);

export const pullRequestStatusSchema = z.enum([
  "open",
  "merged",
  "closed",
  "draft",
  "conflict",
]);

export const teamRoleSchema = z.enum(["owner", "admin", "editor", "viewer"]);

// API Request/Response schemas

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  githubRepo: z
    .string()
    .regex(/^[\w-]+\/[\w.-]+$/, "Invalid GitHub repo format (owner/repo)"),
  githubBranch: z.string().default("main"),
  rootPath: z
    .string()
    .default("")
    .describe("Root path within the repo for monorepos (e.g., apps/web)"),
  deploymentUrl: z
    .union([z.string().url("Invalid deployment URL"), z.literal("")])
    .optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  githubBranch: z.string().optional(),
  rootPath: z.string().optional(),
  deploymentUrl: z.string().url().optional(),
});

export const createEditSchema = z.object({
  elementId: z.string().uuid(),
  newValue: z.string(),
});

export const submitEditSchema = z.object({
  editIds: z.array(z.string().uuid()).min(1),
  prTitle: z.string().min(1).max(200),
  prDescription: z.string().optional(),
});

// Schema for creating PR directly from pending edits (without pre-creating Edit records)
export const publishEditsSchema = z.object({
  edits: z.array(z.object({
    elementId: z.string().uuid(),
    originalValue: z.string(),
    newValue: z.string(),
    originalHref: z.string().optional(),
    newHref: z.string().optional(),
  })).min(1),
});

export const inviteTeamMemberSchema = z.object({
  email: z.string().email(),
  role: teamRoleSchema,
});

export const updateTeamMemberSchema = z.object({
  role: teamRoleSchema,
});

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(1000).default(20),
});

// Analysis request
export const triggerAnalysisSchema = z.object({
  projectId: z.string().uuid(),
  fullRescan: z.boolean().default(false),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateEditInput = z.infer<typeof createEditSchema>;
export type SubmitEditInput = z.infer<typeof submitEditSchema>;
export type PublishEditsInput = z.infer<typeof publishEditsSchema>;
export type InviteTeamMemberInput = z.infer<typeof inviteTeamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type TriggerAnalysisInput = z.infer<typeof triggerAnalysisSchema>;

