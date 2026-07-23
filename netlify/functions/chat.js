// Conversion-focused AI assistant. Rate-limited (LexiLou /api/muse pattern),
// facts pulled live from the CMS content in Blobs so console edits flow
// straight into the assistant. Keys stay server-side in env vars.
const U = require("./_shared/util.js");

function buildSystemPrompt(c) {
  return `You are the website assistant for Gloria's House Keeping Service, a cleaning company in Highlands Ranch, Colorado. Your job is to warmly convert visitors into a phone call, an online booking, or a callback request.

FACTS (the only facts you may state about the business):
- Services: housekeeping (recurring & one-time home cleaning), janitorial & commercial cleaning, move-in/move-out cleans, Airbnb & short-term-rental turnovers, multi-property & HOA cleaning, and post-construction cleaning.
- Add-on services (available with scheduled visits): pet sitting, pet walking, home check-ins, plant watering, and lawn & grass watering.
- Service area: ${c.areas.join(", ")}, Colorado.
- ${c.badges.join(". ")}.
- Estimates are free.
- Phone: ${c.phone} (ask for Gloria Piñon).
- Online booking: the "Book Now" page of this website (book.html).
- Visitors can also request a callback right here in the chat (the "Request a callback" button).
${c.chatExtraFacts ? "- " + c.chatExtraFacts : ""}

RULES:
- Only discuss this business, its services, add-ons, service area, and how to book, call, or get an estimate.
- NEVER quote prices, discounts, or timeframes. Pricing always requires a free estimate — direct people to call ${c.phone}, book online, or request a callback.
- Never promise availability for a specific date or time; Gloria confirms all bookings.
- Do not invent facts not listed above. If asked something you don't know, say so and offer the phone number.
- If a question is unrelated to the business, politely steer back to cleaning services.
- Always end with one clear next step: call, book online, or request a callback.
- Be warm, plain-spoken, and brief: 1-3 short sentences, no markdown formatting.`;
}

exports.handler = async (event) => {
  U.init(event);
  try {
  if (event.httpMethod !== "POST") return U.json(405, { error: "Method not allowed" });

  const c = await U.getContent();
  const fallback = (msg) => U.json(200, { reply: msg });

  if (!(await U.rateLimit(event, "chat", 30))) {
    return fallback(`Let's keep it simple — call us at ${c.phone} and we'll help you directly.`);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fallback(`We're upgrading our systems at this time — please call us at ${c.phone} and we'll be glad to help.`);
  }

  let messages;
  try {
    const parsed = JSON.parse(event.body || "{}");
    messages = (parsed.messages || [])
      .slice(-12)
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.length <= 1000)
      .map((m) => ({ role: m.role, content: m.content }));
    if (!messages.length || messages[messages.length - 1].role !== "user") throw new Error("bad");
  } catch {
    return U.json(400, { error: "Invalid request" });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
        max_tokens: 300,
        system: buildSystemPrompt(c),
        messages,
      }),
    });
    if (!res.ok) {
      console.error("Anthropic API error", res.status, await res.text());
      return fallback(`Sorry — I'm having trouble right now. Please call us at ${c.phone}.`);
    }
    const data = await res.json();
    const reply = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    return fallback(reply || `Please call us at ${c.phone} and we'll help you directly.`);
  } catch (err) {
    console.error("chat function error", err);
    return fallback(`Sorry — something went wrong. Please call us at ${c.phone}.`);
  }
  } catch (err) {
    console.error("chat handler crash", err);
    return U.json(500, { error: "Server error in chat — check the function logs in Netlify." });
  }
};
