const PRAutomationCard = () => {
  return (
    <div className="p-8 border-b border-white/10 bg-[#0a0a0a] hover:bg-[#111] transition-colors group relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-white/30 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
      {/* Red glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-red-500/10 blur-[80px] rounded-full pointer-events-none" />

      <div className="relative z-10 flex items-start gap-8">
        <div className="flex-1">
          <div className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full mb-4 border border-emerald-500/30">
            Git-Native Workflow
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">
            Auto-Generated Pull Requests
          </h3>
          <p className="text-gray-400 text-sm mb-6 max-w-md">
            Every content edit automatically generates a GitHub pull request
            with clear diffs, summaries, and review-ready changes. No manual
            commits needed.
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
              <span>Auto-commit</span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
              <span>Branch management</span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
              <span>Review workflow</span>
            </div>
          </div>
        </div>

        {/* PR Card */}
        <div className="w-72 shrink-0">
          <div className="bg-[#111] rounded-lg border border-white/10 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <span className="text-sm text-emerald-400 font-medium block">
                  Ready to merge
                </span>
                <span className="text-xs text-gray-500">2 approvals</span>
              </div>
            </div>
            <div className="text-base text-white font-mono mb-2">
              #142 Update hero section
            </div>
            <div className="text-xs text-gray-500 mb-4">
              Updated headline and CTA button text
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className="text-red-400 font-mono">-3</span>
                <span className="text-emerald-400 font-mono">+5</span>
              </div>
              <span className="text-gray-500">2 files changed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PRAutomationCard;

