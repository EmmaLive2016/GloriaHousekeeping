// Handles the keypress from the booking confirmation call. VOICE ONLY — no SMS.
// Press 1 -> spoken confirmation; if RESEND_API_KEY + RESEND_FROM are set and the
//            customer gave an email, they get an automated confirmation email.
// Press 2 -> spoken acknowledgment; Gloria follows up with the customer directly.
// Press 9 (or anything else) -> reads the booking details aloud again.
//
// Optional env vars: RESEND_API_KEY, RESEND_FROM (e.g. "Gloria's Cleaning Service <bookings@yourdomain.com>").

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function twiml(body) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/xml" },
    body: `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`,
  };
}

function say(text) {
  return twiml(`<Say voice="Polly.Joanna">${xmlEscape(text)}</Say>`);
}

exports.handler = async (event) => {
  const params = new URLSearchParams(event.body || "");
  const digit = params.get("Digits");

  let booking = {};
  const packed = (event.queryStringParameters || {}).d;
  try {
    if (packed) booking = JSON.parse(Buffer.from(packed, "base64url").toString("utf8"));
  } catch {
    booking = {};
  }

  if (digit === "1") {
    if (process.env.RESEND_API_KEY && process.env.RESEND_FROM && booking.email) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM,
            to: [booking.email],
            subject: "Your cleaning is confirmed — Gloria's Cleaning Service",
            text:
              `Hi ${booking.name || "there"},\n\n` +
              `Good news — your booking request has been confirmed:\n\n` +
              `Service: ${booking.service || "Cleaning"}\n` +
              `Date: ${booking.date || "as requested"} (${booking.time || "time as requested"})\n\n` +
              `If anything changes, call us at 720-227-6417.\n\n` +
              `— Gloria's Cleaning Service\nInsured & Bonded · Highlands Ranch, Colorado`,
          }),
        });
        if (!res.ok) console.error("Resend error", res.status, await res.text());
      } catch (err) {
        console.error("Confirmation email failed", err);
      }
    }
    return say("Booking confirmed. Thank you, Gloria. Goodbye.");
  }

  if (digit === "2") {
    return say(
      "Okay. This booking was not confirmed. It is saved on your website dashboard so you can follow up with the customer. Goodbye."
    );
  }

  // Press 9 or any other key: read the details again, then re-collect a keypress.
  const actionUrl = `${process.env.URL}/.netlify/functions/call-flow?d=${packed || ""}`;
  const phoneSpoken = (booking.phone || "").split("").join(" ");
  const recap = xmlEscape(
    `Repeating. Customer name: ${booking.name || "not given"}. ` +
      `Service: ${booking.service || "a cleaning"}. ` +
      `Preferred date: ${booking.date || "not specified"}, ${booking.time || ""}. ` +
      `Call back number: ${phoneSpoken || "not given"}. ` +
      `Press 1 to confirm. Press 2 if you cannot take it.`
  );
  return twiml(
    `<Gather numDigits="1" timeout="10" action="${xmlEscape(actionUrl)}" method="POST">` +
      `<Say voice="Polly.Joanna">${recap}</Say>` +
      `</Gather>` +
      `<Say voice="Polly.Joanna">No response received. This request is saved on your website dashboard. Goodbye.</Say>`
  );
};
