// Simple structured logger for AI operations
const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
};

function timestamp() {
  return new Date().toISOString();
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export const logger = {
  // Workflow level logging
  workflow: {
    start: (name: string, params: Record<string, any>) => {
      console.log(
        `\n${COLORS.bright}${COLORS.cyan}━━━ WORKFLOW: ${name} ━━━${COLORS.reset}`
      );
      console.log(`${COLORS.dim}${timestamp()}${COLORS.reset}`);
      console.log(`${COLORS.dim}Params:${COLORS.reset}`, JSON.stringify(params, null, 2));
    },
    step: (stepName: string) => {
      console.log(`\n${COLORS.blue}▶ Step: ${stepName}${COLORS.reset}`);
    },
    complete: (name: string, durationMs: number, result: any) => {
      console.log(
        `\n${COLORS.green}✓ WORKFLOW COMPLETE: ${name}${COLORS.reset} ${COLORS.dim}(${formatDuration(durationMs)})${COLORS.reset}`
      );
      console.log(`${COLORS.dim}Result:${COLORS.reset}`, JSON.stringify(result, null, 2));
      console.log(`${COLORS.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}\n`);
    },
    error: (name: string, error: Error) => {
      console.log(`\n${COLORS.red}✗ WORKFLOW FAILED: ${name}${COLORS.reset}`);
      console.log(`${COLORS.red}Error: ${error.message}${COLORS.reset}`);
      if (error.stack) {
        console.log(`${COLORS.dim}${error.stack}${COLORS.reset}`);
      }
    },
  },

  // Tool level logging
  tool: {
    call: (toolName: string, params: Record<string, any>) => {
      console.log(`  ${COLORS.magenta}⚡ Tool: ${toolName}${COLORS.reset}`);
      console.log(`  ${COLORS.dim}Params: ${JSON.stringify(params)}${COLORS.reset}`);
    },
    result: (toolName: string, durationMs: number, result: any) => {
      const preview = JSON.stringify(result);
      const truncated = preview.length > 200 ? preview.slice(0, 200) + "..." : preview;
      console.log(
        `  ${COLORS.green}✓ ${toolName}${COLORS.reset} ${COLORS.dim}(${formatDuration(durationMs)})${COLORS.reset}`
      );
      console.log(`  ${COLORS.dim}Result: ${truncated}${COLORS.reset}`);
    },
    error: (toolName: string, error: Error) => {
      console.log(`  ${COLORS.red}✗ ${toolName} failed: ${error.message}${COLORS.reset}`);
    },
  },

  // AI model logging
  ai: {
    request: (model: string, promptPreview: string) => {
      console.log(`\n  ${COLORS.yellow}🤖 AI Request: ${model}${COLORS.reset}`);
      const truncated =
        promptPreview.length > 100 ? promptPreview.slice(0, 100) + "..." : promptPreview;
      console.log(`  ${COLORS.dim}Prompt: ${truncated}${COLORS.reset}`);
    },
    response: (model: string, durationMs: number, tokenInfo?: { input?: number; output?: number }) => {
      let tokenStr = "";
      if (tokenInfo?.input || tokenInfo?.output) {
        tokenStr = ` [${tokenInfo.input || 0} in / ${tokenInfo.output || 0} out tokens]`;
      }
      console.log(
        `  ${COLORS.green}✓ AI Response${COLORS.reset} ${COLORS.dim}(${formatDuration(durationMs)})${tokenStr}${COLORS.reset}`
      );
    },
    toolCalls: (calls: Array<{ name: string; args: any }>) => {
      if (calls.length === 0) return;
      console.log(`  ${COLORS.dim}AI requested ${calls.length} tool call(s):${COLORS.reset}`);
      for (const call of calls) {
        console.log(`    ${COLORS.dim}→ ${call.name}(${JSON.stringify(call.args)})${COLORS.reset}`);
      }
    },
  },

  // PR generation logging
  pr: {
    start: (projectName: string, editCount: number) => {
      console.log(
        `\n${COLORS.bright}${COLORS.magenta}━━━ PR GENERATION: ${projectName} ━━━${COLORS.reset}`
      );
      console.log(`${COLORS.dim}${timestamp()}${COLORS.reset}`);
      console.log(`${COLORS.dim}Edits to process: ${editCount}${COLORS.reset}`);
    },
    editStart: (elementName: string, filePath: string) => {
      console.log(`\n${COLORS.blue}▶ Processing: ${elementName}${COLORS.reset}`);
      console.log(`  ${COLORS.dim}File: ${filePath}${COLORS.reset}`);
    },
    editChange: (oldValue: string, newValue: string) => {
      const oldPreview = oldValue.length > 50 ? oldValue.slice(0, 50) + "..." : oldValue;
      const newPreview = newValue.length > 50 ? newValue.slice(0, 50) + "..." : newValue;
      console.log(`  ${COLORS.red}- "${oldPreview}"${COLORS.reset}`);
      console.log(`  ${COLORS.green}+ "${newPreview}"${COLORS.reset}`);
    },
    aiEdit: (status: "start" | "success" | "fallback" | "failed", details?: string) => {
      switch (status) {
        case "start":
          console.log(`  ${COLORS.yellow}🤖 AI editing...${COLORS.reset}`);
          break;
        case "success":
          console.log(`  ${COLORS.green}✓ AI edit applied${COLORS.reset}${details ? ` ${COLORS.dim}(line ${details})${COLORS.reset}` : ""}`);
          break;
        case "fallback":
          console.log(`  ${COLORS.yellow}⚠ AI failed, using string replacement${COLORS.reset}`);
          if (details) console.log(`    ${COLORS.dim}Reason: ${details}${COLORS.reset}`);
          break;
        case "failed":
          console.log(`  ${COLORS.red}✗ Edit failed${COLORS.reset}`);
          if (details) console.log(`    ${COLORS.dim}Reason: ${details}${COLORS.reset}`);
          break;
      }
    },
    fileChange: (filePath: string, status: "added" | "modified") => {
      const icon = status === "added" ? "+" : "~";
      const color = status === "added" ? COLORS.green : COLORS.yellow;
      console.log(`  ${color}${icon} ${filePath}${COLORS.reset}`);
    },
    github: (action: string, details?: string) => {
      console.log(`  ${COLORS.cyan}⬆ GitHub: ${action}${COLORS.reset}${details ? ` ${COLORS.dim}(${details})${COLORS.reset}` : ""}`);
    },
    complete: (prNumber: number, prUrl: string, durationMs: number) => {
      console.log(
        `\n${COLORS.green}✓ PR CREATED: #${prNumber}${COLORS.reset} ${COLORS.dim}(${formatDuration(durationMs)})${COLORS.reset}`
      );
      console.log(`  ${COLORS.dim}${prUrl}${COLORS.reset}`);
      console.log(`${COLORS.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}\n`);
    },
    error: (message: string, error?: Error) => {
      console.log(`\n${COLORS.red}✗ PR GENERATION FAILED${COLORS.reset}`);
      console.log(`  ${COLORS.red}${message}${COLORS.reset}`);
      if (error?.stack) {
        console.log(`  ${COLORS.dim}${error.stack}${COLORS.reset}`);
      }
    },
  },
};

