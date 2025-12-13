// Application constants

export const APP_NAME = "AI CMS";
export const APP_VERSION = "0.1.0";

// Analysis settings
export const MAX_PAGES_PER_ANALYSIS = 50;
export const MAX_ELEMENTS_PER_PAGE = 100;
export const ANALYSIS_TIMEOUT_MS = 300000; // 5 minutes
export const SCREENSHOT_WIDTH = 1280;
export const SCREENSHOT_HEIGHT = 720;

// Confidence thresholds
export const MIN_ELEMENT_CONFIDENCE = 0.7;
export const HIGH_CONFIDENCE_THRESHOLD = 0.9;

// GitHub settings
export const GITHUB_API_VERSION = "2022-11-28";
export const MAX_PR_TITLE_LENGTH = 200;
export const MAX_PR_DESCRIPTION_LENGTH = 65535;

// Rate limiting
export const RATE_LIMIT_REQUESTS_PER_MINUTE = 60;
export const RATE_LIMIT_ANALYSIS_PER_HOUR = 10;

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Session settings
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Element type display names
export const ELEMENT_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  heading: "Heading",
  paragraph: "Paragraph",
  image: "Image",
  link: "Link",
  button: "Button",
  section: "Section",
  list: "List",
  navigation: "Navigation",
  footer: "Footer",
  hero: "Hero Section",
  card: "Card",
  custom: "Custom Element",
};

// Status display names
export const PROJECT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  analyzing: "Analyzing",
  ready: "Ready",
  error: "Error",
  archived: "Archived",
};

export const EDIT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_review: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
};

export const PR_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  merged: "Merged",
  closed: "Closed",
  draft: "Draft",
  conflict: "Has Conflicts",
};

