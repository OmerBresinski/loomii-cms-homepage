import { generateText } from "ai";
import {
  createToolExecutors,
  type GitHubContext,
  type ToolExecutors,
} from "./tools/github";
import { logger } from "./logger";

const MODEL = "xai/grok-code-fast-1";

// Detected page information
export interface DetectedPage {
  pagePath: string; // File path in repo (e.g., "src/pages/about.tsx")
  pageRoute: string; // URL route (e.g., "/about")
  pageName: string; // Human-readable name (e.g., "About Page")
}

// Framework detection result
export interface FrameworkInfo {
  framework: string; // "nextjs" | "react-vite" | "astro" | "static-html" | "unknown"
  routingType: string; // "file-based" | "code-based" | "none"
  pagesDirectory?: string; // e.g., "pages", "src/pages", "app"
  pages: DetectedPage[];
}

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

// AI-powered framework detection and page discovery
async function detectFrameworkAndPages(
  executors: ToolExecutors,
  rootPath: string
): Promise<FrameworkInfo> {
  console.log("  🔍 Detecting framework and pages...");

  // Step 1: Get the file listing to understand structure
  const files = await executors.listFiles({
    path: rootPath,
    recursive: true,
  });

  const filePaths = files.map((f) => f.path);

  // Try to read package.json if it exists
  let packageJsonContent = "";
  const packageJsonPath = rootPath
    ? `${rootPath}/package.json`
    : "package.json";
  const hasPackageJson = filePaths.some(
    (f) => f === packageJsonPath || f.endsWith("/package.json")
  );

  if (hasPackageJson) {
    try {
      const data = await executors.readFile({ path: packageJsonPath });
      packageJsonContent = data.preview;
    } catch {
      console.log("  ⚠️ Could not read package.json");
    }
  }

  // Get a summary of the directory structure for AI
  const dirStructure = filePaths
    .filter((p) => !shouldSkipPath(p))
    .slice(0, 200)
    .join("\n");

  // Use AI to detect framework and find pages
  const prompt = `Analyze this project to detect the framework and find all pages/routes.

${
  packageJsonContent
    ? `PACKAGE.JSON (preview):
${packageJsonContent}
`
    : "No package.json found - might be a static HTML site."
}

FILE STRUCTURE:
${dirStructure}

TASK: Identify the framework and list ALL pages in this project.

FRAMEWORK DETECTION RULES:
- Next.js: Has "next" in dependencies, uses "pages/" or "app/" directory
- React + Vite/CRA: Has "react" + "vite" or "react-scripts", routes usually in code
- Astro: Has "astro" in dependencies, uses "src/pages/" directory
- Static HTML: Has .html files in root or public folder, no JS framework
- Vue/Nuxt: Has "vue" or "nuxt" in dependencies
- SvelteKit: Has "@sveltejs/kit" in dependencies

PAGE DETECTION RULES BY FRAMEWORK:
1. Next.js Pages Router: Each file in "pages/" is a route (except _app, _document, api/)
   - pages/index.tsx → /
   - pages/about.tsx → /about
   - pages/blog/[slug].tsx → /blog/:slug

2. Next.js App Router: Each folder in "app/" with page.tsx is a route
   - app/page.tsx → /
   - app/about/page.tsx → /about

3. Astro: Each file in "src/pages/" is a route
   - src/pages/index.astro → /
   - src/pages/about.astro → /about

4. Static HTML: Each .html file is a page
   - index.html → /
   - about.html → /about
   - pitch.html → /pitch

5. React + Vite/CRA: Look for route definitions in App.tsx, routes.tsx, or similar
   - Find <Route path="/about" element={...} /> patterns

Return ONLY a JSON object in this exact format:
{
  "framework": "nextjs" | "react-vite" | "astro" | "static-html" | "sveltekit" | "nuxt" | "unknown",
  "routingType": "file-based" | "code-based" | "none",
  "pagesDirectory": "pages" | "src/pages" | "app" | null,
  "pages": [
    { "pagePath": "src/pages/index.tsx", "pageRoute": "/", "pageName": "Homepage" },
    { "pagePath": "src/pages/about.tsx", "pageRoute": "/about", "pageName": "About Us" }
  ]
}

PAGE NAMING RULES - Names must be CONCISE (1-3 words max):
- Homepage (not "Home Page" or "Index")
- About Us, Pricing, Contact
- For specific topics: "Buy - Bitcoin", "Docs - API"
- Use Title Case
- Derive from file name AND context if available

Be thorough - find ALL pages. For static HTML sites, include ALL .html files.`;

  try {
    const response = await (generateText as any)({
      model: MODEL,
      prompt,
      system: `You are an expert at analyzing web project structures to identify frameworks and pages.
You understand Next.js, React, Astro, Vue, Svelte, and static HTML projects.
Be thorough in finding all pages - don't miss any routes.
Return valid JSON only.`,
    });

    const jsonMatch = response.text?.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]) as FrameworkInfo;
      console.log(
        `  ✅ Detected framework: ${result.framework} (${result.routingType} routing)`
      );
      console.log(`  📄 Found ${result.pages.length} pages`);
      return result;
    }
  } catch (error) {
    console.log(
      `  ⚠️ AI framework detection failed: ${(error as Error).message}`
    );
  }

  // Fallback: Manual detection for common patterns
  return fallbackFrameworkDetection(filePaths, rootPath);
}

// Fallback framework detection when AI fails
function fallbackFrameworkDetection(
  filePaths: string[],
  rootPath: string
): FrameworkInfo {
  console.log("  Using fallback framework detection...");

  const pages: DetectedPage[] = [];
  const prefix = rootPath ? `${rootPath}/` : "";

  // Check for HTML files (static site)
  const htmlFiles = filePaths.filter(
    (f) =>
      f.endsWith(".html") &&
      !shouldSkipPath(f) &&
      (rootPath ? f.startsWith(prefix) : true)
  );

  if (htmlFiles.length > 0) {
    for (const htmlFile of htmlFiles) {
      const relativePath = rootPath ? htmlFile.replace(prefix, "") : htmlFile;
      const fileName = relativePath.replace(".html", "");
      const route = fileName === "index" ? "/" : `/${fileName}`;
      // Generate concise name
      const name =
        fileName === "index"
          ? "Homepage"
          : fileName
              .replace(/-/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase());

      pages.push({
        pagePath: htmlFile,
        pageRoute: route,
        pageName: name,
      });
    }

    return {
      framework: "static-html",
      routingType: "none",
      pages,
    };
  }

  // Check for Next.js pages directory
  const nextPagesFiles = filePaths.filter(
    (f) =>
      (f.includes("/pages/") || f.startsWith("pages/")) &&
      (f.endsWith(".tsx") ||
        f.endsWith(".jsx") ||
        f.endsWith(".ts") ||
        f.endsWith(".js")) &&
      !f.includes("_app") &&
      !f.includes("_document") &&
      !f.includes("/api/")
  );

  if (nextPagesFiles.length > 0) {
    for (const pageFile of nextPagesFiles) {
      const match = pageFile.match(/pages\/(.+)\.(tsx|jsx|ts|js)$/);
      if (match && match[1]) {
        const routePath = match[1];
        const route =
          routePath === "index" ? "/" : `/${routePath.replace(/\/index$/, "")}`;
        const segment = routePath.split("/").pop() || "Page";
        // Generate concise name
        const name =
          segment === "index"
            ? "Homepage"
            : segment
                .replace(/-/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase());

        pages.push({
          pagePath: pageFile,
          pageRoute: route,
          pageName: name,
        });
      }
    }

    return {
      framework: "nextjs",
      routingType: "file-based",
      pagesDirectory: "pages",
      pages,
    };
  }

  // Check for Next.js app directory
  const nextAppFiles = filePaths.filter(
    (f) => f.includes("/app/") && f.endsWith("page.tsx")
  );

  if (nextAppFiles.length > 0) {
    for (const pageFile of nextAppFiles) {
      const match = pageFile.match(/app\/(.*)\/page\.tsx$/);
      const routePath = match?.[1] ?? "";
      const route = routePath === "" ? "/" : `/${routePath}`;
      const segment = routePath.split("/").pop() || "";
      // Generate concise name
      const name =
        segment === "" || routePath === ""
          ? "Homepage"
          : segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

      pages.push({
        pagePath: pageFile,
        pageRoute: route,
        pageName: name,
      });
    }

    return {
      framework: "nextjs",
      routingType: "file-based",
      pagesDirectory: "app",
      pages,
    };
  }

  // Check for Astro pages
  const astroPages = filePaths.filter(
    (f) => f.includes("/pages/") && f.endsWith(".astro")
  );

  if (astroPages.length > 0) {
    for (const pageFile of astroPages) {
      const match = pageFile.match(/pages\/(.+)\.astro$/);
      if (match && match[1]) {
        const routePath = match[1];
        const route =
          routePath === "index" ? "/" : `/${routePath.replace(/\/index$/, "")}`;
        const segment = routePath.split("/").pop() || "Page";
        // Generate concise name
        const name =
          segment === "index"
            ? "Homepage"
            : segment
                .replace(/-/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase());

        pages.push({
          pagePath: pageFile,
          pageRoute: route,
          pageName: name,
        });
      }
    }

    return {
      framework: "astro",
      routingType: "file-based",
      pagesDirectory: "src/pages",
      pages,
    };
  }

  // Default: assume all source files are potential pages
  return {
    framework: "unknown",
    routingType: "unknown",
    pages: [],
  };
}

// Raw element from file analysis
interface RawElement {
  type: string;
  content: string;
  line: number;
  context: string;
  sourceContext: string; // 3 lines before/after for diff view
  filePath: string;
  href?: string;
  pageRoute: string; // URL route this element belongs to
}

// Section group
export interface SectionGroup {
  name: string;
  description?: string;
  sourceFile: string;
  startLine: number;
  endLine: number;
  pageRoute: string; // URL route this section belongs to (e.g., "/", "/about")
  elements: Array<{
    name: string;
    type: string;
    filePath: string;
    line: number;
    currentValue: string;
    sourceContext: string; // 3 lines before/after for diff view
    confidence: number;
    href?: string;
    pageRoute: string; // URL route this element belongs to
  }>;
}

export interface AnalysisResult {
  sections: SectionGroup[];
  filesAnalyzed: string[];
  frameworkInfo: FrameworkInfo;
  pages: DetectedPage[];
}

// Generate a reasonable name for an element based on its type and content (fallback)
// Names should be short, descriptive role-based titles WITHOUT the content itself
function generateElementName(
  type: string,
  content: string,
  index: number = 0
): string {
  // Create a clean, role-based name without echoing the content
  switch (type) {
    case "heading-h1":
      return "Main Headline";
    case "heading-h2":
      return index === 0 ? "Section Title" : `Section Title ${index + 1}`;
    case "heading-h3":
    case "heading-h4":
    case "heading-h5":
    case "heading-h6":
      return index === 0 ? "Subheading" : `Subheading ${index + 1}`;
    case "paragraph":
      return index === 0 ? "Description" : `Paragraph ${index + 1}`;
    case "button":
      return index === 0 ? "Primary Button" : `Button ${index + 1}`;
    case "link":
      return index === 0 ? "Link" : `Link ${index + 1}`;
    case "image-alt":
      return index === 0 ? "Image Description" : `Image ${index + 1}`;
    case "attribute":
      return index === 0 ? "Attribute" : `Attribute ${index + 1}`;
    default:
      return index === 0 ? "Text Content" : `Text ${index + 1}`;
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

  const prompt = `Analyze these website content elements and group them into logical sections.

ELEMENTS (sorted by position, top to bottom):
${JSON.stringify(elementsForAI, null, 2)}

YOUR TASK:
1. Group elements into logical UI sections (navigation, hero, features, footer, etc.)
2. Name each section with a descriptive 2-4 word title
3. Give each element a role-based title (NOT its content)

SECTION NAMING RULES:
- Use descriptive names like "Hero", "Navigation", "Features", "Footer", "Benefits"
- Section names should describe WHAT the section IS
- Keep names to 1-3 words
- DO NOT include page type prefixes like "Landing Page", "Pitch Deck", "Homepage" etc.
- BAD: "Landing Page Hero", "Pitch Deck Features"
- GOOD: "Hero", "Features"

ELEMENT TITLE RULES (CRITICAL):
- Titles describe the element's ROLE, not its content
- BAD: "Learn More Button" (echoes content)
- GOOD: "Primary CTA" (describes role)
- BAD: "Welcome to Our Site" (echoes content)
- GOOD: "Main Headline" (describes role)

EXAMPLES OF GOOD ELEMENT TITLES:
- "Main Headline" (not the actual heading text)
- "Primary CTA" (not "Learn More Button")
- "Description" (not the paragraph text)
- "Navigation Link 1", "Navigation Link 2"
- "Feature Title", "Feature Description"
- "Hero Image Alt"

Return ONLY valid JSON in this exact format:
[
  {
    "name": "Hero Section",
    "description": "Main hero with headline and CTA",
    "elements": [
      { "idx": 0, "title": "Main Headline" },
      { "idx": 1, "title": "Supporting Text" },
      { "idx": 2, "title": "Primary CTA" }
    ]
  }
]

IMPORTANT:
- idx values MUST match the "idx" from the input
- Every element MUST have both "idx" and "title"
- Include ALL elements from the input
- Return ONLY the JSON array, no other text`;

  try {
    const response = await (generateText as any)({
      model: "openai/gpt-5-mini",
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

    // Track type counts for fallback naming
    const typeCounters = new Map<string, number>();

    for (const aiSection of aiSections) {
      // Support both old format (elementIndices) and new format (elements with titles)
      const elementsWithTitles =
        aiSection.elements ||
        aiSection.elementIndices?.map((idx: number) => ({
          idx,
          title: null,
        })) ||
        [];

      if (elementsWithTitles.length === 0) {
        continue;
      }

      const sectionElements = elementsWithTitles
        .map((el: { idx: number; title?: string }) => {
          const rawElement = sorted[el.idx];
          if (!rawElement) return null;

          // Use AI title if provided, otherwise generate fallback
          let title = el.title;
          if (!title || title.trim() === "") {
            const typeCount = typeCounters.get(rawElement.type) || 0;
            typeCounters.set(rawElement.type, typeCount + 1);
            title = generateElementName(
              rawElement.type,
              rawElement.content,
              typeCount
            );
          }

          return {
            ...rawElement,
            aiTitle: title,
          };
        })
        .filter(Boolean) as (RawElement & { aiTitle: string })[];

      if (sectionElements.length === 0) continue;

      const lines = sectionElements.map((e) => e.line);
      const startLine = Math.min(...lines);
      const endLine = Math.max(...lines);

      // Get the most common page route for this section
      const pageRouteCounts = new Map<string, number>();
      for (const e of sectionElements) {
        const count = pageRouteCounts.get(e.pageRoute) || 0;
        pageRouteCounts.set(e.pageRoute, count + 1);
      }
      const sectionPageRoute =
        [...pageRouteCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ||
        "/";

      // Generate section name - use AI name or derive from elements
      let sectionName = aiSection.name;
      if (
        !sectionName ||
        sectionName === "Untitled Section" ||
        sectionName.match(/^Section \d+$/)
      ) {
        // Convert sectionElements back to RawElement format for generateSectionName
        const rawElems = sectionElements.map((e) => ({
          type: e.type,
          content: e.content,
          line: e.line,
          context: e.context,
          sourceContext: e.sourceContext,
          filePath: e.filePath,
          href: e.href,
          pageRoute: e.pageRoute,
        }));
        sectionName = generateSectionName(rawElems, sections.length);
      }

      sections.push({
        name: sectionName,
        description: aiSection.description,
        sourceFile: sectionElements[0]!.filePath,
        startLine,
        endLine,
        pageRoute: sectionPageRoute,
        elements: sectionElements.map((e) => ({
          name: e.aiTitle,
          type: e.type,
          filePath: e.filePath,
          line: e.line,
          currentValue: e.content,
          sourceContext: e.sourceContext,
          confidence: 0.9,
          href: e.href,
          pageRoute: e.pageRoute,
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

// Generate a section name based on the first heading or content
function generateSectionName(elements: RawElement[], index: number): string {
  // Look for a heading in the elements to derive the section name
  const heading = elements.find((e) => e.type.startsWith("heading"));
  if (heading) {
    // Clean up the heading content to create a section name
    const cleanContent = heading.content
      .replace(/[^\w\s]/g, "") // Remove special chars
      .trim()
      .split(/\s+/)
      .slice(0, 4) // Max 4 words
      .join(" ");
    if (cleanContent.length > 0 && cleanContent.length <= 40) {
      return cleanContent;
    }
  }

  // Look for buttons to identify CTA sections
  const hasButtons = elements.some((e) => e.type === "button");
  const hasLinks = elements.some((e) => e.type === "link");
  const hasHeadings = elements.some((e) => e.type.startsWith("heading"));
  const hasParagraphs = elements.some((e) => e.type === "paragraph");

  // Generate contextual names based on content types
  if (hasHeadings && hasButtons) {
    return index === 0 ? "Hero Section" : `Call to Action ${index}`;
  }
  if (hasLinks && !hasHeadings && !hasParagraphs) {
    return index === 0 ? "Navigation" : `Links ${index}`;
  }
  if (hasParagraphs && !hasButtons) {
    return index === 0 ? "Content" : `Content Block ${index}`;
  }

  // Default fallback with better naming
  const sectionTypes = [
    "Header",
    "Main Content",
    "Features",
    "Details",
    "Footer",
  ];
  return sectionTypes[index % sectionTypes.length] || `Section ${index + 1}`;
}

// Fallback grouping when AI fails - group by headings
function fallbackGrouping(elements: RawElement[]): SectionGroup[] {
  const sections: SectionGroup[] = [];
  let currentElements: RawElement[] = [];
  let sectionIndex = 0;

  // Helper to get the most common page route from a list of elements
  const getMostCommonPageRoute = (elems: RawElement[]): string => {
    const counts = new Map<string, number>();
    for (const e of elems) {
      const count = counts.get(e.pageRoute) || 0;
      counts.set(e.pageRoute, count + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "/";
  };

  // Track element type counts for better naming within sections
  const typeCounters = new Map<string, number>();

  for (const elem of elements) {
    // Start new section on headings
    const firstElem = currentElements[0];
    if (
      elem.type.startsWith("heading") &&
      currentElements.length > 0 &&
      firstElem
    ) {
      const lines = currentElements.map((e) => e.line);
      const pageRoute = getMostCommonPageRoute(currentElements);
      typeCounters.clear();
      sections.push({
        name: generateSectionName(currentElements, sectionIndex),
        sourceFile: firstElem.filePath,
        startLine: Math.min(...lines),
        endLine: Math.max(...lines),
        pageRoute,
        elements: currentElements.map((e, i) => {
          const typeCount = typeCounters.get(e.type) || 0;
          typeCounters.set(e.type, typeCount + 1);
          return {
            name: generateElementName(e.type, e.content, typeCount),
            type: e.type,
            filePath: e.filePath,
            line: e.line,
            currentValue: e.content,
            sourceContext: e.sourceContext,
            confidence: 0.9,
            href: e.href,
            pageRoute: e.pageRoute,
          };
        }),
      });
      currentElements = [];
      sectionIndex++;
    }
    currentElements.push(elem);
  }

  // Don't forget the last section
  const lastFirstElem = currentElements[0];
  if (currentElements.length > 0 && lastFirstElem) {
    const lines = currentElements.map((e) => e.line);
    const pageRoute = getMostCommonPageRoute(currentElements);
    typeCounters.clear();
    sections.push({
      name: generateSectionName(currentElements, sectionIndex),
      sourceFile: lastFirstElem.filePath,
      startLine: Math.min(...lines),
      endLine: Math.max(...lines),
      pageRoute,
      elements: currentElements.map((e, i) => {
        const typeCount = typeCounters.get(e.type) || 0;
        typeCounters.set(e.type, typeCount + 1);
        return {
          name: generateElementName(e.type, e.content, typeCount),
          type: e.type,
          filePath: e.filePath,
          line: e.line,
          currentValue: e.content,
          sourceContext: e.sourceContext,
          confidence: 0.9,
          href: e.href,
          pageRoute: e.pageRoute,
        };
      }),
    });
  }

  return sections;
}

// Progress callback type
export type ProgressCallback = (
  progress: number,
  message: string
) => void | Promise<void>;

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
    // Step 1: Detect framework and pages (0-10%)
    await reportProgress(2, "Detecting framework and pages");
    logger.workflow.step("Detecting framework and pages");
    const frameworkInfo = await detectFrameworkAndPages(executors, rootPath);

    console.log(
      `  🔧 Framework: ${frameworkInfo.framework} (${frameworkInfo.routingType} routing)`
    );
    console.log(`  📄 Detected ${frameworkInfo.pages.length} pages`);
    frameworkInfo.pages.forEach((p) =>
      console.log(`    - ${p.pageRoute}: ${p.pagePath}`)
    );

    // Create a mapping from file paths to page routes
    const fileToPageRoute = new Map<string, string>();
    for (const page of frameworkInfo.pages) {
      fileToPageRoute.set(page.pagePath, page.pageRoute);
    }
    console.log(`  📍 Page route map created with ${fileToPageRoute.size} entries:`);
    for (const [path, route] of fileToPageRoute) {
      console.log(`      "${path}" → "${route}"`);
    }

    // Helper to find the page route for a file
    const getPageRouteForFile = (filePath: string): string => {
      // Normalize the file path (remove leading ./ if present)
      const normalizedPath = filePath.replace(/^\.\//, "");

      // Direct match
      if (fileToPageRoute.has(normalizedPath)) {
        console.log(`    🎯 [Route Match] "${filePath}" → direct match → "${fileToPageRoute.get(normalizedPath)}"`);
        return fileToPageRoute.get(normalizedPath)!;
      }

      // Also try matching just the filename for root-level HTML files
      const fileName = normalizedPath.split("/").pop() || "";
      if (fileToPageRoute.has(fileName)) {
        console.log(`    🎯 [Route Match] "${filePath}" → filename match "${fileName}" → "${fileToPageRoute.get(fileName)}"`);
        return fileToPageRoute.get(fileName)!;
      }

      // For components, try to find the closest page (check if file is in same directory as a page)
      const fileDir = normalizedPath.split("/").slice(0, -1).join("/");
      for (const [pagePath, pageRoute] of fileToPageRoute) {
        const pageDir = pagePath.split("/").slice(0, -1).join("/");
        // Only match if both are in the same directory (not just empty strings)
        if (fileDir && pageDir && (fileDir.startsWith(pageDir) || pageDir.startsWith(fileDir))) {
          console.log(`    🎯 [Route Match] "${filePath}" → dir match "${pagePath}" → "${pageRoute}"`);
          return pageRoute;
        }
      }

      // Fallback - log details about why no match was found
      const defaultRoute = frameworkInfo.pages.length === 1 && frameworkInfo.pages[0]
        ? frameworkInfo.pages[0].pageRoute
        : "/";
      console.log(`    ⚠️ [Route Match] "${filePath}" → NO MATCH, using fallback "${defaultRoute}"`);
      console.log(`       Available pages in map: ${[...fileToPageRoute.keys()].join(", ")}`);

      return defaultRoute;
    };

    // Step 2: List all files in the repository/subdirectory (10-15%)
    await reportProgress(10, "Listing repository files");
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

    await reportProgress(15, `Found ${sourceFiles.length} source files`);
    console.log(`  Found ${sourceFiles.length} source files to analyze`);

    if (sourceFiles.length === 0) {
      console.log(`  No source files found in ${rootPath || "repository"}`);
      await reportProgress(100, "No source files found");
      logger.workflow.complete("analyzeRepository", Date.now() - startTime, {
        sectionsFound: 0,
        filesAnalyzed: 0,
      });
      return {
        sections: [],
        filesAnalyzed: [],
        frameworkInfo,
        pages: frameworkInfo.pages,
      };
    }

    // Step 3: Analyze each source file (15-85%)
    logger.workflow.step(`Analyzing ${sourceFiles.length} source files`);

    for (let i = 0; i < sourceFiles.length; i++) {
      const file = sourceFiles[i]!;
      // Progress from 15% to 85% based on file count
      const fileProgress = 15 + Math.round((i / sourceFiles.length) * 70);
      await reportProgress(
        fileProgress,
        `Analyzing ${file.name} (${i + 1}/${sourceFiles.length})`
      );

      try {
        const analysis = await executors.analyzeSourceFile({ path: file.path });
        filesAnalyzed.push(file.path);

        if (analysis.elements.length > 0) {
          // Determine page route for this file
          const pageRoute = getPageRouteForFile(file.path);
          console.log(
            `  📄 ${file.path}: ${analysis.elements.length} elements found (page: ${pageRoute})`
          );

          // Add raw elements with file path and page route
          for (const elem of analysis.elements) {
            allRawElements.push({
              type: elem.type,
              content: elem.content,
              line: elem.line,
              context: elem.context,
              sourceContext: elem.sourceContext,
              filePath: file.path,
              href: elem.href,
              pageRoute,
            });
          }
        }
      } catch (error) {
        console.log(
          `  ⚠️ Failed to analyze ${file.path}: ${(error as Error).message}`
        );
      }
    }

    // Step 4: Use AI to group elements into sections (85-95%)
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
        console.log(
          `  ${i + 1}. "${s.name}" (${s.pageRoute}) - ${
            s.elements.length
          } elements`
        );
      });
    }

    // Log page summary
    const pageElementCounts = new Map<string, number>();
    for (const section of sections) {
      for (const element of section.elements) {
        const count = pageElementCounts.get(element.pageRoute) || 0;
        pageElementCounts.set(element.pageRoute, count + 1);
      }
    }
    console.log("📄 Elements by page:");
    for (const [route, count] of pageElementCounts) {
      console.log(`    ${route}: ${count} elements`);
    }

    const result: AnalysisResult = {
      sections,
      filesAnalyzed,
      frameworkInfo,
      pages: frameworkInfo.pages,
    };

    logger.workflow.complete("analyzeRepository", Date.now() - startTime, {
      sectionsFound: result.sections.length,
      elementsFound: result.sections.reduce(
        (acc, s) => acc + s.elements.length,
        0
      ),
      filesAnalyzed: result.filesAnalyzed.length,
      pagesFound: result.pages.length,
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
