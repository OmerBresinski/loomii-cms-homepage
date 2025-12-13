import { describe, it, expect } from "bun:test";
import {
  generateBranchName,
  generatePRTitle,
  generatePRDescription,
} from "../../services/pr-generator";
import type { Element, Edit } from "@prisma/client";

describe("PR Generator", () => {
  describe("generateBranchName", () => {
    it("generates valid branch name", () => {
      const projectName = "My Website";
      const branchName = generateBranchName(projectName);

      expect(branchName).toMatch(/^cms-update-my-website-\d+$/);
    });

    it("sanitizes special characters", () => {
      const projectName = "My Website! @#$% 123";
      const branchName = generateBranchName(projectName);

      expect(branchName).not.toMatch(/[!@#$%]/);
      expect(branchName).toMatch(/^cms-update-/);
    });

    it("truncates long names", () => {
      const projectName = "A".repeat(100);
      const branchName = generateBranchName(projectName);

      // Should be: cms-update- (11) + truncated name (20) + - (1) + timestamp (13) = ~45 chars
      expect(branchName.length).toBeLessThan(50);
    });
  });

  describe("generatePRTitle", () => {
    it("generates title for single edit", () => {
      const edits = [
        {
          element: { name: "Hero Title", type: "heading" } as Element,
        },
      ];

      const title = generatePRTitle(edits);

      expect(title).toBe("[Content] Update Hero Title");
    });

    it("generates title for multiple edits of same type", () => {
      const edits = [
        { element: { name: "Title 1", type: "heading" } as Element },
        { element: { name: "Title 2", type: "heading" } as Element },
      ];

      const title = generatePRTitle(edits);

      expect(title).toBe("[Content] Update 2 headings");
    });

    it("generates generic title for mixed types", () => {
      const edits = [
        { element: { name: "Title", type: "heading" } as Element },
        { element: { name: "Button", type: "button" } as Element },
      ];

      const title = generatePRTitle(edits);

      expect(title).toBe("[Content] Update 2 elements");
    });
  });

  describe("generatePRDescription", () => {
    it("generates description with change summary", () => {
      const edits = [
        {
          edit: {
            oldValue: "Old Title",
            newValue: "New Title",
          } as Edit,
          element: {
            name: "Hero Title",
            type: "heading",
            currentValue: "Old Title",
          } as Element,
        },
      ];

      const description = generatePRDescription(edits);

      expect(description).toContain("Hero Title");
      expect(description).toContain("heading");
      expect(description).toContain("Old Title");
      expect(description).toContain("New Title");
    });

    it("truncates long values", () => {
      const longValue = "A".repeat(200);
      const edits = [
        {
          edit: {
            oldValue: longValue,
            newValue: "Short",
          } as Edit,
          element: {
            name: "Long Content",
            type: "paragraph",
            currentValue: longValue,
          } as Element,
        },
      ];

      const description = generatePRDescription(edits);

      expect(description).toContain("...");
      expect(description.length).toBeLessThan(500);
    });
  });
});
