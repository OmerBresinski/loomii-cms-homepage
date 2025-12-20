import { SignedIn, SignedOut, SignIn } from "@clerk/clerk-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { IconCircleCheck, IconLayoutDashboard, IconSparkles } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";

const clerkAppearance = {
  elements: {
    rootBox: "w-full bg-transparent",
    cardBox: "w-full shadow-none bg-transparent",
    card: "w-full shadow-none p-0 bg-transparent flex flex-col",
    main: "bg-transparent",
    form: "bg-transparent",
    header: "hidden",
    socialButtonsBlockButton:
      "bg-muted/50 border border-border text-foreground hover:bg-muted transition-all font-medium h-12 rounded-xl",
    socialButtonsBlockButtonText: "font-semibold text-foreground",
    socialButtonsBlockButtonArrow: "text-foreground",
    dividerLine: "bg-border",
    dividerText: "text-muted-foreground text-[10px] font-bold uppercase tracking-widest bg-card px-4",
    formFieldLabel: "text-muted-foreground font-bold text-[10px] uppercase tracking-wider mb-2",
    formFieldInput:
      "bg-muted/20 border-border text-foreground focus:border-primary focus:ring-primary/20 rounded-xl h-12 placeholder:text-muted-foreground/50",
    formButtonPrimary:
      "bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all h-12 shadow-lg shadow-primary/20",
    footerActionLink: "text-primary font-bold hover:text-primary/80",
    footer: "hidden",
    identityPreview: "bg-muted/30 border-border rounded-xl px-4 py-2",
    identityPreviewText: "text-foreground font-medium",
    identityPreviewEditButton: "text-muted-foreground hover:text-primary",
    otpCodeFieldInput: "bg-muted/20 border-border text-foreground rounded-xl",
    formFieldInputShowPasswordButton: "text-muted-foreground hover:text-primary",
    alertText: "text-muted-foreground",
    formFieldWarningText: "text-amber-500",
    formFieldErrorText: "text-destructive",
    formResendCodeLink: "text-primary hover:text-primary/80",
    backLink: "text-muted-foreground hover:text-foreground",
    signInStart: "!bg-transparent !p-0 !border-none !w-full !shadow-none",
  },
  layout: {
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
};

const SignInPanel = () => {
  return (
    <div className="w-full lg:w-[35%] flex flex-col justify-center px-8 lg:px-20 py-12 relative z-10 bg-card/10 backdrop-blur-3xl border-r border-border/50">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-20 group">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:rotate-6 transition-transform">
          <span className="text-primary-foreground text-xl font-black italic">L</span>
        </div>
        <span className="text-2xl font-black tracking-tighter text-foreground">LOOMII</span>
        <Badge className="ml-2 bg-primary/10 text-primary border-none text-[9px] uppercase font-bold px-1.5 h-4">Alpha</Badge>
      </div>

      <Card className="border-none bg-transparent shadow-none p-0">
        <CardHeader className="p-0 mb-10 space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-[0.2em] mb-1">
            <IconSparkles className="w-3.5 h-3.5" />
            AI Content Management
          </div>
          <CardTitle className="text-4xl font-black tracking-tight leading-[0.9]">
            Welcome <br /> back
          </CardTitle>
          <CardDescription className="text-muted-foreground text-base">
            Login to access your organizations and project drafts.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-0 mt-8">
          <SignedOut>
            <SignIn
              appearance={clerkAppearance}
              routing="hash"
              forceRedirectUrl="/onboarding"
            />
          </SignedOut>

          <SignedIn>
            <div className="space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-primary/5 border border-primary/10 text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center border border-primary/20">
                  <IconCircleCheck className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">You're signed in!</h2>
                  <p className="text-sm text-muted-foreground mt-1">Ready to start editing?</p>
                </div>
                <Button size="lg" className="w-full rounded-xl mt-2 group" render={<Link to="/dashboard" />} nativeButton={false}>
                  Go to Dashboard
                  <IconLayoutDashboard className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </div>
            </div>
          </SignedIn>
        </CardContent>
      </Card>

      <div className="mt-auto pt-20">
        <p className="text-[10px] text-muted-foreground/60 text-center font-medium">
          By continuing, you agree to Loomii's{" "}
          <a href="#" className="underline-offset-2 hover:text-primary transition-colors">Terms</a>
          {" "} & {" "}
          <a href="#" className="underline-offset-2 hover:text-primary transition-colors">Privacy</a>
        </p>
      </div>
    </div>
  );
};

export default SignInPanel;
