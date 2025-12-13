import { getFileContent, decodeFileContent, searchCode } from "./github";

interface SourceLocation {
  filePath: string;
  line: number;
  column: number;
  context: string;
}

interface MapperOptions {
  accessToken: string;
  owner: string;
  repo: string;
  branch: string;
}

// Find the source location of content in the codebase
export async function findContentSource(
  content: string,
  selector: string,
  options: MapperOptions
): Promise<SourceLocation | null> {
  const { accessToken, owner, repo } = options;

  // Clean the content for search (take first 50 chars, escape special chars)
  const searchContent = content
    .slice(0, 50)
    .replace(/['"]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!searchContent || searchContent.length < 5) {
    return null;
  }

  try {
    // Search for the content in the codebase
    const results = await searchCode(accessToken, owner, repo, searchContent);

    if (results.length === 0) {
      return null;
    }

    // Find the most likely source file
    // Prioritize: TSX > JSX > TS > JS > MDX > JSON
    const priorityOrder = [".tsx", ".jsx", ".ts", ".js", ".mdx", ".json"];

    const sortedResults = results.sort((a, b) => {
      const aExt = a.path.slice(a.path.lastIndexOf("."));
      const bExt = b.path.slice(b.path.lastIndexOf("."));
      const aIndex = priorityOrder.indexOf(aExt);
      const bIndex = priorityOrder.indexOf(bExt);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    // Get the content of the best match
    const bestMatch = sortedResults[0];
    if (!bestMatch) {
      return null;
    }

    const fileData = await getFileContent(
      accessToken,
      owner,
      repo,
      bestMatch.path,
      options.branch
    );

    const fileContent = decodeFileContent(fileData.content);

    // Find the line number
    const lines = fileContent.split("\n");
    let lineNumber = 0;
    let columnNumber = 0;
    let contextLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line && line.includes(searchContent.slice(0, 30))) {
        lineNumber = i + 1;
        columnNumber = line.indexOf(searchContent.slice(0, 30)) + 1;
        // Get context (2 lines before and after)
        contextLines = lines.slice(Math.max(0, i - 2), i + 3);
        break;
      }
    }

    if (lineNumber === 0) {
      // Couldn't find exact match, return file without line info
      return {
        filePath: bestMatch.path,
        line: 0,
        column: 0,
        context: "",
      };
    }

    return {
      filePath: bestMatch.path,
      line: lineNumber,
      column: columnNumber,
      context: contextLines.join("\n"),
    };
  } catch (error) {
    console.error("Failed to find content source:", error);
    return null;
  }
}

// Map multiple elements to their source locations
export async function mapElementsToSource(
  elements: Array<{
    id: string;
    currentValue: string | null;
    selector: string;
  }>,
  options: MapperOptions
): Promise<Map<string, SourceLocation | null>> {
  const results = new Map<string, SourceLocation | null>();

  // Process in batches to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < elements.length; i += batchSize) {
    const batch = elements.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (element) => {
        if (!element.currentValue) {
          results.set(element.id, null);
          return;
        }

        const location = await findContentSource(
          element.currentValue,
          element.selector,
          options
        );
        results.set(element.id, location);
      })
    );

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < elements.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
}

// Generate a simple content diff
export function generateContentDiff(
  oldContent: string,
  newContent: string
): string {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");

  const diff: string[] = [];

  // Simple line-by-line diff
  const maxLines = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i] ?? "";
    const newLine = newLines[i] ?? "";

    if (oldLine !== newLine) {
      if (oldLine) diff.push(`- ${oldLine}`);
      if (newLine) diff.push(`+ ${newLine}`);
    } else {
      diff.push(`  ${oldLine}`);
    }
  }

  return diff.join("\n");
}

// Validate that content can be safely replaced
export function validateReplacement(
  fileContent: string,
  oldValue: string,
  newValue: string
): { valid: boolean; error?: string; occurrences: number } {
  // Count occurrences of old value
  const regex = new RegExp(escapeRegExp(oldValue), "g");
  const matches = fileContent.match(regex);
  const occurrences = matches?.length ?? 0;

  if (occurrences === 0) {
    return {
      valid: false,
      error: "Content not found in file",
      occurrences: 0,
    };
  }

  if (occurrences > 1) {
    return {
      valid: false,
      error: `Content found ${occurrences} times. Ambiguous replacement.`,
      occurrences,
    };
  }

  // Check if replacement would create syntax errors (basic checks)
  const replaced = fileContent.replace(oldValue, newValue);

  // Check for unbalanced quotes
  const singleQuotes = (replaced.match(/'/g) || []).length;
  const doubleQuotes = (replaced.match(/"/g) || []).length;
  const backticks = (replaced.match(/`/g) || []).length;

  if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0 || backticks % 2 !== 0) {
    return {
      valid: false,
      error: "Replacement would create unbalanced quotes",
      occurrences: 1,
    };
  }

  return { valid: true, occurrences: 1 };
}

// Escape special regex characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

