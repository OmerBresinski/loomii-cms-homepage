import { Mastra } from "@mastra/core";

import { siteAnalyzerAgent } from "./agents/site-analyzer";
import { codeGeneratorAgent } from "./agents/code-generator";
import { analysisWorkflow } from "./workflows/analysis";

// Create the Mastra instance with all agents and workflows
// Mastra uses the Vercel AI SDK under the hood, which reads from:
// - AI_GATEWAY_API_KEY for Vercel AI Gateway access
// - Models are specified per-agent (e.g., "anthropic:claude-sonnet-4-20250514")
export const mastra = new Mastra({
  agents: {
    siteAnalyzerAgent,
    codeGeneratorAgent,
  },
  workflows: {
    analysisWorkflow,
  },
});

export type MastraInstance = typeof mastra;
