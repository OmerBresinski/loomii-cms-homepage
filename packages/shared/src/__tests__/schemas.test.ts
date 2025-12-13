import { describe, it, expect } from "vitest";
import {
  createProjectSchema,
  updateProjectSchema,
  createEditSchema,
  submitEditSchema,
  inviteTeamMemberSchema,
  paginationSchema,
} from "../schemas";

describe("createProjectSchema", () => {
  it("validates valid project input", () => {
    const input = {
      name: "My Website",
      githubRepo: "owner/repo",
      githubBranch: "main",
      deploymentUrl: "https://example.com",
    };

    const result = createProjectSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects invalid GitHub repo format", () => {
    const input = {
      name: "My Website",
      githubRepo: "invalid-repo-format",
      deploymentUrl: "https://example.com",
    };

    const result = createProjectSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid deployment URL", () => {
    const input = {
      name: "My Website",
      githubRepo: "owner/repo",
      deploymentUrl: "not-a-url",
    };

    const result = createProjectSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("uses default branch when not provided", () => {
    const input = {
      name: "My Website",
      githubRepo: "owner/repo",
      deploymentUrl: "https://example.com",
    };

    const result = createProjectSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.githubBranch).toBe("main");
    }
  });
});

describe("updateProjectSchema", () => {
  it("allows partial updates", () => {
    const result = updateProjectSchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("allows empty object", () => {
    const result = updateProjectSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("createEditSchema", () => {
  it("validates valid edit input", () => {
    const input = {
      elementId: "550e8400-e29b-41d4-a716-446655440000",
      newValue: "Updated content",
    };

    const result = createEditSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID", () => {
    const input = {
      elementId: "not-a-uuid",
      newValue: "Updated content",
    };

    const result = createEditSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe("submitEditSchema", () => {
  it("validates valid submit input", () => {
    const input = {
      editIds: ["550e8400-e29b-41d4-a716-446655440000"],
      prTitle: "Update content",
    };

    const result = submitEditSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects empty edit array", () => {
    const input = {
      editIds: [],
      prTitle: "Update content",
    };

    const result = submitEditSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe("inviteTeamMemberSchema", () => {
  it("validates valid invite input", () => {
    const input = {
      email: "user@example.com",
      role: "editor",
    };

    const result = inviteTeamMemberSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const input = {
      email: "not-an-email",
      role: "editor",
    };

    const result = inviteTeamMemberSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const input = {
      email: "user@example.com",
      role: "superadmin",
    };

    const result = inviteTeamMemberSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe("paginationSchema", () => {
  it("uses defaults when not provided", () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it("coerces string numbers", () => {
    const result = paginationSchema.safeParse({ page: "5", limit: "50" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(5);
      expect(result.data.limit).toBe(50);
    }
  });

  it("rejects limit over 100", () => {
    const result = paginationSchema.safeParse({ limit: 200 });
    expect(result.success).toBe(false);
  });
});

