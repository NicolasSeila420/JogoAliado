/* Market Masters — interactions, modals and game loop */
(() => {
  "use strict";

  const D = window.MM_DATA;
  const M = window.MM;
  const S = M.state;
  const UI = window.MM.ui;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = M.escapeHTML;
  const money = M.money;

  /* ---------- hydrate first ---------- */
  M.hydrate();
  const offlineReport = M.applyOfflineEarnings();
  if (!S.networthHistory.length) M.recordNetWorth();
  if (S.mentorHidden && S.tutorialDone.length < D.tutorialTasks.length) S.mentorHidden = false;

  /* ---------- modal system ---------- */
  let activeModal = null;

  function closeModal() {
    const root = $("#modal-root");
    if (!activeModal) return;
    if (!activeModal.closable) return;
    root.innerHTML = "";
    document.body.classList.remove("modal-open");
    activeModal = null;
    UI.hideMapTooltip && UI.hideMapTooltip();
  }

  function showModal({ body, className = "", closable = true, showClose = true, onMount = null, back = null }) {
    if (activeModal) {
      activeModal.closable = true;
      closeModal();
    }
    const root = $("#modal-root");
    root.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal ${className}" role="dialog" aria-modal="true" tabindex="-1">
          ${showClose ? `<button class="icon-btn modal-close" data-close-modal aria-label="Close dialog"><svg class="icon"><use href="#icon-close"/></svg></button>` : ""}
          ${body}
        </div>
      </div>`;
    document.body.classList.add("modal-open");
    const modal = $(".modal", root);
    const backdrop = $(".modal-backdrop", root);
    activeModal = { root, modal, backdrop, closable, back, lessonId: null, isGlossary: false, quizAnswered: false };
    if (closable) {
      backdrop.addEventListener("click", (event) => {
        if (event.target === backdrop) closeModal();
      });
    }
    requestAnimationFrame(() => {
      const focusable = modal.querySelector("input, button:not(:disabled), [tabindex='0']");
      if (focusable) focusable.focus({ preventScroll: true });
      modal.focus?.({ preventScroll: true });
    });
    if (typeof onMount === "function") onMount(modal);
    return modal;
  }

  /* ---------- navigation ---------- */
  function switchView(view) {
    if (!["hq", "ventures", "stocks", "world", "academy"].includes(view)) return;
    $$(".view").forEach((section) => section.classList.toggle("active", section.dataset.viewPanel === view));
    $$(".nav-item, .mobile-nav-item").forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle("active", active);
      if (button.classList.contains("nav-item")) button.setAttribute("aria-selected", active ? "true" : "false");
    });
    if (view === "stocks") UI.renderStocks();
    if (view === "world") UI.renderWorld();
    if (view === "academy") UI.renderAcademy();
    if (view === "hq") UI.renderHQ();
    UI.updateTopBar();
    requestAnimationFrame(() => {
      if (view === "hq") UI.drawNetworthChart();
      if (view === "stocks") UI.drawStockChart();
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    M.saveGame();
  }

  /* ---------- onboarding ---------- */
  let onboardStep = 0;
  let onboardGoal = "";

  function onboardingBody(first) {
    const name = esc(S.companyName || "Northstar Co.");
    return `<div class="modal-body">
      <div class="onboard-step active" data-onboard-step="0">
        <div class="onboard-kicker"><span class="live-dot"></span>Welcome to Market Masters</div>
        <h2>Every tycoon starts with a <span>first dollar.</span></h2>
        <p>You inherit a small company, a little cash, and a very big opportunity: to learn how money actually works by building something.</p>
        <div class="onboard-visual">
          <div class="onboard-mini-card"><div class="om-label">Starting cash</div><div class="om-value">$750</div><div class="om-bar"><span></span></div></div>
          <div class="onboard-arrow">→</div>
          <div class="onboard-mini-card gold"><div class="om-label">Your ambition</div><div class="om-value">∞</div><div class="om-bar"><span></span></div></div>
        </div>
        <label class="modal-label" for="onboard-company">Name your company</label>
        <input class="modal-input" id="onboard-company" maxlength="26" value="${name}" autocomplete="off" placeholder="Northstar Co.">
        <p class="modal-footnote">This is a learning simulation. No real money is involved.</p>
      </div>

      <div class="onboard-step" data-onboard-step="1">
        <div class="onboard-kicker"><span class="live-dot"></span>Make it personal</div>
        <h2>What do you want to <span>get better at?</span></h2>
        <p>There is no wrong answer. Your mentor will use this to frame the journey, but every lesson stays open.</p>
        <div class="onboard-goals">
          <button class="onboard-goal ${onboardGoal === "basics" ? "selected" : ""}" data-goal-choice="basics"><strong>💡 Money basics</strong><span>Cash flow, prices, compounding</span></button>
          <button class="onboard-goal ${onboardGoal === "invest" ? "selected" : ""}" data-goal-choice="invest"><strong>📈 Investing</strong><span>Stocks, risk, diversification</span></button>
          <button class="onboard-goal ${onboardGoal === "business" ? "selected" : ""}" data-goal-choice="business"><strong>🏗️ Business</strong><span>Revenue, scale, global trade</span></button>
          <button class="onboard-goal ${onboardGoal === "curious" ? "selected" : ""}" data-goal-choice="curious"><strong>🧭 Just curious</strong><span>I want to see what happens</span></button>
        </div>
        <p class="modal-footnote">You can revisit any lesson at any time. Learning never expires.</p>
      </div>

      <div class="onboard-step" data-onboard-step="2">
        <div class="onboard-kicker"><span class="live-dot"></span>Your founder toolkit</div>
        <h2>Invest. Ask why. <span>Repeat.</span></h2>
        <p>Your first Lemonade Cart is affordable right now. Buy it, watch the cash flow in, then use that income to build the next thing.</p>
        <div class="onboard-principles">
          <div class="onboard-principle"><b>1</b><span>Buy assets that produce income, not just things that look good.</span></div>
          <div class="onboard-principle"><b>2</b><span>Diversify. One company, one country and one idea is a fragile portfolio.</span></div>
          <div class="onboard-principle"><b>3</b><span>Learn the why. A number you understand is more useful than a number you don't.</span></div>
        </div>
        <div class="onboard-goals" style="grid-template-columns:1fr;margin-top:14px">
          <div class="onboard-goal" style="cursor:default"><strong>💵 $750 starting capital</strong><span>Enough for your first venture and a few shares. Reinvest as you grow.</span></div>
        </div>
        <p class="modal-footnote">Market Masters is an educational simulation. It is not financial advice and does not use real money.</p>
      </div>

      <div class="onboard-footer">
        <button class="text-btn" id="onboard-skip">Skip intro</button>
        <div class="onboard-dots">
          <span class="onboard-dot active"></span><span class="onboard-dot"></span><span class="onboard-dot"></span>
        </div>
        <div class="onboard-nav">
          <button class="btn btn-ghost" id="onboard-back" hidden>Back</button>
          <button class="btn btn-primary" id="onboard-next">Continue <svg class="icon"><use href="#icon-arrow"/></svg></button>
          <button class="btn btn-primary" id="onboard-start" hidden>Start building <svg class="icon"><use href="#icon-arrow"/></svg></button>
        </div>
      </div>
    </div>`;
  }

  function openOnboarding() {
    onboardStep = 0;
    onboardGoal = S.learningGoal || "";
    const modal = showModal({
      body: onboardingBody(true),
      className: "onboarding-modal",
      closable: false,
      showClose: false
    });
    activeModal.onboarding = true;
    updateOnboardStep(modal);
  }

  function updateOnboardStep(modal) {
    $$(".onboard-step", modal).forEach((step) => step.classList.toggle("active", Number(step.dataset.onboardStep) === onboardStep));
    $$(".onboard-dot", modal).forEach((dot, index) => dot.classList.toggle("active", index === onboardStep));
    const back = $("#onboard-back", modal);
    const next = $("#onboard-next", modal);
    const start = $("#onboard-start", modal);
    if (back) back.hidden = onboardStep === 0;
    if (next) next.hidden = onboardStep === 2;
    if (start) start.hidden = onboardStep !== 2;
  }

  function finishOnboarding(skipped = false) {
    const input = $("#onboard-company");
    if (input) {
      const clean = input.value.trim().replace(/[<>]/g, "").slice(0, 26);
      if (clean) S.companyName = clean;
    }
    S.onboarded = true;
    S.learningGoal = onboardGoal || "curious";
    S.mentorHidden = false;
    M.saveGame();
    activeModal.closable = true;
    closeModal();
    UI.refreshAll();
    switchView("ventures");
    UI.toast({
      title: skipped ? "The tour is yours to explore" : "Welcome, founder",
      message: skipped ? "Your dashboard and mentor are ready whenever you are." : "Your first venture is waiting. Make your first investment and start the cash-flow loop.",
      tone: "success",
      icon: "✨"
    });
    setTimeout(() => UI.renderMentor(), 100);
  }

  /* ---------- how to play ---------- */
  function openHowToPlay() {
    showModal({
      className: "modal--wide",
      body: `<div class="modal-head"><span class="eyebrow">Quick guide</span><h2>How to build a company</h2><p class="modal-sub">Four loops, one growing understanding of money.</p></div>
      <div class="modal-body">
        <div class="settings-list">
          <div class="settings-row"><strong>🏗️ 1. Buy ventures</strong><span>Each business adds passive income. The next unit costs more because the best opportunities are taken first.</span></div>
          <div class="settings-row"><strong>📈 2. Own shares</strong><span>Buy slices of companies. Prices move every 6 seconds and news moves whole sectors. You can sell at any time.</span></div>
          <div class="settings-row"><strong>🌍 3. Expand globally</strong><span>Open new markets with cash, level and net-worth requirements. Every market adds a permanent revenue bonus.</span></div>
          <div class="settings-row"><strong>🎓 4. Learn the why</strong><span>Short lessons and the glossary turn game mechanics into real economic ideas. Completing a lesson pays cash.</span></div>
        </div>
        <div class="lesson-example"><b>The core loop</b><p>Invest cash → earn income → learn what happened → diversify or expand → repeat. The point is not to click fast. The point is to notice the pattern.</p></div>
        <p class="modal-footnote">Tips: hover over a “?” for plain-English explanations. Click underlined words to open the glossary. Your progress saves automatically in this browser.</p>
        <div class="modal-actions"><button class="btn btn-primary" data-close-modal>Got it</button></div>
      </div>`
    });
  }

  function openMarketHelp() {
    showModal({
      body: `<div class="modal-head"><span class="eyebrow">Market mechanics</span><h2>A simulated market, real ideas</h2><p class="modal-sub">Everything here is designed to help you feel how markets behave.</p></div>
      <div class="modal-body">
        <div class="modal-section"><h4>Prices update every 6 seconds</h4><p>Each company follows a random walk with volatility, a gentle pull toward a fair value, and market sentiment. News events add bigger sector-specific moves.</p></div>
        <div class="modal-section"><h4>You can buy and sell shares</h4><p>There is a 0.15% fee per trade. Your average cost includes the fee. A profit or loss only becomes realised when you sell.</p></div>
        <div class="modal-section"><h4>What the metrics mean</h4><ul><li><strong>P/E:</strong> price per dollar of annual earnings. Higher means more growth is expected.</li><li><strong>Beta:</strong> sensitivity to the wider market. Above 1 tends to move more.</li><li><strong>Dividend:</strong> annual cash paid to shareholders as a share of the price.</li><li><strong>Risk:</strong> a plain-English guide, not a guarantee.</li></ul></div>
        <div class="lesson-key"><span>💡</span><p>This is not live market data and not financial advice. The goal is to build intuition: prices reflect expectations, news changes expectations, and diversification makes being wrong survivable.</p></div>
        <div class="modal-actions"><button class="btn btn-primary" data-close-modal>Explore the market</button></div>
      </div>`
    });
  }

  function openOfflineReport(report) {
    const minutes = Math.max(1, Math.round(report.seconds / 60));
    showModal({
      body: `<div class="modal-head"><span class="eyebrow">While you were away</span><h2>Your company kept working.</h2><p class="modal-sub">Passive income is the quiet superpower of owning productive assets.</p></div>
      <div class="modal-body">
        <div class="chart-legend" style="margin:0 0 15px"><span>Offline earnings</span></div>
        <div class="networth-block" style="margin-top:0"><span class="label">Added to cash</span><strong style="font-size:45px;color:var(--mint)">${money(report.amount)}</strong><div class="networth-meta"><span>${minutes} minute${minutes === 1 ? "" : "s"} away · 40% of normal income · capped at 4 hours</span></div></div>
        <div class="lesson-key" style="margin-top:18px"><span>💡</span><p>Idle income is still income. The game pays a reduced rate while you are away so progress feels fair, not automatic.</p></div>
        <div class="modal-actions"><button class="btn btn-primary" data-close-modal>Back to work</button></div>
      </div>`
    });
  }

  function openSettings() {
    showModal({
      body: `<div class="modal-head"><span class="eyebrow">Settings</span><h2>Your workspace</h2><p class="modal-sub">Progress saves locally in this browser. No account, no real money.</p></div>
      <div class="modal-body">
        <label class="modal-label" for="settings-company">Company name</label>
        <input class="modal-input" id="settings-company" maxlength="26" value="${esc(S.companyName)}" autocomplete="off">
        <div class="modal-actions" style="margin-top:10px"><button class="btn btn-primary btn-small" data-save-settings>Save name</button></div>
        <div class="settings-list">
          <div class="settings-row"><div><strong>How to play</strong><span>A quick tour of the four loops.</span></div><button class="btn btn-ghost btn-small" data-help-guide>Open guide</button></div>
          <div class="settings-row"><div><strong>Mentor tips</strong><span>Bring back Maya's task list anytime.</span></div><button class="btn btn-ghost btn-small" data-show-mentor>Show mentor</button></div>
          <div class="settings-row"><div><strong>Learning progress</strong><span>${S.lessonsDone.length} of ${D.lessons.length} lessons · ${S.tutorialDone.length} of ${D.tutorialTasks.length} mentor tasks</span></div><button class="btn btn-ghost btn-small" data-goto="academy">Academy</button></div>
          <div class="settings-row danger"><div><strong>Reset company</strong><span>Erase this save and start from $750.</span></div><button class="btn btn-danger btn-small" data-reset-request>Reset</button></div>
        </div>
        <p class="modal-footnote">Market Masters is an educational simulation. Nothing here is financial advice. Past simulated performance is not a promise.</p>
        <div class="modal-actions"><button class="btn btn-ghost" data-close-modal>Close</button></div>
      </div>`
    });
  }

  function confirmReset() {
    showModal({
      body: `<div class="modal-head"><span class="eyebrow">Start over</span><h2>Erase this company?</h2><p class="modal-sub">This removes your cash, ventures, portfolio, markets and learning progress from this browser. It cannot be undone.</p></div>
      <div class="modal-body">
        <div class="lesson-example"><b>A safe alternative</b><p>If you just want a fresh goal, use the Academy or expand into a new market. You can also keep this save and explore the lessons first.</p></div>
        <div class="modal-actions"><button class="btn btn-ghost" data-close-modal>Keep playing</button><button class="btn btn-danger" data-confirm-reset>Erase and restart</button></div>
      </div>`
    });
  }

  /* ---------- glossary & lessons ---------- */
  function openGlossary() {
    showModal({
      className: "modal--wide",
      body: `<div class="modal-head"><span class="eyebrow">Plain-English glossary</span><h2>Sixteen ideas worth knowing</h2><p class="modal-sub">No jargon walls. Click a term for a fuller explanation and a concrete example.</p></div>
      <div class="modal-body">
        <div class="glossary-grid">${D.glossary.map((term) => `<button class="glossary-card" data-term="${term.id}"><h4>${esc(term.term)}</h4><p>${esc(term.short)}</p></button>`).join("")}</div>
        <div class="modal-actions"><button class="btn btn-ghost" data-close-modal>Close</button></div>
      </div>`
    });
    activeModal.isGlossary = true;
  }

  function openTerm(id, back) {
    const term = D.glossary.find((t) => t.id === id);
    if (!term) return;
    showModal({
      body: `<div class="modal-head"><span class="eyebrow">Glossary</span><h2>${esc(term.term)}</h2><p class="modal-sub">${esc(term.short)}</p></div>
      <div class="modal-body">
        <div class="term-detail"><p>${esc(term.long)}</p><div class="lesson-example term-example"><b>A concrete example</b><p>${esc(term.example)}</p></div></div>
        <div class="modal-actions">
          ${back ? `<button class="btn btn-ghost" data-modal-back>${esc(back.label)}</button>` : ""}
          <button class="btn btn-primary" data-close-modal>Got it</button>
        </div>
      </div>`,
      back
    });
  }

  function openTermFromEvent(id) {
    const lessonId = activeModal && activeModal.lessonId;
    const fromGlossary = activeModal && activeModal.isGlossary;
    if (lessonId) {
      openTerm(id, { label: "Back to lesson", onClick: () => openLesson(lessonId) });
    } else if (fromGlossary) {
      openTerm(id, { label: "Back to all terms", onClick: openGlossary });
    } else {
      openTerm(id, null);
    }
  }

  function openLesson(id) {
    const lesson = D.lessons.find((l) => l.id === id);
    if (!lesson) return;
    const done = S.lessonsDone.includes(id);
    const reward = done ? "Reward already claimed" : `Complete for +${money(lesson.reward)} and +45 XP`;
    const body = `
      <div class="modal-head">
        <div class="lesson-head">
          <span class="lesson-head-icon">${lesson.icon}</span>
          <div><span class="eyebrow">Lesson ${String(lesson.num).padStart(2, "0")} · ${esc(lesson.tag)} · ${lesson.time}</span><h2>${esc(lesson.title)}</h2></div>
        </div>
      </div>
      <div class="modal-body">
        <div class="lesson-article">
          ${lesson.paragraphs.map((p) => `<p>${p}</p>`).join("")}
          <div class="lesson-example"><b>Concrete example</b><p>${esc(lesson.example)}</p></div>
          <div class="lesson-key"><span>💡</span><p>${esc(lesson.key)}</p></div>
          <div class="quiz-block">
            <h3>Quick check</h3>
            <p class="quiz-hint">One question. Choose the best answer, then try it in the game.</p>
            <div class="quiz-options">${lesson.quiz.options.map((option, index) => `<button class="quiz-option" data-quiz-index="${index}">${esc(option)}</button>`).join("")}</div>
            <div class="quiz-feedback" id="quiz-feedback"></div>
            <div class="lesson-complete"><span>${done ? "Lesson completed" : "Finish the question to claim your reward"}</span><b>${reward}</b></div>
          </div>
        </div>
        <div class="modal-actions"><button class="btn btn-ghost" data-close-modal>Back to Academy</button></div>
      </div>`;
    showModal({ body, className: "modal--lesson" });
    activeModal.lessonId = id;
    activeModal.quizAnswered = false;
  }

  function answerQuiz(index, button) {
    if (!activeModal || !activeModal.lessonId || activeModal.quizAnswered) return;
    const lesson = D.lessons.find((l) => l.id === activeModal.lessonId);
    if (!lesson) return;
    const feedback = $("#quiz-feedback");
    const options = $$(".quiz-option", activeModal.modal);
    const correct = index === lesson.quiz.answer;
    if (correct) {
      activeModal.quizAnswered = true;
      button.classList.add("correct");
      options.forEach((option) => { option.disabled = true; });
      const wasDone = S.lessonsDone.includes(lesson.id);
      const newlyDone = M.completeLesson(lesson.id);
      if (feedback) {
        feedback.className = "quiz-feedback show good";
        feedback.innerHTML = newlyDone
          ? `<strong>Correct.</strong> ${esc(lesson.quiz.explain)} <br><strong>+${money(lesson.reward)} and +45 XP added.</strong>`
          : `<strong>Correct.</strong> ${esc(lesson.quiz.explain)}${wasDone ? " This was a review; the reward was already claimed." : ""}`;
      }
    } else {
      button.classList.add("incorrect");
      if (feedback) {
        feedback.className = "quiz-feedback show bad";
        feedback.innerHTML = `<strong>Not quite.</strong> ${esc(lesson.quiz.explain)} Try once more — wrong answers are part of learning.`;
      }
      setTimeout(() => button.classList.remove("incorrect"), 1300);
    }
  }

  /* ---------- mentor ---------- */
  function mentorAction() {
    const next = UI.nextMentorTask();
    if (!next) {
      switchView("academy");
      const lesson = D.lessons.find((l) => !S.lessonsDone.includes(l.id)) || D.lessons[0];
      openLesson(lesson.id);
      return;
    }
    switchView(next.view);
    UI.toast({ title: "Mentor", message: next.message, tone: "info", icon: "🧭" });
    if (next.view === "ventures") {
      requestAnimationFrame(() => {
        const card = $(".venture-card");
        if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }

  /* ---------- modal event delegation ---------- */
  $("#modal-root").addEventListener("click", (event) => {
    if (!activeModal) return;
    const target = event.target;

    if (target.closest("[data-close-modal]")) { closeModal(); return; }

    if (target.closest("[data-modal-back]")) {
      const back = activeModal.back;
      if (back && typeof back.onClick === "function") {
        activeModal.closable = true;
        closeModal();
        back.onClick();
      }
      return;
    }

    if (activeModal.onboarding) {
      if (target.closest("#onboard-next")) {
        const input = $("#onboard-company");
        if (input && onboardStep === 0) {
          const clean = input.value.trim().replace(/[<>]/g, "").slice(0, 26);
          if (clean) S.companyName = clean;
        }
        onboardStep = Math.min(2, onboardStep + 1);
        updateOnboardStep(activeModal.modal);
        return;
      }
      if (target.closest("#onboard-back")) {
        onboardStep = Math.max(0, onboardStep - 1);
        updateOnboardStep(activeModal.modal);
        return;
      }
      if (target.closest("#onboard-skip")) { finishOnboarding(true); return; }
      if (target.closest("#onboard-start")) { finishOnboarding(false); return; }
      const goal = target.closest("[data-goal-choice]");
      if (goal) {
        onboardGoal = goal.dataset.goalChoice;
        $$(".onboard-goal[data-goal-choice]", activeModal.modal).forEach((el) => el.classList.toggle("selected", el === goal));
        return;
      }
    }

    if (target.closest("[data-save-settings]")) {
      const input = $("#settings-company");
      const clean = input ? input.value.trim().replace(/[<>]/g, "").slice(0, 26) : "";
      if (clean) S.companyName = clean;
      M.saveGame();
      document.title = `${S.companyName} · Market Masters`;
      closeModal();
      switchView("hq");
      UI.refreshAll();
      UI.toast({ title: "Company renamed", message: `The story continues as ${S.companyName}.`, tone: "success", icon: "✦" });
      return;
    }
    if (target.closest("[data-help-guide]")) { openHowToPlay(); return; }
    if (target.closest("[data-show-mentor]")) {
      S.mentorHidden = false;
      M.saveGame();
      closeModal();
      UI.renderMentor();
      UI.toast({ title: "Maya is back", message: "Your money mentor is ready with the next task.", tone: "info", icon: "🧭" });
      return;
    }
    if (target.closest("[data-reset-request]")) { confirmReset(); return; }
    if (target.closest("[data-confirm-reset]")) { M.resetGame(); return; }

    const quiz = target.closest("[data-quiz-index]");
    if (quiz) { answerQuiz(Number(quiz.dataset.quizIndex), quiz); return; }
  });

  /* ---------- document click actions ---------- */
  document.addEventListener("click", (event) => {
    const target = event.target;
    const nav = target.closest(".nav-item[data-view], .mobile-nav-item[data-view]");
    if (nav) { switchView(nav.dataset.view); return; }
    const goto = target.closest("[data-goto]");
    if (goto) {
      event.preventDefault();
      if (activeModal) { activeModal.closable = true; closeModal(); }
      switchView(goto.dataset.goto);
      return;
    }
    if (target.closest("#settings-btn")) { openSettings(); return; }
    if (target.closest("#ticker-help")) { openMarketHelp(); return; }
    if (target.closest("#mentor-close")) {
      S.mentorHidden = true;
      M.saveGame();
      UI.renderMentor();
      return;
    }
    if (target.closest("#mentor-fab")) {
      S.mentorHidden = false;
      M.saveGame();
      UI.renderMentor();
      return;
    }
    if (target.closest("#mentor-action")) { mentorAction(); return; }
    if (target.closest("#campaign-btn")) { M.startCampaign(); return; }
    if (target.closest("#open-glossary")) { openGlossary(); return; }
    if (target.closest("#skill-btn")) {
      const next = D.lessons.find((l) => !S.lessonsDone.includes(l.id)) || D.lessons[0];
      openLesson(next.id);
      return;
    }

    const buyMode = target.closest('[data-buy-mode]');
    if (buyMode) { UI.setBuyMode(buyMode.dataset.buyMode); return; }

    const venture = target.closest("[data-buy-venture]");
    if (venture) { M.buyVenture(venture.dataset.buyVenture, UI.buyMode); return; }

    const stock = target.closest("[data-stock]");
    if (stock) {
      S.selectedStock = stock.dataset.stock;
      UI.renderStockList();
      UI.renderStockDetail();
      return;
    }

    const trade = target.closest("[data-trade]");
    if (trade) {
      const input = $("#trade-shares");
      M.tradeStock(S.selectedStock, trade.dataset.trade, input ? input.value : 1);
      return;
    }
    if (target.closest("[data-max-shares]")) {
      const input = $("#trade-shares");
      if (input) {
        const max = M.maxBuyShares(S.selectedStock);
        if (max > 0) input.value = max;
        UI.updateTradeEstimate();
      }
      return;
    }
    const sellAll = target.closest("[data-sell-all]");
    if (sellAll) {
      const holding = S.holdings[sellAll.dataset.sellAll];
      if (holding) M.tradeStock(sellAll.dataset.sellAll, "sell", holding.shares);
      return;
    }

    const lesson = target.closest("[data-lesson]");
    if (lesson) { openLesson(lesson.dataset.lesson); return; }

    const term = target.closest("[data-term]");
    if (term) { openTermFromEvent(term.dataset.term); return; }

    const chip = target.closest("[data-country-select]");
    if (chip) { M.selectCountry(chip.dataset.countrySelect); return; }

    const mapTarget = target.closest("#world-map-wrap [data-country]");
    if (mapTarget) {
      UI.hideMapTooltip();
      M.selectCountry(mapTarget.dataset.country);
      return;
    }

    const expand = target.closest("[data-expand-country]");
    if (expand) { M.expandCountry(expand.dataset.expandCountry); return; }
  });

  /* ---------- input events ---------- */
  document.addEventListener("input", (event) => {
    if (event.target.closest("#trade-shares")) UI.updateTradeEstimate();
    if (event.target.closest("#lab-start, #lab-monthly, #lab-rate, #lab-years")) UI.updateCompoundLab();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeModal && activeModal.closable) { closeModal(); return; }
    const mapTarget = event.target.closest && event.target.closest("#world-map-wrap [data-country]");
    if (mapTarget && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      M.selectCountry(mapTarget.dataset.country);
    }
    if (event.key === "Tab" && activeModal) {
      const focusable = $$("button:not(:disabled), input:not(:disabled), [tabindex='0'], a[href]", activeModal.modal)
        .filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  /* ---------- map tooltips ---------- */
  const mapWrap = $("#world-map-wrap");
  if (mapWrap) {
    mapWrap.addEventListener("pointermove", (event) => {
      const target = event.target.closest("[data-country]");
      if (target) UI.showMapTooltip(event, target.dataset.country);
      else UI.hideMapTooltip();
    });
    mapWrap.addEventListener("pointerleave", UI.hideMapTooltip);
  }

  /* ---------- chart resize ---------- */
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => UI.redrawCharts(), 120);
  });

  /* ---------- game loop ---------- */
  let lastTick = performance.now();
  setInterval(() => {
    const now = performance.now();
    const dt = Math.min(1, Math.max(0, (now - lastTick) / 1000));
    lastTick = now;
    M.tick(dt);
    UI.updateTopBar();
  }, 200);

  setInterval(() => {
    UI.drawNetworthChart();
    UI.updateCampaignButton();
    M.checkGoals();
  }, 1000);

  setInterval(() => {
    M.recordNetWorth();
    UI.drawNetworthChart();
  }, 3200);

  setInterval(() => M.saveGame(), 10000);
  setInterval(() => M.simulateMarket(), 6000);

  function scheduleNews() {
    const wait = 26000 + Math.random() * 22000;
    setTimeout(() => {
      if (document.visibilityState !== "hidden") {
        const pool = D.news.filter((item) => !S.latestNews || item.headline !== S.latestNews.headline);
        const item = pool[Math.floor(Math.random() * pool.length)];
        M.publishNews(item);
      }
      scheduleNews();
    }, wait);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") M.saveGame();
    else lastTick = performance.now();
  });
  window.addEventListener("beforeunload", M.saveGame);

  /* ---------- boot ---------- */
  document.title = `${S.companyName} · Market Masters`;
  UI.refreshAll();
  UI.buildTicker();
  M.checkGoals();
  UI.renderMentor();

  if (!S.onboarded) {
    setTimeout(openOnboarding, 260);
  } else if (offlineReport) {
    setTimeout(() => openOfflineReport(offlineReport), 800);
  } else if (S.tutorialDone.length < D.tutorialTasks.length && !S.mentorHidden) {
    setTimeout(() => UI.renderMentor(), 500);
  }

  setTimeout(() => M.loadFxRates(), 1400);
})();
