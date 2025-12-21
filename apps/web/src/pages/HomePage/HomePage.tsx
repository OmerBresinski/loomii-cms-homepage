import { Navigate } from "@tanstack/react-router";
import { useOrganization } from "@clerk/clerk-react";
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

  const { organization, isLoaded } = useOrganization();

  if (isLoaded && organization) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex relative overflow-hidden select-none">
      <style>{clerkOverrideStyles}</style>
      <SignInPanel />
      <FeatureGrid />
    </div>
  );
};

export default HomePage;

