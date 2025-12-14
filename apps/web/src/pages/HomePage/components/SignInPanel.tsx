import { SignedIn, SignedOut, SignIn } from "@clerk/clerk-react";

const clerkAppearance = {
  elements: {
    rootBox: "w-full bg-transparent",
    cardBox: "w-full shadow-none bg-transparent",
    card: "w-full shadow-none p-0 bg-transparent",
    main: "bg-transparent",
    form: "bg-transparent",
    header: "hidden",
    socialButtonsBlockButton:
      "bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all font-medium h-11 rounded-lg",
    socialButtonsBlockButtonText: "font-medium text-white",
    socialButtonsBlockButtonArrow: "text-white",
    dividerLine: "bg-white/10",
    dividerText: "text-gray-500 text-sm bg-[#0a0a0a] px-3",
    formFieldLabel: "text-gray-300 font-medium text-sm mb-1.5",
    formFieldInput:
      "bg-white/5 border-white/10 text-white focus:border-red-500 focus:ring-red-500/20 rounded-lg h-11 placeholder:text-gray-500",
    formButtonPrimary:
      "bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors h-11 shadow-lg shadow-red-500/20",
    footerActionLink: "text-red-400 font-medium hover:text-red-300",
    footer: "hidden",
    identityPreview: "bg-white/5 border-white/10 rounded-lg",
    identityPreviewText: "text-gray-300",
    identityPreviewEditButton: "text-gray-400 hover:text-white",
    otpCodeFieldInput: "bg-white/5 border-white/10 text-white rounded-lg",
    formFieldInputShowPasswordButton: "text-gray-400 hover:text-white",
    alertText: "text-gray-300",
    formFieldWarningText: "text-amber-400",
    formFieldErrorText: "text-red-400",
    formResendCodeLink: "text-red-400 hover:text-red-300",
    backLink: "text-gray-400 hover:text-white",
    signInStart: "!bg-transparent !p-0.5 !border-none !w-full !shadow-none",
  },
  layout: {
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
};

const SignInPanel = () => {
  return (
    <div className="w-full lg:w-[30%] flex flex-col justify-center px-8 lg:px-16 py-12 relative z-10">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-16">
        <div className="w-9 h-9 bg-red-500 rounded-lg flex items-center justify-center">
          <span className="text-white text-base font-bold">L</span>
        </div>
        <span className="text-xl font-semibold text-white">Loomii</span>
      </div>

      {/* Welcome text */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
        <p className="text-gray-400">Sign in to continue to your dashboard</p>
      </div>

      <SignedOut>
        <SignIn
          appearance={clerkAppearance}
          routing="hash"
          forceRedirectUrl="/onboarding"
        />
      </SignedOut>

      <SignedIn>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
            <svg
              className="w-8 h-8 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            You're signed in!
          </h2>
          <p className="text-gray-400 mb-6">Redirecting to dashboard...</p>
        </div>
      </SignedIn>

      <p className="text-xs text-gray-500 mt-10 text-center">
        By signing in, you agree to our{" "}
        <a
          href="#"
          className="text-gray-400 hover:text-white transition-colors"
        >
          Terms of Service
        </a>{" "}
        and{" "}
        <a
          href="#"
          className="text-gray-400 hover:text-white transition-colors"
        >
          Privacy Policy
        </a>
      </p>
    </div>
  );
};

export default SignInPanel;

