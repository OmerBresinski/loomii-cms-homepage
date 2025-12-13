import { describe, it, expect } from "bun:test";
import {
  generateContentDiff,
  validateReplacement,
} from "../../services/element-mapper";

describe("Element Mapper", () => {
  describe("generateContentDiff", () => {
    it("generates diff for single line change", () => {
      const oldContent = "Hello World";
      const newContent = "Hello Universe";

      const diff = generateContentDiff(oldContent, newContent);

      expect(diff).toContain("- Hello World");
      expect(diff).toContain("+ Hello Universe");
    });

    it("generates diff for multi-line content", () => {
      const oldContent = "Line 1\nLine 2\nLine 3";
      const newContent = "Line 1\nModified Line\nLine 3";

      const diff = generateContentDiff(oldContent, newContent);

      expect(diff).toContain("  Line 1");
      expect(diff).toContain("- Line 2");
      expect(diff).toContain("+ Modified Line");
      expect(diff).toContain("  Line 3");
    });

    it("handles empty strings", () => {
      const diff = generateContentDiff("", "New content");

      expect(diff).toContain("+ New content");
    });
  });

  describe("validateReplacement", () => {
    it("validates single occurrence replacement", () => {
      const fileContent = 'const title = "Hello World";';
      const oldValue = "Hello World";
      const newValue = "Hello Universe";

      const result = validateReplacement(fileContent, oldValue, newValue);

      expect(result.valid).toBe(true);
      expect(result.occurrences).toBe(1);
    });

    it("rejects content not found", () => {
      const fileContent = 'const title = "Hello World";';
      const oldValue = "Goodbye World";
      const newValue = "Hello Universe";

      const result = validateReplacement(fileContent, oldValue, newValue);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Content not found in file");
    });

    it("rejects ambiguous multiple occurrences", () => {
      const fileContent = 'const a = "Hello";\nconst b = "Hello";';
      const oldValue = "Hello";
      const newValue = "Hi";

      const result = validateReplacement(fileContent, oldValue, newValue);

      expect(result.valid).toBe(false);
      expect(result.occurrences).toBe(2);
      expect(result.error).toContain("Ambiguous");
    });

    it("detects unbalanced quotes after replacement", () => {
      const fileContent = 'const title = "Hello World";';
      const oldValue = '"Hello World"';
      const newValue = '"Hello Universe'; // Missing closing quote

      const result = validateReplacement(fileContent, oldValue, newValue);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("unbalanced quotes");
    });
  });
});
