import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SignedIn, SignedOut, SignInButton, useOrganization } from "@clerk/clerk-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const { organization, isLoaded } = useOrganization();

  // Redirect signed-in users with an org to dashboard
  useEffect(() => {
    if (isLoaded && organization) {
      navigate({ to: "/dashboard" });
    }
  }, [isLoaded, organization, navigate]);

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="py-24 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 text-center relative">
          <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full mb-8 border border-primary/30">
            Now in Public Beta
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Edit content.
            <br />
            <span className="text-gray-500">Ship as code.</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Add a CMS to any live site in minutes. AI analyzes your pages, you edit visually,
            changes become pull requests.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <SignedOut>
              <SignInButton mode="modal" forceRedirectUrl="/onboarding">
                <Button size="lg" className="h-12 px-8 text-base">
                  Get Started
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Button size="lg" className="h-12 px-8 text-base" asChild>
                <Link to="/onboarding">Go to Dashboard</Link>
              </Button>
            </SignedIn>
            <Button variant="outline" size="lg" className="h-12 px-8 text-base" asChild>
              <a href="#features">See How It Works</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Three steps to transform how your team manages content.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              step="01"
              title="Connect"
              description="Link your GitHub repo and live deployment URL. That's all we need to get started."
            />
            <FeatureCard
              step="02"
              title="Analyze"
              description="AI scans your site, identifies editable content, and builds a custom CMS dashboard."
            />
            <FeatureCard
              step="03"
              title="Edit & Ship"
              description="Make changes visually, preview them, and ship as a pull request. Developers just review."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[300px] bg-primary/10 blur-[100px] rounded-full" />
        </div>
        <div className="max-w-2xl mx-auto px-6 text-center relative">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to transform your workflow?
          </h2>
          <p className="text-gray-400 mb-8">
            Join teams shipping content faster with AI-powered editing.
          </p>
          <SignedOut>
            <SignInButton mode="modal" forceRedirectUrl="/onboarding">
              <Button size="lg" className="h-12 px-8 text-base">
                Get Started Free
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Button size="lg" className="h-12 px-8 text-base" asChild>
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          </SignedIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-5 h-5 bg-primary rounded flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">L</span>
            </div>
            <span>Loomii CMS</span>
          </div>
          <div className="text-sm text-gray-600">© 2025 Loomii CMS</div>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  step: string;
  title: string;
  description: string;
}

function FeatureCard({ step, title, description }: FeatureCardProps) {
  return (
    <div className="p-8 border border-white/10 rounded-lg bg-[#111] hover:bg-[#161616] transition-colors group">
      <div className="text-4xl font-bold text-white/10 group-hover:text-white/20 transition-colors mb-4">
        {step}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}
