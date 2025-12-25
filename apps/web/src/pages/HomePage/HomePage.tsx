import { Navigate } from "@tanstack/react-router";
import {
  useOrganization,
  SignedIn,
  SignedOut,
  SignIn,
} from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import { Link } from "@tanstack/react-router";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { IconArrowRight, IconSparkles } from "@tabler/icons-react";

const clerkAppearance = {
  baseTheme: dark,
  elements: {
    rootBox: "w-full bg-transparent",
    cardBox: "w-full shadow-none bg-transparent",
    card: "w-full shadow-none p-0 bg-transparent",
    main: "bg-transparent",
    form: "bg-transparent",
    formContainer: "bg-transparent",
    header: "hidden",
    footer: "hidden",
    socialButtonsBlockButton:
      "bg-zinc-800/50 border border-zinc-700/50 text-zinc-100 hover:bg-zinc-700/50 hover:border-zinc-600 transition-all h-10 rounded-lg text-sm",
    socialButtonsBlockButtonText: "font-medium",
    dividerLine: "bg-zinc-700/50",
    dividerText: "text-zinc-500 text-xs bg-transparent px-3",
    formFieldLabel: "text-zinc-400 text-xs font-medium mb-1.5",
    formFieldInput:
      "bg-zinc-800/50 border-zinc-700/50 text-zinc-100 focus:border-zinc-500 focus:ring-0 rounded-lg h-10 text-sm placeholder:text-zinc-500",
    formButtonPrimary:
      "bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg h-10 text-sm",
    footerActionLink: "text-zinc-400 hover:text-white text-sm",
    footerActionText: "text-zinc-500 text-sm",
    identityPreview: "bg-zinc-800/50 border-zinc-700/50 rounded-lg",
    identityPreviewText: "text-zinc-100",
    identityPreviewEditButton: "text-zinc-400 hover:text-white",
    otpCodeFieldInput:
      "bg-zinc-800/50 border-zinc-700/50 text-zinc-100 rounded-lg",
    formFieldInputShowPasswordButton: "text-zinc-400 hover:text-white",
    alertText: "text-zinc-400 text-sm",
    formResendCodeLink: "text-zinc-400 hover:text-white",
    backLink: "text-zinc-400 hover:text-white",
    // Hide branding elements
    logoBox: "hidden",
    logoImage: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    dividerRow: "hidden",
    footerPages: "hidden",
    footerPagesLink: "hidden",
    badge: "hidden",
    internal: "hidden",
  },
  layout: {
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
    showOptionalFields: false,
  },
};

// CSS to hide stubborn Clerk elements and make backgrounds transparent
const clerkHideStyles = `
  .cl-internal-b3fm6y,
  .cl-footerAction,
  .cl-footer,
  .cl-footerPages,
  .cl-badge,
  .cl-logoBox,
  .cl-headerTitle,
  .cl-headerSubtitle,
  [data-localization-key="signIn.start.title"],
  [data-localization-key="signIn.start.subtitle"] {
    display: none !important;
  }
  .cl-rootBox,
  .cl-cardBox,
  .cl-card,
  .cl-main,
  .cl-form,
  .cl-formContainer,
  .cl-signIn-root,
  .cl-signIn-start {
    background: transparent !important;
    background-color: transparent !important;
  }
  .cl-formButtonPrimary {
    background: #f43f5e !important;
    color: white !important;
    border: none !important;
    border-width: 0 !important;
    outline: none !important;
    box-shadow: none !important;
  }
  .cl-formButtonPrimary:hover {
    background: #e11d48 !important;
    border: none !important;
    box-shadow: none !important;
  }
  .cl-formButtonPrimary:focus {
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
  }
  .cl-main,
  .cl-card,
  .cl-cardBox,
  .cl-signIn-root,
  .cl-rootBox {
    padding-top: 0 !important;
    margin-top: 0 !important;
  }
  .cl-socialButtons {
    margin-top: 30px !important;
  }
  .cl-internal-1dauvpw {
    padding-top: 0 !important;
  }
  .cl-header {
    display: none !important;
    height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
  }
`;

const HomePage = () => {
  const { organization, isLoaded } = useOrganization();

  if (isLoaded && organization) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <style>{clerkHideStyles}</style>
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-linear-to-br from-zinc-950 via-zinc-950 to-zinc-900" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 blur-[120px] rounded-full" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <img src="/loomii-black-pink.png" alt="Loomii" className="w-8 h-8" />
          <span className="text-xl font-semibold text-zinc-100">Loomii</span>
          <Badge
            variant="secondary"
            className="bg-zinc-800 text-zinc-400 border-0 text-[10px] px-1.5"
          >
            Beta
          </Badge>
        </div>

        {/* Main Card */}
        <div className="p-6">
          <SignedOut>
            <div className="text-center mb-6">
              <h1 className="text-xl font-semibold text-zinc-100 mb-1">
                Welcome back
              </h1>
              <p className="text-sm text-zinc-500">
                Sign in to continue to Loomii
              </p>
            </div>

            <SignIn
              appearance={clerkAppearance}
              routing="hash"
              forceRedirectUrl="/onboarding"
            />
          </SignedOut>

          <SignedIn>
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                <IconSparkles className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">
                  You're signed in
                </h2>
                <p className="text-sm text-zinc-500 mt-1">
                  Continue to your dashboard
                </p>
              </div>
              <Link to="/dashboard" className="w-full">
                <Button className="w-full">
                  Go to Dashboard
                  <IconArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </SignedIn>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-zinc-600">
            By continuing, you agree to our{" "}
            <a
              href="#"
              className="text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              Terms
            </a>{" "}
            and{" "}
            <a
              href="#"
              className="text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
