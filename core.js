/* Market Masters — state, economy and actions */
(() => {
  "use strict";

  const DATA = window.MM_DATA;
  const STORAGE_KEY = "marketMastersSave_v1";
  const FEE = 0.0015;
  const MAX_HISTORY = 90;

  /* ---------- utilities ---------- */
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const round2 = (n) => Math.round(n * 100) / 100;
  const fullMoney = (n) => {
    const value = Number.isFinite(n) ? n : 0;
    return (value < 0 ? "-$" : "$") + Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 0 });
  };
  const fullMoney2 = (n) => {
    const value = Number.isFinite(n) ? n : 0;
    return (value < 0 ? "-$" : "$") + Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const money = (value, forceDecimals = 0) => {
    let n = Number.isFinite(value) ? value : 0;
    const sign = n < 0 ? "-" : "";
    n = Math.abs(n);
    if (n >= 1e15) return sign + "$" + (n / 1e15).toFixed(n >= 1e16 ? 1 : 2) + "Qa";
    if (n >= 1e12) return sign + "$" + (n / 1e12).toFixed(n >= 1e13 ? 1 : 2) + "T";
    if (n >= 1e9) return sign + "$" + (n / 1e9).toFixed(n >= 1e10 ? 1 : 2) + "B";
    if (n >= 1e6) return sign + "$" + (n / 1e6).toFixed(n >= 1e7 ? 1 : 2) + "M";
    if (n >= 1e4) return sign + "$" + (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + "K";
    if (n >= 1e3 && forceDecimals === 0) return sign + "$" + Math.round(n).toLocaleString("en-US");
    if (forceDecimals > 0) return sign + "$" + n.toFixed(forceDecimals).replace(/\.?0+$/, "");
    if (n < 10 && n % 1 !== 0) return sign + "$" + n.toFixed(2).replace(/0$/, "");
    return sign + "$" + Math.round(n).toLocaleString("en-US");
  };
  const money2 = (n) => (n < 0 ? "-$" : "$") + Math.abs(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (n, digits = 1) => `${n >= 0 ? "+" : ""}${(Number(n) || 0).toFixed(digits)}%`;
  const int = (n) => Math.round(Number(n) || 0).toLocaleString("en-US");
  const gaussian = () => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const escapeHTML = (str) => String(str ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  /* ---------- state ---------- */
  const seedHistory = (stock) => {
    let price = stock.price;
    const history = [];
    for (let i = 0; i < 42; i++) {
      price = Math.max(1, price * (1 + gaussian() * stock.vol * 0.75));
      history.push(round2(price));
    }
    history[history.length - 1] = stock.price;
    return history;
  };

  const createDefaultState = () => {
    const stocks = {};
    DATA.stocks.forEach((s) => {
      stocks[s.id] = { price: s.price, open: s.price, history: seedHistory(s), shock: 0 };
    });
    const ventures = {};
    DATA.ventures.forEach((v) => { ventures[v.id] = 0; });
    return {
      version: 1,
      onboarded: false,
      companyName: "Northstar Co.",
      learningGoal: "",
      cash: 750,
      xp: 0,
      level: 1,
      totalEarned: 0,
      playSeconds: 0,
      ventures,
      countries: ["USA"],
      stocks,
      holdings: {},
      realized: 0,
      totalTrades: 0,
      campaign: { until: 0, cooldown: 0 },
      news: [],
      latestNews: null,
      marketSentiment: 0.06,
      goalsClaimed: [],
      lessonsDone: [],
      academyXp: 0,
      tutorialDone: [],
      mentorHidden: false,
      selectedStock: "NOVA",
      selectedCountry: "USA",
      networthHistory: [],
      fx: { rates: { ...DATA.fallbackFx }, updated: 0, source: "fallback" },
      createdAt: Date.now(),
      lastSaved: Date.now()
    };
  };

  const state = createDefaultState();
  let loadedSave = false;

  function hydrate() {
    let raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (_) { /* storage can be blocked */ }
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") return;
      const defaults = createDefaultState();
      Object.assign(state, defaults, saved);
      state.companyName = String(saved.companyName || defaults.companyName).slice(0, 26);
      state.cash = Number.isFinite(saved.cash) ? Math.max(0, saved.cash) : defaults.cash;
      state.xp = Math.max(0, Number(saved.xp) || 0);
      state.level = Math.max(1, Number(saved.level) || 1);
      state.playSeconds = Math.max(0, Number(saved.playSeconds) || 0);
      state.totalEarned = Math.max(0, Number(saved.totalEarned) || 0);
      state.ventures = { ...defaults.ventures, ...(saved.ventures || {}) };
      DATA.ventures.forEach((v) => {
        state.ventures[v.id] = Math.max(0, Math.floor(Number(state.ventures[v.id]) || 0));
      });
      state.countries = Array.isArray(saved.countries)
        ? Array.from(new Set(["USA", ...saved.countries.filter((id) => DATA.countries.some((c) => c.id === id))]))
        : ["USA"];
      state.holdings = {};
      if (saved.holdings && typeof saved.holdings === "object") {
        Object.keys(saved.holdings).forEach((id) => {
          if (!DATA.stocks.some((s) => s.id === id)) return;
          const h = saved.holdings[id];
          const shares = Math.max(0, Math.floor(Number(h && h.shares) || 0));
          if (shares > 0) state.holdings[id] = { shares, avgCost: Math.max(0, Number(h.avgCost) || 0) };
        });
      }
      state.stocks = {};
      DATA.stocks.forEach((def) => {
        const current = saved.stocks && saved.stocks[def.id] ? saved.stocks[def.id] : {};
        const price = Number(current.price);
        state.stocks[def.id] = {
          price: Number.isFinite(price) && price > 0 ? price : def.price,
          open: Number(current.open) > 0 ? current.open : (Number.isFinite(price) && price > 0 ? price : def.price),
          history: Array.isArray(current.history) && current.history.length > 2
            ? current.history.slice(-MAX_HISTORY).map((v) => Math.max(0.01, Number(v) || def.price))
            : seedHistory(def),
          shock: Number(current.shock) || 0
        };
      });
      state.news = Array.isArray(saved.news) ? saved.news.slice(0, 8) : [];
      state.latestNews = saved.latestNews || state.news[0] || null;
      state.marketSentiment = clamp(Number(saved.marketSentiment) || 0, -1, 1);
      state.goalsClaimed = Array.isArray(saved.goalsClaimed) ? saved.goalsClaimed : [];
      state.lessonsDone = Array.isArray(saved.lessonsDone)
        ? saved.lessonsDone.filter((id) => DATA.lessons.some((l) => l.id === id))
        : [];
      state.academyXp = Math.max(0, Number(saved.academyXp) || 0);
      state.tutorialDone = Array.isArray(saved.tutorialDone)
        ? saved.tutorialDone.filter((id) => DATA.tutorialTasks.some((t) => t.id === id))
        : [];
      state.mentorHidden = Boolean(saved.mentorHidden);
      state.selectedStock = DATA.stocks.some((s) => s.id === state.selectedStock) ? state.selectedStock : "NOVA";
      state.selectedCountry = DATA.countries.some((c) => c.id === state.selectedCountry) ? state.selectedCountry : "USA";
      state.networthHistory = Array.isArray(saved.networthHistory)
        ? saved.networthHistory.slice(-MAX_HISTORY).map((v) => Number(v)).filter((v) => Number.isFinite(v))
        : [];
      state.fx = saved.fx && saved.fx.rates
        ? { rates: { ...defaults.fx.rates, ...saved.fx.rates }, updated: Number(saved.fx.updated) || 0, source: saved.fx.source || "fallback" }
        : defaults.fx;
      state.campaign = {
        until: Number(saved.campaign && saved.campaign.until) || 0,
        cooldown: Number(saved.campaign && saved.campaign.cooldown) || 0
      };
      state.lastSaved = Number(saved.lastSaved) || Date.now();
      if (state.tutorialDone.length === DATA.tutorialTasks.length) state.mentorHidden = true;
      loadedSave = true;
    } catch (error) {
      console.warn("Market Masters: could not read save", error);
    }
  }

  function saveGame() {
    try {
      state.lastSaved = Date.now();
      state.networthHistory = state.networthHistory.slice(-MAX_HISTORY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Market Masters: save failed", error);
    }
  }

  function resetGame() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* noop */ }
    window.location.reload();
  }

  /* ---------- UI bridge ---------- */
  function refresh() {
    if (window.MM && window.MM.ui && window.MM.ui.refreshAll) window.MM.ui.refreshAll();
  }
  function refreshWorld() {
    if (window.MM && window.MM.ui && window.MM.ui.renderWorld) window.MM.ui.renderWorld();
  }
  function toast(title, message, tone = "info", icon = "✦") {
    if (window.MM && window.MM.ui && window.MM.ui.toast) window.MM.ui.toast({ title, message, tone, icon });
  }
  function celebrate() {
    if (window.MM && window.MM.ui && window.MM.ui.confetti) window.MM.ui.confetti();
  }

  /* ---------- economic model ---------- */
  function ownedTotal() {
    return DATA.ventures.reduce((sum, v) => sum + state.ventures[v.id], 0);
  }
  function baseIncome() {
    return DATA.ventures.reduce((sum, v) => sum + v.income * state.ventures[v.id], 0);
  }
  function countryBonus() {
    return state.countries.reduce((sum, id) => {
      const country = DATA.countries.find((c) => c.id === id);
      return sum + (country ? country.bonus : 0);
    }, 0);
  }
  function globalMultiplier() {
    return (1 + countryBonus()) * (1 + (state.level - 1) * 0.04);
  }
  function campaignRemaining(now = Date.now()) {
    return Math.max(0, state.campaign.until - now);
  }
  function campaignCooldown(now = Date.now()) {
    return Math.max(0, state.campaign.cooldown - now);
  }
  function campaignMultiplier(now = Date.now()) {
    return campaignRemaining(now) > 0 ? 2 : 1;
  }
  function incomePerSecond(now = Date.now()) {
    return baseIncome() * globalMultiplier() * campaignMultiplier(now);
  }
  function ventureCost(def, count = 1) {
    const owned = state.ventures[def.id] || 0;
    const first = def.cost * Math.pow(def.growth, owned);
    return first * (Math.pow(def.growth, count) - 1) / (def.growth - 1);
  }
  function maxAffordable(def) {
    const owned = state.ventures[def.id] || 0;
    const first = def.cost * Math.pow(def.growth, owned);
    if (state.cash < first) return 0;
    const raw = Math.log(1 + (state.cash * 0.999) * (def.growth - 1) / first) / Math.log(def.growth);
    return Math.max(0, Math.min(2500, Math.floor(raw)));
  }
  function investedInVentures() {
    return DATA.ventures.reduce((sum, v) => {
      const owned = state.ventures[v.id];
      if (!owned) return sum;
      return sum + v.cost * (Math.pow(v.growth, owned) - 1) / (v.growth - 1);
    }, 0);
  }
  function portfolioValue() {
    return Object.entries(state.holdings).reduce((sum, [id, holding]) => {
      const live = state.stocks[id];
      return sum + (live ? live.price * holding.shares : 0);
    }, 0);
  }
  function openProfit() {
    return Object.entries(state.holdings).reduce((sum, [id, holding]) => {
      const live = state.stocks[id];
      return sum + (live ? live.price * holding.shares - holding.avgCost * holding.shares : 0);
    }, 0);
  }
  function companyValue() {
    const stableIncome = baseIncome() * globalMultiplier();
    return stableIncome * 42 + investedInVentures() * 0.24;
  }
  function netWorth() {
    return state.cash + portfolioValue() + companyValue();
  }
  function ventureLock(def) {
    const index = DATA.ventures.findIndex((v) => v.id === def.id);
    if (index <= 0) return null;
    const previous = DATA.ventures[index - 1];
    const owned = state.ventures[previous.id] || 0;
    if (owned < 5) return { previous, owned, needed: 5 };
    return null;
  }
  function nextVentureGoal(def) {
    return ventureLock(def);
  }

  function xpNeeded(level = state.level) {
    return Math.floor(80 * Math.pow(level, 1.42));
  }
  function levelProgress() {
    return clamp(state.xp / xpNeeded(), 0, 1);
  }
  function addXp(amount) {
    if (!amount) return;
    state.xp += Math.max(0, amount);
    let leveled = false;
    while (state.xp >= xpNeeded()) {
      state.xp -= xpNeeded();
      state.level += 1;
      leveled = true;
    }
    if (leveled) {
      toast("Founder level up!", `Level ${state.level} — all revenue is now ${((1 + (state.level - 1) * 0.04) * 100).toFixed(0)}% of base.`, "gold", "🏆");
      celebrate();
      if (window.MM && window.MM.ui && window.MM.ui.renderWorld) window.MM.ui.renderWorld();
    }
  }

  /* ---------- goals and tutorial ---------- */
  function goalProgress(goal) {
    let current = 0;
    switch (goal.id) {
      case "first_venture": current = ownedTotal(); break;
      case "first_stock": current = Object.keys(state.holdings).length; break;
      case "coffee_chain": current = state.ventures.coffee || 0; break;
      case "first_lesson": current = state.lessonsDone.length; break;
      case "thousand": current = state.cash; break;
      case "diversified": current = Object.keys(state.holdings).length; break;
      case "global": current = state.countries.length; break;
      case "level_five": current = state.level; break;
      case "millionaire": current = netWorth(); break;
      default: current = 0;
    }
    const ratio = clamp(current / goal.target, 0, 1);
    let label = "";
    if (goal.id === "thousand") label = `${money(current)} / ${money(goal.target)}`;
    else if (goal.id === "millionaire") label = `${money(current)} / ${money(goal.target)}`;
    else if (goal.id === "level_five") label = `Level ${current} / ${goal.target}`;
    else label = `${Math.floor(current)} / ${goal.target}`;
    return { current, target: goal.target, ratio, label };
  }
  function nextGoal() {
    return DATA.goals.find((g) => !state.goalsClaimed.includes(g.id)) || null;
  }
  function checkGoals() {
    let changed = false;
    DATA.goals.forEach((goal) => {
      if (state.goalsClaimed.includes(goal.id)) return;
      const progress = goalProgress(goal);
      if (progress.ratio >= 1) {
        state.goalsClaimed.push(goal.id);
        state.cash += goal.reward;
        addXp(goal.xp);
        toast("Milestone complete", `${goal.title} · +${money(goal.reward)}`, "gold", "🏆");
        celebrate();
        changed = true;
      }
    });
    if (changed) refresh();
  }
  function completeTutorialTask(id) {
    if (!state.onboarded || state.tutorialDone.includes(id)) return;
    const task = DATA.tutorialTasks.find((t) => t.id === id);
    if (!task) return;
    state.tutorialDone.push(id);
    state.cash += 75;
    addXp(12);
    const allDone = state.tutorialDone.length >= DATA.tutorialTasks.length;
    toast("Mentor task complete", `${task.text} · +$75${allDone ? " · foundation complete!" : ""}`, "success", "✓");
    if (allDone) celebrate();
    refresh();
    saveGame();
  }

  /* ---------- ventures ---------- */
  function buyVenture(id, mode = "1") {
    const def = DATA.ventures.find((v) => v.id === id);
    if (!def) return;
    const lock = ventureLock(def);
    if (lock) {
      toast("Still locked", `Own ${lock.needed} ${lock.previous.name}${lock.previous.name.endsWith("s") ? "" : "s"} first.`, "info", "🔒");
      return;
    }
    let count = mode === "max" ? maxAffordable(def) : Math.max(1, parseInt(mode, 10) || 1);
    if (count < 1) {
      toast("Not enough cash", "Grow income or wait a moment, then try again.", "info", "⏳");
      return;
    }
    let cost = ventureCost(def, count);
    if (cost > state.cash + 0.001) {
      count = maxAffordable(def);
      if (count < 1) {
        toast("Not enough cash", `You need ${money(ventureCost(def, 1))} for the next ${def.name}.`, "info", "⏳");
        return;
      }
      cost = ventureCost(def, count);
    }
    const previousOwned = state.ventures[id];
    state.cash -= cost;
    state.ventures[id] += count;
    addXp(3 + Math.min(20, count));
    completeTutorialTask("venture");
    const next = DATA.ventures[DATA.ventures.findIndex((v) => v.id === id) + 1];
    if (next && previousOwned < 5 && state.ventures[id] >= 5 && state.ventures[next.id] === 0) {
      toast("New venture unlocked", `${next.name} is now available. Costs rise as you scale.`, "gold", "🔓");
    }
    checkGoals();
    refresh();
    saveGame();
  }

  function startCampaign() {
    const now = Date.now();
    if (ownedTotal() === 0) {
      toast("No revenue yet", "Buy a venture first, then a campaign can amplify its income.", "info", "📣");
      return;
    }
    if (campaignRemaining(now) > 0) {
      toast("Campaign already live", "Your income is boosted until the timer runs out.", "info", "📣");
      return;
    }
    if (campaignCooldown(now) > 0) {
      toast("Campaign cooling down", `${Math.ceil(campaignCooldown(now) / 1000)}s until the next launch.`, "info", "⏳");
      return;
    }
    const cost = Math.max(10, Math.floor(state.cash * 0.02));
    if (state.cash < cost) {
      toast("Not enough cash", `A campaign costs ${money(cost)}.`, "info", "⏳");
      return;
    }
    state.cash -= cost;
    state.campaign.until = now + 20000;
    state.campaign.cooldown = now + 60000;
    toast("Campaign launched", `2× revenue for 20 seconds · cost ${money(cost)}.`, "success", "📣");
    refresh();
    saveGame();
  }

  /* ---------- stocks ---------- */
  function stockDef(id) { return DATA.stocks.find((s) => s.id === id); }
  function stockLive(id) { return state.stocks[id]; }
  function stockChange(id) {
    const live = state.stocks[id];
    if (!live) return 0;
    return live.open ? ((live.price - live.open) / live.open) * 100 : 0;
  }
  function stockPe(id) {
    const def = stockDef(id);
    const live = state.stocks[id];
    if (!def || !live) return 0;
    const eps = def.price / def.pe;
    return eps ? live.price / eps : 0;
  }
  function holdingsCount() { return Object.keys(state.holdings).length; }
  function maxBuyShares(id) {
    const live = state.stocks[id];
    if (!live) return 0;
    return Math.max(0, Math.floor(state.cash / (live.price * (1 + FEE))));
  }
  function tradeStock(id, side, shares) {
    const def = stockDef(id);
    const live = state.stocks[id];
    if (!def || !live) return;
    const qty = Math.max(1, Math.floor(Number(shares) || 0));
    if (side === "buy") {
      const cost = round2(live.price * qty * (1 + FEE));
      if (cost > state.cash) {
        toast("Not enough cash", `That purchase costs ${money2(cost)}.`, "info", "⏳");
        return;
      }
      const current = state.holdings[id] || { shares: 0, avgCost: 0 };
      const newShares = current.shares + qty;
      const newBasis = (current.avgCost * current.shares + cost) / newShares;
      state.cash -= cost;
      state.holdings[id] = { shares: newShares, avgCost: newBasis };
      state.totalTrades += 1;
      addXp(4);
      completeTutorialTask("stock");
      toast("Shares purchased", `${qty} ${def.ticker || id} for ${money2(cost)} · fee included.`, "success", "📈");
      checkGoals();
      refresh();
      saveGame();
    } else {
      const current = state.holdings[id];
      if (!current || current.shares < qty) {
        toast("Not enough shares", "You cannot sell more than you own.", "info", "📉");
        return;
      }
      const proceeds = round2(live.price * qty * (1 - FEE));
      const pnl = proceeds - current.avgCost * qty;
      const remaining = current.shares - qty;
      state.cash += proceeds;
      state.realized += pnl;
      if (remaining > 0) state.holdings[id] = { shares: remaining, avgCost: current.avgCost };
      else delete state.holdings[id];
      state.totalTrades += 1;
      addXp(3);
      toast("Shares sold", `${qty} ${id} for ${money2(proceeds)} · ${pnl >= 0 ? "profit" : "loss"} ${money2(Math.abs(pnl))}.`, pnl >= 0 ? "success" : "info", pnl >= 0 ? "💸" : "📉");
      checkGoals();
      refresh();
      saveGame();
    }
  }
  function simulateMarket() {
    state.marketSentiment = clamp(state.marketSentiment + (Math.random() - 0.5) * 0.24, -1, 1);
    DATA.stocks.forEach((def) => {
      const live = state.stocks[def.id];
      if (!live) return;
      const shock = live.shock || 0;
      const reversion = ((def.fair - live.price) / def.fair) * 0.02;
      let move = def.drift + gaussian() * def.vol + state.marketSentiment * 0.0008 + shock + reversion;
      move = clamp(move, -0.085, 0.085);
      live.price = round2(Math.max(0.5, live.price * (1 + move)));
      live.history.push(live.price);
      if (live.history.length > MAX_HISTORY) live.history.shift();
      live.shock = shock * 0.45;
    });
    if (window.MM && window.MM.ui) {
      window.MM.ui.updateMarketUI && window.MM.ui.updateMarketUI();
      window.MM.ui.renderPortfolio && window.MM.ui.renderPortfolio();
      window.MM.ui.updateTopBar && window.MM.ui.updateTopBar();
    }
  }
  function publishNews(item) {
    if (!item) return;
    state.latestNews = { ...item, at: Date.now() };
    state.news = [state.latestNews, ...state.news].slice(0, 8);
    if (item.impact && item.sectors && item.sectors.length) {
      DATA.stocks.forEach((def) => {
        if (!item.sectors.includes(def.sector)) return;
        const live = state.stocks[def.id];
        if (!live) return;
        live.price = Math.max(0.5, round2(live.price * (1 + item.impact)));
        live.history.push(live.price);
        if (live.history.length > MAX_HISTORY) live.history.shift();
        live.shock = (live.shock || 0) + item.impact * 0.5;
      });
      state.marketSentiment = clamp(state.marketSentiment + item.impact * 1.5, -1, 1);
    }
    if (window.MM && window.MM.ui) {
      window.MM.ui.buildTicker && window.MM.ui.buildTicker();
      window.MM.ui.renderBriefing && window.MM.ui.renderBriefing();
      window.MM.ui.updateMarketUI && window.MM.ui.updateMarketUI();
      window.MM.ui.renderStockDetail && window.MM.ui.updateStockDetailLive && window.MM.ui.updateStockDetailLive();
    }
    toast("Market news", item.headline, item.impact >= 0 ? "success" : "info", item.impact >= 0 ? "📈" : "📉");
    saveGame();
  }
  function sentimentLabel() {
    if (state.marketSentiment > 0.35) return { label: "Greed", cls: "greed" };
    if (state.marketSentiment < -0.35) return { label: "Fear", cls: "fear" };
    return { label: "Balanced", cls: "" };
  }

  /* ---------- countries ---------- */
  function countryById(id) { return DATA.countries.find((c) => c.id === id); }
  function isCountryOpen(id) { return state.countries.includes(id); }
  function canExpandCountry(id) {
    const c = countryById(id);
    if (!c || isCountryOpen(id)) return false;
    return state.level >= c.reqLevel && netWorth() >= c.reqNet && state.cash >= c.cost;
  }
  function expandCountry(id) {
    const c = countryById(id);
    if (!c || isCountryOpen(id)) return;
    if (state.level < c.reqLevel) {
      toast("Level requirement", `Reach founder level ${c.reqLevel} to enter ${c.name}.`, "info", "🔒");
      return;
    }
    if (netWorth() < c.reqNet) {
      toast("Net worth requirement", `Reach ${money(c.reqNet)} net worth to enter ${c.name}.`, "info", "🔒");
      return;
    }
    if (state.cash < c.cost) {
      toast("Not enough cash", `Entering ${c.name} costs ${money(c.cost)}.`, "info", "⏳");
      return;
    }
    state.cash -= c.cost;
    state.countries.push(id);
    addXp(110);
    state.selectedCountry = id;
    toast("New market opened", `${c.flag} ${c.name} adds +${Math.round(c.bonus * 100)}% to all venture income.`, "gold", "🌍");
    celebrate();
    checkGoals();
    refresh();
    completeTutorialTask("world");
    saveGame();
  }
  function selectCountry(id) {
    if (!countryById(id)) return;
    state.selectedCountry = id;
    completeTutorialTask("world");
    refreshWorld();
    saveGame();
  }

  /* ---------- lessons and glossary ---------- */
  function completeLesson(id) {
    const lesson = DATA.lessons.find((l) => l.id === id);
    if (!lesson) return false;
    if (state.lessonsDone.includes(id)) return false;
    state.lessonsDone.push(id);
    state.academyXp += 50;
    state.cash += lesson.reward;
    addXp(45);
    toast("Lesson complete", `${lesson.title} · +${money(lesson.reward)} and +45 XP.`, "gold", "🎓");
    celebrate();
    completeTutorialTask("lesson");
    checkGoals();
    refresh();
    saveGame();
    return true;
  }

  function recordNetWorth() {
    state.networthHistory.push(Math.round(netWorth() * 100) / 100);
    if (state.networthHistory.length > MAX_HISTORY) state.networthHistory.shift();
  }

  function applyOfflineEarnings() {
    if (!loadedSave || !state.onboarded) return null;
    const now = Date.now();
    const seconds = Math.floor((now - state.lastSaved) / 1000);
    const rate = incomePerSecond(now);
    if (seconds < 45 || rate <= 0) return null;
    const capped = Math.min(seconds, 4 * 60 * 60);
    const amount = rate * capped * 0.4;
    state.cash += amount;
    state.totalEarned += amount;
    saveGame();
    return { seconds: capped, amount };
  }

  function tick(dt) {
    const now = Date.now();
    const rate = incomePerSecond(now);
    if (rate > 0) {
      const earned = rate * dt;
      state.cash += earned;
      state.totalEarned += earned;
    }
    state.playSeconds += dt;
  }

  /* ---------- FX ---------- */
  async function loadFxRates() {
    const fields = Array.from(new Set(DATA.countries.map((c) => c.fx)));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);
    try {
      const response = await fetch("https://open.er-api.com/v6/latest/USD", { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!payload || payload.result !== "success" || !payload.rates) throw new Error("Invalid FX response");
      const rates = {};
      fields.forEach((code) => { if (payload.rates[code]) rates[code] = payload.rates[code]; });
      rates.USD = 1;
      state.fx = { rates: { ...DATA.fallbackFx, ...rates }, updated: Date.now(), source: "live" };
      toast("Live FX connected", "Currency rates are now updating the world market view.", "success", "🌐");
      saveGame();
    } catch (_) {
      state.fx = {
        rates: { ...DATA.fallbackFx, ...(state.fx && state.fx.rates ? state.fx.rates : {}) },
        updated: state.fx && state.fx.updated ? state.fx.updated : 0,
        source: state.fx && state.fx.updated ? "cached" : "fallback"
      };
    } finally {
      clearTimeout(timer);
      refreshWorld();
    }
    return state.fx;
  }
  function fxRate(code) {
    return (state.fx && state.fx.rates && state.fx.rates[code]) || DATA.fallbackFx[code] || 1;
  }

  /* ---------- exports ---------- */
  window.MM = {
    DATA,
    state,
    FEE,
    STORAGE_KEY,
    loadedSave,
    hydrate,
    saveGame,
    resetGame,
    money,
    money2,
    fullMoney,
    fullMoney2,
    pct,
    int,
    clamp,
    escapeHTML,
    round2,
    ownedTotal,
    baseIncome,
    countryBonus,
    globalMultiplier,
    campaignRemaining,
    campaignCooldown,
    campaignMultiplier,
    incomePerSecond,
    ventureCost,
    maxAffordable,
    investedInVentures,
    portfolioValue,
    openProfit,
    companyValue,
    netWorth,
    ventureLock,
    xpNeeded,
    levelProgress,
    addXp,
    goalProgress,
    nextGoal,
    checkGoals,
    completeTutorialTask,
    buyVenture,
    startCampaign,
    stockDef,
    stockLive,
    stockChange,
    stockPe,
    holdingsCount,
    maxBuyShares,
    tradeStock,
    simulateMarket,
    publishNews,
    sentimentLabel,
    countryById,
    isCountryOpen,
    canExpandCountry,
    expandCountry,
    selectCountry,
    completeLesson,
    recordNetWorth,
    applyOfflineEarnings,
    tick,
    loadFxRates,
    fxRate,
    toast,
    refresh,
    refreshWorld
  };
  window.MM.loadedSave = loadedSave;
  window.MM.isLoaded = () => loadedSave;
})();
