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

    // six service cards (home) + six sections (services page) + booking dropdown
    if (Array.isArray(c.services) && c.services.length === 6) {
      var cards = document.querySelectorAll(".svc-card");
      if (cards.length === 6) {
        cards.forEach(function (card, i) {
          var s = c.services[i];
          var h3 = card.querySelector("h3"); if (h3) h3.textContent = s.title;
          var pp = card.querySelector("p"); if (pp) pp.textContent = s.blurb;
          card.querySelectorAll(".svc-list li").forEach(function (li, j) {
            if (s.items[j]) {
              var svg = li.querySelector("svg");
              li.textContent = " " + s.items[j];
              if (svg) li.insertBefore(svg, li.firstChild);
            }
          });
        });
      }
      var slugs = ["housekeeping","janitorial","move","airbnb","multi","construction"];
      slugs.forEach(function (slug, i) {
        var sec = document.getElementById(slug);
        if (!sec) return;
        var s = c.services[i];
        var h2 = sec.querySelector("h2"); if (h2) h2.textContent = s.title;
        var eb = sec.querySelector(".eyebrow");
        if (eb) { var esvg = eb.querySelector("svg"); eb.textContent = " " + s.title; if (esvg) eb.insertBefore(esvg, eb.firstChild); }
        var ld = sec.querySelector(".lede"); if (ld) ld.textContent = s.blurb;
        sec.querySelectorAll(".feat-grid .feat b").forEach(function (bEl, j) {
          if (s.items[j]) bEl.textContent = s.items[j];
        });
      });
      var sel = document.getElementById("b-service");
      if (sel) {
        var keep = sel.querySelector("option[disabled]");
        sel.innerHTML = "";
        if (keep) sel.appendChild(keep);
        c.services.forEach(function (s) {
          var o = document.createElement("option"); o.textContent = s.title; sel.appendChild(o);
        });
        var last = document.createElement("option"); last.textContent = "Not sure — need an estimate"; sel.appendChild(last);
      }
    }

    // add-ons: services grid, booking checkboxes, home callout sentence
    if (Array.isArray(c.addons) && c.addons.length === 5) {
      var addSec = document.getElementById("addons");
      if (addSec) {
        addSec.querySelectorAll(".feat-grid .feat").forEach(function (f, i) {
          var a = c.addons[i]; if (!a) return;
          var bb = f.querySelector("b"); if (bb) bb.textContent = a.label;
          var ss = f.querySelector("span"); if (ss) ss.textContent = a.desc;
        });
      }
      document.querySelectorAll(".addon-opt").forEach(function (opt, i) {
        var a = c.addons[i]; if (!a) return;
        var inp = opt.querySelector("input");
        opt.textContent = " " + a.label;
        if (inp) { inp.value = a.label; opt.insertBefore(inp, opt.firstChild); }
      });
      var callout = document.querySelector(".addon-callout p:not(.eyebrow)");
      if (callout) {
        var labels = c.addons.map(function (a) { return a.label.toLowerCase(); });
        callout.textContent = labels.slice(0, -1).join(", ") + ", and " + labels[labels.length - 1] + " — add any of them when you book.";
      }
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
