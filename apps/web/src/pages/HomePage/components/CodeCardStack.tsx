import { useState } from "react";

const codeCards = [
  {
    filename: "hero.tsx",
    code: (
      <>
        <span className="text-gray-600">{'<section className="hero">'}</span>
        {"\n"}
        <span className="text-red-400">-</span>
        {"  "}
        <span className="text-red-400/70">
          {"<h1>Welcome to our site</h1>"}
        </span>
        {"\n"}
        <span className="text-emerald-400">+</span>
        {"  "}
        <span className="text-emerald-400/70">
          {"<h1>Edit content. Ship as code.</h1>"}
        </span>
        {"\n"}
        <span className="text-gray-600">{"</section>"}</span>
      </>
    ),
  },
  {
    filename: "nav.tsx",
    code: (
      <>
        <span className="text-gray-600">{"const navItems = ["}</span>
        {"\n"}
        {"  "}
        <span className="text-gray-600">{`{ label: "Features", href: "/features" },`}</span>
        {"\n"}
        <span className="text-emerald-400">+</span>{" "}
        <span className="text-emerald-400/70">{`{ label: "Pricing", href: "/pricing" },`}</span>
        {"\n"}
        <span className="text-gray-600">{"];"}</span>
      </>
    ),
  },
  {
    filename: "pricing.tsx",
    code: (
      <>
        <span className="text-gray-600">{"const plans = [{"}</span>
        {"\n"}
        {"  "}
        <span className="text-gray-600">{`name: "Pro",`}</span>
        {"\n"}
        <span className="text-red-400">-</span>
        {"  "}
        <span className="text-red-400/70">{`price: "$29/month",`}</span>
        {"\n"}
        <span className="text-emerald-400">+</span>
        {"  "}
        <span className="text-emerald-400/70">{`price: "$19/month",`}</span>
        {"\n"}
        <span className="text-gray-600">{"}];"}</span>
      </>
    ),
  },
  {
    filename: "blog-post.mdx",
    code: (
      <>
        <span className="text-gray-600">{"---"}</span>
        {"\n"}
        <span className="text-red-400">-</span>{" "}
        <span className="text-red-400/70">{`title: "Draft Post"`}</span>
        {"\n"}
        <span className="text-emerald-400">+</span>{" "}
        <span className="text-emerald-400/70">{`title: "Introducing Loomii CMS"`}</span>
        {"\n"}
        <span className="text-red-400">-</span>{" "}
        <span className="text-red-400/70">{`published: false`}</span>
        {"\n"}
        <span className="text-emerald-400">+</span>{" "}
        <span className="text-emerald-400/70">{`published: true`}</span>
        {"\n"}
        <span className="text-gray-600">{"---"}</span>
      </>
    ),
  },
  {
    filename: "seo.tsx",
    code: (
      <>
        <span className="text-gray-600">{"<Head>"}</span>
        {"\n"}
        <span className="text-red-400">-</span>
        {"  "}
        <span className="text-red-400/70">{"<title>My Website</title>"}</span>
        {"\n"}
        <span className="text-emerald-400">+</span>
        {"  "}
        <span className="text-emerald-400/70">
          {"<title>Loomii - AI CMS</title>"}
        </span>
        {"\n"}
        <span className="text-gray-600">{"</Head>"}</span>
      </>
    ),
  },
  {
    filename: "contact.tsx",
    code: (
      <>
        <span className="text-gray-600">{"const contact = {"}</span>
        {"\n"}
        <span className="text-red-400">-</span>
        {"  "}
        <span className="text-red-400/70">{`email: "info@example.com",`}</span>
        {"\n"}
        <span className="text-emerald-400">+</span>
        {"  "}
        <span className="text-emerald-400/70">{`email: "hello@loomii.dev",`}</span>
        {"\n"}
        <span className="text-gray-600">{"};"}</span>
      </>
    ),
  },
];

const TOTAL = 6;
const VISIBLE = 4;

const CodeCardStack = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const getCardStyle = (cardIndex: number) => {
    const relativeIndex = (cardIndex - currentIndex + TOTAL) % TOTAL;

    if (relativeIndex >= VISIBLE) {
      return {
        transform: "translate(-30px, -30px)",
        opacity: 0,
        zIndex: 0,
      };
    }

    const offset = relativeIndex * -10;
    const opacity = 1 - relativeIndex * 0.15;

    return {
      transform: `translate(${offset}px, ${offset}px)`,
      opacity: Math.max(0.4, opacity),
      zIndex: VISIBLE - relativeIndex,
    };
  };

  return (
    <div
      className="relative h-52 cursor-pointer w-full"
      onClick={() => setCurrentIndex((prev) => (prev + 1) % TOTAL)}
    >
      {codeCards.map((card, idx) => (
        <div
          key={idx}
          className="absolute inset-0 bg-[#111] border border-white/10 rounded-lg overflow-hidden font-mono text-sm transition-all duration-300"
          style={getCardStyle(idx)}
        >
          <div className="flex items-center gap-1.5 px-4 py-3 bg-[#0a0a0a] border-b border-white/10">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
            <span className="ml-3 text-xs text-gray-500">{card.filename}</span>
          </div>
          <div className="p-4">
            <pre className="text-gray-400 text-xs overflow-hidden leading-relaxed whitespace-pre-wrap">
              {card.code}
            </pre>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CodeCardStack;
