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

export interface AnalysisResult {
  elements: Array<{
    name: string;
    type: string;
    filePath: string;
    line: number;
    currentValue: string;
    confidence: number;
  }>;
  filesAnalyzed: string[];
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
  const allElements: AnalysisResult["elements"] = [];
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
        elementsFound: 0,
        filesAnalyzed: 0,
      });
      return { elements: [], filesAnalyzed: [] };
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

          // Convert raw elements to our format with AI-generated names
          for (const elem of analysis.elements) {
            allElements.push({
              name: generateElementName(elem.type, elem.content),
              type: elem.type,
              filePath: file.path,
              line: elem.line,
              currentValue: elem.content,
              confidence: 0.9,
            });
          }
        }
      } catch (error) {
        console.log(
          `  ⚠️ Failed to analyze ${file.path}: ${(error as Error).message}`
        );
      }
    }

    // Step 3: Use AI to refine and name the elements
    if (allElements.length > 0) {
      logger.workflow.step("Refining element names with AI");

      const prompt = `Given these content elements found in source code, generate better human-readable names for each one. Keep the same structure but improve the "name" field to be descriptive and useful for content editors.

Elements found:
${JSON.stringify(allElements.slice(0, 30), null, 2)}

Return ONLY a JSON array with the refined elements (same structure, just better names):`;

      try {
        const response = await (generateText as any)({
          model: MODEL,
          prompt,
          system: `You are a content management expert. Generate clear, descriptive names for UI elements that would make sense to marketing/content teams. For example:
- "Welcome to Our Platform" → "Homepage Hero Title"
- "Get Started" → "CTA Button - Get Started"  
- "Learn more about our features" → "Features Section Description"

Return valid JSON only.`,
        });

        const jsonMatch = response.text?.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const refinedElements = JSON.parse(jsonMatch[0]);
          // Merge refined names back
          for (
            let i = 0;
            i < Math.min(refinedElements.length, allElements.length);
            i++
          ) {
            const refined = refinedElements[i];
            const original = allElements[i];
            if (refined?.name && original) {
              original.name = refined.name;
            }
          }
        }
      } catch (error) {
        console.log(`  Warning: AI refinement failed, using generated names`);
      }
    }

    const result: AnalysisResult = {
      elements: allElements,
      filesAnalyzed,
    };

    logger.workflow.complete("analyzeRepository", Date.now() - startTime, {
      elementsFound: result.elements.length,
      filesAnalyzed: result.filesAnalyzed.length,
    });

    return result;
  } catch (error) {
    logger.workflow.error("analyzeRepository", error as Error);
    throw error;
  }
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
