// AI content editor (console-only). Takes a natural-language instruction and
// the current CMS content; returns a PROPOSED full content document plus a
// summary. Nothing is saved here — the console shows a diff and the human
// applies it via the content PUT endpoint. LexiLou "compose for review" pattern.
const U = require("./_shared/util.js");

function editorSystemPrompt(current) {
  return `You are the content editor for the website of Gloria's House Keeping Service (a cleaning company). You edit a JSON content document and nothing else.

CURRENT CONTENT DOCUMENT:
${JSON.stringify(current, null, 2)}

SCHEMA (all fields required in your output):
- phone: string (US phone display format)
- heroH1: string ≤120 chars
- heroLede: string ≤400 chars
- badges: array of exactly 3 short strings
- strip: array of exactly 4 short strings
- areas: array of 1-12 area names
- announcement: { enabled: boolean, text: string ≤160 }
- chatExtraFacts: string ≤1200 (plain sentences the site's AI assistant may state)
- services: array of 1-8 of { icon, title ≤60, blurb ≤260, items: array of up to 6 short strings }
- addons: array of 0-8 of { icon, label ≤40, desc ≤120 }
- theme: { teal: "#RRGGBB", gold: "#RRGGBB" }  — teal is the primary accent, gold the secondary
- icon must be one of: ${U.ALLOWED_ICONS.join(", ")}

RULES:
1. Apply ONLY what the instruction asks. Preserve every other field exactly as-is.
2. Never invent business facts (phone numbers, credentials, years, guarantees) that aren't in the current content or the instruction.
3. Never include prices or discounts anywhere.
4. Keep the professional, warm voice of the existing copy. American English.
5. Adding a service or add-on: write title/blurb/items in the same style; choose the most fitting icon from the allowed list.
6. Deleting: remove the item; keep array order otherwise.
7. Colors: only change theme values when asked; keep them readable against white backgrounds (mid-to-dark tones).
8. If the instruction asks for something outside this schema (new page types, layout, images, code), do NOT attempt it — explain in the summary that it's outside the editable content and make no changes to unrelated fields.

OUTPUT: respond with ONLY a JSON object, no markdown fences, no prose:
{"summary": "one or two sentences describing exactly what changed (or why nothing did)", "content": { ...the COMPLETE new content document... }}`;
}

exports.handler = async (event) => {
  U.init(event);
  try {
    if (event.httpMethod !== "POST") return U.json(405, { error: "Method not allowed" });
    if (!U.verifySession(U.bearer(event))) return U.json(401, { error: "Session expired — log in again." });
    if (!(await U.rateLimit(event, "edit", 20))) return U.json(429, { error: "Editor rate limit reached — try again in an hour." });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return U.json(500, { error: "ANTHROPIC_API_KEY is not set in Netlify." });

    let instruction = "";
    try { instruction = String(JSON.parse(event.body || "{}").instruction || "").slice(0, 2000); } catch { /* noop */ }
    if (!instruction.trim()) return U.json(400, { error: "Tell the editor what to change." });

    const current = await U.getContent();

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_EDITOR_MODEL || "claude-sonnet-4-6",
        max_tokens: 4000,
        system: editorSystemPrompt(current),
        messages: [{ role: "user", content: instruction }],
      }),
    });
    if (!res.ok) {
      console.error("editor API error", res.status, await res.text());
      return U.json(502, { error: "The AI editor couldn't respond — check Anthropic billing/key, then try again." });
    }
    const data = await res.json();
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim()
      .replace(/^```(json)?/i, "").replace(/```$/, "").trim();

    let parsed;
    try { parsed = JSON.parse(text); } catch {
      console.error("editor bad JSON", text.slice(0, 400));
      return U.json(502, { error: "The AI editor returned an unreadable proposal — try rephrasing the instruction." });
    }
    if (!parsed || typeof parsed !== "object" || !parsed.content) {
      return U.json(502, { error: "The AI editor returned no proposal — try rephrasing." });
    }

    // Normalize through the same validator that saves use, but WITHOUT saving.
    const proposal = {
      phone: String(parsed.content.phone || current.phone).slice(0, 20),
      heroH1: String(parsed.content.heroH1 || current.heroH1).slice(0, 120),
      heroLede: String(parsed.content.heroLede || current.heroLede).slice(0, 400),
      badges: (Array.isArray(parsed.content.badges) ? parsed.content.badges : current.badges).slice(0, 3).map((s) => String(s).slice(0, 40)),
      strip: (Array.isArray(parsed.content.strip) ? parsed.content.strip : current.strip).slice(0, 4).map((s) => String(s).slice(0, 40)),
      areas: (Array.isArray(parsed.content.areas) ? parsed.content.areas : current.areas).slice(0, 12).map((s) => String(s).slice(0, 40)).filter(Boolean),
      announcement: {
        enabled: !!(parsed.content.announcement && parsed.content.announcement.enabled),
        text: String((parsed.content.announcement && parsed.content.announcement.text) || "").slice(0, 160),
      },
      chatExtraFacts: String(parsed.content.chatExtraFacts || "").slice(0, 1200),
      services: (Array.isArray(parsed.content.services) && parsed.content.services.length ? parsed.content.services : current.services)
        .slice(0, 8).map((s) => ({
          icon: U.ALLOWED_ICONS.includes(s && s.icon) ? s.icon : "sparkle",
          title: String((s && s.title) || "Service").slice(0, 60),
          blurb: String((s && s.blurb) || "").slice(0, 260),
          items: (Array.isArray(s && s.items) ? s.items : []).slice(0, 6).map((x) => String(x).slice(0, 60)).filter(Boolean),
        })),
      addons: (Array.isArray(parsed.content.addons) ? parsed.content.addons : current.addons)
        .slice(0, 8).map((a) => ({
          icon: U.ALLOWED_ICONS.includes(a && a.icon) ? a.icon : "paw",
          label: String((a && a.label) || "Add-on").slice(0, 40),
          desc: String((a && a.desc) || "").slice(0, 120),
        })),
      theme: {
        teal: /^#[0-9a-fA-F]{6}$/.test(parsed.content.theme && parsed.content.theme.teal) ? parsed.content.theme.teal : current.theme.teal,
        gold: /^#[0-9a-fA-F]{6}$/.test(parsed.content.theme && parsed.content.theme.gold) ? parsed.content.theme.gold : current.theme.gold,
      },
    };

    return U.json(200, { summary: String(parsed.summary || "Proposed changes ready.").slice(0, 500), proposal, current });
  } catch (err) {
    console.error("edit handler crash", err);
    return U.json(500, { error: "Server error in edit — check the function logs in Netlify." });
  }
};
