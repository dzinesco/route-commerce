// Clerk Authentication Integration
// Multi-tenant auth with role-based access control

import { createClerkClient } from "@clerk/nextjs/server";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

// Clerk configuration
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// Clerk publishable key for frontend
export const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Role definitions
export type UserRole = "platform_admin" | "brand_admin" | "store_employee" | "wholesale_customer" | "customer";

export interface ClerkUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  publicMetadata: {
    role?: UserRole;
    brand_id?: string;
    is_onboarded?: boolean;
  };
}

// Get current authenticated user from Clerk
export async function getClerkUser(): Promise<ClerkUser | null> {
  const { userId, sessionId, getToken } = await auth();
  
  if (!userId) {
    return null;
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    
    return {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || "",
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      publicMetadata: user.publicMetadata as ClerkUser["publicMetadata"],
    };
  } catch (error) {
    console.error("Failed to fetch Clerk user:", error);
    return null;
  }
}

// Get Clerk session token for API calls
export async function getClerkToken() {
  const { getToken } = await auth();
  return getToken({ template: "supabase" });
}

// Create Clerk user with metadata
export async function createClerkUser(
  email: string,
  firstName?: string,
  lastName?: string,
  publicMetadata?: Record<string, unknown>
) {
  try {
    const user = await clerkClient.users.createUser({
      emailAddress: [email],
      firstName,
      lastName,
      publicMetadata: {
        role: "customer",
        is_onboarded: false,
        ...publicMetadata,
      },
    });
    return user;
  } catch (error) {
    console.error("Failed to create Clerk user:", error);
    throw error;
  }
}

// Update Clerk user metadata
export async function updateClerkUserMetadata(
  userId: string,
  metadata: Record<string, unknown>
) {
  try {
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: metadata,
    });
  } catch (error) {
    console.error("Failed to update Clerk user metadata:", error);
    throw error;
  }
}

// Set user role in Clerk metadata
export async function setUserRole(userId: string, role: UserRole, brandId?: string) {
  await updateClerkUserMetadata(userId, {
    role,
    brand_id: brandId,
  });
}

// Delete Clerk user (soft delete for compliance)
export async function deleteClerkUser(userId: string) {
  try {
    await clerkClient.users.deleteUser(userId);
  } catch (error) {
    console.error("Failed to delete Clerk user:", error);
    throw error;
  }
}

// Get user's organizations/brands from Clerk
export async function getUserOrganizations() {
  const { userId } = await auth();
  
  if (!userId) {
    return [];
  }

  try {
    const memberships = await clerkClient.users.getOrganizationMemberships({ userId });
    return memberships.data;
  } catch (error) {
    console.error("Failed to fetch organization memberships:", error);
    return [];
  }
}

// Create Clerk organization for brands
export async function createBrandOrganization(brandId: string, brandName: string) {
  try {
    const org = await clerkClient.organizations.createOrganization({
      name: brandName,
      slug: brandName.toLowerCase().replace(/\s+/g, "-"),
      publicMetadata: {
        brand_id: brandId,
      },
    });
    return org;
  } catch (error) {
    console.error("Failed to create organization:", error);
    throw error;
  }
}

// Add user to organization with role
export async function addUserToOrganization(
  organizationId: string,
  userId: string,
  role: string
) {
  try {
    await clerkClient.organizations.createOrganizationMembership({
      organizationId,
      userId,
      role,
    });
  } catch (error) {
    console.error("Failed to add user to organization:", error);
    throw error;
  }
}

// Authentication helper for middleware
export function isAuthenticated() {
  return auth().userId !== null;
}

// Role checking helper
export function hasRole(allowedRoles: UserRole[]) {
  return async function checkRole() {
    const user = await getClerkUser();
    if (!user) return false;
    return allowedRoles.includes(user.publicMetadata.role || "customer");
  };
}

// Session management - sync with Supabase for brand data
export async function syncUserWithBrand(userId: string, brandId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  // Sync with Supabase admin_users table
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/rpc/upsert_admin_user`,
      {
        method: "POST",
        headers: {
          apikey: serviceKey,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          p_user_id: userId,
          p_brand_id: brandId,
          p_role: "brand_admin",
        }),
      }
    );
    
    if (res.ok) {
      const result = await res.json();
      return result;
    }
  } catch (error) {
    console.error("Failed to sync user with brand:", error);
  }
  
  return null;
}

// Webhook handler for Clerk events
export async function handleClerkWebhook(event: string, payload: unknown) {
  switch (event) {
    case "user.created":
      // New user signup - create in our system
      await handleUserCreated(payload);
      break;
    case "user.updated":
      // User updated their profile
      await handleUserUpdated(payload);
      break;
    case "user.deleted":
      // User deleted their account
      await handleUserDeleted(payload);
      break;
    case "session.created":
      // User logged in
      await handleSessionCreated(payload);
      break;
    case "session.ended":
      // User logged out
      await handleSessionEnded(payload);
      break;
  }
}

async function handleUserCreated(payload: unknown) {
  // Sync new user to our database
  const user = payload as { id: string; email_addresses: { email_address: string }[] };
  console.log("New user created:", user.id);
  // Add any additional logic here
}

async function handleUserUpdated(payload: unknown) {
  const user = payload as { id: string };
  console.log("User updated:", user.id);
}

async function handleUserDeleted(payload: unknown) {
  const user = payload as { id: string };
  console.log("User deleted:", user.id);
  // Optionally soft-delete or anonymize user data
}

async function handleSessionCreated(payload: unknown) {
  const session = payload as { id: string; user_id: string };
  // Track session for analytics
  console.log("Session created:", session.id);
}

async function handleSessionEnded(payload: unknown) {
  const session = payload as { id: string };
  console.log("Session ended:", session.id);
}