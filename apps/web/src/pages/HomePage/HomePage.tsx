import { useNavigate } from "@tanstack/react-router";
import { useOrganization } from "@clerk/clerk-react";
import { useEffect } from "react";
import { SignInPanel, FeatureGrid } from "./components";

// Custom styles to override Clerk's internal styling
const clerkOverrideStyles = `
  .cl-signIn-start,
  .cl-card {
    background: transparent !important;
    padding: 2px !important;
    border: none !important;
    box-shadow: none !important;
  }
`;

const HomePage = () => {
  const navigate = useNavigate();
  const { organization, isLoaded } = useOrganization();

  useEffect(() => {
    if (isLoaded && organization) {
      navigate({ to: "/dashboard" });
    }
  }, [isLoaded, organization, navigate]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex relative overflow-hidden select-none">
      <style>{clerkOverrideStyles}</style>
      <SignInPanel />
      <FeatureGrid />
    </div>
  );
};

export default HomePage;

