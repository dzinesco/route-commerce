// Waitlist API - Signup and manage waitlist entries
import { NextRequest, NextResponse } from "next/server";

interface WaitlistEntry {
  id: string;
  email: string;
  name?: string;
  company?: string;
  role?: string;
  referral_code?: string;
  referred_by?: string;
  source: string;
  created_at: string;
  status: "pending" | "invited" | "converted" | "declined";
  notes?: string;
}

// In-memory store for demo (replace with Supabase in production)
const waitlistEntries = new Map<string, WaitlistEntry>();

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function generateReferralCode(email: string): string {
  const prefix = email.substring(0, 2).toUpperCase();
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${suffix}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  let entries = Array.from(waitlistEntries.values());

  // Filter by status if provided
  if (status && status !== "all") {
    entries = entries.filter((e) => e.status === status);
  }

  // Sort by created_at descending
  entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Paginate
  const total = entries.length;
  const paginatedEntries = entries.slice(offset, offset + limit);

  return NextResponse.json({
    entries: paginatedEntries,
    total,
    limit,
    offset,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, company, role, referral_code, referred_by, source } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check for existing entry
    const existingEntry = Array.from(waitlistEntries.values()).find(
      (e) => e.email.toLowerCase() === email.toLowerCase()
    );
    if (existingEntry) {
      return NextResponse.json(
        { error: "This email is already on the waitlist", entry: existingEntry },
        { status: 409 }
      );
    }

    // Create new entry
    const id = generateId();
    const entry: WaitlistEntry = {
      id,
      email: email.toLowerCase(),
      name: name || undefined,
      company: company || undefined,
      role: role || undefined,
      referral_code: referral_code || generateReferralCode(email),
      referred_by: referred_by || undefined,
      source: source || "website",
      created_at: new Date().toISOString(),
      status: "pending",
    };

    waitlistEntries.set(id, entry);

    // If referred, increment the referrer's count (in production, update in database)
    if (referred_by) {
      console.log(`[Waitlist] New signup referred by: ${referred_by}`);
      // In production: update referrer's stats in Supabase
    }

    return NextResponse.json({
      success: true,
      entry,
      message: "You've been added to the waitlist!",
      position: waitlistEntries.size,
    });
  } catch (error) {
    console.error("Waitlist API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const entry = waitlistEntries.get(id);
    if (!entry) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      );
    }

    // Update fields
    if (status) {
      entry.status = status;
    }
    if (notes !== undefined) {
      entry.notes = notes;
    }

    waitlistEntries.set(id, entry);

    return NextResponse.json({
      success: true,
      entry,
    });
  } catch (error) {
    console.error("Waitlist API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}