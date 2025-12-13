import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h12M4 18h8" />
              </svg>
            </div>
            <span className="font-semibold text-lg">AI CMS</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/dashboard" className="btn-secondary">
              Dashboard
            </Link>
            <a href="/api/auth/github" className="btn-primary">
              Sign in with GitHub
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-20">
        <div className="max-w-3xl mx-auto text-center animate-in">
          <h1 className="text-5xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground to-foreground-muted bg-clip-text text-transparent">
            Edit your website with AI.
            <br />
            <span className="text-accent">Ship with PRs.</span>
          </h1>
          <p className="text-xl text-foreground-muted mb-10 text-balance">
            Connect your GitHub repo and live site. Our AI analyzes your pages and generates a CMS tailored to your content. Every edit becomes a pull request.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a href="/api/auth/github" className="btn-primary text-base px-6 py-3">
              Get Started Free
            </a>
            <Link to="/dashboard" className="btn-secondary text-base px-6 py-3">
              View Demo
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-24 max-w-5xl mx-auto">
          <FeatureCard
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
            title="AI-Powered Analysis"
            description="Our AI agent crawls your live site, identifying editable content like headers, images, and CTAs."
          />
          <FeatureCard
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
            title="Visual Editor"
            description="Edit content directly with a WYSIWYG interface. Preview changes before submitting."
          />
          <FeatureCard
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            title="Code PRs"
            description="Changes become precise code diffs. Developers review and merge like any other PR."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-24">
        <div className="container mx-auto px-6 py-8 text-center text-foreground-subtle text-sm">
          Built with AI SDK, Mastra, and Hono. Deploy frontend to Vercel, backend anywhere.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="card hover:border-border-hover transition-colors">
      <div className="w-12 h-12 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-foreground-muted text-sm">{description}</p>
    </div>
  );
}

