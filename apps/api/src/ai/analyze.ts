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
  href?: string;
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
    href?: string;
  }>;
}

export interface AnalysisResult {
  sections: SectionGroup[];
  filesAnalyzed: string[];
}

// Generate a reasonable name for an element based on its type and content (fallback)
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
6. Give each element a title that describes its ROLE or POSITION in the UI, NOT its content

CRITICAL: Element titles must describe WHAT the element IS, not WHAT IT SAYS.
- BAD titles: "Edit Content Text", "Learn More Button", "Welcome Heading" (these echo the content)
- GOOD titles: "Primary CTA", "Second Navigation Link", "Section Subheading", "Description Text" (these describe the role)

Think about it this way: if someone changes the content, the title should still make sense.
For example, if "Learn More" changes to "Get Started", the title "Primary CTA" still works, but "Learn More Button" wouldn't.

Return ONLY a JSON array in this exact format:
[
  {
    "name": "Hero Section",
    "description": "Main hero area with headline and CTA",
    "elements": [
      { "idx": 0, "title": "Main Headline" },
      { "idx": 1, "title": "Subheading" },
      { "idx": 2, "title": "Primary CTA" }
    ]
  },
  {
    "name": "Navigation Menu", 
    "description": "Top navigation with links",
    "elements": [
      { "idx": 3, "title": "First Link" },
      { "idx": 4, "title": "Second Link" },
      { "idx": 5, "title": "Third Link" },
      { "idx": 6, "title": "CTA Button" }
    ]
  }
]

The idx values should reference the "idx" values from the input. Titles should be 2-4 words describing the element's role.`;

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
      // Support both old format (elementIndices) and new format (elements with titles)
      const elementsWithTitles = aiSection.elements || 
        (aiSection.elementIndices?.map((idx: number) => ({ idx, title: null })) || []);
      
      if (elementsWithTitles.length === 0) {
        continue;
      }

      const sectionElements = elementsWithTitles
        .map((el: { idx: number; title?: string }) => {
          const rawElement = sorted[el.idx];
          if (!rawElement || !el.title) return null; // Skip elements without AI-generated title
          return {
            ...rawElement,
            aiTitle: el.title,
          };
        })
        .filter(Boolean) as (RawElement & { aiTitle: string })[];

      if (sectionElements.length === 0) continue;

      const lines = sectionElements.map((e) => e.line);
      const startLine = Math.min(...lines);
      const endLine = Math.max(...lines);

      sections.push({
        name: aiSection.name || "Untitled Section",
        description: aiSection.description,
        sourceFile: sectionElements[0]!.filePath,
        startLine,
        endLine,
        elements: sectionElements.map((e) => ({
          // Use AI-generated title (required)
          name: e.aiTitle,
          type: e.type,
          filePath: e.filePath,
          line: e.line,
          currentValue: e.content,
          confidence: 0.9,
          href: e.href,
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
          href: e.href,
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
        href: e.href,
      })),
    });
  }

  return sections;
}

// Progress callback type
export type ProgressCallback = (progress: number, message: string) => void | Promise<void>;

export async function analyzeRepository(
  ctx: GitHubContext,
  onProgress?: ProgressCallback
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

  // Helper to report progress
  const reportProgress = async (progress: number, message: string) => {
    console.log(`  📊 Progress: ${progress}% - ${message}`);
    if (onProgress) {
      await onProgress(progress, message);
    }
  };

  try {
    // Step 1: List all files in the repository/subdirectory (0-10%)
    await reportProgress(5, "Listing repository files");
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

    await reportProgress(10, `Found ${sourceFiles.length} source files`);
    console.log(`  Found ${sourceFiles.length} source files to analyze`);

    if (sourceFiles.length === 0) {
      console.log(`  No source files found in ${rootPath || "repository"}`);
      await reportProgress(100, "No source files found");
      logger.workflow.complete("analyzeRepository", Date.now() - startTime, {
        sectionsFound: 0,
        filesAnalyzed: 0,
      });
      return { sections: [], filesAnalyzed: [] };
    }

    // Step 2: Analyze each source file (10-85%)
    logger.workflow.step(`Analyzing ${sourceFiles.length} source files`);

    for (let i = 0; i < sourceFiles.length; i++) {
      const file = sourceFiles[i]!;
      // Progress from 10% to 85% based on file count
      const fileProgress = 10 + Math.round((i / sourceFiles.length) * 75);
      await reportProgress(fileProgress, `Analyzing ${file.name} (${i + 1}/${sourceFiles.length})`);
      
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
              href: elem.href,
            });
          }
        }
      } catch (error) {
        console.log(
          `  ⚠️ Failed to analyze ${file.path}: ${(error as Error).message}`
        );
      }
    }

    // Step 3: Use AI to group elements into sections (85-95%)
    await reportProgress(85, "AI grouping elements into sections");
    logger.workflow.step("AI grouping elements into sections");
    const sections = await groupElementsWithAI(allRawElements);
    
    await reportProgress(95, `Created ${sections.length} sections`);
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
