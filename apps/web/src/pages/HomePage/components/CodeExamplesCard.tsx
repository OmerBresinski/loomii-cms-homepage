import { Card, CardContent } from "@/ui/card";
import { Badge } from "@/ui/badge";
import { IconCode, IconHash, IconTypography, IconPhoto, IconWorld, IconPointer } from "@tabler/icons-react";
import CodeCardStack from "./CodeCardStack";

const CodeExamplesCard = () => {
  const contentTypes = [
    { label: "Headlines", icon: IconTypography },
    { label: "Navigation", icon: IconWorld },
    { label: "CTAs", icon: IconPointer },
    { label: "SEO Meta", icon: IconHash },
    { label: "Assets", icon: IconPhoto },
  ];

  return (
    <Card className="rounded-none border-t-0 border-x-0 border-b-0 bg-transparent hover:bg-accent/5 transition-colors group relative overflow-hidden h-full flex items-center">
      <div className="absolute top-0 left-0 w-full h-px bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
      
      <CardContent className="p-10 relative z-10 flex flex-col md:flex-row items-center gap-12 w-full">
        <div className="flex-1 space-y-6">
          <Badge variant="outline" className="bg-violet-500/10 text-violet-500 border-violet-500/20 px-3 py-1 gap-1.5 font-bold uppercase tracking-widest text-[10px]">
            <IconCode className="w-3.5 h-3.5" />
            Content as Code
          </Badge>
          
          <div className="space-y-3">
            <h3 className="text-3xl font-sans font-black tracking-tight text-foreground leading-tight">
              Edit Any <br /> Content Element
            </h3>
            <p className="text-muted-foreground text-base max-w-md leading-relaxed">
              From hero headlines to meta tags — every piece of content is 
              discoverable, editable, and tracked in your Git history.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {contentTypes.map((type) => (
              <div 
                key={type.label} 
                className="px-3 py-1.5 bg-muted/30 border border-border rounded-lg text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all cursor-default"
              >
                <type.icon className="w-3 h-3" />
                {type.label}
              </div>
            ))}
          </div>
        </div>

        {/* Code Cards Stack */}
        <div className="w-full md:w-80 shrink-0 transform md:translate-y-4">
          <CodeCardStack />
        </div>
      </CardContent>
    </Card>
  );
};

export default CodeExamplesCard;
