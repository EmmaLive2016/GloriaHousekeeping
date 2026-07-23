// Fires automatically on every Netlify Forms submission.
// booking form  -> places a voice call to Gloria that reads the full booking
//                  details aloud, with press 1 to confirm / press 2 to decline.
// contact form  -> no call; the submission lands in the Netlify dashboard and
//                  in the email notification (set up under Forms > Notifications).
//
// VOICE CALL ONLY — no SMS is sent.
//
// Env vars required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, GLORIA_CELL.
// URL (the site's base URL) is provided by Netlify automatically.

function twilioRequest(resource, params) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  return fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/${resource}.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
  });
}

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

exports.handler = async (event) => {
  const configured =
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER &&
    process.env.GLORIA_CELL;

  let payload;
  try {
    payload = JSON.parse(event.body).payload;
  } catch {
    return { statusCode: 400, body: "Bad payload" };
  }

  // Only the booking form triggers a call.
  if (payload.form_name !== "booking") {
    return { statusCode: 200, body: "No call for this form" };
  }

  if (!configured) {
    console.log("Twilio env vars not set — skipping call for booking submission.");
    return { statusCode: 200, body: "Call not configured" };
  }

  const d = payload.data || {};
  const from = process.env.TWILIO_PHONE_NUMBER;
  const gloria = process.env.GLORIA_CELL;

  try {
    // Pack details so the keypress handler can read them back on press-1.
    const booking = {
      name: d.name || "",
      phone: d.phone || "",
      email: d.email || "",
      service: d.service || "",
      date: d.preferred_date || "",
      time: d.preferred_time || "",
    };
    const packed = Buffer.from(JSON.stringify(booking)).toString("base64url");
    const actionUrl = `${process.env.URL}/.netlify/functions/call-flow?d=${packed}`;

    // The call reads EVERYTHING aloud, since there is no text message to reference.
    const rawAddons = d.addons;
    const addonsText = Array.isArray(rawAddons) ? rawAddons.join(", ") : (rawAddons || "");
    const phoneSpoken = (d.phone || "").split("").join(" "); // read digits one at a time
    const say = xmlEscape(
      `Hello. New booking request for Gloria's House Keeping Service. ` +
        `Customer name: ${d.name || "not given"}. ` +
        `Service requested: ${d.service || "a cleaning"}. ` +
        `Location: ${d.address || ""}, ${d.city || "your service area"}. ` +
        `Preferred date: ${d.preferred_date || "not specified"}, ${d.preferred_time || ""}. ` +
        (addonsText ? `Add-ons requested: ${addonsText}. ` : "") +
        (d.notes ? `Notes: ${d.notes}. ` : "") +
        `Call back number: ${phoneSpoken || "not given"}. ` +
        `To confirm this booking, press 1. If you cannot take it, press 2. ` +
        `To hear this again, press 9.`
    );

    const twiml =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<Response><Pause length="1"/>` +
      `<Gather numDigits="1" timeout="10" action="${xmlEscape(actionUrl)}" method="POST">` +
      `<Say voice="Polly.Joanna">${say}</Say>` +
      `</Gather>` +
      // If no key is pressed, repeat once so a missed prompt still gets heard.
      `<Gather numDigits="1" timeout="10" action="${xmlEscape(actionUrl)}" method="POST">` +
      `<Say voice="Polly.Joanna">${say}</Say>` +
      `</Gather>` +
      `<Say voice="Polly.Joanna">No response received. This request is saved on your website dashboard. Goodbye.</Say>` +
      `</Response>`;

    const callRes = await twilioRequest("Calls", {
      To: gloria,
      From: from,
      Twiml: twiml,
      Timeout: "25",
    });
    if (!callRes.ok) console.error("Call failed", callRes.status, await callRes.text());

    return { statusCode: 200, body: "OK" };
  } catch (err) {
    console.error("submission-created error", err);
    return { statusCode: 200, body: "Error logged" };
  }
};
