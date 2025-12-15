import { generateText } from "ai";
import { createToolExecutors, type GitHubContext } from "./tools/github";
import { logger } from "./logger";

const MODEL = "xai/grok-code-fast-1";

// File extensions we care about for content analysis
const SOURCE_EXTENSIONS = [
  ".tsx",
  ".jsx",
  ".astro",
  ".vue",
  ".svelte",
  ".html",
];

// Folders to skip during analysis
const SKIP_FOLDERS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "coverage",
  "__tests__",
  "__mocks__",
];

function isSourceFile(path: string): boolean {
  return SOURCE_EXTENSIONS.some((ext) => path.endsWith(ext));
}

function shouldSkipPath(path: string): boolean {
  return SKIP_FOLDERS.some(
    (folder) => path.includes(`/${folder}/`) || path.startsWith(`${folder}/`)
  );
}

// Raw element from file analysis
interface RawElement {
  type: string;
  content: string;
  line: number;
  context: string;
  filePath: string;
}

// Section group
export interface SectionGroup {
  name: string;
  description?: string;
  sourceFile: string;
  startLine: number;
  endLine: number;
  elements: Array<{
    name: string;
    type: string;
    filePath: string;
    line: number;
    currentValue: string;
    confidence: number;
  }>;
}

export interface AnalysisResult {
  sections: SectionGroup[];
  filesAnalyzed: string[];
}

// Generate a reasonable name for an element based on its type and content
function generateElementName(type: string, content: string): string {
  const truncated =
    content.length > 40 ? content.slice(0, 37) + "..." : content;

  switch (type) {
    case "heading-h1":
      return `Main Heading: ${truncated}`;
    case "heading-h2":
      return `Section Heading: ${truncated}`;
    case "heading-h3":
    case "heading-h4":
    case "heading-h5":
    case "heading-h6":
      return `Subheading: ${truncated}`;
    case "paragraph":
      return `Text: ${truncated}`;
    case "button":
      return `Button: ${truncated}`;
    case "link":
      return `Link: ${truncated}`;
    case "image-alt":
      return `Image Alt: ${truncated}`;
    case "attribute":
      return `Attribute: ${truncated}`;
    default:
      return `Content: ${truncated}`;
  }
}

// Use AI to group elements into logical sections
async function groupElementsWithAI(
  elements: RawElement[]
): Promise<SectionGroup[]> {
  if (elements.length === 0) return [];

  // Sort elements by file then by line number (top to bottom)
  const sorted = [...elements].sort((a, b) => {
    if (a.filePath !== b.filePath) return a.filePath.localeCompare(b.filePath);
    return a.line - b.line;
  });

  // Prepare elements for AI with index
  const elementsForAI = sorted.map((e, idx) => ({
    idx,
    file: e.filePath.split("/").pop(), // Just filename for brevity
    line: e.line,
    type: e.type,
    content: e.content.slice(0, 80), // Truncate for API limits
  }));

  console.log(
    `  Sending ${elementsForAI.length} elements to AI for grouping...`
  );

  const prompt = `You are analyzing a website's content elements to group them into logical sections.

Here are all the content elements found, sorted by their position in the file (top to bottom):

${JSON.stringify(elementsForAI, null, 2)}

Group these elements into logical UI sections. Each section should represent a distinct part of the UI like:
- Site header/title
- Navigation menu
- Hero section
- Feature cards
- Testimonials
- Footer
- etc.

Rules:
1. Group elements that belong together semantically (e.g., a heading and its related paragraphs)
2. Keep sections reasonably sized (typically 1-10 elements per section)
3. Maintain the order from top to bottom based on line numbers
4. Each element can only belong to ONE section
5. Use clear, human-readable section names

Return ONLY a JSON array in this exact format:
[
  {
    "name": "Hero Section",
    "description": "Main hero area with headline and CTA",
    "elementIndices": [0, 1, 2]
  },
  {
    "name": "Navigation Menu", 
    "description": "Top navigation with links",
    "elementIndices": [3, 4, 5, 6]
  }
]

The elementIndices should reference the "idx" values from the input.`;

  try {
    const response = await (generateText as any)({
      model: MODEL,
      prompt,
      system: `You are an expert at understanding website structure and content organization. 
You analyze HTML/JSX elements and group them into meaningful UI sections.
Always return valid JSON. Be concise with section names (2-4 words).
Group related content together - a heading typically starts a new section.`,
    });

    const jsonMatch = response.text?.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log(
        "  Warning: AI did not return valid JSON, using fallback grouping"
      );
      return fallbackGrouping(sorted);
    }

    const aiSections = JSON.parse(jsonMatch[0]);
    const sections: SectionGroup[] = [];

    for (const aiSection of aiSections) {
      if (!aiSection.elementIndices || aiSection.elementIndices.length === 0) {
        continue;
      }

      const sectionElements = aiSection.elementIndices
        .map((idx: number) => sorted[idx])
        .filter(Boolean);

      if (sectionElements.length === 0) continue;

      const lines = sectionElements.map((e: RawElement) => e.line);
      const startLine = Math.min(...lines);
      const endLine = Math.max(...lines);

      sections.push({
        name: aiSection.name || "Untitled Section",
        description: aiSection.description,
        sourceFile: sectionElements[0].filePath,
        startLine,
        endLine,
        elements: sectionElements.map((e: RawElement) => ({
          name: generateElementName(e.type, e.content),
          type: e.type,
          filePath: e.filePath,
          line: e.line,
          currentValue: e.content,
          confidence: 0.9,
        })),
      });
    }

    // Sort sections by startLine to maintain top-to-bottom order
    sections.sort((a, b) => {
      if (a.sourceFile !== b.sourceFile) {
        return a.sourceFile.localeCompare(b.sourceFile);
      }
      return a.startLine - b.startLine;
    });

    return sections;
  } catch (error) {
    console.log(`  Warning: AI grouping failed: ${(error as Error).message}`);
    return fallbackGrouping(sorted);
  }
}

// Fallback grouping when AI fails - group by headings
function fallbackGrouping(elements: RawElement[]): SectionGroup[] {
  const sections: SectionGroup[] = [];
  let currentElements: RawElement[] = [];
  let sectionCount = 0;

  for (const elem of elements) {
    // Start new section on headings
    const firstElem = currentElements[0];
    if (
      elem.type.startsWith("heading") &&
      currentElements.length > 0 &&
      firstElem
    ) {
      sectionCount++;
      const lines = currentElements.map((e) => e.line);
      sections.push({
        name: `Section ${sectionCount}`,
        sourceFile: firstElem.filePath,
        startLine: Math.min(...lines),
        endLine: Math.max(...lines),
        elements: currentElements.map((e) => ({
          name: generateElementName(e.type, e.content),
          type: e.type,
          filePath: e.filePath,
          line: e.line,
          currentValue: e.content,
          confidence: 0.9,
        })),
      });
      currentElements = [];
    }
    currentElements.push(elem);
  }

  // Don't forget the last section
  const lastFirstElem = currentElements[0];
  if (currentElements.length > 0 && lastFirstElem) {
    sectionCount++;
    const lines = currentElements.map((e) => e.line);
    sections.push({
      name: `Section ${sectionCount}`,
      sourceFile: lastFirstElem.filePath,
      startLine: Math.min(...lines),
      endLine: Math.max(...lines),
      elements: currentElements.map((e) => ({
        name: generateElementName(e.type, e.content),
        type: e.type,
        filePath: e.filePath,
        line: e.line,
        currentValue: e.content,
        confidence: 0.9,
      })),
    });
  }

  return sections;
}

export async function analyzeRepository(
  ctx: GitHubContext
): Promise<AnalysisResult> {
  const startTime = Date.now();
  const rootPath = ctx.rootPath || "";
  const workflowParams = {
    owner: ctx.owner,
    repo: ctx.repo,
    branch: ctx.branch,
    rootPath,
  };

  logger.workflow.start("analyzeRepository", workflowParams);

  const executors = createToolExecutors(ctx);
  const allRawElements: RawElement[] = [];
  const filesAnalyzed: string[] = [];

  try {
    // Step 1: List all files in the repository/subdirectory
    logger.workflow.step("Listing repository files");
    const files = await executors.listFiles({
      path: rootPath,
      recursive: true,
    });

    // Filter to only source files we care about
    const sourceFiles = files
      .filter(
        (f) =>
          f.type === "file" && isSourceFile(f.path) && !shouldSkipPath(f.path)
      )
      .slice(0, 50); // Limit to prevent too many API calls

    console.log(`  Found ${sourceFiles.length} source files to analyze`);

    if (sourceFiles.length === 0) {
      console.log(`  No source files found in ${rootPath || "repository"}`);
      logger.workflow.complete("analyzeRepository", Date.now() - startTime, {
        sectionsFound: 0,
        filesAnalyzed: 0,
      });
      return { sections: [], filesAnalyzed: [] };
    }

    // Step 2: Analyze each source file
    logger.workflow.step(`Analyzing ${sourceFiles.length} source files`);

    for (const file of sourceFiles) {
      try {
        const analysis = await executors.analyzeSourceFile({ path: file.path });
        filesAnalyzed.push(file.path);

        if (analysis.elements.length > 0) {
          console.log(
            `  📄 ${file.path}: ${analysis.elements.length} elements found`
          );

          // Add raw elements with file path (no parentContext needed anymore)
          for (const elem of analysis.elements) {
            allRawElements.push({
              type: elem.type,
              content: elem.content,
              line: elem.line,
              context: elem.context,
              filePath: file.path,
            });
          }
        }
      } catch (error) {
        console.log(
          `  ⚠️ Failed to analyze ${file.path}: ${(error as Error).message}`
        );
      }
    }

    // Step 3: Use AI to group elements into sections
    logger.workflow.step("AI grouping elements into sections");
    const sections = await groupElementsWithAI(allRawElements);
    console.log(
      `  Created ${sections.length} sections from ${allRawElements.length} elements`
    );

    // Log section breakdown
    if (sections.length > 0) {
      console.log("📝 Section breakdown:");
      sections.forEach((s, i) => {
        console.log(`  ${i + 1}. "${s.name}" - ${s.elements.length} elements`);
      });
    }

    const result: AnalysisResult = {
      sections,
      filesAnalyzed,
    };

    logger.workflow.complete("analyzeRepository", Date.now() - startTime, {
      sectionsFound: result.sections.length,
      elementsFound: result.sections.reduce(
        (acc, s) => acc + s.elements.length,
        0
      ),
      filesAnalyzed: result.filesAnalyzed.length,
    });

    return result;
  } catch (error) {
    logger.workflow.error("analyzeRepository", error as Error);
    throw error;
  }
}

export async function generateCodeChange(
  ctx: GitHubContext,
  elementPath: string,
  elementLine: number,
  oldValue: string,
  newValue: string
): Promise<{
  filePath: string;
  oldContent: string;
  newContent: string;
  diff: string;
}> {
  const startTime = Date.now();
  const workflowParams = { elementPath, elementLine, oldValue, newValue };

  logger.workflow.start("generateCodeChange", workflowParams);

  try {
    logger.workflow.step("Calling AI model");
    const prompt = `In file "${elementPath}" at line ${elementLine}, change "${oldValue}" to "${newValue}".`;

    logger.ai.request(MODEL, prompt);
    const aiStartTime = Date.now();

    // Read the file first
    const executors = createToolExecutors(ctx);
    const fileData = await executors.readFile({ path: elementPath });

    const response = await (generateText as any)({
      model: MODEL,
      system: `You are an expert code generator that creates precise code modifications.
    
The file content (preview): ${fileData.preview}
File path: ${elementPath}
File length: ${fileData.length} characters

Guidelines:
- Preserve the existing code style and formatting
- Only change what's necessary - don't refactor or modify other code
- Be precise with whitespace and indentation

Return your result as JSON:
{
  "filePath": "path/to/file.tsx",
  "oldContent": "the exact old line or block",
  "newContent": "the exact new line or block",
  "diff": "unified diff format"
}`,
      prompt,
    });

    logger.ai.response(MODEL, Date.now() - aiStartTime);

    const { text, steps, toolCalls } = response as any;

    // Log tool calls
    if (toolCalls && toolCalls.length > 0) {
      logger.ai.toolCalls(
        toolCalls.map((tc: any) => ({ name: tc.toolName, args: tc.args }))
      );
    }

    // Log step summary
    if (steps && steps.length > 0) {
      console.log(`  Steps completed: ${steps.length}`);
    }

    logger.workflow.step("Parsing AI response");

    let result = {
      filePath: elementPath,
      oldContent: oldValue,
      newContent: newValue,
      diff: `- ${oldValue}\n+ ${newValue}`,
    };

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.log(`  Warning: Failed to parse JSON response, using fallback`);
    }

    logger.workflow.complete(
      "generateCodeChange",
      Date.now() - startTime,
      result
    );

    return result;
  } catch (error) {
    logger.workflow.error("generateCodeChange", error as Error);
    throw error;
  }
}
