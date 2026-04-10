import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { faqEntries, serializeCatalogForAssistant, siteName } from "@/lib/data";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const rateLimitWindowMs = 60_000;
const maxRequestsPerWindow = 10;
const requestStore = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function checkRateLimit(identifier: string) {
  const now = Date.now();
  const existing = requestStore.get(identifier);

  if (!existing || existing.resetAt < now) {
    requestStore.set(identifier, { count: 1, resetAt: now + rateLimitWindowMs });
    return true;
  }

  if (existing.count >= maxRequestsPerWindow) {
    return false;
  }

  existing.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY. Add it to your environment before using the assistant." },
        { status: 500 }
      );
    }

    const ip = getClientIp(request);

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Rate limit reached. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    const body = (await request.json()) as { messages?: ChatMessage[] };
    const messages = body.messages?.slice(-8) ?? [];

    if (!messages.length) {
      return NextResponse.json({ error: "No messages provided." }, { status: 400 });
    }

    const invalidMessage = messages.find(
      (message) =>
        !message.content ||
        message.content.length > 1000 ||
        !["user", "assistant"].includes(message.role)
    );

    if (invalidMessage) {
      return NextResponse.json({ error: "Invalid message payload." }, { status: 400 });
    }

    const faqKnowledge = faqEntries
      .map((entry) => `${entry.question}: ${entry.answer}`)
      .join("\n");

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || "gpt-5.1";

    const response = await client.responses.create({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: `You are the AI concierge for ${siteName}, an e-auction and buy-now marketplace.
Only answer questions about the website, navigation, buying flows, bidding flows, shipping notes, policies, and the available catalog grounding below.
If the user asks for something outside the website context, politely say that your scope is limited to this marketplace.
Keep answers concise, practical, and easy for shoppers to understand.

FAQ knowledge:
${faqKnowledge}

Catalog grounding:
${serializeCatalogForAssistant()}`
            }
          ]
        },
        ...messages.map((message) => ({
          role: message.role,
          content: [{ type: "input_text" as const, text: message.content }]
        }))
      ],
      reasoning: { effort: "none" },
      store: false
    });

    return NextResponse.json({ answer: response.output_text });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The assistant could not complete this request."
      },
      { status: 500 }
    );
  }
}
