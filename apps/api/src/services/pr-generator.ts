import {
  getFileContent,
  decodeFileContent,
  createBranch,
  updateFile,
  createPullRequest,
} from "./github";
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

// Generate a unique branch name for the PR
export function generateBranchName(projectName: string): string {
  const timestamp = Date.now();
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 20);
  return `cms-update-${slug}-${timestamp}`;
}

// Generate a code change for a single edit
export async function generateCodeChange(
  element: Element,
  edit: Edit,
  options: PRGeneratorOptions
): Promise<CodeChange | null> {
  const { accessToken, owner, repo, baseBranch } = options;

  // If we don't have source file info, we can't generate a change
  if (!element.sourceFile) {
    console.warn(`No source file for element ${element.id}`);
    return null;
  }

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

    // Find and replace the old value with the new value
    // This is a simple implementation - in production, we'd use AST parsing
    const oldValue = edit.oldValue || element.currentValue;
    if (!oldValue) {
      console.warn(`No old value for element ${element.id}`);
      return null;
    }

    if (!content.includes(oldValue)) {
      console.warn(`Could not find content "${oldValue}" in ${element.sourceFile}`);
      return null;
    }

    const newContent = content.replace(oldValue, edit.newValue);

    return {
      filePath: element.sourceFile,
      oldContent: content,
      newContent,
      description: `Update ${element.name}: "${oldValue.slice(0, 50)}..." → "${edit.newValue.slice(0, 50)}..."`,
    };
  } catch (error) {
    console.error(`Failed to generate change for element ${element.id}:`, error);
    return null;
  }
}

// Generate all code changes for a batch of edits
export async function generateAllChanges(
  edits: Array<{ edit: Edit; element: Element }>,
  options: PRGeneratorOptions
): Promise<CodeChange[]> {
  const changes: CodeChange[] = [];

  for (const { edit, element } of edits) {
    const change = await generateCodeChange(element, edit, options);
    if (change) {
      changes.push(change);
    }
  }

  // Merge changes to the same file
  const mergedChanges = new Map<string, CodeChange>();

  for (const change of changes) {
    const existing = mergedChanges.get(change.filePath);
    if (existing) {
      // Apply this change on top of the previous one
      existing.newContent = existing.newContent.replace(
        change.oldContent,
        change.newContent
      );
      existing.description += `\n- ${change.description}`;
    } else {
      mergedChanges.set(change.filePath, { ...change });
    }
  }

  return Array.from(mergedChanges.values());
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

  if (changes.length === 0) {
    throw new Error("No changes to commit");
  }

  // Create a new branch
  const branchName = generateBranchName(projectName);
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
  }

  // Build PR body
  const changesMarkdown = changes
    .map(
      (c) =>
        `### \`${c.filePath}\`\n${c.description
          .split("\n")
          .map((d) => `- ${d}`)
          .join("\n")}`
    )
    .join("\n\n");

  const fullDescription = `${prDescription}\n\n## Changes\n\n${changesMarkdown}\n\n---\n*Created by [AI CMS](https://github.com)*`;

  // Create the pull request
  const pr = await createPullRequest(
    accessToken,
    owner,
    repo,
    prTitle,
    fullDescription,
    branchName,
    baseBranch
  );

  return {
    prNumber: pr.number,
    prUrl: pr.html_url,
    branchName,
  };
}

// Generate a PR title from edits
export function generatePRTitle(edits: Array<{ element: Element }>): string {
  if (edits.length === 1 && edits[0]) {
    return `[Content] Update ${edits[0].element.name}`;
  }

  const types = [...new Set(edits.map((e) => e.element.type))];
  if (types.length === 1) {
    return `[Content] Update ${edits.length} ${types[0]}s`;
  }

  return `[Content] Update ${edits.length} elements`;
}

// Generate a PR description from edits
export function generatePRDescription(
  edits: Array<{ edit: Edit; element: Element }>
): string {
  const lines = [
    "This pull request updates content via AI CMS.",
    "",
    "## Summary",
    "",
  ];

  for (const { edit, element } of edits) {
    const oldValue = (edit.oldValue || element.currentValue || "").slice(0, 100);
    const newValue = edit.newValue.slice(0, 100);
    lines.push(`- **${element.name}** (${element.type})`);
    lines.push(`  - From: "${oldValue}${oldValue.length >= 100 ? "..." : ""}"`);
    lines.push(`  - To: "${newValue}${newValue.length >= 100 ? "..." : ""}"`);
  }

  return lines.join("\n");
}

