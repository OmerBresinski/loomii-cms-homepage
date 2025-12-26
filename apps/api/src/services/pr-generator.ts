import {
  getFileContent,
  decodeFileContent,
  createBranch,
  updateFile,
  createPullRequest,
} from "./github";
import { applyEditWithAI } from "./ai-code-editor";
import { logger } from "../ai/logger";
import type { Element, Edit } from "@prisma/client";

interface CodeChange {
  filePath: string;
  oldContent: string;
  newContent: string;
  description: string;
}

interface PRGeneratorOptions {
  accessToken: string;
  owner: string;
  repo: string;
  baseBranch: string;
}

// Replace text only on a specific line number for precise edits
function replaceOnLine(
  content: string,
  lineNumber: number,
  oldValue: string,
  newValue: string
): { success: boolean; content: string; error?: string } {
  const lines = content.split('\n');

  // Validate line number
  if (lineNumber < 1 || lineNumber > lines.length) {
    return { success: false, content, error: `Line ${lineNumber} out of range (file has ${lines.length} lines)` };
  }

  const lineIndex = lineNumber - 1; // Convert to 0-based
  const line = lines[lineIndex]!;

  // Check if the old value exists on this specific line
  if (!line.includes(oldValue)) {
    return { success: false, content, error: `"${oldValue.slice(0, 30)}..." not found on line ${lineNumber}` };
  }

  // Replace on this line only (first occurrence on the line)
  lines[lineIndex] = line.replace(oldValue, newValue);

  return { success: true, content: lines.join('\n') };
}

// Generate a unique branch name for the PR
export function generateBranchName(projectName: string): string {
  const timestamp = Date.now();
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 20);
  return `cms-update-${slug}-${timestamp}`;
}

// Generate a code change for a single edit using AI
export async function generateCodeChange(
  element: Element,
  edit: Edit,
  options: PRGeneratorOptions
): Promise<CodeChange | null> {
  const { accessToken, owner, repo, baseBranch } = options;

  // If we don't have source file info, we can't generate a change
  if (!element.sourceFile) {
    logger.pr.aiEdit("failed", `No source file for element ${element.id}`);
    return null;
  }

  logger.pr.editStart(element.name, element.sourceFile);

  try {
    // Get the current file content
    const fileData = await getFileContent(
      accessToken,
      owner,
      repo,
      element.sourceFile,
      baseBranch
    );

    const content = decodeFileContent(fileData.content);

    const oldValue = edit.oldValue || element.currentValue;
    if (!oldValue) {
      logger.pr.aiEdit("failed", "No old value to replace");
      return null;
    }

    logger.pr.editChange(oldValue, edit.newValue);

    if (edit.oldHref && edit.newHref && edit.oldHref !== edit.newHref) {
      logger.pr.editChange(edit.oldHref, edit.newHref);
    }

    logger.pr.aiEdit("start");

    // Use AI to apply the edit - more robust than simple string replacement
    const aiResult = await applyEditWithAI(content, element.sourceFile, {
      elementName: element.name,
      elementType: element.type,
      oldValue,
      newValue: edit.newValue,
      oldHref: edit.oldHref || undefined,
      newHref: edit.newHref || undefined,
      sourceLine: element.sourceLine || undefined,
    });

    if (!aiResult.success) {
      logger.pr.aiEdit("fallback", aiResult.error);
      // Fallback to simple string replacement for both text and href
      let fallbackContent = content;
      const textChanged = oldValue !== edit.newValue;
      const hrefChanged = edit.oldHref && edit.newHref && edit.oldHref !== edit.newHref;

      // Apply text change
      if (textChanged) {
        if (element.sourceLine) {
          // Use line-based replacement for precision when we have line info
          const result = replaceOnLine(fallbackContent, element.sourceLine, oldValue, edit.newValue);
          if (!result.success) {
            logger.pr.aiEdit("failed", result.error);
            return null;
          }
          fallbackContent = result.content;
        } else {
          // Fallback to simple replace only if no line info available
          if (!content.includes(oldValue)) {
            logger.pr.aiEdit("failed", `Content not found in ${element.sourceFile}`);
            return null;
          }
          fallbackContent = fallbackContent.replace(oldValue, edit.newValue);
        }
      }

      // Apply href change
      if (hrefChanged) {
        if (fallbackContent.includes(edit.oldHref!)) {
          fallbackContent = fallbackContent.replace(edit.oldHref!, edit.newHref!);
          logger.pr.editChange(edit.oldHref!, edit.newHref!);
        } else {
          logger.pr.aiEdit("fallback", `Href "${edit.oldHref}" not found in file`);
        }
      }

      let description = `Update ${element.name}`;
      if (textChanged) {
        description += `: "${oldValue.slice(0, 50)}${oldValue.length > 50 ? "..." : ""}" → "${edit.newValue.slice(0, 50)}${edit.newValue.length > 50 ? "..." : ""}"`;
      }
      if (hrefChanged) {
        description += `${textChanged ? ", " : ": "}href: "${edit.oldHref}" → "${edit.newHref}"`;
      }

      return {
        filePath: element.sourceFile,
        oldContent: content,
        newContent: fallbackContent,
        description,
      };
    }

    logger.pr.aiEdit("success", aiResult.changedLine?.toString());

    return {
      filePath: element.sourceFile,
      oldContent: content,
      newContent: aiResult.newContent,
      description: `Update ${element.name}: "${oldValue.slice(0, 50)}..." → "${edit.newValue.slice(0, 50)}..."`,
    };
  } catch (error) {
    logger.pr.aiEdit("failed", error instanceof Error ? error.message : "Unknown error");
    return null;
  }
}

// Generate all code changes for a batch of edits
export async function generateAllChanges(
  edits: Array<{ edit: Edit; element: Element }>,
  options: PRGeneratorOptions
): Promise<CodeChange[]> {
  const { accessToken, owner, repo, baseBranch } = options;

  // Group edits by file first
  const editsByFile = new Map<string, Array<{ edit: Edit; element: Element }>>();
  for (const item of edits) {
    const file = item.element.sourceFile;
    if (!file) continue;
    const existing = editsByFile.get(file) || [];
    existing.push(item);
    editsByFile.set(file, existing);
  }

  const changes: CodeChange[] = [];

  // Process each file once, applying all its edits sequentially
  for (const [filePath, fileEdits] of editsByFile) {
    logger.pr.editStart(`${fileEdits.length} elements`, filePath);

    try {
      // Fetch file content once
      const fileData = await getFileContent(
        accessToken,
        owner,
        repo,
        filePath,
        baseBranch
      );

      const originalContent = decodeFileContent(fileData.content);
      let currentContent = originalContent;
      const descriptions: string[] = [];

      // Apply each edit sequentially
      for (const { edit, element } of fileEdits) {
        const oldValue = edit.oldValue || element.currentValue;
        if (!oldValue) {
          logger.pr.aiEdit("failed", `No old value for ${element.name}`);
          continue;
        }

        logger.pr.editChange(oldValue, edit.newValue);

        const hrefChanged = edit.oldHref && edit.newHref && edit.oldHref !== edit.newHref;

        if (hrefChanged) {
          logger.pr.editChange(edit.oldHref!, edit.newHref!);
        }

        logger.pr.aiEdit("start");

        // Use AI to apply the edit
        const aiResult = await applyEditWithAI(currentContent, filePath, {
          elementName: element.name,
          elementType: element.type,
          oldValue,
          newValue: edit.newValue,
          oldHref: edit.oldHref || undefined,
          newHref: edit.newHref || undefined,
          sourceLine: element.sourceLine || undefined,
        });

        if (aiResult.success) {
          logger.pr.aiEdit("success", aiResult.changedLine?.toString());
          currentContent = aiResult.newContent;
        } else {
          logger.pr.aiEdit("fallback", aiResult.error);
          // Fallback to string replacement
          const textChanged = oldValue !== edit.newValue;

          if (textChanged) {
            if (element.sourceLine) {
              // Use line-based replacement for precision
              const result = replaceOnLine(currentContent, element.sourceLine, oldValue, edit.newValue);
              if (result.success) {
                currentContent = result.content;
              } else {
                logger.pr.aiEdit("failed", result.error);
                continue;
              }
            } else if (currentContent.includes(oldValue)) {
              // Fallback to simple replace only if no line info
              currentContent = currentContent.replace(oldValue, edit.newValue);
            } else {
              logger.pr.aiEdit("failed", `Content "${oldValue.slice(0, 30)}..." not found`);
              continue;
            }
          }

          if (hrefChanged && currentContent.includes(edit.oldHref!)) {
            currentContent = currentContent.replace(edit.oldHref!, edit.newHref!);
          }
        }

        // Build description
        let desc = `Update ${element.name}`;
        const textChanged = oldValue !== edit.newValue;
        if (textChanged) {
          desc += `: "${oldValue.slice(0, 50)}${oldValue.length > 50 ? "..." : ""}" → "${edit.newValue.slice(0, 50)}${edit.newValue.length > 50 ? "..." : ""}"`;
        }
        if (hrefChanged) {
          desc += `${textChanged ? ", " : ": "}href: "${edit.oldHref}" → "${edit.newHref}"`;
        }
        descriptions.push(desc);
      }

      // Only add if we made changes
      if (currentContent !== originalContent) {
        changes.push({
          filePath,
          oldContent: originalContent,
          newContent: currentContent,
          description: descriptions.join("\n"),
        });
      }
    } catch (error) {
      logger.pr.aiEdit("failed", error instanceof Error ? error.message : "Unknown error");
    }
  }

  return changes;
}

// Create a PR with all the changes
export async function createContentPR(
  projectName: string,
  changes: CodeChange[],
  prTitle: string,
  prDescription: string,
  options: PRGeneratorOptions
): Promise<{ prNumber: number; prUrl: string; branchName: string }> {
  const { accessToken, owner, repo, baseBranch } = options;
  const startTime = Date.now();

  logger.pr.start(projectName, changes.length);

  if (changes.length === 0) {
    logger.pr.error("No changes to commit");
    throw new Error("No changes to commit");
  }

  try {
    // Create a new branch
    const branchName = generateBranchName(projectName);
    logger.pr.github("Creating branch", branchName);
    await createBranch(accessToken, owner, repo, branchName, baseBranch);

    // Get the SHA for each file and commit changes
    for (const change of changes) {
      const fileData = await getFileContent(
        accessToken,
        owner,
        repo,
        change.filePath,
        baseBranch
      );

      logger.pr.github("Committing", change.filePath);
      await updateFile(
        accessToken,
        owner,
        repo,
        change.filePath,
        change.newContent,
        `[AI CMS] ${change.description.split("\n")[0]}`,
        branchName,
        fileData.sha
      );
      logger.pr.fileChange(change.filePath, "modified");
    }

    // Create the pull request
    logger.pr.github("Creating pull request");
    const pr = await createPullRequest(
      accessToken,
      owner,
      repo,
      prTitle,
      prDescription,
      branchName,
      baseBranch
    );

    logger.pr.complete(pr.number, pr.html_url, Date.now() - startTime);

    return {
      prNumber: pr.number,
      prUrl: pr.html_url,
      branchName,
    };
  } catch (error) {
    logger.pr.error("GitHub API error", error instanceof Error ? error : undefined);
    throw error;
  }
}

// Generate a PR title from edits
export function generatePRTitle(edits: Array<{ element: Element }>): string {
  if (edits.length === 1 && edits[0]) {
    return `(cms): update ${edits[0].element.name.toLowerCase()}`;
  }

  const types = [...new Set(edits.map((e) => e.element.type))];
  if (types.length === 1) {
    return `(cms): update ${edits.length} ${types[0]}s`;
  }

  return `(cms): update ${edits.length} content elements`;
}

// Generate a PR description from edits
export function generatePRDescription(
  edits: Array<{ edit: Edit; element: Element }>
): string {
  const fileCount = new Set(edits.map((e) => e.element.sourceFile)).size;
  const elementTypes = [...new Set(edits.map((e) => e.element.type))];
  const hasLinkChanges = edits.some((e) => {
    return e.edit.oldHref && e.edit.newHref && e.edit.oldHref !== e.edit.newHref;
  });

  const lines: string[] = [
    "# ✏️ Content Update",
    "",
    `> **${edits.length} element${edits.length !== 1 ? "s" : ""}** updated across **${fileCount} file${fileCount !== 1 ? "s" : ""}**`,
    "",
    "> [!NOTE]",
    "> This PR contains automated content changes from Loomii CMS.",
    "> ",
    `> 📝 **${edits.length}** element${edits.length !== 1 ? "s" : ""} modified`,
    `> 📁 **${fileCount}** file${fileCount !== 1 ? "s" : ""} changed`,
    `> 🏷️ Types: ${elementTypes.map((t) => `\`${t}\``).join(", ")}`,
    "",
    "---",
    "",
    "## Changes",
    "",
  ];

  // Group edits by file
  const editsByFile = new Map<string, Array<{ edit: Edit; element: Element }>>();
  for (const item of edits) {
    const file = item.element.sourceFile || "unknown";
    const existing = editsByFile.get(file) || [];
    existing.push(item);
    editsByFile.set(file, existing);
  }

  for (const [file, fileEdits] of editsByFile) {
    lines.push(`### \`${file}\``);
    lines.push("");

    for (const { edit, element } of fileEdits) {
      const oldValue = edit.oldValue || element.currentValue || "";
      const newValue = edit.newValue;
      const hrefChanged = edit.oldHref && edit.newHref && edit.oldHref !== edit.newHref;

      lines.push(`#### ${element.name} \`${element.type}\``);
      lines.push("");
      lines.push("```diff");
      lines.push(`- ${oldValue}`);
      lines.push(`+ ${newValue}`);
      lines.push("```");

      if (hrefChanged) {
        lines.push("");
        lines.push("**Link changed:**");
        lines.push("```diff");
        lines.push(`- ${edit.oldHref}`);
        lines.push(`+ ${edit.newHref}`);
        lines.push("```");
      }

      if (element.sourceLine) {
        lines.push("");
        lines.push(`📍 **Line ${element.sourceLine}**`);
      }

      lines.push("");
    }
  }

  lines.push("---");
  lines.push("");
  lines.push("## ✅ Review Checklist");
  lines.push("");
  lines.push("- [ ] Content changes look correct");
  lines.push("- [ ] No unintended formatting changes");
  if (hasLinkChanges) {
    lines.push("- [ ] Links are valid");
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("*Automated content update via [Loomii](https://loomii.dev)*");

  return lines.join("\n");
}

