// Clerk provider wrapper for Next.js App Router

"use client";

import { ClerkProvider as ClerkProviderBase } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";

interface ClerkProviderProps {
  children: React.ReactNode;
  publishableKey: string;
}

export function ClerkProvider({ children, publishableKey }: ClerkProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Determine sign-in URL based on current path
  const signInUrl = "/login";
  const signUpUrl = "/register";
  const afterSignInUrl = pathname || "/admin";
  const afterSignUpUrl = "/onboarding";
  
  return (
    <ClerkProviderBase
      publishableKey={publishableKey}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
      afterSignInUrl={afterSignInUrl}
      afterSignUpUrl={afterSignUpUrl}
      routing={process.env.NEXT_PUBLIC_CLERK_ROUTING || "path"}
    >
      {children}
    </ClerkProviderBase>
  );
}

// Hooks for Clerk auth state
export { useUser, useAuth, useClerk } from "@clerk/nextjs";