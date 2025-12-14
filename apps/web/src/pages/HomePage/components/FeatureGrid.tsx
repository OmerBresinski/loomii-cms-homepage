import PRAutomationCard from "./PRAutomationCard";
import CodeExamplesCard from "./CodeExamplesCard";

const FeatureGrid = () => {
  return (
    <div className="hidden lg:flex lg:w-[70%] items-center justify-center relative z-10 p-10">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(#121212 1px, transparent 1px),
                            linear-gradient(90deg, #121212 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Bento Grid Container */}
      <div className="relative border border-white/10 w-full max-w-4xl">
        {/* Corner + decorations */}
        <div className="absolute -top-3 -left-3 w-6 h-6 flex items-center justify-center text-red-500 text-2xl font-light select-none z-10">
          +
        </div>
        <div className="absolute -top-3 -right-3 w-6 h-6 flex items-center justify-center text-red-500 text-2xl font-light select-none z-10">
          +
        </div>
        <div className="absolute -bottom-3 -left-3 w-6 h-6 flex items-center justify-center text-red-500 text-2xl font-light select-none z-10">
          +
        </div>
        <div className="absolute -bottom-3 -right-3 w-6 h-6 flex items-center justify-center text-red-500 text-2xl font-light select-none z-10">
          +
        </div>

        {/* Two Row Grid */}
        <div className="grid grid-rows-2">
          <PRAutomationCard />
          <CodeExamplesCard />
        </div>
      </div>
    </div>
  );
};

export default FeatureGrid;
