/* Hydrates CMS-editable regions from /.netlify/functions/content.
   Static HTML keeps full default content (SEO-safe); this overlays edits. */
(function () {
  "use strict";
  var DEFAULT_PHONE = "720-227-6417";

  function telHref(p) { return "tel:+1" + p.replace(/\D/g, ""); }

  function apply(c) {
    if (!c) return;
    // simple text regions
    document.querySelectorAll("[data-cms]").forEach(function (el) {
      var k = el.getAttribute("data-cms");
      if (k === "heroH1" && c.heroH1) el.textContent = c.heroH1;
      if (k === "heroLede" && c.heroLede) el.textContent = c.heroLede;
      var m = /^badge(\d)$/.exec(k);
      if (m && c.badges && c.badges[+m[1]]) el.textContent = c.badges[+m[1]];
      var s = /^strip(\d)$/.exec(k);
      if (s && c.strip && c.strip[+s[1]]) el.textContent = c.strip[+s[1]];
    });

    // service-area chips
    var list = document.querySelector('[data-cms="areas"]');
    if (list && Array.isArray(c.areas) && c.areas.length) {
      var pin = list.querySelector(".area-chip svg");
      var pinHTML = pin ? pin.outerHTML : "";
      list.innerHTML = c.areas.map(function (a) {
        return '<span class="area-chip">' + pinHTML + " " + a.replace(/</g, "&lt;") + "</span>";
      }).join("");
    }

    // phone: every tel link + visible number text
    if (c.phone && c.phone !== DEFAULT_PHONE) {
      document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
        a.setAttribute("href", telHref(c.phone));
        if (a.textContent.indexOf(DEFAULT_PHONE) !== -1) {
          a.textContent = a.textContent.replace(DEFAULT_PHONE, c.phone);
        } else if (a.textContent.trim() === DEFAULT_PHONE) {
          a.textContent = c.phone;
        }
      });
      document.querySelectorAll("main span, main p, footer div, footer a").forEach(function (el) {
        if (el.children.length === 0 && el.textContent.indexOf(DEFAULT_PHONE) !== -1) {
          el.textContent = el.textContent.replace(DEFAULT_PHONE, c.phone);
        }
      });
      window.__GHS_PHONE = c.phone;
    }

    // announcement bar
    if (c.announcement && c.announcement.enabled && c.announcement.text) {
      var bar = document.createElement("div");
      bar.className = "announce";
      bar.textContent = c.announcement.text;
      var header = document.querySelector(".site-header");
      if (header && header.parentNode) header.parentNode.insertBefore(bar, header.nextSibling);
    }
  }

  fetch("/.netlify/functions/content")
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(apply)
    .catch(function () { /* offline/local preview: static defaults stand */ });
})();
