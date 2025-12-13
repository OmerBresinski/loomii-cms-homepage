import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/projects/$projectId")({
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { projectId } = Route.useParams();

  // TODO: Fetch project details with TanStack Query

  return (
    <div className="p-8 animate-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Project: {projectId}</h1>
        <p className="text-foreground-muted">View and edit your website content.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Sidebar - Page List */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Pages</h2>
            <div className="space-y-2">
              <PageItem url="/" title="Home" elementCount={12} active />
              <PageItem url="/about" title="About" elementCount={8} />
              <PageItem url="/contact" title="Contact" elementCount={5} />
            </div>
          </div>
        </div>

        {/* Main Content - Element List */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Elements</h2>
              <div className="flex gap-2">
                <select className="input text-sm py-1 px-2 w-auto">
                  <option value="all">All Types</option>
                  <option value="heading">Headings</option>
                  <option value="paragraph">Paragraphs</option>
                  <option value="image">Images</option>
                  <option value="button">Buttons</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <ElementCard
                type="heading"
                name="Hero Title"
                value="Welcome to our website"
                confidence={0.95}
              />
              <ElementCard
                type="paragraph"
                name="Hero Description"
                value="We build amazing things for the web."
                confidence={0.88}
              />
              <ElementCard
                type="button"
                name="CTA Button"
                value="Get Started"
                confidence={0.92}
              />
              <ElementCard
                type="image"
                name="Hero Image"
                value="/images/hero.jpg"
                confidence={0.85}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageItem({
  url,
  title,
  elementCount,
  active = false,
}: {
  url: string;
  title: string;
  elementCount: number;
  active?: boolean;
}) {
  return (
    <button
      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
        active
          ? "bg-accent/10 text-accent border border-accent/30"
          : "hover:bg-background-tertiary"
      }`}
    >
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-foreground-subtle">
        {url} · {elementCount} elements
      </p>
    </button>
  );
}

function ElementCard({
  type,
  name,
  value,
  confidence,
}: {
  type: string;
  name: string;
  value: string;
  confidence: number;
}) {
  const typeColors: Record<string, string> = {
    heading: "bg-blue-500/20 text-blue-400",
    paragraph: "bg-green-500/20 text-green-400",
    button: "bg-purple-500/20 text-purple-400",
    image: "bg-orange-500/20 text-orange-400",
  };

  return (
    <div className="p-4 rounded-lg border border-border hover:border-border-hover transition-colors cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`badge ${typeColors[type] || "badge-accent"}`}>
            {type}
          </span>
          <span className="font-medium text-sm">{name}</span>
        </div>
        <span className="text-xs text-foreground-subtle">
          {Math.round(confidence * 100)}% confidence
        </span>
      </div>
      <p className="text-sm text-foreground-muted truncate">{value}</p>
    </div>
  );
}

