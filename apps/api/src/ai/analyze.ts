import { generateText } from "ai";
import { toolDefinitions, type GitHubContext } from "./tools/github";
import { logger } from "./logger";

const MODEL = "google/gemini-2.0-flash-lite";

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
  const workflowParams = {
    owner: ctx.owner,
    repo: ctx.repo,
    branch: ctx.branch,
  };

  logger.workflow.start("analyzeRepository", workflowParams);

  try {
    logger.workflow.step("Calling AI model");
    const prompt = `Analyze the GitHub repository ${ctx.owner}/${ctx.repo} on branch ${ctx.branch} to find all editable content elements.`;

    logger.ai.request(MODEL, prompt);
    const aiStartTime = Date.now();

    const response = await generateText({
      model: MODEL as any,
      tools: toolDefinitions as any,
      system: `You are an expert code analyst that identifies editable content in source code.
    
Your task is to:
1. List files in the repository to understand the project structure
2. Identify key source files (pages, components) that contain user-facing content
3. Read and analyze each relevant file to find editable elements

Focus on content that would typically be edited by marketing or content teams:
- Page titles and headings
- Marketing copy and descriptions  
- Button labels and CTAs
- Image alt text
- Link text

Skip:
- Code comments
- Variable names
- Import statements
- Technical configuration
- Error messages (unless user-facing)

Start by listing files to find:
- src/pages/, src/app/, app/ directories (pages)
- src/components/, components/ directories (components)
- Landing page files (index, home, landing)

Return your final analysis as JSON with this structure:
{
  "elements": [
    {
      "name": "Hero Title",
      "type": "heading",
      "filePath": "src/pages/index.tsx",
      "line": 42,
      "currentValue": "Welcome to Our Site",
      "confidence": 0.95
    }
  ],
  "filesAnalyzed": ["src/pages/index.tsx", "src/components/Hero.tsx"]
}`,
      prompt,
    } as any);

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
      for (const step of steps) {
        if (step.toolCalls && step.toolCalls.length > 0) {
          for (const tc of step.toolCalls) {
            console.log(`    → ${tc.toolName}`);
          }
        }
      }
    }

    logger.workflow.step("Parsing AI response");

    // Parse the final response
    let result: AnalysisResult = { elements: [], filesAnalyzed: [] };

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]) as AnalysisResult;
      }
    } catch (parseError) {
      console.log(`  Warning: Failed to parse JSON response`);
    }

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

    const response = await generateText({
      model: MODEL as any,
      tools: toolDefinitions as any,
      system: `You are an expert code generator that creates precise code modifications.
    
Your task is to:
1. Read the source file at the given path
2. Locate the exact content that needs to be changed at the given line
3. Generate a minimal, focused change that updates the content

Guidelines:
- Preserve the existing code style and formatting
- Only change what's necessary - don't refactor or modify other code
- Be precise with whitespace and indentation

Return your final result as JSON:
{
  "filePath": "path/to/file.tsx",
  "oldContent": "the exact old line or block",
  "newContent": "the exact new line or block",
  "diff": "unified diff format"
}`,
      prompt,
    } as any);

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
