import { Card, CardContent } from "@/ui/card";
import { Badge } from "@/ui/badge";
import { IconBrandGithub, IconCircleCheck, IconGitPullRequest, IconArrowRight, IconSparkles } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const PRAutomationCard = () => {
  return (
    <Card className="rounded-none border-b border-t-0 border-x-0 bg-transparent hover:bg-accent/5 transition-colors group relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
      
      {/* Subtle glow */}
      <div className="absolute -top-[100px] left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

      <CardContent className="p-10 relative z-10 flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 space-y-6">
          <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 gap-1.5 font-bold uppercase tracking-widest text-[10px]">
            <IconGitPullRequest className="w-3 h-3" />
            Git-Native Workflow
          </Badge>
          
          <div className="space-y-3">
            <h3 className="text-3xl font-black tracking-tight text-foreground leading-tight">
              Auto-Generated <br /> Pull Requests
            </h3>
            <p className="text-muted-foreground text-base max-w-md leading-relaxed">
              Every content edit automatically generates a GitHub pull request 
              with clear diffs and AI summaries. Your code remains clean and reviewed.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {[
              { label: "Auto-commit", icon: IconCircleCheck },
              { label: "Branch control", icon: IconCircleCheck },
              { label: "AI Summary", icon: IconSparkles },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 group/feat">
                <item.icon className="w-4 h-4 text-emerald-500 group-hover/feat:scale-110 transition-transform" />
                <span className="text-sm font-semibold text-foreground/70">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* PR Mockup */}
        <div className="w-full md:w-80 shrink-0">
          <div className="bg-card rounded-2xl border border-border shadow-2xl p-6 relative group/pr transition-all hover:-translate-y-1">
            <div className="absolute -top-3 -right-3 bg-emerald-500 text-white p-2 rounded-full shadow-lg z-20 scale-0 group-hover/pr:scale-100 transition-transform duration-300">
               <IconCircleCheck className="w-4 h-4" />
            </div>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <IconGitPullRequest className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block">
                  Ready to merge
                </span>
                <span className="text-xs text-muted-foreground font-medium">2 reviews approved</span>
              </div>
            </div>

            <div className="space-y-4">
               <div>
                  <div className="text-sm font-bold text-foreground font-mono leading-snug">
                    #142 Update hero section
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Created by <span className="text-primary font-bold">Loomii AI</span> • 5m ago
                  </div>
               </div>
               
               <div className="flex items-center justify-between pt-4 border-t border-dashed">
                 <div className="flex items-center gap-3">
                    <span className="text-emerald-500 font-mono text-xs font-bold">+24</span>
                    <span className="text-destructive font-mono text-xs font-bold">-12</span>
                 </div>
                 <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <span>2 files</span>
                    <IconArrowRight className="w-3 h-3" />
                 </div>
               </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PRAutomationCard;
