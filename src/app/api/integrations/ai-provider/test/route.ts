import { NextRequest, NextResponse } from "next/server";
import { getAIClient } from "@/actions/integrations/ai-providers";
import { getAdminUser } from "@/lib/admin-permissions";

export async function POST(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!adminUser.can_manage_settings) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { brandId } = await req.json();

    const effectiveBrandId = adminUser.brand_id ?? brandId ?? null;
    if (!effectiveBrandId) {
      return NextResponse.json({ error: "Brand ID required" }, { status: 400 });
    }
    if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
      return NextResponse.json({ error: "Not authorized for this brand" }, { status: 403 });
    }

    const result = await getAIClient(effectiveBrandId);

    if ("error" in result && !result.client) {
      return NextResponse.json({ error: result.error }, { status: 503 });
    }

    const { client, provider, model } = result as { client: unknown; provider: string; model: string };

    // Anthropic uses a different API
    if (provider === "anthropic") {
      const anthropicClient = client as { messages?: { create: (args: unknown) => unknown } };
      if (!anthropicClient?.messages) {
        return NextResponse.json({ error: "Invalid Anthropic client" }, { status: 500 });
      }
      const response = await anthropicClient.messages.create({
        model,
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      });
      if (!response) throw new Error("No response");
      return NextResponse.json({
        success: true,
        message: `Connected to ${provider} (model: ${model})`,
        provider,
        model,
      });
    }

    // Google Gemini uses a different API
    if (provider === "google") {
      const googleClient = client as { models?: { generateContent: (model: string, input: unknown) => unknown } };
      if (!googleClient?.models) {
        return NextResponse.json({ error: "Invalid Google AI client" }, { status: 500 });
      }
      const response = await googleClient.models.generateContent(model, "Hi");
      if (!response) throw new Error("No response");
      return NextResponse.json({
        success: true,
        message: `Connected to ${provider} (model: ${model})`,
        provider,
        model,
      });
    }

    // OpenAI, xAI, and custom OpenAI-compatible endpoints
    const clientObj = client as { chat?: { completions?: { create: (args: unknown) => unknown } } };
    if (!clientObj?.chat?.completions) {
      return NextResponse.json({ error: "Invalid AI client — not an OpenAI-compatible SDK" }, { status: 500 });
    }

    const response = await clientObj.chat.completions.create({
      model,
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 5,
    });

    if (!response) throw new Error("No response");

    return NextResponse.json({
      success: true,
      message: `Connected to ${provider} (model: ${model})`,
      provider,
      model,
    });
  } catch (err) {
    // Surface the actual SDK/API error so users can tell whether the
    // failure is a bad key, a retired model, a quota issue, or a network
    // problem — not a generic "check your key" message.
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
        ? err
        : "Connection test failed. Check your API key and endpoint.";
    // Some SDKs throw non-Error objects with a .status / .error property
    const status =
      (typeof err === "object" && err && "status" in err && typeof (err as { status?: unknown }).status === "number"
        ? (err as { status: number }).status
        : undefined) ?? 500;
    return NextResponse.json({ error: message }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}