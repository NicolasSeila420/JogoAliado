/* Market Masters — interface rendering */
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
  const money2 = M.money2;
  const pct = M.pct;

  UI.buyMode = "1";

  /* ---------------- toasts & celebration ---------------- */
  UI.toast = ({ title, message, tone = "info", icon = "✦" }) => {
    const stack = $("#toast-stack");
    if (!stack) return;
    while (stack.children.length >= 4) stack.firstElementChild.remove();
    const el = document.createElement("div");
    el.className = `toast ${tone}`;
    el.innerHTML = `<span class="toast-icon">${esc(icon)}</span><div><b>${esc(title)}</b><span>${esc(message)}</span></div>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add("leaving");
      setTimeout(() => el.remove(), 320);
    }, 3900);
  };

  UI.confetti = () => {
    const colors = ["#69e6a8", "#f4c66e", "#7cb8ff", "#b6a0ff", "#ffb1c1"];
    for (let i = 0; i < 28; i++) {
      const bit = document.createElement("div");
      bit.className = "confetti-bit";
      bit.style.left = `${35 + Math.random() * 30}vw`;
      bit.style.top = `${35 + Math.random() * 15}vh`;
      bit.style.background = colors[Math.floor(Math.random() * colors.length)];
      bit.style.setProperty("--dx", `${(Math.random() - 0.5) * 260}px`);
      bit.style.setProperty("--rot", `${Math.random() * 720 - 360}deg`);
      bit.style.animationDelay = `${Math.random() * 0.15}s`;
      document.body.appendChild(bit);
      setTimeout(() => bit.remove(), 1600);
    }
  };

  /* ---------------- top bar ---------------- */
  UI.updateCampaignButton = () => {
    const btn = $("#campaign-btn");
    const label = $("#campaign-label");
    const note = $("#campaign-note");
    if (!btn || !label || !note) return;
    const now = Date.now();
    const active = M.campaignRemaining(now);
    const cooldown = M.campaignCooldown(now);
    const noVenture = M.ownedTotal() === 0;
    btn.disabled = active > 0 || cooldown > 0 || noVenture;
    if (active > 0) {
      label.textContent = `Boost active · ${Math.ceil(active / 1000)}s`;
      note.textContent = "2× venture income is live. Use it before it expires.";
    } else if (cooldown > 0) {
      label.textContent = `Ready in ${Math.ceil(cooldown / 1000)}s`;
      note.textContent = "Campaign cooldown — good marketing needs pacing.";
    } else if (noVenture) {
      label.textContent = "Launch campaign";
      note.textContent = "Buy a venture first; campaigns amplify existing revenue.";
    } else {
      label.textContent = "Launch campaign";
      const cost = Math.max(10, Math.floor(S.cash * 0.02));
      note.textContent = `Double income for 20s · costs ${money(cost)} (2% of cash) · ready now`;
    }
  };

  UI.updateTopBar = () => {
    const tc = $("#top-cash");
    const ti = $("#top-income");
    if (tc) { tc.textContent = money(S.cash); tc.title = M.fullMoney(S.cash); }
    if (ti) ti.textContent = `+${money(M.incomePerSecond())}/s`;
    const badge = $("#level-badge");
    if (badge) badge.textContent = `Lv ${S.level}`;
    const fill = $("#level-fill");
    if (fill) fill.style.width = `${(M.levelProgress() * 100).toFixed(1)}%`;
    const levelChip = $("#level-chip");
    if (levelChip) levelChip.title = `${Math.floor(S.xp)} / ${M.xpNeeded()} XP to level ${S.level + 1}`;
    const day = $("#day-chip");
    if (day) day.textContent = `Day ${Math.max(1, Math.floor(S.playSeconds / 30) + 1)}`;
    const marketState = $("#market-state");
    if (marketState) marketState.textContent = "Market open";
    const dot = $("#world-nav-dot");
    if (dot) {
      const canExpand = D.countries.some((c) => !M.isCountryOpen(c.id) && S.level >= c.reqLevel && M.netWorth() >= c.reqNet);
      dot.style.display = canExpand ? "block" : "none";
    }
    UI.updateCampaignButton();
  };

  /* ---------------- charts ---------------- */
  function setupCanvas(canvas) {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return null;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width: rect.width, height: rect.height };
  }

  function drawSeries(canvas, values, color, options = {}) {
    const setup = setupCanvas(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;
    ctx.clearRect(0, 0, width, height);
    if (!values || values.length < 2) return;
    const pad = options.pad || 8;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || Math.max(1, max * 0.1);
    const xFor = (i) => pad + (i / (values.length - 1)) * (width - pad * 2);
    const yFor = (v) => pad + (1 - (v - min) / span) * (height - pad * 2);

    if (options.grid) {
      ctx.strokeStyle = "rgba(255,255,255,.045)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const y = pad + (i / 4) * (height - pad * 2);
        ctx.beginPath();
        ctx.moveTo(pad, y);
        ctx.lineTo(width - pad, y);
        ctx.stroke();
      }
    }

    const path = new Path2D();
    values.forEach((value, i) => {
      const x = xFor(i);
      const y = yFor(value);
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    });

    const area = new Path2D(path);
    area.lineTo(width - pad, height - pad);
    area.lineTo(pad, height - pad);
    area.closePath();
    const gradient = ctx.createLinearGradient(0, pad, 0, height);
    gradient.addColorStop(0, hexToRgba(color, 0.24));
    gradient.addColorStop(1, hexToRgba(color, 0.01));
    ctx.fillStyle = gradient;
    ctx.fill(area);

    ctx.strokeStyle = color;
    ctx.lineWidth = options.lineWidth || 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.shadowColor = hexToRgba(color, 0.45);
    ctx.shadowBlur = options.glow ? 8 : 0;
    ctx.stroke(path);
    ctx.shadowBlur = 0;

    if (options.dot) {
      const x = xFor(values.length - 1);
      const y = yFor(values[values.length - 1]);
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = hexToRgba(color, 0.18);
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function hexToRgba(hex, alpha) {
    const clean = String(hex).replace("#", "");
    const value = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
    const r = parseInt(value.slice(0, 2), 16) || 105;
    const g = parseInt(value.slice(2, 4), 16) || 230;
    const b = parseInt(value.slice(4, 6), 16) || 168;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  UI.drawNetworthChart = () => {
    const canvas = $("#networth-chart");
    if (!canvas) return;
    let values = S.networthHistory.slice(-70);
    if (values.length < 2) values = [S.cash * 0.8 || 1, M.netWorth()];
    const current = M.netWorth();
    const first = values[0] || current;
    drawSeries(canvas, values, current >= first ? "#69e6a8" : "#ff7a90", { grid: true, glow: true, dot: true, pad: 7 });
  };

  UI.drawStockChart = () => {
    const canvas = $("#stock-chart");
    if (!canvas) return;
    const id = S.selectedStock;
    const def = M.stockDef(id);
    const live = M.stockLive(id);
    if (!def || !live) return;
    drawSeries(canvas, live.history.slice(-48), def.color, { grid: true, glow: true, dot: true, pad: 6, lineWidth: 2.2 });
  };

  UI.redrawCharts = () => {
    UI.drawNetworthChart();
    UI.drawStockChart();
  };

  /* ---------------- ticker ---------------- */
  UI.buildTicker = () => {
    const track = $("#ticker-track");
    if (!track) return;
    const items = [];
    const news = S.news.slice(0, 7);
    if (news.length) {
      news.forEach((n) => {
        const tone = n.impact >= 0 ? "up" : "down";
        items.push(`<span class="ticker-item"><b>${esc(n.tag || "MARKET")}</b>${esc(n.headline)}<span class="${tone}">${n.impact ? pct(n.impact * 100) : "TIP"}</span></span>`);
      });
    } else {
      items.push(`<span class="ticker-item"><b>ACADEMY</b>Profit is not the same thing as cash flow.<span class="up">TIP</span></span>`);
      items.push(`<span class="ticker-item"><b>MENTOR</b>Diversification spreads company-specific risk.<span class="up">TIP</span></span>`);
    }
    D.stocks.forEach((def) => {
      const change = M.stockChange(def.id);
      items.push(`<span class="ticker-item"><b>${def.id}</b>${money2(S.stocks[def.id].price)}<span class="${change >= 0 ? "up" : "down"}">${pct(change, 1)}</span></span>`);
    });
    const html = items.join("");
    track.innerHTML = html + html;
  };

  /* ---------------- dashboard ---------------- */
  UI.renderBriefing = () => {
    const body = $("#briefing-body");
    const tag = $("#briefing-tag");
    if (!body) return;
    const n = S.latestNews;
    if (!n) {
      if (tag) tag.textContent = "Start here";
      body.innerHTML = `
        <div class="briefing-headline">Every number is a decision in disguise.</div>
        <div class="briefing-copy">A business grows by turning cash into productive assets. Your first Lemonade Cart costs cash today and pays you back over time. Reinvest the income and the next purchase arrives sooner.</div>
        <div class="briefing-lesson"><strong>Founder principle:</strong> cash flow keeps the lights on, while profit tells you whether the model works. Watch both.</div>`;
      return;
    }
    if (tag) tag.textContent = n.tag || "Market";
    body.innerHTML = `
      <div class="briefing-headline">${esc(n.headline)}</div>
      <div class="briefing-copy">${esc(n.detail)}</div>
      <div class="briefing-lesson"><strong>Why it matters:</strong> ${esc(n.explain)}</div>`;
  };

  UI.renderHQ = () => {
    const name = $("#hq-company-name");
    if (name) name.textContent = S.companyName;
    const worth = M.netWorth();
    const first = S.networthHistory[0] || worth;
    const delta = first ? ((worth - first) / first) * 100 : 0;
    const worthEl = $("#hq-networth");
    if (worthEl) { worthEl.textContent = money(worth); worthEl.title = M.fullMoney(worth); }
    const deltaEl = $("#hq-networth-delta");
    if (deltaEl) {
      deltaEl.textContent = `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(1)}%`;
      deltaEl.className = delta >= 0 ? "delta-up" : "delta-down";
    }

    const metrics = $("#hq-metrics");
    if (metrics) {
      const rate = M.incomePerSecond();
      const profit = M.openProfit();
      metrics.innerHTML = [
        metricCard("💵", "green", "Passive income", `${money(rate)}<span style="font-size:11px;color:var(--muted-2)">/s</span>`, `${M.ownedTotal()} businesses · ${M.globalMultiplier().toFixed(2)}× multiplier`),
        metricCard("📈", "blue", "Stock portfolio", money(M.portfolioValue()), `${M.holdingsCount()} companies · <span class="${profit >= 0 ? "text-green" : "text-red"}">${profit >= 0 ? "+" : ""}${money(profit)}</span> open P/L`),
        metricCard("🌍", "gold", "Global reach", `${S.countries.length} markets`, `+${Math.round(M.countryBonus() * 100)}% revenue from expansion`),
        metricCard("🎓", "violet", "Academy", `${S.lessonsDone.length}/8`, `${M.int(S.academyXp)} learning XP · ${S.lessonsDone.length === 0 ? "start learning" : "keep going"}`)
      ].join("");
    }

    const goalBox = $("#next-goal-body");
    const goal = M.nextGoal();
    if (goalBox) {
      if (!goal) {
        goalBox.innerHTML = `
          <div class="next-goal-title">You completed every milestone.</div>
          <div class="next-goal-desc">Now the game is yours. Keep building, keep learning, and watch the compounding do its quiet work.</div>
          <button class="btn btn-gold btn-small" data-goto="academy" style="margin-top:12px">Review the Academy</button>`;
      } else {
        const progress = M.goalProgress(goal);
        goalBox.innerHTML = `
          <div class="next-goal-title">${esc(goal.title)}</div>
          <div class="next-goal-desc">${esc(goal.desc)}</div>
          <div class="goal-progress"><span style="width:${(progress.ratio * 100).toFixed(1)}%"></span></div>
          <div class="goal-meta"><span>${esc(progress.label)}</span><span class="goal-reward">+${money(goal.reward)} reward</span></div>
          <button class="btn btn-ghost btn-small" data-goto="${esc(goal.view)}">Go to ${viewName(goal.view)} <svg class="icon"><use href="#icon-arrow"/></svg></button>`;
      }
    }

    const nextLesson = D.lessons.find((l) => !S.lessonsDone.includes(l.id));
    const skillTitle = $("#skill-title");
    const skillCopy = $("#skill-copy");
    const skillIcon = $("#skill-icon");
    if (nextLesson) {
      if (skillTitle) skillTitle.textContent = nextLesson.title;
      if (skillCopy) skillCopy.textContent = nextLesson.summary;
      if (skillIcon) skillIcon.textContent = nextLesson.icon;
    } else {
      if (skillTitle) skillTitle.textContent = "Your foundation is complete";
      if (skillCopy) skillCopy.textContent = "Review any lesson or experiment in the compound lab.";
      if (skillIcon) skillIcon.textContent = "🏅";
    }

    const list = $("#hq-venture-list");
    if (list) {
      const sorted = D.ventures.slice().sort((a, b) => {
        const diff = (S.ventures[b.id] || 0) - (S.ventures[a.id] || 0);
        return diff || D.ventures.indexOf(a) - D.ventures.indexOf(b);
      }).slice(0, 3);
      list.innerHTML = sorted.map((v) => {
        const owned = S.ventures[v.id];
        const locked = M.ventureLock(v);
        const earn = v.income * owned * M.globalMultiplier();
        return `<div class="hq-venture-row">
          <span class="hq-venture-icon" style="color:${v.color}">${v.icon}</span>
          <div class="hq-venture-name"><strong>${esc(v.name)}</strong><span>${locked ? "Locked — grow your previous venture" : `${owned} owned`}</span></div>
          <div class="hq-venture-earn"><strong>${locked ? "—" : money(earn) + "/s"}</strong><span>${locked ? "locked" : "passive"}</span></div>
        </div>`;
      }).join("");
    }

    UI.renderBriefing();
    requestAnimationFrame(UI.drawNetworthChart);
  };

  function metricCard(icon, cls, label, value, detail) {
    return `<div class="metric-card"><span class="metric-icon ${cls}">${icon}</span><div><span>${label}</span><strong>${value}</strong><small>${detail}</small></div></div>`;
  }
  function viewName(view) {
    return ({ hq: "Dashboard", ventures: "Ventures", stocks: "Stocks", world: "World", academy: "Academy" })[view] || "Dashboard";
  }

  /* ---------------- ventures ---------------- */
  UI.renderVentures = () => {
    const grid = $("#venture-grid");
    if (!grid) return;
    const rate = M.incomePerSecond();
    const incomeEl = $("#venture-income");
    if (incomeEl) incomeEl.innerHTML = `${money(rate)}<span>/s</span>`;
    const detailEl = $("#venture-income-detail");
    if (detailEl) detailEl.textContent = `${M.ownedTotal()} businesses owned · ${Math.round(M.countryBonus() * 100)}% market bonus`;
    const mult = $("#global-mult");
    if (mult) mult.textContent = `${M.globalMultiplier().toFixed(2)}×`;
    const multDetail = $("#multiplier-detail");
    if (multDetail) multDetail.textContent = `Level bonus +${Math.round((S.level - 1) * 4)}% · markets +${Math.round(M.countryBonus() * 100)}%`;

    grid.innerHTML = D.ventures.map((v) => {
      const owned = S.ventures[v.id] || 0;
      const locked = M.ventureLock(v);
      const global = M.globalMultiplier();
      const unitIncome = v.income * global;
      const totalIncome = unitIncome * owned;
      const maxCount = M.maxAffordable(v);
      const requested = UI.buyMode === "max" ? Math.max(0, maxCount) : Math.max(1, parseInt(UI.buyMode, 10) || 1);
      const displayCount = requested || 1;
      const cost = M.ventureCost(v, displayCount);
      const canAfford = !locked && requested > 0 && cost <= S.cash + 0.001;
      const lockProgress = locked ? Math.min(100, (locked.owned / locked.needed) * 100) : 100;
      let actionHtml = "";
      if (locked) {
        actionHtml = `<div class="venture-lock"><svg class="icon"><use href="#icon-lock"/></svg>Unlock after ${locked.previous.name} ×${locked.needed}</div>
          <div class="unlock-line"><svg class="icon"><use href="#icon-lock"/></svg>${locked.owned} / ${locked.needed} ${esc(locked.previous.name)} owned</div>
          <div class="unlock-track"><span style="width:${lockProgress}%"></span></div>`;
      } else {
        actionHtml = `<button class="btn ${canAfford ? "btn-primary" : "btn-ghost"} venture-buy" data-buy-venture="${v.id}" ${canAfford ? "" : "disabled"}>
          <span>${requested > 0 ? `Invest ×${requested}` : "Not enough cash"}</span><b>${requested > 0 ? money(cost) : "—"}</b>
        </button>`;
      }
      return `<article class="venture-card ${locked ? "is-locked" : ""}" style="--venture-color:${v.color}">
        <div class="venture-top">
          <div class="venture-icon">${v.icon}</div>
          <div class="owned-badge"><strong>${owned}</strong><span>owned</span></div>
        </div>
        <h3>${esc(v.name)}</h3>
        <p class="venture-tagline">${esc(v.tagline)}</p>
        <div class="concept-tag"><i></i>${esc(v.concept)}</div>
        <div class="venture-numbers">
          <div class="venture-number"><span>Each earns</span><strong class="green">${money(unitIncome)}/s</strong></div>
          <div class="venture-number"><span>Your total</span><strong>${money(totalIncome)}/s</strong></div>
        </div>
        ${actionHtml}
        <button class="edu-link" data-lesson="${v.lesson}">📘 Learn the idea behind ${esc(v.concept.toLowerCase())}</button>
      </article>`;
    }).join("");
  };

  UI.setBuyMode = (mode) => {
    UI.buyMode = mode;
    $$(".segment[data-buy-mode]").forEach((b) => b.classList.toggle("active", b.dataset.buyMode === mode));
    UI.renderVentures();
  };

  /* ---------------- stocks ---------------- */
  function sparkline(values, color) {
    const vals = (values || []).slice(-30);
    if (vals.length < 2) return "";
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const points = vals.map((v, i) => {
      const x = 2 + (i / (vals.length - 1)) * 96;
      const y = 3 + (1 - (v - min) / span) * 24;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return `<svg class="sparkline" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
  }

  UI.renderStockList = () => {
    const list = $("#stock-list");
    if (!list) return;
    list.innerHTML = D.stocks.map((def) => {
      const live = S.stocks[def.id];
      const change = M.stockChange(def.id);
      const selected = S.selectedStock === def.id;
      return `<button class="stock-row ${selected ? "active" : ""}" data-stock="${def.id}" aria-label="View ${esc(def.name)}">
        <span class="stock-id"><span class="stock-logo" style="--stock-color:${def.color}">${def.id}</span><span><strong>${esc(def.name)}</strong><span>${esc(def.sector)}</span></span></span>
        ${sparkline(live.history, def.color)}
        <span class="stock-price">${money2(live.price)}</span>
        <span class="stock-change ${change >= 0 ? "up" : "down"}">${pct(change, 1)}</span>
      </button>`;
    }).join("");
  };

  UI.renderSentiment = () => {
    const pill = $("#sentiment-pill");
    if (!pill) return;
    const sentiment = M.sentimentLabel();
    pill.className = `sentiment ${sentiment.cls}`;
    pill.innerHTML = `<span>Sentiment</span><strong>${sentiment.label}</strong>`;
  };

  UI.renderStockMetrics = () => {
    const el = $("#stock-metrics");
    if (!el) return;
    const profit = M.openProfit();
    el.innerHTML = [
      metricCard("💵", "green", "Available cash", money(S.cash), "ready to deploy"),
      metricCard("📈", "blue", "Portfolio value", money(M.portfolioValue()), `${M.holdingsCount()} stock positions`),
      metricCard("⚖️", profit >= 0 ? "gold" : "violet", "Open profit / loss", `<span class="${profit >= 0 ? "text-green" : "text-red"}">${profit >= 0 ? "+" : ""}${money(profit)}</span>`, "unrealised — not locked in"),
      metricCard("🔁", "violet", "Realised profit / loss", `<span class="${S.realized >= 0 ? "text-green" : "text-red"}">${S.realized >= 0 ? "+" : ""}${money(S.realized)}</span>`, `${S.totalTrades} trades completed`)
    ].join("");
  };

  UI.renderStockDetail = () => {
    const box = $("#stock-detail");
    if (!box) return;
    const def = M.stockDef(S.selectedStock) || D.stocks[0];
    const live = S.stocks[def.id];
    const change = M.stockChange(def.id);
    const holding = S.holdings[def.id] || { shares: 0, avgCost: 0 };
    box.innerHTML = `
      <div class="stock-detail-top">
        <div class="stock-detail-name">
          <span class="stock-detail-logo" style="--stock-color:${def.color}">${def.id}</span>
          <div><h3>${esc(def.name)}</h3><span>${esc(def.sector)} · educational simulation</span></div>
        </div>
        <span class="stock-ticker-badge">${def.id}</span>
      </div>
      <div class="detail-price-row">
        <span class="detail-price" id="detail-price">${money2(live.price)}</span>
        <span class="detail-change ${change >= 0 ? "up" : "down"}" id="detail-change">${pct(change, 2)}</span>
      </div>
      <div class="detail-chart-wrap"><canvas id="stock-chart" aria-label="${esc(def.name)} price chart"></canvas></div>
      <div class="detail-chart-labels"><span>older</span><span>latest 6s tick</span></div>
      <div class="stock-metrics-grid">
        <div class="stock-metric"><span>P/E ratio</span><strong id="detail-pe">${M.stockPe(def.id).toFixed(1)}</strong></div>
        <div class="stock-metric"><span>Beta</span><strong>${def.beta.toFixed(2)}</strong></div>
        <div class="stock-metric"><span>Dividend</span><strong>${def.dividend ? (def.dividend * 100).toFixed(1) + "%" : "None"}</strong></div>
        <div class="stock-metric"><span>Risk</span><strong>${esc(def.risk)}</strong></div>
      </div>
      <p class="stock-blurb">${esc(def.blurb)} <button class="inline-term" data-term="${def.id === "INDEX" ? "etf" : "valuation"}">Why this matters</button></p>
      <div class="trade-box">
        <div class="trade-label-row"><span>Buy or sell shares</span><span>You own <b id="detail-owned">${holding.shares}</b>${holding.shares ? ` · avg ${money2(holding.avgCost)}` : ""}</span></div>
        <div class="trade-input-row">
          <div class="trade-input-wrap"><input id="trade-shares" type="number" min="1" step="1" value="1" aria-label="Number of shares"><span>shares</span></div>
          <button class="trade-btn buy" id="buy-stock-btn" data-trade="buy">Buy</button>
          <button class="trade-btn sell" id="sell-stock-btn" data-trade="sell">Sell</button>
        </div>
        <div class="trade-summary"><span id="trade-estimate">—</span><button class="trade-max" data-max-shares>max</button></div>
      </div>`;
    requestAnimationFrame(() => {
      UI.drawStockChart();
      UI.updateTradeEstimate();
    });
  };

  UI.updateTradeEstimate = () => {
    const def = M.stockDef(S.selectedStock);
    const live = S.stocks[S.selectedStock];
    const input = $("#trade-shares");
    if (!def || !live || !input) return;
    const qty = Math.max(1, Math.floor(Number(input.value) || 1));
    const buy = live.price * qty * (1 + M.FEE);
    const sell = live.price * qty * (1 - M.FEE);
    const estimate = $("#trade-estimate");
    if (estimate) estimate.innerHTML = `Buy ${qty} ≈ <b>${money2(buy)}</b> · sell ≈ <b>${money2(sell)}</b>`;
    const buyBtn = $("#buy-stock-btn");
    const sellBtn = $("#sell-stock-btn");
    if (buyBtn) buyBtn.disabled = buy > S.cash;
    if (sellBtn) sellBtn.disabled = qty > (S.holdings[S.selectedStock]?.shares || 0);
  };

  UI.updateStockDetailLive = () => {
    const def = M.stockDef(S.selectedStock);
    const live = S.stocks[S.selectedStock];
    if (!def || !live) return;
    const price = $("#detail-price");
    const changeEl = $("#detail-change");
    if (price) price.textContent = money2(live.price);
    const change = M.stockChange(S.selectedStock);
    if (changeEl) {
      changeEl.textContent = pct(change, 2);
      changeEl.className = `detail-change ${change >= 0 ? "up" : "down"}`;
    }
    const pe = $("#detail-pe");
    if (pe) pe.textContent = M.stockPe(S.selectedStock).toFixed(1);
    const holding = S.holdings[S.selectedStock];
    const owned = $("#detail-owned");
    if (owned) owned.textContent = holding ? holding.shares : 0;
    UI.drawStockChart();
    UI.updateTradeEstimate();
  };

  UI.renderPortfolio = () => {
    const body = $("#portfolio-body");
    const total = $("#portfolio-total");
    if (total) total.textContent = money(M.portfolioValue());
    if (!body) return;
    const entries = Object.entries(S.holdings);
    if (!entries.length) {
      body.innerHTML = `<div class="empty-portfolio"><div class="empty-icon">🪙</div><strong>Your portfolio is waiting.</strong><span>Buy your first share above. Start small — the goal is to learn how ownership feels.</span></div>`;
      return;
    }
    const rows = entries.map(([id, holding]) => {
      const def = M.stockDef(id);
      const live = S.stocks[id];
      if (!def || !live) return "";
      const value = live.price * holding.shares;
      const pnl = value - holding.avgCost * holding.shares;
      const pnlPct = holding.avgCost ? (live.price / holding.avgCost - 1) * 100 : 0;
      return `<tr>
        <td><span class="p-name"><span class="stock-logo" style="width:25px;height:25px;--stock-color:${def.color}">${def.id}</span><span>${esc(def.name)}<span>${holding.shares} shares</span></span></span></td>
        <td>${money2(holding.avgCost)}</td>
        <td>${money2(live.price)}</td>
        <td>${money2(value)}</td>
        <td class="${pnl >= 0 ? "text-green" : "text-red"}">${pnl >= 0 ? "+" : ""}${money(pnl)} <span style="font-size:8px;opacity:.7">${pct(pnlPct)}</span></td>
        <td><button class="p-sell" data-sell-all="${id}">Sell all</button></td>
      </tr>`;
    }).join("");
    body.innerHTML = `<table class="portfolio-table">
      <thead><tr><th>Company</th><th>Avg cost</th><th>Price</th><th>Value</th><th>Open P/L</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table>`;
  };

  UI.renderStocks = () => {
    UI.renderStockList();
    UI.renderStockDetail();
    UI.renderStockMetrics();
    UI.renderPortfolio();
    UI.renderSentiment();
  };

  UI.updateMarketUI = () => {
    UI.renderStockList();
    UI.renderStockMetrics();
    UI.renderPortfolio();
    UI.renderSentiment();
    UI.updateStockDetailLive();
    UI.drawNetworthChart();
  };

  /* ---------------- refresh ---------------- */
  UI.refreshAll = () => {
    UI.updateTopBar();
    UI.renderHQ();
    UI.renderVentures();
    UI.renderStocks();
    if (UI.renderWorld) UI.renderWorld();
    if (UI.renderAcademy) UI.renderAcademy();
    if (UI.renderMentor) UI.renderMentor();
    UI.renderBriefing();
    UI.buildTicker();
  };

  UI.viewName = viewName;
})();
