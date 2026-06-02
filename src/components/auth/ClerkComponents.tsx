// Clerk authentication components for the UI
// Use Show, UserButton, SignInButton, SignUpButton from @clerk/nextjs

"use client";

import { 
  SignInButton, 
  SignUpButton, 
  UserButton,
  useAuth,
  useUser 
} from "@clerk/nextjs";
import Link from "next/link";

// Show component for conditional rendering based on auth state
interface ShowProps {
  when: "signed-in" | "signed-out";
  children: React.ReactNode;
}

export function Show({ when, children }: ShowProps) {
  const { isSignedIn } = useAuth();
  
  if (when === "signed-in" && isSignedIn) {
    return <>{children}</>;
  }
  
  if (when === "signed-out" && !isSignedIn) {
    return <>{children}</>;
  }
  
  return null;
}

// User profile button with dropdown menu
export function ProfileButton() {
  const { user } = useUser();
  
  return (
    <div className="flex items-center gap-2">
      <UserButton 
        afterSignOutUrl="/"
        appearance={{
          elements: {
            avatarBox: "w-8 h-8",
          },
        }}
      />
      {user && (
        <span className="hidden md:block text-sm text-gray-700">
          {user.firstName || user.emailAddresses[0]?.emailAddress}
        </span>
      )}
    </div>
  );
}

// Sign in button for use in nav/header
export function SignInLink({ className }: { className?: string }) {
  return (
    <SignInButton mode="modal">
      <button className={className || "px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"}>
        Sign In
      </button>
    </SignInButton>
  );
}

// Sign up button for use in nav/header
export function SignUpLink({ className }: { className?: string }) {
  return (
    <SignUpButton mode="modal">
      <button className={className || "px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5"}>
        Sign Up
      </button>
    </SignUpButton>
  );
}

// Combined auth buttons for header
export function AuthButtons({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className || ""}`}>
      <Show when="signed-out">
        <>
          <SignInLink />
          <SignUpLink />
        </>
      </Show>
      <Show when="signed-in">
        <ProfileButton />
      </Show>
    </div>
  );
}

// Admin navigation with auth check
export function AdminNav() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  
  if (!isSignedIn) {
    return (
      <div className="flex items-center gap-4">
        <SignInLink />
        <SignUpLink />
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-4">
      <Link href="/admin" className="text-sm text-gray-600 hover:text-primary">
        Dashboard
      </Link>
      <Link href="/admin/orders" className="text-sm text-gray-600 hover:text-primary">
        Orders
      </Link>
      <Link href="/admin/products" className="text-sm text-gray-600 hover:text-primary">
        Products
      </Link>
      <ProfileButton />
    </div>
  );
}

// Wholesale customer navigation
export function WholesaleNav() {
  const { isSignedIn } = useAuth();
  
  return (
    <div className="flex items-center gap-4">
      <Show when="signed-out">
        <SignInLink />
      </Show>
      <Show when="signed-in">
        <>
          <Link href="/wholesale/portal" className="text-sm text-gray-600 hover:text-primary">
            Portal
          </Link>
          <ProfileButton />
        </>
      </Show>
    </div>
  );
}

// Loading state component
export function AuthLoading() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
      <span className="text-sm text-gray-500">Loading...</span>
    </div>
  );
}