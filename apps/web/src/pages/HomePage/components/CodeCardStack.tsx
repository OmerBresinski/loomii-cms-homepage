import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const codeCards = [
  {
    filename: "hero.tsx",
    code: (
      <>
        <span className="text-muted-foreground/50">{'<section className="hero">'}</span>
        {"\n"}
        <span className="text-destructive font-bold">-</span>
        {"  "}
        <span className="text-destructive/80 line-through">
          {"<h1>Welcome to our site</h1>"}
        </span>
        {"\n"}
        <span className="text-emerald-500 font-bold">+</span>
        {"  "}
        <span className="text-emerald-400 font-bold">
          {"<h1>Edit content. Ship as code.</h1>"}
        </span>
        {"\n"}
        <span className="text-muted-foreground/50">{"</section>"}</span>
      </>
    ),
  },
  {
    filename: "pricing.tsx",
    code: (
      <>
        <span className="text-muted-foreground/50">{"const plans = [{"}</span>
        {"\n"}
        {"  "}
        <span className="text-muted-foreground/80">{`name: "Pro",`}</span>
        {"\n"}
        <span className="text-destructive font-bold">-</span>
        {"  "}
        <span className="text-destructive/80 line-through">{`price: "$29/month",`}</span>
        {"\n"}
        <span className="text-emerald-500 font-bold">+</span>
        {"  "}
        <span className="text-emerald-400 font-bold">{`price: "$19/month",`}</span>
        {"\n"}
        <span className="text-muted-foreground/50">{"}];"}</span>
      </>
    ),
  },
  {
    filename: "blog-post.mdx",
    code: (
      <>
        <span className="text-muted-foreground/50">{"---"}</span>
        {"\n"}
        <span className="text-destructive font-bold">-</span>{" "}
        <span className="text-destructive/80 line-through">{`title: "Draft Post"`}</span>
        {"\n"}
        <span className="text-emerald-500 font-bold">+</span>{" "}
        <span className="text-emerald-400 font-bold">{`title: "Introducing Loomii CMS"`}</span>
        {"\n"}
        <span className="text-destructive font-bold">-</span>{" "}
        <span className="text-destructive/80 line-through">{`published: false`}</span>
        {"\n"}
        <span className="text-emerald-500 font-bold">+</span>{" "}
        <span className="text-emerald-400 font-bold">{`published: true`}</span>
        {"\n"}
        <span className="text-muted-foreground/50">{"---"}</span>
      </>
    ),
  },
  {
    filename: "seo.tsx",
    code: (
      <>
        <span className="text-muted-foreground/50">{"<Head>"}</span>
        {"\n"}
        <span className="text-destructive font-bold">-</span>
        {"  "}
        <span className="text-destructive/80 line-through">{"<title>My Website</title>"}</span>
        {"\n"}
        <span className="text-emerald-500 font-bold">+</span>
        {"  "}
        <span className="text-emerald-400 font-bold">
          {"<title>Loomii — AI CMS</title>"}
        </span>
        {"\n"}
        <span className="text-muted-foreground/50">{"</Head>"}</span>
      </>
    ),
  },
];

const TOTAL = codeCards.length;
const VISIBLE = 3;

const CodeCardStack = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % TOTAL);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const getCardStyle = (cardIndex: number) => {
    const relativeIndex = (cardIndex - currentIndex + TOTAL) % TOTAL;

    if (relativeIndex >= VISIBLE) {
      return {
        transform: "translate(20px, 20px) scale(0.9)",
        opacity: 0,
        zIndex: 0,
      };
    }

    const offset = relativeIndex * 12;
    const scale = 1 - relativeIndex * 0.05;
    const opacity = 1 - relativeIndex * 0.3;

    return {
      transform: `translate(${offset}px, ${offset}px) scale(${scale})`,
      opacity: Math.max(0, opacity),
      zIndex: VISIBLE - relativeIndex,
    };
  };

  return (
    <div
      className="relative h-56 cursor-pointer w-full group/stack"
      onClick={() => setCurrentIndex((prev) => (prev + 1) % TOTAL)}
    >
      {codeCards.map((card, idx) => (
        <div
          key={idx}
          className={cn(
            "absolute inset-0 bg-card border border-border/80 rounded-2xl overflow-hidden font-mono text-[11px] transition-all duration-700 ease-out shadow-2xl shadow-black/40",
            idx === currentIndex && "ring-1 ring-primary/20 bg-background"
          )}
          style={getCardStyle(idx)}
        >
          {/* Editor Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-muted/40 border-b border-border/50">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
              <span className="ml-3 text-[10px] font-bold text-muted-foreground/60 tracking-wider">
                {card.filename}
              </span>
            </div>
            {idx === currentIndex && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                <span className="text-[8px] font-black text-primary uppercase tracking-[0.1em]">Editing</span>
              </div>
            )}
          </div>
          
          {/* Editor Body */}
          <div className="p-6 relative">
            <div className="absolute top-0 right-0 p-8 text-primary/5 select-none pointer-events-none">
               <span className="text-6xl font-black">{"{ }"}</span>
            </div>
            <pre className="text-foreground/90 overflow-hidden leading-relaxed whitespace-pre-wrap font-medium">
              {card.code}
            </pre>
          </div>

          {/* Bottom Bar Decor */}
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover/stack:opacity-100 transition-opacity" />
        </div>
      ))}
    </div>
  );
};

export default CodeCardStack;
