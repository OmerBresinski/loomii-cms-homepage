  ---
  Frontend Improvement Plan for Loomii CMS

  Executive Summary

  The app has a solid technical foundation (React 19, TanStack Router/Query, shadcn/ui, Tailwind) and a polished dark aesthetic. However, the core editing experience feels more like a "data browser" than a visual content editor. The main opportunities are around making editing more visual and intuitive, completing unfinished flows, and adding polish.

  ---
  🎯 Priority 1: Core Editor Experience

  Problem: The ProjectDetailPage is the heart of the app but feels disconnected from the actual website being edited.

  1.1 Live Preview Panel (High Impact)

  - Add a split-view with an iframe showing the actual deployed site
  - Highlight elements on hover in the preview
  - Click elements in preview to edit them directly
  - Show changes in real-time as users type

  1.2 Inline Editing Improvements

  - Current: Edit via accordion → input field → save button (3 steps)
  - Better: Double-click element text to edit inline (1 step)
  - Add click-to-edit on the element value itself
  - Show diff preview (strikethrough old, highlight new) before saving

  1.3 Visual Element Cards

  - Replace the text-heavy list with visual cards
  - Show image thumbnails for image elements
  - Show button previews for buttons (with actual styling hints)
  - Color-code by element type more prominently

  1.4 Better Section Organization

  - Add drag-and-drop to reorder sections
  - Section thumbnails/previews
  - Collapse all / Expand all buttons
  - "Jump to" quick navigation

  ---
  🎯 Priority 2: Complete Unfinished Flows

  2.1 PR Creation Flow (Critical - Currently "Coming Soon")

  - Implement actual GitHub PR creation
  - Add commit message input with smart defaults
  - Show PR preview (title, description, files changed)
  - Branch selection (create new or use existing)
  - Add PR template support

  2.2 Individual Edit Management

  - Allow removing single edits from Review page
  - Edit history with undo/redo
  - "Discard changes for this element" option
  - Batch select/deselect edits

  2.3 View Site Integration

  - "View Site" button currently does nothing meaningful
  - Open deployment URL in new tab
  - Add deployment status indicator
  - Quick link to specific page being edited

  ---
  🎯 Priority 3: Navigation & Discovery

  3.1 Command Palette (⌘K)

  - Global search across projects, sections, elements
  - Quick actions: "New Project", "Go to Settings", "Review Changes"
  - Recent items
  - Keyboard-first navigation

  3.2 Keyboard Shortcuts

  - E - Edit selected element
  - S - Save current edit
  - Esc - Cancel/close
  - ←/→ - Navigate between elements
  - / - Focus search
  - ? - Show shortcuts help

  3.3 Breadcrumb Improvements

  - Make breadcrumbs clickable dropdowns
  - Show siblings in dropdown (other projects, other pages)
  - Add "copy link" to current location

  ---
  🎯 Priority 4: Dashboard & Projects

  4.1 Dashboard Home Enhancements

  - Activity feed showing recent edits, PRs, analyses
  - Quick actions cards (not just stats)
  - "Continue where you left off" - last edited project/element
  - Sparkline charts for activity trends

  4.2 Projects Page Improvements

  - Grid/List view toggle
  - Sort by: name, last modified, status
  - Filter by: status, has pending edits
  - Quick actions menu (⋯): Delete, Duplicate, Settings
  - Project cards with preview thumbnails

  4.3 Project Settings

  - Currently no way to edit project settings after creation
  - Add settings tab/page per project
  - Allow changing deployment URL, root path
  - Danger zone: delete project

  ---
  🎯 Priority 5: Visual Polish & Consistency

  5.1 Loading States

  - Replace generic spinners with skeleton screens
  - Add shimmer effect to skeletons
  - Optimistic UI updates where possible
  - Progress indicators for long operations

  5.2 Empty States

  - More engaging illustrations
  - Contextual help text
  - Clear call-to-action
  - "Learn more" links to docs

  5.3 Micro-interactions

  - Button press effects
  - Success celebrations (confetti on PR merge?)
  - Smooth transitions between states
  - Toast notifications with undo actions

  5.4 Consistency Pass

  - Standardize padding (p-6 vs p-8)
  - Consistent icon sizes
  - Unified button styles across flows
  - Form validation patterns

  ---
  🎯 Priority 6: Mobile & Responsive

  6.1 Mobile Navigation

  - Pages sidebar currently hidden on mobile
  - Add mobile-friendly page selector (dropdown or sheet)
  - Bottom navigation bar for key actions
  - Swipe gestures for navigation

  6.2 Touch-Friendly Editing

  - Larger tap targets
  - Mobile-optimized element editor
  - Pull-to-refresh for analysis status

  ---
  🎯 Priority 7: Settings & Preferences

  7.1 Theme Toggle

  - Add light mode option (currently dark-only)
  - System preference detection
  - Per-user preference storage

  7.2 User Preferences

  - Default view preferences (grid/list)
  - Notification settings
  - Editor preferences (auto-save, confirm on discard)

  ---
  🎯 Priority 8: Developer Experience

  8.1 Error Handling

  - Better error boundaries with recovery options
  - Detailed error messages with solutions
  - Error reporting/feedback mechanism

  8.2 Performance Monitoring

  - Add performance marks for key interactions
  - Lazy load heavy components (diff viewer, code highlighting)
  - Virtual scrolling for long element lists

  ---
  Implementation Phases

  Phase 1 (Foundation) -
  - Command palette
  - Complete PR creation flow
  - Keyboard shortcuts
  - Project settings page

  Phase 2 (Core Experience) -
  - Live preview panel
  - Inline editing
  - Visual element cards
  - Individual edit management

  Phase 3 (Polish) -
  - Loading state improvements
  - Empty state designs
  - Mobile responsive fixes
  - Theme toggle

  Phase 4 (Delight) -
  - Micro-interactions
  - Activity feed
  - Sparkline charts
  - Advanced keyboard nav

  ---
  Quick Wins (Can do immediately)

  1. Fix "View Site" button - Link to deployment URL
  2. Add project count to Projects page header
  3. Collapse all sections button
  4. Copy element value to clipboard
  5. Show unsaved changes indicator in sidebar
  6. Add tooltips to icon-only buttons
  7. Improve Review page sticky footer - it overlaps content