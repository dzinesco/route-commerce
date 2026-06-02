// Auth Components for Clerk
import { UserButton } from "@clerk/nextjs";

export default function ClerkComponents() {
  return (
    <div className="flex items-center gap-4">
      <UserButton />
    </div>
  );
}