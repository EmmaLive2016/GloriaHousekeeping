/* Hydrates CMS-editable regions from /.netlify/functions/content.
   Static HTML keeps full default content (SEO-safe); this overlays edits. */
(function () {
  "use strict";
  var DEFAULT_PHONE = "720-227-6417";
  var ICONS = {
    "home": "<svg viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M4 10.5 12 4l8 6.5M6 9.5V20h12V9.5\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M10 20v-5h4v5\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
    "building": "<svg viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"5\" y=\"3.5\" width=\"14\" height=\"17\" rx=\"1.5\" stroke=\"currentColor\" stroke-width=\"1.7\"/><path d=\"M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10.5 20.5v-2h3v2\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"/></svg>",
    "box": "<svg viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M4.5 8.5 12 4l7.5 4.5v9L12 21l-7.5-3.5v-9Z\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linejoin=\"round\"/><path d=\"M4.5 8.5 12 12.5l7.5-4M12 12.5V21\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linejoin=\"round\"/></svg>",
    "bed": "<svg viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M4 17v-5.5A2.5 2.5 0 0 1 6.5 9h11a2.5 2.5 0 0 1 2.5 2.5V17M4 17h16M4 17v2m16-2v2M4 9V6.5\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M7 9h4v2.5H7z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\"/></svg>",
    "stack": "<svg viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"4.5\" y=\"9.5\" width=\"10\" height=\"10\" rx=\"1.8\" stroke=\"currentColor\" stroke-width=\"1.7\"/><path d=\"M9 5.5h8.7A1.8 1.8 0 0 1 19.5 7.3V16\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"/></svg>",
    "hardhat": "<svg viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M4 16a8 8 0 0 1 16 0M10 8.5V6a2 2 0 0 1 4 0v2.5\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M3 16h18v2H3z\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linejoin=\"round\"/></svg>",
    "broom": "<svg viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M15.5 3.5 12 7M11 8l5 5M9.5 9.5 4.7 14.3a2 2 0 0 0-.5.9L3 20l4.8-1.2c.35-.09.66-.27.9-.5L14.5 13.5M8 15l2 2M11 12.5l2 2\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
    "sparkle": "<svg viewBox=\"0 0 24 24\" fill=\"currentColor\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M12 2c.6 4.5 2.9 6.8 7.4 7.4C14.9 10 12.6 12.3 12 16.8 11.4 12.3 9.1 10 4.6 9.4 9.1 8.8 11.4 6.5 12 2Z\"/></svg>",
    "drop": "<svg viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M12 3.5C12 3.5 6 10.2 6 14a6 6 0 0 0 12 0c0-3.8-6-10.5-6-10.5Z\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linejoin=\"round\"/></svg>",
    "grass": "<svg viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M4.5 19.5c0-4.5 2.5-7 2.5-7m3.5 7c0-6.5 1.5-10 1.5-10m4 10c0-5.5 2.5-8 2.5-8m2.5 8c0-3.5 1.5-5.5 1.5-5.5\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"/><path d=\"M3 19.5h18\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"/></svg>",
    "key": "<svg viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"8\" cy=\"12\" r=\"3.2\" stroke=\"currentColor\" stroke-width=\"1.7\"/><path d=\"M11.2 12H21M17.5 12v3M20.5 12v2.4\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"/></svg>",
    "paw": "<svg viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"7.2\" cy=\"9\" r=\"1.9\" stroke=\"currentColor\" stroke-width=\"1.6\"/><circle cx=\"12\" cy=\"7\" r=\"1.9\" stroke=\"currentColor\" stroke-width=\"1.6\"/><circle cx=\"16.8\" cy=\"9\" r=\"1.9\" stroke=\"currentColor\" stroke-width=\"1.6\"/><path d=\"M12 12c-2.8 0-5 2-5 4.2 0 1.5 1.2 2.3 2.5 2.3 1 0 1.7-.5 2.5-.5s1.5.5 2.5.5c1.3 0 2.5-.8 2.5-2.3C17 14 14.8 12 12 12Z\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linejoin=\"round\"/></svg>",
    "bone": "<svg viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M8.2 10.2h7.6M8.2 13.8h7.6\" stroke=\"currentColor\" stroke-width=\"1.6\"/><circle cx=\"6\" cy=\"9.6\" r=\"2.1\" stroke=\"currentColor\" stroke-width=\"1.6\"/><circle cx=\"6\" cy=\"14.4\" r=\"2.1\" stroke=\"currentColor\" stroke-width=\"1.6\"/><circle cx=\"18\" cy=\"9.6\" r=\"2.1\" stroke=\"currentColor\" stroke-width=\"1.6\"/><circle cx=\"18\" cy=\"14.4\" r=\"2.1\" stroke=\"currentColor\" stroke-width=\"1.6\"/></svg>",
    "check-circle": "<svg viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"12\" cy=\"12\" r=\"9\" stroke=\"currentColor\" stroke-width=\"1.7\"/><path d=\"m8.5 12 2.3 2.3L16 9.5\" stroke=\"currentColor\" stroke-width=\"1.9\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
    "shield": "<svg viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M12 3 5 6v5c0 4.2 2.9 8 7 9 4.1-1 7-4.8 7-9V6l-7-3Z\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linejoin=\"round\"/><path d=\"m9 12 2 2 4-4\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
    "clock": "<svg viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"12\" cy=\"12\" r=\"8.5\" stroke=\"currentColor\" stroke-width=\"1.7\"/><path d=\"M12 7.5V12l3 2\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
    "phone": "<svg viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M6.5 3.5h3l1.2 4-2 1.3a12 12 0 0 0 5 5l1.3-2 4 1.2v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linejoin=\"round\"/></svg>",
    "check": "<svg viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M20 6 9 17l-5-5\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
    "arrow": "<svg viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M5 12h14M13 6l6 6-6 6\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
  };


  function telHref(p) { return "tel:+1" + p.replace(/\D/g, ""); }

  function apply(c) {
    if (!c) return;

    // brand theme -> CSS variables (with derived hover shades)
    if (c.theme && /^#[0-9a-fA-F]{6}$/.test(c.theme.teal || "")) {
      var darken = function (hex, f) {
        var n = parseInt(hex.slice(1), 16);
        var r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), bl = Math.round((n & 255) * f);
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
      };
      var root = document.documentElement.style;
      root.setProperty("--teal", c.theme.teal);
      root.setProperty("--teal-deep", darken(c.theme.teal, 0.78));
      var tn = parseInt(c.theme.teal.slice(1), 16);
      var tr = (tn >> 16) & 255, tg = (tn >> 8) & 255, tb = tn & 255;
      root.setProperty("--teal-tint", "rgba(" + tr + "," + tg + "," + tb + ",0.16)");
      if (/^#[0-9a-fA-F]{6}$/.test(c.theme.gold || "")) {
        root.setProperty("--gold", c.theme.gold);
        root.setProperty("--gold-deep", darken(c.theme.gold, 0.82));
      }
    }
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

    function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
    function slugify(s) { return String(s).toLowerCase().replace(/&amp;|&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "service"; }
    function ic(name) { return ICONS[name] || ICONS.sparkle; }

    // theme colors
    if (c.theme) {
      if (/^#[0-9a-fA-F]{6}$/.test(c.theme.teal)) {
        document.documentElement.style.setProperty("--teal", c.theme.teal);
        document.documentElement.style.setProperty("--teal-deep", c.theme.teal);
      }
      if (/^#[0-9a-fA-F]{6}$/.test(c.theme.gold)) {
        document.documentElement.style.setProperty("--gold", c.theme.gold);
        document.documentElement.style.setProperty("--gold-deep", c.theme.gold);
      }
    }

    // services: rebuild home grid, services-page sections, booking dropdown
    if (Array.isArray(c.services) && c.services.length) {
      var grid = document.querySelector(".svc-grid");
      if (grid) {
        grid.innerHTML = c.services.map(function (s) {
          var lis = (s.items || []).slice(0, 3).map(function (x) { return "<li>" + ic("check") + " " + esc(x) + "</li>"; }).join("");
          return '<div class="svc-card"><div class="svc-ico">' + ic(s.icon) + "</div><h3>" + esc(s.title) + "</h3><p>" + esc(s.blurb) + '</p><ul class="svc-list">' + lis + '</ul><a class="more" href="services.html#' + slugify(s.title) + '">Get a quote ' + ic("arrow") + "</a></div>";
        }).join("");
      }
      var wrapEl = document.querySelector('[data-cms="svc-sections"]');
      if (wrapEl) {
        wrapEl.innerHTML = c.services.map(function (s, i) {
          var feats = (s.items || []).map(function (x) { return '<div class="feat">' + ic("check-circle") + "<div><b>" + esc(x) + "</b></div></div>"; }).join("");
          return '<section class="section' + (i % 2 === 1 ? " section-mist" : "") + '" id="' + slugify(s.title) + '"><div class="wrap"><div class="section-head"><p class="eyebrow">' + ic(s.icon) + " " + esc(s.title) + "</p><h2>" + esc(s.title) + '</h2><p class="lede">' + esc(s.blurb) + '</p></div><div class="feat-grid">' + feats + '</div><div style="margin-top:32px;"><a class="btn btn-primary" href="book.html">' + ic("sparkle") + " Book now</a></div></div></section>";
        }).join("");
      }
      var sel = document.getElementById("b-service");
      if (sel) {
        var keep = sel.querySelector("option[disabled]");
        sel.innerHTML = "";
        if (keep) sel.appendChild(keep);
        c.services.forEach(function (s) { var o = document.createElement("option"); o.textContent = s.title; sel.appendChild(o); });
        var last = document.createElement("option"); last.textContent = "Not sure — need an estimate"; sel.appendChild(last);
      }
    }

    // add-ons: rebuild services grid, booking checkboxes, home callout
    if (Array.isArray(c.addons)) {
      var addSec = document.getElementById("addons");
      var fieldset = document.querySelector("fieldset.addons-field");
      var callout = document.querySelector(".addon-callout");
      if (c.addons.length === 0) {
        if (addSec) addSec.style.display = "none";
        if (fieldset) fieldset.style.display = "none";
        if (callout) callout.style.display = "none";
      } else {
        if (addSec) {
          var fg = addSec.querySelector(".feat-grid");
          if (fg) fg.innerHTML = c.addons.map(function (a) {
            return '<div class="feat">' + ic(a.icon) + "<div><b>" + esc(a.label) + "</b><span>" + esc(a.desc) + "</span></div></div>";
          }).join("");
        }
        var ag = document.querySelector(".addon-grid");
        if (ag) {
          ag.innerHTML = c.addons.map(function (a) {
            return '<label class="addon-opt"><input type="checkbox" name="addons" value="' + esc(a.label) + '"> ' + esc(a.label) + "</label>";
          }).join("");
        }
        if (callout) {
          var cp = callout.querySelector("p:not(.eyebrow)");
          if (cp) {
            var labels = c.addons.map(function (a) { return a.label.toLowerCase(); });
            cp.textContent = (labels.length > 1 ? labels.slice(0, -1).join(", ") + ", and " + labels[labels.length - 1] : labels[0]) + " — add any of them when you book.";
          }
        }
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
