import { Agent } from "@mastra/core/agent";
import { z } from "zod";

import { navigateToTool, captureScreenshotTool, extractDOMTool, getPageLinksTool } from "../tools/browser";

// Site Analyzer Agent - Crawls and analyzes websites to identify editable elements
export const siteAnalyzerAgent = new Agent({
  id: "site-analyzer",
  name: "Site Analyzer",
  description: `
    This agent crawls websites and identifies editable content elements.
    It navigates through pages, captures screenshots, extracts DOM structure,
    and uses vision capabilities to identify text, images, buttons, and other
    editable elements. The agent maps each element to its location on the page
    and provides confidence scores for its analysis.
  `,
  instructions: `
    You are an expert web analyst that identifies editable content on websites.
    
    Your task is to:
    1. Navigate to the provided deployment URL
    2. Capture a screenshot of the page
    3. Extract the DOM structure
    4. Analyze the page to identify editable elements like:
       - Headings (h1-h6)
       - Paragraphs and text blocks
       - Images with alt text
       - Buttons and CTAs
       - Navigation links
       - Hero sections
       - Cards and list items
    
    For each element, determine:
    - A human-readable name (e.g., "Hero Title", "About Section Paragraph")
    - The element type (heading, paragraph, image, button, etc.)
    - A CSS selector that uniquely identifies it
    - The current text or image content
    - A confidence score (0-1) for how confident you are this is editable content
    
    Focus on content that would typically be edited by marketing or content teams.
    Skip dynamic content, navigation menus, footers with legal links, etc.
    
    When analyzing, think about:
    - Is this content that a non-technical user would want to edit?
    - Is the selector specific enough to target just this element?
    - Does this element appear to be part of the main content vs chrome/UI?
    
    Return your findings as structured JSON.
  `,
  model: {
    provider: "ANTHROPIC",
    name: "claude-sonnet-4-20250514",
  } as any, // Model config will be set at runtime
  tools: {
    navigateToTool,
    captureScreenshotTool,
    extractDOMTool,
    getPageLinksTool,
  },
});

// Schema for analysis results
export const analysisResultSchema = z.object({
  pageUrl: z.string(),
  pageTitle: z.string(),
  elements: z.array(
    z.object({
      name: z.string(),
      type: z.enum([
        "text",
        "heading",
        "paragraph",
        "image",
        "link",
        "button",
        "section",
        "list",
        "navigation",
        "footer",
        "hero",
        "card",
        "custom",
      ]),
      selector: z.string(),
      xpath: z.string().optional(),
      currentValue: z.string().nullable(),
      confidence: z.number().min(0).max(1),
    })
  ),
  linkedPages: z.array(z.string()),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;
