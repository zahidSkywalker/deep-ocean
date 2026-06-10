import { NextRequest, NextResponse } from "next/server";

const VALID_TOKEN = process.env.ECHO_AGENT_TOKEN || "";

export async function POST(req: NextRequest) {
  // ── Auth check ──
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token || token !== VALID_TOKEN) {
    return NextResponse.json(
      { error: "Unauthorized. Provide a valid Bearer token." },
      { status: 401 }
    );
  }

  // ── Parse body ──
  let body: {
    message?: string;
    system_prompt?: string;
    conversation_history?: { role: string; content: string }[];
    max_tokens?: number;
    temperature?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const {
    message,
    system_prompt,
    conversation_history,
    max_tokens = 2048,
    temperature = 0.7,
  } = body;

  if (!message && (!conversation_history || conversation_history.length === 0)) {
    return NextResponse.json(
      { error: "Provide 'message' or 'conversation_history'." },
      { status: 400 }
    );
  }

  // ── Build messages array ──
  const messages: { role: string; content: string }[] = [];

  if (system_prompt) {
    messages.push({ role: "system", content: system_prompt });
  }

  // If conversation history is provided, use it (skip system since we already added it)
  if (conversation_history && conversation_history.length > 0) {
    for (const msg of conversation_history) {
      if (msg.role !== "system") {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
  }

  // Append the current message if not already in history
  if (message) {
    const lastMsg = conversation_history?.[conversation_history.length - 1];
    if (!lastMsg || lastMsg.content !== message || lastMsg.role !== "user") {
      messages.push({ role: "user", content: message });
    }
  }

  // ── Call z-ai-web-dev-sdk ──
  try {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: messages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      })),
      max_tokens,
      temperature,
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "No response generated.";

    return NextResponse.json({
      success: true,
      response: reply,
      model: completion.model || "unknown",
      usage: completion.usage || {},
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[echo-agent] SDK error:", errorMsg);
    return NextResponse.json(
      { error: `AI SDK error: ${errorMsg}` },
      { status: 502 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "alive",
    service: "echo-agent",
    version: "1.0.0",
    docs: "POST with Bearer token. Body: { message, system_prompt?, conversation_history?, max_tokens?, temperature? }",
  });
}
