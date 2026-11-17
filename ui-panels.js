/* Market Masters — world map, academy and mentor panels */
(() => {
  "use strict";

  const D = window.MM_DATA;
  const M = window.MM;
  const S = M.state;
  const UI = window.MM.ui = window.MM.ui || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = M.escapeHTML;
  const money = M.money;
  const pct = M.pct;
  const world = window.WORLD_MAP || { w: 1000, h: 500, countries: [] };

  /* ---------------- world map ---------------- */
  function project(lon, lat) {
    return { x: ((lon + 180) / 360) * world.w, y: ((90 - lat) / 180) * world.h };
  }

  function buildGraticule() {
    const lines = [];
    for (let lon = -150; lon <= 150; lon += 30) {
      const x = project(lon, 0).x;
      lines.push(`M${x},0V${world.h}`);
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = project(0, lat).y;
      lines.push(`M0,${y}H${world.w}`);
    }
    return `<path class="graticule" d="${lines.join("")}"/>`;
  }

  UI.renderMap = () => {
    const wrap = $("#world-map-wrap");
    if (!wrap) return;
    const supported = new Set(D.countries.map((c) => c.id));
    const open = new Set(S.countries);
    const paths = world.countries.map((country) => {
      const isSupported = supported.has(country.id);
      const classes = ["country-path"];
      if (isSupported) classes.push("is-supported");
      if (open.has(country.id)) classes.push("is-open");
      if (country.id === "USA") classes.push("is-home");
      if (country.id === S.selectedCountry) classes.push("is-selected");
      const attrs = isSupported
        ? `data-country="${country.id}" tabindex="0" role="button" aria-label="Open market details for ${esc(country.name)}"`
        : `aria-hidden="true"`;
      return `<path class="${classes.join(" ")}" d="${country.d}" ${attrs}><title>${esc(country.name)}</title></path>`;
    }).join("");

    const pins = D.countries.map((country) => {
      const point = project(country.lon, country.lat);
      const classes = ["pin-group"];
      if (open.has(country.id)) classes.push("is-open");
      if (country.id === "USA") classes.push("is-home");
      if (country.id === S.selectedCountry) classes.push("is-selected");
      const labelX = point.x + country.labelDx;
      const labelY = point.y + country.labelDy;
      return `<g class="${classes.join(" ")}" data-country="${country.id}" tabindex="0" role="button" aria-label="${esc(country.name)} — ${open.has(country.id) ? "operating" : "available market"}">
        <circle class="pin-hit" cx="${point.x}" cy="${point.y}" r="16"></circle>
        <circle class="pin-halo" cx="${point.x}" cy="${point.y}" r="9"></circle>
        <circle class="pin-core" cx="${point.x}" cy="${point.y}" r="3.8"></circle>
        <text class="pin-label" x="${labelX}" y="${labelY}">${country.id}</text>
      </g>`;
    }).join("");

    wrap.innerHTML = `<svg class="world-svg" viewBox="0 0 ${world.w} ${world.h}" role="img" aria-label="World map of company operations">
      <defs>
        <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#1b5554" stop-opacity=".24"/>
          <stop offset="100%" stop-color="#07141d" stop-opacity="0"/>
        </radialGradient>
        <filter id="mapShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity=".22"/>
        </filter>
      </defs>
      <rect width="${world.w}" height="${world.h}" fill="transparent"/>
      <circle cx="520" cy="245" r="300" fill="url(#mapGlow)"/>
      ${buildGraticule()}
      <g filter="url(#mapShadow)">${paths}</g>
      <g class="map-pins">${pins}</g>
    </svg>`;
  };

  UI.showMapTooltip = (event, id) => {
    const country = M.countryById(id);
    const tip = $("#map-tooltip");
    const scroll = $(".map-scroll");
    if (!country || !tip || !scroll) return;
    const isOpen = M.isCountryOpen(id);
    const req = isOpen ? "Operating" : `Entry ${money(country.cost)} · +${Math.round(country.bonus * 100)}% reach`;
    tip.innerHTML = `<b>${country.flag} ${esc(country.name)}</b>${esc(req)}`;
    tip.hidden = false;
    const rect = scroll.getBoundingClientRect();
    const left = M.clamp(event.clientX - rect.left + scroll.scrollLeft, 80, scroll.scrollWidth - 80);
    const top = Math.max(28, event.clientY - rect.top);
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  };
  UI.hideMapTooltip = () => {
    const tip = $("#map-tooltip");
    if (tip) tip.hidden = true;
  };

  UI.renderCountryChips = () => {
    const el = $("#country-chips");
    if (!el) return;
    el.innerHTML = D.countries.map((c) => {
      const isOpen = M.isCountryOpen(c.id);
      const home = c.id === "USA";
      return `<button class="country-chip ${isOpen ? "open" : "locked"} ${home ? "home" : ""} ${S.selectedCountry === c.id ? "active" : ""}" data-country-select="${c.id}">
        <span class="cc-flag">${c.flag}</span><span class="cc-name">${esc(c.name)}</span><span class="cc-state"></span>
      </button>`;
    }).join("");
  };

  function fxRateText(country) {
    const rate = M.fxRate(country.fx);
    const formatted = rate >= 100 ? rate.toFixed(2) : rate >= 1 ? rate.toFixed(2) : rate.toFixed(3);
    return `1 USD = ${formatted} ${country.currency}`;
  }

  UI.renderFxBadge = () => {
    const badge = $("#fx-badge");
    const label = $("#fx-status");
    if (!badge || !label) return;
    const source = S.fx && S.fx.source;
    const updated = S.fx && S.fx.updated;
    badge.classList.toggle("live", source === "live");
    if (source === "live") {
      label.textContent = `Live FX · ${new Date(updated).toLocaleDateString("en-US", { day: "2-digit", month: "short" })}`;
    } else if (source === "cached") {
      label.textContent = "FX rates cached · refreshing";
    } else {
      label.textContent = "Indicative FX rates · connecting…";
    }
  };

  UI.renderOpsCard = () => {
    const el = $("#ops-card");
    if (!el) return;
    const active = S.countries.map((id) => M.countryById(id)).filter(Boolean);
    const bonus = Math.round(M.countryBonus() * 100);
    const source = S.fx && S.fx.source;
    const sourceText = source === "live" ? "Live exchange-rate feed connected. Currency rates update the market view, not your score." : "Using built-in exchange rates while the live feed connects. Your game works offline.";
    el.innerHTML = `
      <div class="ops-total">
        <div><strong>${active.length}</strong><span>active market${active.length === 1 ? "" : "s"}</span></div>
        <div class="ops-bonus">+${bonus}%</div>
      </div>
      <div class="ops-list">${active.map((c) => `<span class="ops-chip">${c.flag} ${esc(c.name)}</span>`).join("")}</div>
      <div class="fx-line"><b>Global reach bonus:</b> expansion adds a permanent percentage to every venture's income.<br>${esc(sourceText)}</div>`;
  };

  UI.renderCountryDetail = () => {
    const el = $("#country-detail");
    if (!el) return;
    const c = M.countryById(S.selectedCountry) || M.countryById("USA");
    if (!c) return;
    const isOpen = M.isCountryOpen(c.id);
    const isHome = c.id === "USA";
    const levelMet = S.level >= c.reqLevel;
    const netMet = M.netWorth() >= c.reqNet;
    const cashMet = S.cash >= c.cost;
    const allMet = levelMet && netMet && cashMet;
    const status = isHome ? "Headquarters" : isOpen ? "Operating here" : "Available market";
    const button = isHome
      ? `<button class="btn btn-ghost" disabled>Home base · always active</button>`
      : isOpen
        ? `<button class="btn btn-gold" disabled>✓ Operating · +${Math.round(c.bonus * 100)}% reach</button>`
        : `<button class="btn btn-primary" data-expand-country="${c.id}" ${allMet ? "" : "disabled"}>Enter market · ${money(c.cost)}</button>`;
    el.innerHTML = `
      <div class="country-hero">
        <span class="country-flag">${c.flag}</span>
        <div><h3>${esc(c.name)}</h3><span>${esc(c.region)} · ${esc(c.market)} market</span></div>
        <span class="country-status ${isOpen ? "" : "locked"}">${status}</span>
      </div>
      <p class="country-insight">${esc(c.insight)}</p>
      <div class="country-stats">
        <div class="country-stat"><span>Trade bonus</span><strong class="gold">${isHome ? "Base market" : `+${Math.round(c.bonus * 100)}% revenue`}</strong></div>
        <div class="country-stat"><span>Currency</span><strong>${c.currency}</strong></div>
        <div class="country-stat"><span>Risk level</span><strong>${esc(c.risk)}</strong></div>
        <div class="country-stat"><span>Exchange rate</span><strong>${fxRateText(c)}</strong></div>
      </div>
      ${isHome ? `<div class="country-req"><div class="req-row met"><span class="req-check">✓</span>Your home market and headquarters</div><div class="req-row met"><span class="req-check">✓</span>All global revenue is reported in USD</div></div>` : `
        <div class="country-req">
          <div class="req-row ${levelMet ? "met" : ""}"><span class="req-check">${levelMet ? "✓" : ""}</span>Founder level ${c.reqLevel}${levelMet ? " · reached" : ` (you are level ${S.level})`}</div>
          <div class="req-row ${netMet ? "met" : ""}"><span class="req-check">${netMet ? "✓" : ""}</span>${money(c.reqNet)} net worth${netMet ? " · reached" : ` (${money(M.netWorth())})`}</div>
          <div class="req-row ${cashMet ? "met" : ""}"><span class="req-check">${cashMet ? "✓" : ""}</span>${money(c.cost)} cash for market entry</div>
        </div>`}
      ${button}
      <p class="small-note">${isOpen ? "Global expansion is permanent. Its bonus applies to every venture." : "Expansion is paid once and never expires. Check both the opportunity and the currency risk."}</p>`;
  };

  UI.renderWorld = () => {
    UI.renderMap();
    UI.renderCountryChips();
    UI.renderCountryDetail();
    UI.renderOpsCard();
    UI.renderFxBadge();
    const active = S.countries.length;
    const count = $("#ops-count");
    if (count) count.textContent = active;
    const plural = $("#ops-count-plural");
    if (plural) plural.textContent = active === 1 ? "" : "s";
    const bonus = $("#ops-bonus");
    if (bonus) bonus.textContent = `+${Math.round(M.countryBonus() * 100)}%`;
    const next = D.countries.filter((c) => !M.isCountryOpen(c.id)).sort((a, b) => a.reqLevel - b.reqLevel)[0];
    const lvl = $("#world-level");
    if (lvl) lvl.textContent = next ? `Lv ${next.reqLevel}` : "All open";
  };

  /* ---------------- academy ---------------- */
  UI.renderAcademy = () => {
    const done = S.lessonsDone.length;
    const percent = Math.round((done / D.lessons.length) * 100);
    const ring = $("#academy-ring");
    if (ring) {
      ring.style.setProperty("--progress", `${percent}%`);
      const label = $("#academy-ring-label");
      if (label) label.textContent = `${percent}%`;
    }
    const count = $("#academy-count");
    if (count) count.textContent = `${done} of ${D.lessons.length} lessons`;
    const xp = $("#academy-xp");
    if (xp) xp.textContent = M.int(S.academyXp);

    const grid = $("#lesson-grid");
    if (grid) {
      const nextLesson = D.lessons.find((l) => !S.lessonsDone.includes(l.id));
      grid.innerHTML = D.lessons.map((lesson) => {
        const isDone = S.lessonsDone.includes(lesson.id);
        const isNext = nextLesson && nextLesson.id === lesson.id;
        return `<button class="lesson-card ${isDone ? "done" : ""}" data-lesson="${lesson.id}">
          <span class="lesson-tag">${isDone ? "" : isNext ? "Next up" : ""}</span>
          <span class="lesson-num">LESSON ${String(lesson.num).padStart(2, "0")}</span>
          <span class="lesson-icon">${lesson.icon}</span>
          <h3>${esc(lesson.title)}</h3>
          <p>${esc(lesson.summary)}</p>
          <span class="lesson-meta"><span>${lesson.time} · ${esc(lesson.tag)}</span><span class="lesson-reward">${isDone ? "✓ complete" : `+${money(lesson.reward)}`}</span></span>
        </button>`;
      }).join("");
    }

    const preview = $("#glossary-preview");
    if (preview) {
      const ids = ["cashflow", "compound", "diversification", "stock", "valuation", "fx"];
      preview.innerHTML = ids.map((id) => {
        const term = D.glossary.find((g) => g.id === id);
        if (!term) return "";
        return `<button class="glossary-mini" data-term="${term.id}"><strong>${esc(term.term)}</strong><span>${esc(term.short)}</span></button>`;
      }).join("");
    }
    UI.updateCompoundLab();
  };

  UI.updateCompoundLab = () => {
    const startEl = $("#lab-start");
    const monthlyEl = $("#lab-monthly");
    const rateEl = $("#lab-rate");
    const yearsEl = $("#lab-years");
    if (!startEl || !monthlyEl || !rateEl || !yearsEl) return;
    const start = Math.max(0, Number(startEl.value) || 0);
    const monthly = Math.max(0, Number(monthlyEl.value) || 0);
    const annual = Math.max(0.1, Number(rateEl.value) || 8);
    const years = Math.max(1, Number(yearsEl.value) || 10);
    const months = years * 12;
    const r = Math.pow(1 + annual / 100, 1 / 12) - 1;
    const future = start * Math.pow(1 + r, months) + monthly * ((Math.pow(1 + r, months) - 1) / r);
    const invested = start + monthly * months;
    const growth = Math.max(0, future - invested);
    const set = (id, value) => { const el = $(id); if (el) el.textContent = value; };
    set("#lab-rate-label", `${annual}%`);
    set("#lab-years-label", `${years}`);
    set("#lab-future", money(future));
    set("#lab-invested", money(invested));
    set("#lab-growth", money(growth));
    const total = future || 1;
    const inBar = $("#lab-bar-in");
    const growthBar = $("#lab-bar-growth");
    if (inBar) inBar.style.width = `${(invested / total) * 100}%`;
    if (growthBar) growthBar.style.width = `${(growth / total) * 100}%`;
  };

  /* ---------------- mentor ---------------- */
  UI.nextMentorTask = () => D.tutorialTasks.find((t) => !S.tutorialDone.includes(t.id)) || null;

  UI.renderMentor = () => {
    const pop = $("#mentor-popover");
    const fab = $("#mentor-fab");
    if (!pop || !fab) return;
    if (!S.onboarded) {
      pop.hidden = true;
      fab.hidden = true;
      return;
    }
    const next = UI.nextMentorTask();
    const done = S.tutorialDone.length;
    const total = D.tutorialTasks.length;
    if (S.mentorHidden) {
      pop.hidden = true;
      fab.hidden = false;
      return;
    }
    pop.hidden = false;
    fab.hidden = true;
    const level = $("#mentor-level");
    if (level) level.textContent = next ? `${Math.max(0, total - done)} tasks` : "Ready";
    const msg = $("#mentor-message");
    if (msg) msg.textContent = next
      ? next.message
      : "You have the foundation: invest, diversify, learn, and think globally. Keep asking why the numbers move.";
    const tasks = $("#mentor-tasks");
    if (tasks) {
      tasks.innerHTML = D.tutorialTasks.map((task) => `<div class="mentor-task ${S.tutorialDone.includes(task.id) ? "done" : ""}"><span class="task-check">${S.tutorialDone.includes(task.id) ? "✓" : ""}</span>${esc(task.text)}</div>`).join("");
    }
    const action = $("#mentor-action");
    if (action) action.innerHTML = next ? `Show me <svg class="icon"><use href="#icon-arrow"/></svg>` : `Open Academy <svg class="icon"><use href="#icon-arrow"/></svg>`;
  };

  /* ---------------- public helpers ---------------- */
  UI.refreshAll = (() => {
    const original = UI.refreshAll;
    return () => {
      original();
      UI.renderWorld();
      UI.renderAcademy();
      UI.renderMentor();
    };
  })();
})();
