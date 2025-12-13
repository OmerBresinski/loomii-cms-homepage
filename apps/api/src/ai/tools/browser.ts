import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// Browser context that will be provided at runtime
interface BrowserContext {
  page: {
    goto: (url: string) => Promise<void>;
    screenshot: (options?: { fullPage?: boolean }) => Promise<Buffer>;
    content: () => Promise<string>;
    evaluate: <T>(fn: () => T) => Promise<T>;
    title: () => Promise<string>;
    url: () => string;
  };
}

// Navigate to a URL
export const navigateToTool = createTool({
  id: "navigate-to",
  description:
    "Navigate the browser to a specific URL and wait for the page to load.",
  inputSchema: z.object({
    url: z.string().url().describe("The URL to navigate to"),
    waitForSelector: z
      .string()
      .optional()
      .describe(
        "Optional CSS selector to wait for before considering the page loaded"
      ),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    title: z.string(),
    url: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { url } = context as unknown as {
      url: string;
      waitForSelector?: string;
    };
    const runtimeContext = (context as any).runtimeContext;
    const browser = runtimeContext?.get("browser") as
      | BrowserContext
      | undefined;

    if (!browser) {
      return {
        success: false,
        title: "",
        url,
        error: "Browser not initialized",
      };
    }

    try {
      await browser.page.goto(url);
      const title = await browser.page.title();
      return { success: true, title, url: browser.page.url() };
    } catch (error) {
      return {
        success: false,
        title: "",
        url,
        error: error instanceof Error ? error.message : "Navigation failed",
      };
    }
  },
});

// Capture a screenshot
export const captureScreenshotTool = createTool({
  id: "capture-screenshot",
  description:
    "Capture a screenshot of the current page. Returns base64 encoded image.",
  inputSchema: z.object({
    fullPage: z
      .boolean()
      .default(false)
      .describe("Whether to capture the full page or just the viewport"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    screenshot: z.string().optional().describe("Base64 encoded PNG image"),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { fullPage } = context as unknown as { fullPage: boolean };
    const runtimeContext = (context as any).runtimeContext;
    const browser = runtimeContext?.get("browser") as
      | BrowserContext
      | undefined;

    if (!browser) {
      return { success: false, error: "Browser not initialized" };
    }

    try {
      const buffer = await browser.page.screenshot({ fullPage });
      const base64 = buffer.toString("base64");
      return { success: true, screenshot: base64 };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Screenshot failed",
      };
    }
  },
});

// Extract DOM structure
export const extractDOMTool = createTool({
  id: "extract-dom",
  description:
    "Extract the DOM structure of the current page, including element hierarchy and text content.",
  inputSchema: z.object({
    selector: z
      .string()
      .default("body")
      .describe("CSS selector to start extraction from"),
    maxDepth: z.number().default(10).describe("Maximum depth to traverse"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    html: z.string().optional(),
    elements: z
      .array(
        z.object({
          tag: z.string(),
          selector: z.string(),
          textContent: z.string().nullable(),
          attributes: z.record(z.string()),
          children: z.number(),
        })
      )
      .optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const runtimeContext = (context as any).runtimeContext;
    const browser = runtimeContext?.get("browser") as
      | BrowserContext
      | undefined;

    if (!browser) {
      return { success: false, error: "Browser not initialized" };
    }

    try {
      const html = await browser.page.content();

      // Extract structured elements
      const elements = await browser.page.evaluate(() => {
        const extractElements = (
          root: Element,
          depth = 0,
          maxDepth = 10
        ): Array<{
          tag: string;
          selector: string;
          textContent: string | null;
          attributes: Record<string, string>;
          children: number;
        }> => {
          if (depth > maxDepth) return [];

          const results: Array<{
            tag: string;
            selector: string;
            textContent: string | null;
            attributes: Record<string, string>;
            children: number;
          }> = [];

          const contentTags = [
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "p",
            "span",
            "a",
            "button",
            "img",
            "section",
            "article",
            "main",
          ];

          for (const child of root.children) {
            const tag = child.tagName.toLowerCase();

            if (contentTags.includes(tag) || child.children.length > 0) {
              const attrs: Record<string, string> = {};
              for (const attr of child.attributes) {
                attrs[attr.name] = attr.value;
              }

              // Generate a unique selector
              let sel = tag;
              if (attrs.id) sel += `#${attrs.id}`;
              else if (attrs.class) sel += `.${attrs.class.split(" ")[0]}`;

              results.push({
                tag,
                selector: sel,
                textContent: child.textContent?.trim().slice(0, 200) || null,
                attributes: attrs,
                children: child.children.length,
              });

              results.push(...extractElements(child, depth + 1, maxDepth));
            }
          }

          return results;
        };

        const root = document.querySelector("body");
        return root ? extractElements(root) : [];
      });

      return { success: true, html: html.slice(0, 50000), elements };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "DOM extraction failed",
      };
    }
  },
});

// Get all links on the page
export const getPageLinksTool = createTool({
  id: "get-page-links",
  description:
    "Get all internal links on the current page for further crawling.",
  inputSchema: z.object({
    baseUrl: z.string().url().describe("The base URL to filter internal links"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    links: z.array(z.string()).optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { baseUrl } = context as unknown as { baseUrl: string };
    const runtimeContext = (context as any).runtimeContext;
    const browser = runtimeContext?.get("browser") as
      | BrowserContext
      | undefined;

    if (!browser) {
      return { success: false, error: "Browser not initialized" };
    }

    try {
      const links = await browser.page.evaluate(() => {
        const anchors = document.querySelectorAll("a[href]");
        return Array.from(anchors)
          .map((a) => a.getAttribute("href"))
          .filter((href): href is string => href !== null);
      });

      // Filter to internal links only
      const baseUrlObj = new URL(baseUrl);
      const internalLinks = links
        .map((link) => {
          try {
            const url = new URL(link, baseUrl);
            if (url.hostname === baseUrlObj.hostname) {
              return url.pathname;
            }
            return null;
          } catch {
            return null;
          }
        })
        .filter((link): link is string => link !== null)
        .filter((link, index, arr) => arr.indexOf(link) === index); // Dedupe

      return { success: true, links: internalLinks };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Link extraction failed",
      };
    }
  },
});

