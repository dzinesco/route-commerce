// Stripe Webhook Handler
// Handles all Stripe subscription and payment events

import { NextRequest } from "next/server";
import { processWebhook } from "@/lib/stripe-billing";

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      return Response.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }
    
    // Get raw body for signature verification
    const rawBody = await req.arrayBuffer();
    const payload = Buffer.from(rawBody);
    
    // Process the webhook
    const result = await processWebhook(payload, signature);
    
    return Response.json(result);
  } catch (error) {
    console.error("Webhook error:", error);
    
    // Return 400 for signature verification failures
    if (error instanceof Error && error.message.includes("signature")) {
      return Response.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }
    
    // Return 500 for other errors
    return Response.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Stripe requires raw body, so disable body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};