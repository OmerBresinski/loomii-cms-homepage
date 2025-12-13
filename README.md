# AI CMS

An AI-powered CMS that automatically analyzes live websites and generates code-based pull requests for content changes.

## Features

- **AI-Powered Analysis**: Connect your GitHub repo and live site URL. AI agents crawl and analyze your pages to identify editable content.
- **Visual Editor**: Edit content through an intuitive interface. Preview changes before submitting.
- **Code PRs**: Every edit becomes a precise code diff. Developers review and merge like any other PR.
- **Team Collaboration**: Invite team members with different roles (viewers, editors, admins).
- **Multi-Provider Deployment**: Frontend deploys to Vercel, backend to Railway or any Node.js host.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + TanStack Router + TanStack Query |
| Backend | Hono (Bun runtime) + Hono RPC |
| Database | PostgreSQL + Prisma |
| AI | Vercel AI SDK + AI Gateway + Mastra |
| Deployment | Vercel (frontend) + Railway (backend) |

## Project Structure

```
├── apps/
│   ├── web/          # React frontend (Vercel)
│   └── api/          # Hono API server (Railway/Bun)
├── packages/
│   ├── ai/           # Mastra agents & workflows
│   ├── db/           # Prisma schema & client
│   └── shared/       # Shared types & utilities
```

## Getting Started

### Prerequisites

- Node.js 20+
- Bun 1.x
- pnpm 9+
- PostgreSQL database

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/ai-cms.git
cd ai-cms
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
# Copy example env files
cp .env.example .env

# Required variables:
# DATABASE_URL=postgresql://...
# GITHUB_CLIENT_ID=...
# GITHUB_CLIENT_SECRET=...
# VERCEL_AI_GATEWAY_API_KEY=...
# SESSION_SECRET=...
```

4. Set up the database:
```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# (Optional) Seed demo data
pnpm db:seed
```

5. Start development servers:
```bash
# Start all apps
pnpm dev

# Or start individually:
# Frontend: http://localhost:5173
cd apps/web && pnpm dev

# Backend: http://localhost:3001
cd apps/api && pnpm dev
```

## Deployment

### Frontend (Vercel)

1. Connect your repo to Vercel
2. Set root directory to `apps/web`
3. Build command: `pnpm turbo build --filter=@ai-cms/web`
4. Add environment variables

### Backend (Railway)

1. Create new project in Railway
2. Connect your repo
3. Set Dockerfile path to `apps/api/Dockerfile`
4. Add environment variables:
   - `DATABASE_URL`
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `VERCEL_AI_GATEWAY_API_KEY`
   - `SESSION_SECRET`
   - `FRONTEND_URL`
   - `API_URL`

## Development

### Commands

```bash
# Build all packages
pnpm build

# Run type checking
pnpm type-check

# Run linting
pnpm lint

# Run tests
pnpm test

# Database commands
pnpm db:generate   # Generate Prisma client
pnpm db:migrate    # Run migrations (dev)
pnpm db:push       # Push schema changes
pnpm db:studio     # Open Prisma Studio
pnpm db:seed       # Seed demo data
```

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Hono API  │────▶│  PostgreSQL │
│   (Vercel)  │     │  (Railway)  │     │             │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │   Mastra    │
                    │   Agents    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Browser  │ │ AI SDK + │ │  GitHub  │
        │  Tools   │ │ Gateway  │ │   API    │
        └──────────┘ └──────────┘ └──────────┘
```

## License

MIT

