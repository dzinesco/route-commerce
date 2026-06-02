// Clerk Authentication Provider
import { ClerkProvider } from "@clerk/nextjs";

export default function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      {children}
    </ClerkProvider>
  );
}