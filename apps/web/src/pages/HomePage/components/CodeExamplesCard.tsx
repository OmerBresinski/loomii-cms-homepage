import CodeCardStack from "./CodeCardStack";

const CodeExamplesCard = () => {
  return (
    <div className="p-8 bg-[#0a0a0a] hover:bg-[#111] transition-colors group relative overflow-hidden flex items-center">
      <div className="absolute top-0 left-0 w-full h-px bg-white/30 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
      <div className="flex-1 pr-8">
        <div className="inline-block px-3 py-1 bg-violet-500/10 text-violet-400 text-xs font-medium rounded-full mb-4 border border-violet-500/30">
          Content as Code
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">
          Edit Any Content Element
        </h3>
        <p className="text-gray-400 text-sm mb-6 max-w-md">
          From hero headlines to pricing tables, meta tags to blog posts — every
          piece of content is editable and tracked in your codebase.
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded text-xs text-gray-400">
            Headlines
          </span>
          <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded text-xs text-gray-400">
            Navigation
          </span>
          <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded text-xs text-gray-400">
            CTAs
          </span>
          <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded text-xs text-gray-400">
            SEO Meta
          </span>
          <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded text-xs text-gray-400">
            Blog Posts
          </span>
        </div>
      </div>

      {/* Code Cards */}
      <div className="w-80 shrink-0 translate-y-[10px]">
        <CodeCardStack />
      </div>
    </div>
  );
};

export default CodeExamplesCard;
