# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI CMS - An AI-powered content management system that analyzes live websites/GitHub repos and generates code-based pull requests for content changes. Users connect a GitHub repo + live site URL, AI identifies editable content, and edits become precise code diffs as PRs.

## Development Commands

```bash
# Start all apps (API + Web)
npm run dev

# Start individually
npm run dev:api         # API at http://localhost:3001
npm run dev:web         # Frontend at http://localhost:5173

# Build
npm run build           # Build all
npm run build:api       # API only
npm run build:web       # Web only

# Database (PostgreSQL + Prisma)
npm run db:push         # Push schema changes
npm run db:migrate      # Run migrations
npm run db:studio       # Open Prisma Studio GUI

# Testing
npm run test            # Run tests
cd apps/web && npm run test:e2e    # Playwright E2E tests

# Type checking & linting
cd apps/api && npm run type-check && npm run lint
cd apps/web && npm run type-check && npm run lint
```

## Architecture

**Monorepo** using Bun workspaces with two main apps:

```
apps/
├── api/        # Hono + Bun backend (deploys to Railway)
│   ├── src/
│   │   ├── app.ts              # Hono app with routes & middleware
│   │   ├── routes/             # API endpoints
│   │   ├── middleware/auth.ts  # Clerk auth + project access control
│   │   ├── ai/analyze.ts       # AI repository analysis engine
│   │   └── db/client.ts        # Prisma client
│   └── prisma/schema.prisma    # Database schema
│
└── web/        # React + Vite frontend (deploys to Vercel)
    └── src/
        ├── ui/           # shadcn UI components
        ├── api/          # TanStack Query hooks
        ├── pages/        # Page components (feature folders)
        └── components/   # Shared components including editor/
```

**Key Technologies:**
- Frontend: React 19, Vite, TanStack Router + Query, Tailwind CSS, shadcn/ui, Clerk
- Backend: Hono, Bun runtime, Prisma, PostgreSQL, Vercel AI SDK
- AI: xai/grok-code-fast-1 model for content analysis

## API Structure

Backend routes in `apps/api/src/routes/`:
- `auth.ts` - Authentication endpoints
- `organizations.ts` - Org management (synced with Clerk)
- `projects.ts` - Project CRUD
- `analysis.ts` - AI analysis triggers
- `elements.ts` - Editable content elements
- `sections.ts` - Page sections
- `edits.ts` - Content edit workflow
- `github.ts` - GitHub integration
- `team.ts` - Team/role management

Auth middleware (`apps/api/src/middleware/auth.ts`) handles Clerk authentication and project-level access control with roles: owner, admin, editor, viewer.

## Data Model

Core entities in Prisma schema:
- `Organization` → `Project` → `Section` → `Element` → `Edit` → `PullRequest`
- `User` with `OrganizationMember` and `TeamMember` for role-based access
- `AnalysisJob` tracks AI analysis progress

Element types: text, heading, paragraph, image, link, button, section, list, navigation, footer, hero, card, custom

Edit statuses: draft → pending_review → approved/rejected

## Frontend Conventions

From `apps/web/AGENTS.md`:

- **Routing**: Use TanStack Router with coded routes only (no file-based routing)
- **Data fetching**: TanStack Query exclusively, with optimistic mutations
- **UI**: shadcn components via `npx shadcn@latest add`, styled with Tailwind + `cn()` from `@/lib/utils.ts`
- **Structure**: Pages in `pages/<PageName>/` with local `components/` subfolder
- **Hooks**: Place data hooks in `api/` folder (e.g., `useProjectQuery.ts`)

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` - GitHub OAuth
- `VERCEL_AI_GATEWAY_API_KEY` - AI access
- `SESSION_SECRET`

Frontend communicates with API via proxy configured in `apps/web/vite.config.ts` (proxies `/api` to `http://localhost:3001`).
