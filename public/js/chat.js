/* Gloria's House Keeping Service — conversion assistant widget.
   AI calls go through /.netlify/functions/chat; no keys live here.
   Adds: proactive nudge, quick actions, and "Request a callback" lead capture. */
(function () {
  "use strict";

  var history = [];
  var open = false;
  var busy = false;
  var phone = function () { return window.__GHS_PHONE || "720-227-6417"; };

  var fab = document.createElement("button");
  fab.className = "chat-fab";
  fab.setAttribute("aria-label", "Chat with us");
  fab.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M4 5.5h16v10H9l-4 3.5v-3.5H4z" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>' +
    "</svg>";

  var nudge = document.createElement("button");
  nudge.className = "chat-nudge hidden";
  nudge.type = "button";
  nudge.textContent = "Need a free estimate? Chat with us \uD83D\uDC4B";

  var panel = document.createElement("div");
  panel.className = "chat-panel hidden";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Chat with Gloria's House Keeping Service");
  panel.innerHTML =
    '<div class="chat-head"><span class="t">Gloria\u2019s House Keeping Service</span>' +
    '<button type="button" aria-label="Close chat">\u00d7</button></div>' +
    '<div class="chat-log" aria-live="polite"></div>' +
    '<div class="chat-quick"></div>' +
    '<div class="chat-input">' +
    '<input type="text" placeholder="Ask about our services\u2026" aria-label="Your message" maxlength="500">' +
    '<button type="button">Send</button></div>';

  document.body.appendChild(fab);
  document.body.appendChild(nudge);
  document.body.appendChild(panel);

  var log = panel.querySelector(".chat-log");
  var quick = panel.querySelector(".chat-quick");
  var input = panel.querySelector(".chat-input input");
  var sendBtn = panel.querySelector(".chat-input button");
  var closeBtn = panel.querySelector(".chat-head button");

  function addMsg(role, text) {
    var el = document.createElement("div");
    el.className = "chat-msg " + (role === "user" ? "user" : "bot");
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  // ---------- quick actions ----------
  function renderQuick() {
    quick.innerHTML = "";
    [
      { t: "Get a free estimate", act: function () { sendText("I'd like a free estimate."); } },
      { t: "See add-ons", act: function () { sendText("What add-on services do you offer?"); } },
      { t: "Request a callback", act: showLeadForm },
      { t: "\u260E Call now", act: function () { window.location.href = "tel:+1" + phone().replace(/\D/g, ""); } },
      { t: "Book online", act: function () { window.location.href = "book.html"; } },
    ].forEach(function (q) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chat-chip";
      b.textContent = q.t;
      b.addEventListener("click", q.act);
      quick.appendChild(b);
    });
  }

  // ---------- callback lead capture ----------
  function showLeadForm() {
    if (panel.querySelector(".lead-form")) return;
    var f = document.createElement("div");
    f.className = "chat-msg bot lead-form";
    f.innerHTML =
      '<b>Request a callback</b>' +
      '<input type="text" placeholder="Your name" maxlength="80" aria-label="Your name">' +
      '<input type="tel" placeholder="Your phone number" maxlength="25" aria-label="Your phone number">' +
      '<input type="text" placeholder="What do you need? (optional)" maxlength="300" aria-label="What do you need">' +
      '<button type="button" class="lead-send">Request callback</button>' +
      '<span class="lead-status"></span>';
    log.appendChild(f);
    log.scrollTop = log.scrollHeight;
    var inputs = f.querySelectorAll("input");
    var status = f.querySelector(".lead-status");
    f.querySelector(".lead-send").addEventListener("click", function () {
      var name = inputs[0].value.trim(), tel = inputs[1].value.trim(), note = inputs[2].value.trim();
      if (!name || tel.replace(/\D/g, "").length < 10) {
        status.textContent = "Please enter your name and a full phone number.";
        return;
      }
      status.textContent = "Sending\u2026";
      fetch("/.netlify/functions/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, phone: tel, note: note }),
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok) {
            f.remove();
            addMsg("bot", "Got it, " + name + " \u2014 Gloria will call you back at " + tel + ". If it's urgent, call us now at " + phone() + ".");
          } else {
            status.textContent = (res.j && res.j.error) || "Something went wrong \u2014 please call " + phone() + ".";
          }
        })
        .catch(function () { status.textContent = "Something went wrong \u2014 please call " + phone() + "."; });
    });
  }

  // ---------- open/close + proactive nudge ----------
  function toggle(show) {
    open = show;
    panel.classList.toggle("hidden", !open);
    nudge.classList.add("hidden");
    if (open) {
      try { sessionStorage.setItem("ghsChatSeen", "1"); } catch (e) {}
      if (!log.children.length) {
        addMsg("bot", "Hi! I can help you get a free estimate, book a cleaning, or set up add-ons like pet sitting and plant watering. What can I do for you?");
        renderQuick();
      }
      input.focus();
    } else {
      fab.focus();
    }
  }

  fab.addEventListener("click", function () { toggle(!open); });
  closeBtn.addEventListener("click", function () { toggle(false); });
  nudge.addEventListener("click", function () { toggle(true); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && open) toggle(false); });

  try {
    if (!sessionStorage.getItem("ghsChatSeen")) {
      setTimeout(function () {
        if (!open) nudge.classList.remove("hidden");
        setTimeout(function () { nudge.classList.add("hidden"); }, 12000);
      }, 8000);
    }
  } catch (e) { /* private mode: skip nudge */ }

  // ---------- AI conversation ----------
  function sendText(text) {
    if (!text || busy) return;
    addMsg("user", text);
    history.push({ role: "user", content: text });
    if (history.length > 12) history = history.slice(-12);

    busy = true;
    var typing = addMsg("bot", "\u2026");
    typing.classList.add("typing");

    fetch("/.netlify/functions/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        typing.remove();
        var reply = data && data.reply ? data.reply : "Sorry \u2014 I couldn\u2019t reach the assistant just now. Please call us at " + phone() + ".";
        addMsg("bot", reply);
        history.push({ role: "assistant", content: reply });
      })
      .catch(function () {
        typing.remove();
        addMsg("bot", "Sorry \u2014 something went wrong on my end. Please call us at " + phone() + " or use the Book Now page.");
      })
      .finally(function () { busy = false; input.focus(); });
  }

  function sendFromInput() {
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    sendText(text);
  }

  sendBtn.addEventListener("click", sendFromInput);
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") sendFromInput(); });
})();
