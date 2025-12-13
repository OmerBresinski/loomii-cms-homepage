import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

// Input schema for the analysis workflow
const analysisInputSchema = z.object({
  projectId: z.string().uuid(),
  deploymentUrl: z.string().url(),
  maxPages: z.number().default(10),
  fullRescan: z.boolean().default(false),
});

// Output schema for the analysis workflow
const analysisOutputSchema = z.object({
  projectId: z.string(),
  pagesAnalyzed: z.number(),
  elementsFound: z.number(),
  duration: z.number(),
  errors: z.array(z.string()),
});

// Step 1: Initialize and analyze site
const analyzeSiteStep = createStep({
  id: "analyze-site",
  inputSchema: analysisInputSchema,
  outputSchema: z.object({
    projectId: z.string(),
    pagesAnalyzed: z.number(),
    elementsFound: z.number(),
    duration: z.number(),
    errors: z.array(z.string()),
  }),
  execute: async ({ inputData, mastra }) => {
    const startTime = Date.now();
    const { projectId, deploymentUrl, maxPages } = inputData;
    const errors: string[] = [];
    let pagesAnalyzed = 0;
    let elementsFound = 0;

    try {
      // Get the site analyzer agent
      const agent = mastra.getAgent("site-analyzer");

      if (!agent) {
        throw new Error("Site analyzer agent not found");
      }

      // Analyze the main page
      const response = await agent.generate(
        `Navigate to ${deploymentUrl} and analyze the page to identify all editable content elements.
        
        For each element found, provide:
        - A descriptive name
        - The element type (heading, paragraph, image, button, etc.)
        - A unique CSS selector
        - The current text/content value
        - Your confidence score (0-1)
        
        Also, identify up to ${maxPages} internal page links to analyze.
        
        Return the results as a structured JSON object.`
      );

      // In a real implementation, we would:
      // 1. Parse the structured response
      // 2. Save elements to the database
      // 3. Queue additional pages for analysis

      pagesAnalyzed = 1;
      elementsFound = 5; // Placeholder
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Unknown error");
    }

    const duration = Date.now() - startTime;

    return {
      projectId,
      pagesAnalyzed,
      elementsFound,
      duration,
      errors,
    };
  },
});

// Main analysis workflow - simplified to single step for now
export const analysisWorkflow = createWorkflow({
  id: "site-analysis",
  description: `
    Analyzes a deployed website to identify editable content elements.
    Uses AI agents to crawl pages, capture screenshots, and identify
    text, images, buttons, and other editable content.
  `,
  inputSchema: analysisInputSchema,
  outputSchema: analysisOutputSchema,
})
  .then(analyzeSiteStep)
  .commit();

export type AnalysisWorkflowInput = z.infer<typeof analysisInputSchema>;
export type AnalysisWorkflowOutput = z.infer<typeof analysisOutputSchema>;

