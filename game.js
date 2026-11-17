/* ============================================================
   FRENTE ALIADA — motor do jogo + interface
   Jogo educativo sobre a Segunda Guerra Mundial.
   ============================================================ */
(() => {
  "use strict";

  /* ------------------------------------------------------------
     Utilidades
     ------------------------------------------------------------ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, cls = "icon") => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const hashString = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  const mulberry32 = (seed) => {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const rgba = (hex, a) => {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  const artStyle = (b) => `--sky1:${b.palette.sky[0]};--sky2:${b.palette.sky[2]};--ground:${b.palette.ground};--sun-color:${b.palette.sun}`;

  // Bandeiras dos países onde cada batalha aconteceu, usando as imagens reais
  // da pasta Images. A bandeira da Alemanha começa desfocada e só é revelada
  // quando o jogador passa o mouse (ou foca) sobre o cartão.
  const FLAG_IMAGES = {
    no: "Images/Norway.png",
    eg: "Images/Egypt.svg",
    su: "Images/Soviet.png",
    fr: "Images/France.png",
    be: "Images/Belgium.webp",
    de: "Images/Germany.png"
  };
  const flagHTML = (code, cls = "flag-img") => {
    const src = FLAG_IMAGES[code];
    if (!src) return "";
    const reveal = code === "de" ? " flag-reveal" : "";
    const img = `<img class="${cls}${reveal}" src="${src}" alt="" aria-hidden="true" decoding="async">`;
    // A bandeira alemã ganha uma caixa de hover própria: só ela revela a
    // imagem, e não o cartão inteiro da batalha.
    return code === "de" ? `<span class="flag-box" aria-hidden="true">${img}</span>` : img;
  };

  /* ------------------------------------------------------------
     Progresso salvo
     ------------------------------------------------------------ */
  const SAVE_KEY = "frente-aliada-save-v1";
  const DEFAULT_SAVE = { completed: {}, best: {}, difficulty: "soldado", sound: true, graphics: "high", unlockedAll: false };
  const UNLOCK_CODE = "aliados";
  let unlockBuffer = "";
  const BATTLES = (window.BATTLES || []).slice().sort((a, b) => a.start.localeCompare(b.start));
  BATTLES.forEach((b, i) => { b.index = i; });

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_SAVE));
      const parsed = JSON.parse(raw);
      return {
        completed: parsed.completed && typeof parsed.completed === "object" ? parsed.completed : {},
        best: parsed.best && typeof parsed.best === "object" ? parsed.best : {},
        difficulty: ["recruta", "soldado", "veterano"].includes(parsed.difficulty) ? parsed.difficulty : "soldado",
        sound: parsed.sound !== false,
        graphics: ["low", "medium", "high"].includes(parsed.graphics) ? parsed.graphics : "high",
        unlockedAll: parsed.unlockedAll === true
      };
    } catch (_) { return JSON.parse(JSON.stringify(DEFAULT_SAVE)); }
  }
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) { /* modo privado */ }
  }
  let save = loadSave();
  document.body.dataset.graphics = save.graphics;

  const DIFFICULTIES = {
    recruta: { label: "Recruta", roman: "I", enemyHp: 0.8, enemyDmg: 0.65, spawn: 1.18, coin: 1.15, desc: "Inimigos mais frágeis e mais moedas iniciais. Ideal para aprender a história." },
    soldado: { label: "Soldado", roman: "II", enemyHp: 1, enemyDmg: 1, spawn: 1, coin: 1, desc: "Experiência equilibrada. O padrão da campanha." },
    veterano: { label: "Veterano", roman: "III", enemyHp: 1.28, enemyDmg: 1.4, spawn: 0.85, coin: 0.9, desc: "Inimigos resistentes, reforços mais rápidos e menos moedas. Para quem já conhece o front." }
  };
  // Presets gráficos. O alto mantém o visual completo; baixo e médio reduzem
  // resolução interna, densidade de cenário, partículas e clima para ganhar FPS.
  const GRAPHICS = {
    low: {
      label: "Baixo", badge: "L",
      desc: "Prioriza FPS: resolução e detalhes reduzidos, menos efeitos e clima.",
      dpr: 0.85, scenery: 0.42, weather: 0.35, particles: 0.35,
      effects: 0.5, shadows: false, simpleParticles: true, trenchStep: 26, hudMs: 140
    },
    medium: {
      label: "Médio", badge: "M",
      desc: "Equilíbrio entre fluidez e visual, com parte dos efeitos.",
      dpr: 1.25, scenery: 0.72, weather: 0.65, particles: 0.7,
      effects: 0.8, shadows: true, simpleParticles: false, trenchStep: 20, hudMs: 110
    },
    high: {
      label: "Alto", badge: "A",
      desc: "Visual completo, com todos os detalhes e efeitos. Padrão do jogo.",
      dpr: 2, scenery: 1, weather: 1, particles: 1,
      effects: 1, shadows: true, simpleParticles: false, trenchStep: 16, hudMs: 90
    }
  };
  const quality = () => GRAPHICS[save.graphics] || GRAPHICS.high;
  const RANKS = {
    bronze: { label: "Bronze", value: 1, order: 1 },
    prata: { label: "Prata", value: 2, order: 2 },
    ouro: { label: "Ouro", value: 3, order: 3 }
  };
  const rankLabel = (r) => (RANKS[r] ? RANKS[r].label : "—");

  function isCompleted(id) { return !!save.completed[id]; }
  function isUnlocked(index) { return save.unlockedAll || index === 0 || isCompleted(BATTLES[index].id) || (index > 0 && isCompleted(BATTLES[index - 1].id)); }
  function completedCount() { return BATTLES.filter((b) => isCompleted(b.id)).length; }
  function nextBattle() { return BATTLES.find((b) => !isCompleted(b.id)) || null; }

  /* ------------------------------------------------------------
     Configurações do RTS de trincheiras
     (unidades, facções e economia ficam definidas junto ao motor)
     ------------------------------------------------------------ */

  /* ------------------------------------------------------------
     Interface — campanha
     ------------------------------------------------------------ */
  let timelineFilter = "all";
  let diaryFilter = "all";

  function renderAll() {
    renderProgress();
    renderNextDossier();
    renderTimeline();
    renderDiary();
    renderDifficulty();
    renderGraphics();
    syncSound();
  }

  function renderProgress() {
    const done = completedCount();
    const total = BATTLES.length;
    $("#header-progress").textContent = `${done}/${total}`;
    $("#diary-count").textContent = `${done} de ${total} fichas`;
    const pct = Math.round((done / total) * 100);
    $("#diary-ring").style.setProperty("--p", pct);
    $("#diary-ring-label").textContent = `${pct}%`;
    $("#west-count").textContent = `${BATTLES.filter((b) => b.front === "west" && isCompleted(b.id)).length}/5 concluídas`;
    $("#east-count").textContent = `${BATTLES.filter((b) => b.front === "east" && isCompleted(b.id)).length}/5 concluídas`;
    const next = nextBattle();
    $("#continue-label").textContent = done === 0 ? "Começar campanha" : next ? "Continuar campanha" : "Campanha concluída";
  }

  function renderNextDossier() {
    const el = $("#next-dossier");
    const next = nextBattle();
    if (!next) {
      el.innerHTML = `
        <div class="dossier-top">
          <span class="dossier-label">Campanha concluída</span>
          <span class="dossier-status">${icon("check")} Vitória aliada</span>
        </div>
        <div class="dossier-date">8 de maio de 1945 · Europa</div>
        <div class="dossier-title">A guerra acabou.<span>Você percorreu as duas frentes e conhece a história por dentro. Releia o Diário de Guerra ou revisite uma batalha.</span></div>
        <div class="dossier-meta">
          <span>${icon("medal")} ${completedCount()}/${BATTLES.length} batalhas</span>
          <span>${icon("book")} Diário completo</span>
        </div>
        <div class="dossier-objective"><small>Próximo passo</small><strong>Revisite suas batalhas favoritas ou aprofunde-se nas fichas históricas.</strong></div>
        <div class="dossier-actions">
          <button class="btn btn-primary" data-battle-id="berlim">${icon("play")} Rejogar Berlim</button>
          <button class="btn btn-ghost" data-action="diary">${icon("book")} Diário</button>
        </div>`;
      return;
    }
    const done = completedCount();
    el.innerHTML = `
      <div class="dossier-top">
        <span class="dossier-label">Próxima missão · ${String(done + 1).padStart(2, "0")}/${BATTLES.length}</span>
        <span class="dossier-status"><span class="live-dot"></span> Disponível</span>
      </div>
      <div class="dossier-date">${esc(next.dateLabel)}</div>
      <div class="dossier-title">${esc(next.name)}<span>${esc(next.subtitle)}</span></div>
      <div class="dossier-meta">
        <span><i class="front-dot front-dot--${next.front}"></i>${esc(next.frontLabel)}</span>
        <span>${icon("globe")} ${esc(next.place)}</span>
      </div>
      <div class="dossier-objective">
        <small>Objetivo de combate</small>
        <strong>${esc(next.objective)}</strong>
      </div>
      <div class="dossier-actions">
        <button class="btn btn-primary" data-battle-id="${next.id}">${icon("book")} Abrir briefing</button>
        <button class="btn btn-ghost" data-action="scroll-timeline">${icon("arrow")} Linha do tempo</button>
      </div>`;
  }

  function battleCardHTML(b, idx) {
    const done = isCompleted(b.id);
    const unlocked = isUnlocked(idx);
    const isNext = nextBattle() && nextBattle().id === b.id;
    const best = save.best[b.id];
    const medal = best && RANKS[best.rank] ? `<span class="medal-pill">${icon("medal")}${rankLabel(best.rank)}</span>` : "";
    const ddayReady = b.variant === "dday" && unlocked;
    const status = done
      ? `<span class="battle-status done">${icon("check")} Concluída</span>`
      : unlocked
        ? `<span class="battle-status">${icon("info")} ${isNext ? "Pronta para jogar" : "Disponível"}</span>`
        : `<span class="battle-status locked">${icon("lock")} Bloqueada</span>`;
    return `
      <article class="battle-card ${done ? "is-done" : ""} ${isNext && !done ? "is-next" : ""} ${unlocked ? "" : "is-locked"} ${ddayReady ? "is-dday-ready" : ""}"
        data-battle-id="${b.id}" data-front="${b.front}" tabindex="0" role="button"
        aria-label="${esc(b.name)} — ${done ? "concluída" : unlocked ? "disponível" : "bloqueada"}"
        style="animation-delay:${Math.min(idx * 38, 300)}ms">
        <div class="battle-art ${b.image ? "has-photo" : ""}" data-scene="${b.scene}" style="${artStyle(b)}">
          ${b.image ? `<img class="battle-photo" src="${esc(b.image)}" alt="" loading="lazy" draggable="false"><span class="battle-photo-shade"></span>` : ""}
          <span class="art-year">${b.year}</span>
          ${flagHTML(b.flag, "art-flag")}
          <div class="art-front"><span class="front-tag"><i class="front-dot front-dot--${b.front}"></i>${b.front === "west" ? "Ocidental" : "Oriental"}</span></div>
        </div>
        <div class="battle-body">
          <div class="battle-kicker"><span>Batalha ${String(idx + 1).padStart(2, "0")}</span><span class="kicker-line"></span><span>${esc(b.frontLabel)}</span></div>
          <div class="battle-title-row"><h3>${esc(b.name)}</h3>${isNext && !done ? `<span class="next-flag">Próxima</span>` : ""}</div>
          <p class="battle-sub">${esc(b.subtitle)}</p>
          <div class="battle-meta">
            <span>${icon("clock")} ${esc(b.dateLabel)}</span>
            <span>${icon("globe")} ${esc(b.place)}</span>
            <span>${icon("target")} ${esc(b.outcome)}</span>
          </div>
        </div>
        <div class="battle-actions">
          ${status}
          ${done ? medal : ""}
          <button class="btn btn-ghost btn-sm" ${unlocked ? "" : "disabled"} type="button">
            ${unlocked ? `${icon("book")} Briefing` : `${icon("lock")} Bloqueada`}
          </button>
        </div>
      </article>`;
  }

  function renderTimeline() {
    const container = $("#timeline");
    const list = BATTLES.filter((b) => timelineFilter === "all" || b.front === timelineFilter);
    if (!list.length) {
      container.innerHTML = `<div class="diary-empty">Nenhuma batalha nesta frente.</div>`;
      return;
    }
    const years = [...new Set(list.map((b) => b.year))];
    container.innerHTML = years.map((year) => {
      const battles = list.filter((b) => b.year === year);
      return `
        <div class="year-block">
          <div class="year-marker">
            <span class="year-number">${year}</span>
            <span class="year-count">${battles.length} ${battles.length === 1 ? "batalha" : "batalhas"}</span>
          </div>
          <div class="year-battles">${battles.map((b) => battleCardHTML(b, BATTLES.indexOf(b))).join("")}</div>
        </div>`;
    }).join("");
  }

  function renderDiary() {
    const container = $("#diary-grid");
    const list = BATTLES.filter((b) => diaryFilter === "all" || b.front === diaryFilter);
    if (!list.length) {
      container.innerHTML = `<div class="diary-empty">Nenhuma ficha nesta frente.</div>`;
      return;
    }
    container.innerHTML = list.map((b) => {
      const done = isCompleted(b.id);
      const best = save.best[b.id];
      if (!done) {
        return `
          <article class="diary-card is-locked ${b.image ? "has-photo" : ""}" data-front="${b.front}">
            ${b.image ? `<div class="diary-photo"><img src="${esc(b.image)}" alt="" loading="lazy" draggable="false"></div>` : ""}
            <div class="diary-head">
              <span class="diary-date">${esc(b.dateLabel)}</span>
              <span class="front-tag" data-front="${b.front}"><i class="front-dot front-dot--${b.front}"></i>${b.front === "west" ? "Ocidental" : "Oriental"}</span>
            </div>
            <h3 class="diary-title">${esc(b.name)}</h3>
            <p class="diary-context">${esc(b.subtitle)}</p>
            <div class="diary-lock">${icon("lock")} Complete a batalha para desbloquear a ficha histórica</div>
          </article>`;
      }
      return `
        <article class="diary-card ${b.image ? "has-photo" : ""}" data-front="${b.front}">
          ${b.image ? `<div class="diary-photo"><img src="${esc(b.image)}" alt="" loading="lazy" draggable="false"></div>` : ""}
          <div class="diary-head">
            <span class="diary-date">${esc(b.dateLabel)}</span>
            <span class="front-tag" data-front="${b.front}"><i class="front-dot front-dot--${b.front}"></i>${b.front === "west" ? "Ocidental" : "Oriental"}</span>
          </div>
          <h3 class="diary-title">${esc(b.name)}</h3>
          <p class="diary-context">${esc(b.context.length > 260 ? `${b.context.slice(0, 257)}…` : b.context)}</p>
          <div class="diary-fact"><b>Você sabia?</b>${esc(b.funFact)}</div>
          <div class="diary-footer">
            <span class="diary-outcome">${best && RANKS[best.rank] ? `Melhor posto: ${rankLabel(best.rank)}` : esc(b.outcome)}</span>
            <button class="diary-open" data-battle-id="${b.id}" type="button">Abrir ficha ${icon("arrow")}</button>
          </div>
        </article>`;
    }).join("");
  }

  function renderDifficulty() {
    $$(".difficulty-option").forEach((btn) => btn.classList.toggle("active", btn.dataset.difficulty === save.difficulty));
    const d = DIFFICULTIES[save.difficulty] || DIFFICULTIES.soldado;
    const note = $("#difficulty-note");
    if (note) note.textContent = `Dificuldade atual: ${d.label} — ${d.desc}`;
    $$(".diff-chip[data-set-difficulty]").forEach((chip) => chip.classList.toggle("active", chip.dataset.setDifficulty === save.difficulty));
  }

  function renderGraphics() {
    const q = quality();
    $$(".graphics-option").forEach((btn) => btn.classList.toggle("active", btn.dataset.graphics === save.graphics));
    $$(".graphics-chip").forEach((btn) => btn.classList.toggle("active", btn.dataset.graphics === save.graphics));
    const note = $("#graphics-note");
    if (note) note.textContent = `Qualidade atual: ${q.label} — ${q.desc}`;
    const btn = $("#graphics-toggle");
    if (btn) {
      btn.title = `Gráficos: ${q.label}`;
      btn.setAttribute("aria-label", `Gráficos: ${q.label}. Abrir configurações gráficas`);
    }
  }

  function setGraphics(key) {
    if (!GRAPHICS[key] || save.graphics === key) return;
    save.graphics = key;
    persist();
    applyGraphics();
    Sound.ui();
  }

  function applyGraphics() {
    document.body.dataset.graphics = save.graphics;
    renderGraphics();
    if (!G) return;
    // Recalcula a resolução interna e reconstrói o cenário com a nova densidade.
    resizeCanvas();
    relayoutField(true);
    buildScenery();
    const q = quality();
    const particleCap = Math.round(320 * Math.max(0.25, q.particles));
    if (G.particles.length > particleCap) G.particles.splice(0, G.particles.length - particleCap);
    const tracerCap = Math.round(80 * Math.max(0.4, q.effects));
    if (G.tracers.length > tracerCap) G.tracers.splice(0, G.tracers.length - tracerCap);
  }

  function syncSound() {
    const btn = $("#sound-toggle");
    if (!btn) return;
    btn.innerHTML = icon(save.sound ? "volume" : "mute");
    btn.setAttribute("aria-label", save.sound ? "Desativar som" : "Ativar som");
    btn.setAttribute("aria-pressed", String(save.sound));
  }

  /* ------------------------------------------------------------
     Navegação e filtros
     ------------------------------------------------------------ */
  function showView(name) {
    $$(".view").forEach((view) => view.classList.toggle("active", view.dataset.viewPanel === name));
    $$(".nav-item").forEach((item) => {
      const active = item.dataset.view === name;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function toast(title, message) {
    const stack = $("#toast-stack");
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<strong>${esc(title)}</strong>${esc(message)}`;
    stack.appendChild(el);
    while (stack.children.length > 3) stack.firstElementChild.remove();
    setTimeout(() => {
      el.style.transition = "opacity 200ms ease, transform 200ms ease";
      el.style.opacity = "0";
      el.style.transform = "translateX(12px)";
      setTimeout(() => el.remove(), 220);
    }, 4200);
  }

  function setDifficulty(key) {
    if (!DIFFICULTIES[key]) return;
    save.difficulty = key;
    persist();
    renderDifficulty();
    $$(".diff-chip[data-set-difficulty]").forEach((chip) => chip.classList.toggle("active", chip.dataset.setDifficulty === key));
  }

  /* ------------------------------------------------------------
     Modal
     ------------------------------------------------------------ */
  let modalData = null;

  function mountModal(panelClass, html, opts = {}) {
    const previousFocus = modalData ? modalData.previousFocus : document.activeElement;
    closeModal(true);
    const root = $("#modal-root");
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `<div class="${panelClass}" role="dialog" aria-modal="true" aria-label="${esc(opts.label || "Janela")}">${html}</div>`;
    root.appendChild(backdrop);
    document.body.classList.add("is-modal-open");
    modalData = { backdrop, panel: backdrop.firstElementChild, opts, previousFocus };
    backdrop.addEventListener("mousedown", (e) => {
      if (e.target === backdrop && opts.dismissible !== false) closeModal();
    });
    const focusable = modalData.panel.querySelector("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    if (focusable) focusable.focus({ preventScroll: true });
  }

  function closeModal(silent = false) {
    const root = $("#modal-root");
    if (!root) return;
    const previous = modalData ? modalData.previousFocus : null;
    root.innerHTML = "";
    document.body.classList.remove("is-modal-open");
    modalData = null;
    if (!silent && previous && typeof previous.focus === "function") previous.focus({ preventScroll: true });
  }

  function difficultyChips() {
    return Object.entries(DIFFICULTIES).map(([key, d]) => `<button class="diff-chip ${save.difficulty === key ? "active" : ""}" data-set-difficulty="${key}" type="button">${d.roman} · ${d.label}</button>`).join("");
  }

  function openBriefing(battle) {
    if (!battle) return;
    const idx = BATTLES.indexOf(battle);
    const done = isCompleted(battle.id);
    const best = save.best[battle.id];
    const diff = DIFFICULTIES[save.difficulty];
    const html = `
      <div class="modal-art ${battle.image ? "has-photo" : ""}" style="${artStyle(battle)}">
        ${battle.image ? `<img class="modal-photo" src="${esc(battle.image)}" alt="" draggable="false"><span class="modal-photo-shade"></span>` : ""}
        <div class="modal-art-inner">
          <div class="modal-art-top">
            <span class="modal-art-icon">${flagHTML(battle.flag, "modal-flag")}</span>
            <button class="modal-close" data-close-modal aria-label="Fechar briefing" type="button">${icon("close")}</button>
          </div>
          <div class="modal-art-bottom">
            <div>
              <div class="modal-kicker">Batalha ${String(idx + 1).padStart(2, "0")} · ${esc(battle.frontLabel)}</div>
              <h2>${esc(battle.name)}</h2>
              <p>${esc(battle.subtitle)}</p>
            </div>
            <div class="modal-art-date">${esc(battle.dateLabel)}<br>${esc(battle.place)}</div>
          </div>
        </div>
      </div>
      <div class="modal-body">
        <div class="modal-meta">
          <div class="meta-cell"><span>Data</span><strong>${esc(battle.dateLabel)}</strong></div>
          <div class="meta-cell"><span>Local</span><strong>${esc(battle.place)}</strong></div>
          <div class="meta-cell"><span>Frente</span><strong>${esc(battle.frontLabel)}</strong></div>
          <div class="meta-cell"><span>Resultado</span><strong>${esc(battle.outcome)}</strong></div>
          <div class="meta-cell"><span>Aliados</span><strong>${esc(battle.allies)}</strong></div>
          <div class="meta-cell"><span>Eixo</span><strong>${esc(battle.axis)}</strong></div>
          <div class="meta-cell"><span>Comandantes aliados</span><strong>${esc(battle.commandersAllies)}</strong></div>
          <div class="meta-cell"><span>Comandantes do Eixo</span><strong>${esc(battle.commandersAxis)}</strong></div>
        </div>
        <div class="modal-section">
          <h3>O contexto histórico</h3>
          <p>${esc(battle.context)}</p>
        </div>
        <div class="modal-section">
          <h3>O que estava em jogo</h3>
          <p>${esc(battle.stakes)}</p>
        </div>
        <div class="modal-section">
          <h3>Seu papel na missão</h3>
          <div class="mission-box">
            <p>${esc(battle.role)}</p>
            <div class="mission-objective">
              ${icon("target")}
              <div><strong>Objetivo</strong><span>${esc(battle.objective)}</span></div>
            </div>
          </div>
        </div>
        <div class="fun-fact">
          <div class="fun-fact-head">${icon("star")} Você sabia?</div>
          <p>${esc(battle.funFact)}</p>
          <span class="fact-note">Curiosidade histórica — não é ficção do jogo.</span>
        </div>
      </div>
      <div class="modal-footer">
        <div class="modal-footer-left">
          <span class="modal-diff-label">Dificuldade</span>
          ${difficultyChips()}
        </div>
        <div class="modal-footer-actions">
          ${done && best ? `<span class="medal-pill">${icon("medal")} ${rankLabel(best.rank)}</span>` : ""}
          <button class="btn btn-ghost" data-close-modal type="button">Voltar</button>
          <button class="btn btn-primary" data-start-battle="${battle.id}" type="button">${done ? "Jogar novamente" : "Iniciar batalha"} ${icon("play")}</button>
        </div>
      </div>`;
    mountModal("modal", html, { label: `Briefing: ${battle.name}`, dismissible: true });
    const foot = modalData.panel.querySelector(".modal-footer-left");
    if (foot) foot.setAttribute("title", `Dificuldade atual: ${diff.label}`);
  }

  function openConfirmReset() {
    mountModal("modal", `
      <div class="modal-body" style="padding-top:30px">
        <span class="eyebrow">Apagar progresso</span>
        <h2 style="font-size:36px;margin:10px 0 8px">Começar de novo?</h2>
        <p style="color:var(--muted);font-size:12px;line-height:1.8">Todo o progresso da campanha, as fichas do Diário e os melhores postos serão apagados deste navegador. As batalhas voltarão a ficar bloqueadas em sequência.</p>
      </div>
      <div class="modal-footer">
        <span class="modal-small-note">Esta ação não pode ser desfeita.</span>
        <div class="modal-footer-actions">
          <button class="btn btn-ghost" data-close-modal type="button">Cancelar</button>
          <button class="btn btn-danger" data-confirm-reset type="button">${icon("refresh")} Apagar tudo</button>
        </div>
      </div>`, { label: "Apagar progresso", dismissible: true });
  }

  function openGraphicsModal() {
    mountModal("modal", `
      <div class="modal-body" style="padding-top:30px">
        <span class="eyebrow">Configurações</span>
        <h2 style="font-size:36px;margin:10px 0 8px">Qualidade gráfica</h2>
        <p style="color:var(--muted);font-size:12px;line-height:1.8">Escolha o equilíbrio entre visual e desempenho. O <strong>Alto</strong> é o padrão do jogo; use <strong>Médio</strong> ou <strong>Baixo</strong> se o campo de batalha estiver travando ou com poucos FPS.</p>
        <div class="graphics-list" role="group" aria-label="Qualidade gráfica">
          ${Object.entries(GRAPHICS).map(([key, q]) => `
            <button class="graphics-option ${save.graphics === key ? "active" : ""}" data-graphics="${key}" type="button">
              <span class="graphics-badge">${q.badge}</span>
              <div><strong>${q.label}</strong><small>${q.desc}</small></div>
            </button>`).join("")}
        </div>
        <p class="small-note" id="graphics-note"></p>
      </div>
      <div class="modal-footer">
        <span class="modal-small-note">A mudança é aplicada imediatamente e fica salva neste navegador.</span>
        <div class="modal-footer-actions">
          <button class="btn btn-primary" data-close-modal type="button">Fechar</button>
        </div>
      </div>`, { label: "Configurações gráficas", dismissible: true });
    renderGraphics();
  }

  /* ------------------------------------------------------------
     Áudio: efeitos sintetizados + gravações da pasta Sounds
     ------------------------------------------------------------ */
  const SOUND_FILES = {
    allyRifleWest: "Sounds/WestAlliesRifleShoot.mp3",
    allyRifleEast: "Sounds/EastAlliesRifleShoot.mp3",
    enemyRifle: "Sounds/EnemyRifleShoot.mp3",
    allyMG: "Sounds/WestEastAlliesMachineGunShoot.mp3",
    enemyMG: "Sounds/EnemyMachineGunShoot.mp3",
    explosion1: "Sounds/Explosion1.mp3",
    explosion2: "Sounds/Explosion2.mp3",
    explosion3: "Sounds/Explosion3.mp3",
    scream1: "Sounds/Scream1.mp3",
    scream2: "Sounds/Scream2.mp3",
    scream3: "Sounds/Scream3.mp3"
  };

  const Sound = {
    ctx: null, master: null, noise: null,
    buffers: {}, samples: {}, loadingAssets: false,
    init() {
      if (!save.sound) return;
      if (this.ctx) { this.ctx.resume().catch(() => {}); this.loadAssets(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.18;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.8);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buf;
      this.loadAssets();
    },
    loadAssets() {
      if (this.loadingAssets) return;
      this.loadingAssets = true;
      Object.entries(SOUND_FILES).forEach(([key, url]) => {
        fetch(url)
          .then((res) => { if (!res.ok) throw new Error(url); return res.arrayBuffer(); })
          .then((data) => new Promise((resolve, reject) => this.ctx.decodeAudioData(data, resolve, reject)))
          .then((buffer) => { this.buffers[key] = buffer; })
          .catch(() => {
            // Rede de segurança para quando o jogo é aberto direto do disco
            // (file://), onde fetch é bloqueado: <audio> toca o arquivo local.
            const el = new Audio(url);
            el.preload = "auto";
            el.load();
            this.samples[key] = el;
          });
      });
    },
    playSample(key, gain = 0.5, rate = 1, maxSeconds = 0) {
      if (!save.sound) return false;
      const buffer = this.buffers[key];
      if (this.ctx && buffer) {
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        src.playbackRate.value = rate;
        const g = this.ctx.createGain();
        g.gain.value = gain;
        src.connect(g); g.connect(this.master);
        if (maxSeconds) src.start(0, 0, maxSeconds);
        else src.start();
        return true;
      }
      const base = this.samples[key];
      if (!base) return false;
      try {
        const node = base.cloneNode();
        node.volume = Math.max(0, Math.min(1, gain * 0.35));
        node.playbackRate = rate;
        const playing = node.play();
        if (playing && playing.catch) playing.catch(() => {});
        if (maxSeconds) {
          setTimeout(() => {
            try { node.pause(); node.currentTime = 0; } catch (err) {}
          }, (maxSeconds * 1000) / rate);
        }
        return true;
      } catch (err) {
        return false;
      }
    },
    pickSample(keys) { return keys[Math.floor(Math.random() * keys.length)]; },
    burst(freq, gain, dur, type = "lowpass") {
      if (!this.ctx || !save.sound) return;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      const filter = this.ctx.createBiquadFilter();
      filter.type = type; filter.frequency.value = freq;
      const g = this.ctx.createGain();
      const t = this.ctx.currentTime;
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(filter); filter.connect(g); g.connect(this.master);
      src.start(t); src.stop(t + dur + 0.02);
    },
    tone(freq, gain, dur, type = "sine", endFreq = freq) {
      if (!this.ctx || !save.sound) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const t = this.ctx.currentTime;
      o.type = type; o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.02);
    },
    shot() {
      if (!this.playSample("allyRifleWest", 0.45, 0.96 + Math.random() * 0.1, 0.5)) {
        this.burst(1600, 0.5, 0.08, "highpass"); this.tone(150, 0.22, 0.09, "triangle", 55);
      }
    },
    enemyShot() {
      if (!this.playSample("enemyRifle", 0.36, 0.96 + Math.random() * 0.1, 0.5)) this.burst(900, 0.12, 0.05, "highpass");
    },
    explosion() {
      const key = this.pickSample(["explosion1", "explosion2", "explosion3"]);
      if (!this.playSample(key, 0.6, 0.92 + Math.random() * 0.16, 1.4)) {
        this.burst(380, 0.7, 0.62, "lowpass"); this.tone(90, 0.4, 0.55, "sine", 32);
      }
    },
    scream() {
      const key = this.pickSample(["scream1", "scream2", "scream3"]);
      if (!this.playSample(key, 0.45, 0.95 + Math.random() * 0.12, 1.6)) this.tone(340, 0.1, 0.3, "sawtooth", 120);
    },
    combat(u) {
      if (!this.ctx || !save.sound) return;
      if (u && (u.type === "tank" || u.type === "mortar")) { this.explosion(); return; }
      const isEnemy = !!u && u.side === "enemy";
      const isMG = !!u && u.type === "mg";
      let key;
      if (isMG) key = isEnemy ? "enemyMG" : "allyMG";
      else if (isEnemy) key = "enemyRifle";
      else key = u && u.faction && u.faction.key === "east" ? "allyRifleEast" : "allyRifleWest";
      const played = isMG
        ? this.playSample(key, 0.5, 0.94 + Math.random() * 0.12, 0.75)
        : this.playSample(key, 0.4, 0.94 + Math.random() * 0.12, 0.5);
      if (!played) this.burst(1200, 0.07, 0.04, "highpass");
    },
    hit() { this.tone(520, 0.09, 0.04, "square", 260); },
    reload() { this.tone(210, 0.1, 0.035, "square", 120); setTimeout(() => this.tone(260, 0.08, 0.03, "square", 160), 120); },
    ui() { this.tone(420, 0.05, 0.04, "sine", 620); },
    victory() { [392, 523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.12, 0.35, "sine", f), i * 120)); },
    defeat() { [220, 185, 147].forEach((f, i) => setTimeout(() => this.tone(f, 0.14, 0.5, "triangle", f * 0.8), i * 180)); }
  };

  /* ============================================================
     Eventos da interface
     ============================================================ */
  function openBattleById(id) {
    const battle = BATTLES.find((b) => b.id === id);
    if (!battle) return;
    const idx = BATTLES.indexOf(battle);
    if (!isUnlocked(idx) && !isCompleted(battle.id)) {
      const previous = BATTLES[idx - 1];
      toast("Batalha bloqueada", previous ? `Complete "${previous.name}" para desbloquear esta missão.` : "Complete a missão anterior para desbloquear.");
      return;
    }
    Sound.init();
    openBriefing(battle);
  }

  document.addEventListener("click", (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;

    const nav = target.closest(".nav-item[data-view]");
    if (nav) { Sound.ui(); showView(nav.dataset.view); return; }

    const filter = target.closest("[data-filter]");
    if (filter) {
      timelineFilter = filter.dataset.filter;
      $$("[data-filter]").forEach((f) => f.classList.toggle("active", f === filter));
      renderTimeline();
      return;
    }
    const diaryFilterBtn = target.closest("[data-diary-filter]");
    if (diaryFilterBtn) {
      diaryFilter = diaryFilterBtn.dataset.diaryFilter;
      $$("[data-diary-filter]").forEach((f) => f.classList.toggle("active", f === diaryFilterBtn));
      renderDiary();
      return;
    }

    const diffChip = target.closest("[data-set-difficulty]");
    if (diffChip) { setDifficulty(diffChip.dataset.setDifficulty); return; }
    const diffOption = target.closest("[data-difficulty]");
    if (diffOption) { setDifficulty(diffOption.dataset.difficulty); return; }

    const graphicsOption = target.closest(".graphics-option[data-graphics], .graphics-chip[data-graphics]");
    if (graphicsOption) { setGraphics(graphicsOption.dataset.graphics); return; }

    const actionEl = target.closest("[data-action]");
    if (actionEl) {
      const action = actionEl.dataset.action;
      if (action === "home" || action === "campaign") showView("campaign");
      else if (action === "howto") showView("about");
      else if (action === "diary") showView("diary");
      else if (action === "scroll-timeline") {
        showView("campaign");
        setTimeout(() => $("#timeline-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
      } else if (action === "reset-progress") openConfirmReset();
      return;
    }

    const closeBtn = target.closest("[data-close-modal]");
    if (closeBtn) { closeModal(); return; }

    const startBtn = target.closest("[data-start-battle]");
    if (startBtn) {
      const battle = BATTLES.find((b) => b.id === startBtn.dataset.startBattle);
      closeModal(true);
      if (battle) startBattle(battle);
      return;
    }

    const confirmReset = target.closest("[data-confirm-reset]");
    if (confirmReset) {
      save = JSON.parse(JSON.stringify(DEFAULT_SAVE));
      persist();
      closeModal(true);
      renderAll();
      showView("campaign");
      toast("Progresso apagado", "A campanha voltou ao início. A história continua disponível.");
      return;
    }

    const resultBtn = target.closest("[data-result]");
    if (resultBtn) {
      const battle = G ? G.battle : null;
      const action = resultBtn.dataset.result;
      if (action === "retry" && battle) {
        closeModal(true);
        startBattle(battle);
      } else if (action === "next" && battle) {
        const next = BATTLES[BATTLES.indexOf(battle) + 1];
        closeModal(true);
        exitGame();
        showView("campaign");
        renderAll();
        if (next) setTimeout(() => openBriefing(next), 160);
      } else {
        closeModal(true);
        exitGame();
        showView("campaign");
        renderAll();
      }
      return;
    }

    const battleEl = target.closest("[data-battle-id]");
    if (battleEl) { openBattleById(battleEl.dataset.battleId || battleEl.getAttribute("data-battle-id")); return; }
  });

  $("#continue-btn").addEventListener("click", () => {
    const next = nextBattle();
    if (next) { Sound.init(); openBriefing(next); return; }
    showView("campaign");
    $("#timeline-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    toast("Campanha concluída", "Todas as batalhas foram vencidas. Revisite as missões ou consulte o Diário de Guerra.");
  });

  $("#sound-toggle").addEventListener("click", () => {
    save.sound = !save.sound;
    persist();
    syncSound();
    if (save.sound) { Sound.init(); Sound.ui(); }
  });

  const graphicsToggle = $("#graphics-toggle");
  if (graphicsToggle) graphicsToggle.addEventListener("click", () => { Sound.init(); Sound.ui(); openGraphicsModal(); });

  /* ============================================================
     RTS DE TRINCHEIRAS — dados, estado, simulação e interface
     ============================================================ */
  const canvasEl = $("#game-canvas");
  const ctx = canvasEl.getContext("2d");
  let G = null;
  let W = 0;
  let H = 0;

  const TRENCH_FRACTIONS = [0.06, 0.205, 0.35, 0.495, 0.64, 0.785, 0.93];
  // O Dia D não é uma guerra de trincheiras: o jogador avança por coberturas na
  // praia até a única trincheira inimiga, diante dos bunkers.
  const DDAY_FRACTIONS = [0.205, 0.315, 0.425, 0.535, 0.645, 0.775, 0.90];
  const DDAY_SHORE = 0.16;
  const DDAY_LINE_LABELS = ["Praia", "Ouriços", "Rochas", "Muro", "Cratera", "Aproximação", "Trincheira"];
  const isDDay = () => !!(G && G.battle && G.battle.variant === "dday");
  const battleFractions = () => (isDDay() ? DDAY_FRACTIONS : TRENCH_FRACTIONS);
  const positionLabel = (index) => isDDay()
    ? (DDAY_LINE_LABELS[index] || `Posição ${index + 1}`)
    : `Linha ${index + 1}`;
  const isStopTrench = (index) => !!G
    && Number.isInteger(index) && index >= 0 && index < G.trenches.length
    && (!isDDay() || index === 0 || index === G.trenches.length - 1);
  const CAPTURE_BONUS = 20;
  const INCOME_TICK_COINS = 100;
  const INCOME_TICK_SECONDS = 5;
  const GRENADE_COOLDOWN = 5;
  const GRENADE_FUSE = 0.6;
  const GRENADE_DAMAGE = 18;
  const GRENADE_RADIUS = 0.55;
  const PLAYER_UNIT_CAP = 28;
  const ENEMY_UNIT_CAP = 28;
  const ENEMY_REPLACE_COOLDOWN = 5;
  // Distância mínima (em fração do espaçamento entre trincheiras) para duas
  // tropas que avançam de frente pararem antes do contato.
  const STANDOFF_FACTOR = 0.18;
  const DDAY_STANDOFF_FACTOR = 0.5;
  const SLOT_ROWS = 6;
  const SOLDIER_SCALE = 2;
  const TANK_SCALE = 2.6;
  const OWNER_COLORS = { player: "#e7c26a", enemy: "#d36a4f", neutral: "#8a917d" };
  const PLAYER_COLORS = {
    skin: "#d9b285", skinDark: "#b98d62",
    body: "#75845f", bodyLight: "#8b9b72", bodyDark: "#526043",
    pants: "#5d6b4b", pantsDark: "#465238",
    boots: "#2e2b22", helmet: "#c2aa70", helmetDark: "#8d7444",
    rifle: "#3a3026", rifleLight: "#6d5a40",
    accent: "#e7c26a", outline: "#1a1c15"
  };
  const SOVIET_COLORS = {
    ...PLAYER_COLORS,
    body: "#7c6c4d", bodyLight: "#93815d", bodyDark: "#584b35",
    pants: "#62553d", pantsDark: "#4a3f2d", helmet: "#9b9464", helmetDark: "#6f6a45"
  };
  const ENEMY_COLORS = {
    skin: "#cfa883", skinDark: "#a98563",
    body: "#66705d", bodyLight: "#7b8670", bodyDark: "#464e3f",
    pants: "#505a47", pantsDark: "#3b4435",
    boots: "#26251f", helmet: "#7f8872", helmetDark: "#5c6453",
    rifle: "#2e2a23", rifleLight: "#5a4d3a",
    accent: "#d36a4f", outline: "#151711"
  };
  const ITALY_COLORS = {
    ...ENEMY_COLORS,
    body: "#77775a", bodyLight: "#8c8c6c", bodyDark: "#55553f",
    pants: "#5d5d45", pantsDark: "#464632", helmet: "#a6a17a", helmetDark: "#777454"
  };

  // Todas as armas alcançam um vão de trincheira; a velocidade acompanha o
  // peso do equipamento: armas leves avançam rápido, morteiros e blindados são lentos.
  const UNIT_DEFS = {
    rifle: { cost: 35, hp: 74, damage: 12, range: 1, fireRate: 1.3, speed: 0.7, label: "Fuzileiro", short: "FUZ", role: "Linha de frente" },
    smg: { cost: 50, hp: 64, damage: 7, range: 1, fireRate: 0.55, speed: 0.85, label: "Assalto", short: "ASL", role: "Combate próximo" },
    mg: { cost: 80, hp: 92, damage: 10, range: 1, fireRate: 0.3, speed: 0.46, label: "Metralhadora", short: "MT", role: "Supressão" },
    sniper: { cost: 95, hp: 56, damage: 36, range: 1, fireRate: 2.4, speed: 0.52, label: "Sniper", short: "SNP", role: "Longo alcance" },
    at: { cost: 110, hp: 78, damage: 42, range: 1, fireRate: 2.6, speed: 0.42, label: "Antitanque", short: "AT", role: "Caça-blindados", armorBonus: 2.6 },
    mortar: { cost: 130, hp: 68, damage: 26, range: 1, fireRate: 3.4, speed: 0.34, label: "Morteiro", short: "MTR", role: "Ataque de área", splash: 0.55 },
    medic: { cost: 70, hp: 60, damage: 0, range: 1, fireRate: 1.1, speed: 0.8, label: "Médico", short: "MED", role: "Cura aliados", heal: 9 },
    tank: { cost: 220, hp: 330, damage: 34, range: 1, fireRate: 1.65, speed: 0.28, label: "Blindado", short: "BLD", role: "Choque", armor: 0.45, splash: 0.8 }
  };

  const FACTIONS = {
    west: {
      key: "west", label: "Aliados Ocidentais", short: "Aliados", color: "#7fb7d9",
      units: {
        rifle: "Fuzileiro (Lee-Enfield)",
        smg: "Comando (Sten)",
        mg: "Metralhador (Bren)",
        sniper: "Sniper (Enfield)",
        at: "Caçador de tanques (PIAT)",
        mortar: "Morteiro de 3 pol.",
        medic: "Médico de campanha",
        tank: "Blindado Sherman"
      }
    },
    east: {
      key: "east", label: "Exército Vermelho", short: "Soviéticos", color: "#e0a05f",
      units: {
        rifle: "Fuzileiro (Mosin-Nagant)",
        smg: "Assalto (PPSh-41)",
        mg: "Metralhador (Maxim)",
        sniper: "Sniper (Mosin)",
        at: "Antitanque (PTRD-41)",
        mortar: "Morteiro de 82 mm",
        medic: "Enfermeira de campanha",
        tank: "Blindado T-34"
      }
    },
    germany: {
      key: "germany", label: "Wehrmacht", short: "Eixo", color: "#d36a4f",
      units: {
        rifle: "Infantaria (Kar98k)",
        smg: "Assalto (MP40)",
        mg: "Metralhadora (MG42)",
        sniper: "Sniper (Kar98k)",
        at: "Panzerfaust",
        mortar: "Granatwerfer",
        medic: "Sanitäter",
        tank: "Panzer IV"
      }
    },
    italy: {
      key: "italy", label: "Regio Esercito", short: "Itália", color: "#c9b37a",
      units: {
        rifle: "Fuzileiro (Carcano M91)",
        smg: "Assalto (Beretta M38)",
        mg: "Metralhadora (Breda M37)",
        sniper: "Sniper (Carcano)",
        at: "Antitanque (Cannone 47/32)",
        mortar: "Morteiro Brixia",
        medic: "Enfermeiro de campanha",
        tank: "Blindado M13/40"
      }
    }
  };

  Object.assign(Sound, {
    order() { this.tone(320, 0.055, 0.08, "square", 420); },
    buy() { this.tone(500, 0.055, 0.06, "sine", 760); },
    capture() {
      [392, 523].forEach((f, i) => setTimeout(() => this.tone(f, 0.08, 0.22, "sine", f), i * 90));
    }
  });

  const factionForBattle = (battle) => (battle.front === "east" ? "east" : "west");
  const colorsForUnit = (u) => {
    if (u.side === "enemy") return u.faction?.key === "italy" ? ITALY_COLORS : ENEMY_COLORS;
    return u.faction?.key === "east" ? SOVIET_COLORS : PLAYER_COLORS;
  };
  const biomeForBattle = (battle) => {
    if (battle.biome) return battle.biome;
    if (battle.weather === "snow") return "snow";
    if (battle.scene === "desert") return "sand";
    if (battle.scene === "beach") return "coast";
    if (battle.scene === "urban" || battle.scene === "ruins") return "urban";
    if (battle.scene === "forest") return "forest";
    return "field";
  };
  const mod = (n, m) => ((n % m) + m) % m;
  const playerOwnedCount = () => (G ? G.trenches.filter((t) => t.owner === "player").length : 0);
  const enemyOwnedCount = () => (G ? G.trenches.filter((t) => t.owner === "enemy").length : 0);
  const unitCapReached = () => G && G.units.filter((u) => u.side === "player" && !u.dead).length >= PLAYER_UNIT_CAP;
  // Unidades em trânsito não ocupam uma trincheira até chegarem ao destino.
  const inTransit = (u) => !!u && (u.state === "moving" || u.state === "blocked");
  const sideUnitCount = (side) => (G ? G.units.filter((u) => !u.dead && u.side === side).length : 0);
  const trenchGap = () => {
    const fractions = battleFractions();
    return W * (fractions[fractions.length - 1] - fractions[0]) / (fractions.length - 1);
  };
  const fmtCoins = (n) => Math.floor(n).toLocaleString("pt-BR");

  function weightedPick(table) {
    let total = 0;
    table.forEach((row) => { total += row[1]; });
    let roll = Math.random() * total;
    for (const row of table) {
      roll -= row[1];
      if (roll <= 0) return row[0];
    }
    return table[0][0];
  }

  function rr(x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
  }

  function px(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  }

  function resizeCanvas() {
    W = window.innerWidth;
    H = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, quality().dpr);
    canvasEl.width = Math.floor(W * dpr);
    canvasEl.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function layoutBattlefield() {
    if (!G) return;
    const topRect = $(".game-top").getBoundingClientRect();
    const dockRect = $("#battle-dock").getBoundingClientRect();
    const top = (topRect.height ? topRect.bottom : H * 0.2) + 10;
    const bottom = (dockRect.height ? dockRect.top : H * 0.72) - 10;
    G.fieldTop = clamp(top, 58, H * 0.52);
    G.fieldBottom = clamp(bottom, G.fieldTop + 110, H - 26);
    const fractions = battleFractions();
    G.trenches.forEach((t, i) => { t.x = W * fractions[i]; });
    G.units.forEach((u) => {
      if (inTransit(u) || u.state === "aboard") return;
      const p = slotPosition(u.trench, u.side, u.slot);
      u.x = p.x;
      u.y = p.y;
    });
    syncBunkers();
  }

  // Área útil das tropas: deixa espaço no rodapé para os botões de ordem.
  function slotMetrics() {
    const top = G.fieldTop + 44;
    const bottom = Math.max(top + 40, G.fieldBottom - 78);
    const rows = clamp(Math.round((bottom - top) / 46) + 1, 2, SLOT_ROWS);
    return { top, bottom, rows };
  }

  function slotPosition(trenchIndex, side, slot) {
    const t = G.trenches[trenchIndex];
    if (!t) return { x: W / 2, y: H / 2 };
    const { top, bottom, rows } = slotMetrics();
    const row = slot % rows;
    const col = Math.floor(slot / rows);
    const y = lerp(top, bottom, row / (rows - 1));
    const off = 20 + col * 18;
    return { x: t.x + (side === "player" ? -off : off), y };
  }

  function countAt(trenchIndex, side, includeMoving = false) {
    if (!G) return 0;
    return G.units.filter((u) => !u.dead && u.side === side && (u.trench === trenchIndex || (includeMoving && inTransit(u) && u.targetTrench === trenchIndex))).length;
  }

  function stationedUnits(trenchIndex, side) {
    if (!G) return [];
    return G.units.filter((u) => !u.dead && u.side === side && u.trench === trenchIndex && !inTransit(u));
  }

  function nextSlot(trenchIndex, side) {
    if (!G) return 0;
    let n = 0;
    G.units.forEach((u) => {
      if (u.dead || u.side !== side) return;
      if (u.trench === trenchIndex || ((inTransit(u) || u.state === "aboard") && u.targetTrench === trenchIndex)) n++;
    });
    return n;
  }

  function compactTrench(trenchIndex, side) {
    const list = stationedUnits(trenchIndex, side);
    list.forEach((u, i) => {
      u.slot = i;
      const p = slotPosition(trenchIndex, side, i);
      u.x = p.x;
      u.y = p.y;
    });
  }

  function attackTargetFrom(index) {
    if (isDDay()) {
      const target = G.trenches.length - 1;
      if (index >= target || target === 0) return -1;
      return G.trenches[target].owner === "player" ? -1 : target;
    }
    let target = index + 1;
    while (target < G.trenches.length) {
      const t = G.trenches[target];
      if (t.owner === "player" && t.blocked === false) {
        target++;
        continue;
      }
      break;
    }
    return target < G.trenches.length ? target : -1;
  }

  function retreatTargetFrom(index) {
    if (isDDay()) return index > 0 && G.trenches[0].owner === "player" ? 0 : -1;
    let target = index - 1;
    while (target >= 0 && G.trenches[target].owner !== "player") target--;
    return target;
  }

  function highestPlayerTrench() {
    let best = -1;
    G.trenches.forEach((t) => { if (isStopTrench(t.index) && t.owner === "player") best = Math.max(best, t.index); });
    return best;
  }

  function orderSourceIndex() {
    if (!G) return null;
    if (isStopTrench(G.selected) && G.trenches[G.selected]?.owner === "player" && stationedUnits(G.selected, "player").length) return G.selected;
    const ready = G.trenches.filter((t) => isStopTrench(t.index) && t.owner === "player" && stationedUnits(t.index, "player").length);
    return ready.length ? ready[ready.length - 1].index : null;
  }

  function orderButtonRects(t) {
    const size = Math.round(clamp(W * 0.015, 17, 23));
    const gapPx = 4;
    const blockH = Math.round(clamp(size * 0.68, 12, 16));
    const y = Math.round(G.fieldBottom - size - 2);
    const left = Math.round(t.x - size - 5);
    const width = size * 2 + 10;
    return {
      retreat: { x: left, y, w: size, h: size },
      attack: { x: Math.round(t.x + 5), y, w: size, h: size },
      block: { x: left, y: y - blockH - gapPx, w: width, h: blockH }
    };
  }

  function hitRect(r, x, y) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  function arrowAt(x, y) {
    if (!G) return null;
    for (const t of G.trenches) {
      if (t.owner !== "player" || !isStopTrench(t.index)) continue;
      const r = orderButtonRects(t);
      if (!isDDay() && hitRect(r.block, x, y)) return { index: t.index, dir: 0, block: true };
      if (hitRect(r.retreat, x, y)) return { index: t.index, dir: -1 };
      if (hitRect(r.attack, x, y)) return { index: t.index, dir: 1 };
    }
    return null;
  }

  function toggleTrenchBlock(index) {
    if (!G || G.phase !== "playing") return;
    const t = G.trenches[index];
    if (!t || t.owner !== "player") return;
    t.blocked = t.blocked === false;
    Sound.ui();
    showGameToast(t.blocked
      ? `${positionLabel(index)} bloqueada: as tropas param nesta posição.`
      : `${positionLabel(index)} liberada: as tropas atravessam sem parar.`);
    updateHud(true);
  }

  function spawnUnit(side, type, trenchIndex, opts = {}) {
    if (!G) return null;
    const def = UNIT_DEFS[type];
    if (!def) return null;
    const hpScale = side === "enemy" ? G.diff.enemyHp : 1;
    const hp = Math.round(def.hp * hpScale);
    const slot = nextSlot(trenchIndex, side);
    const pos = slotPosition(trenchIndex, side, slot);
    const gap = Math.max(1, trenchGap());
    const walkIn = !!opts.walkIn;
    const spawnX = side === "player"
      ? (isDDay() ? W * DDAY_SHORE - 24 : -Math.max(28, W * 0.035))
      : W + Math.max(28, W * 0.035);
    const spawnY = clamp(pos.y + rand(-8, 8), G.fieldTop + 22, G.fieldBottom - 20);
    const startX = walkIn ? spawnX : pos.x;
    const startY = walkIn ? spawnY : pos.y;
    const travel = walkIn ? Math.hypot(pos.x - startX, pos.y - startY) : gap;
    const u = {
      id: G.nextUnitId++,
      side, type, def,
      faction: side === "player" ? G.faction : G.enemyFaction,
      hp, maxHp: hp,
      trench: walkIn ? -1 : trenchIndex,
      state: walkIn ? "moving" : "idle", slot,
      x: startX, y: startY,
      sx: startX, sy: startY, tx: pos.x, ty: pos.y,
      fromTrench: walkIn ? -1 : trenchIndex,
      targetTrench: trenchIndex, targetSlot: slot,
      progress: 0, span: Math.max(0.45, travel / gap),
      fireCd: rand(0.3, Math.max(0.5, def.fireRate || 1.2)),
      flash: 0, walk: rand(0, Math.PI * 2), facing: side === "player" ? 1 : -1,
      fromSea: isDDay() && side === "player" && walkIn,
      dead: false, born: 0, grenadeCd: GRENADE_COOLDOWN
    };
    G.units.push(u);
    if (!opts.silent && !walkIn) {
      addBurst(pos.x, pos.y, side === "player" ? "rgba(231,194,106,0.7)" : "rgba(211,106,79,0.7)", 8, 55);
    }
    return u;
  }

  function buildTrenches() {
    const mission = G.mission;
    const dday = isDDay();
    const fractions = battleFractions();
    G.trenches = fractions.map((fraction, index) => ({
      index,
      x: W * fraction,
      owner: dday
        ? (index === 0 ? "player" : index === fractions.length - 1 ? "enemy" : "neutral")
        : (index <= 1 ? "player" : index >= 4 ? "enemy" : "neutral"),
      blocked: true,
      bonusGiven: false,
      flash: 0
    }));

    const playerList = [];
    Object.entries(mission.startUnits || {}).forEach(([type, count]) => {
      for (let i = 0; i < count; i++) playerList.push(type);
    });
    if (dday) {
      queueLandingWaves(playerList);
    } else {
      playerList.forEach((type, i) => {
        const ti = i % 4 === 3 ? 0 : 1;
        spawnUnit("player", type, ti, { silent: true });
      });
    }

    const enemyList = [];
    Object.entries(mission.enemyStart || {}).forEach(([type, count]) => {
      for (let i = 0; i < count; i++) enemyList.push(type);
    });
    if (dday) {
      const enemyTrench = fractions.length - 1;
      enemyList.forEach((type) => {
        spawnUnit("enemy", type, enemyTrench, { silent: true });
      });
      setupDdayDefenses(enemyTrench);
    } else {
      enemyList.forEach((type, i) => {
        spawnUnit("enemy", type, 4 + (i % 3), { silent: true });
      });
    }
    balanceStartingForces();
  }

  // As tropas iniciais do Dia D chegam em grupos de botes. Cada bote navega
  // até a arrebentação e desembarca seus soldados, que seguem para a praia.
  function queueLandingWaves(list) {
    if (!G || !list.length) return;
    const groups = [];
    for (let i = 0; i < list.length; i += 4) groups.push(list.slice(i, i + 4));
    const { top, bottom } = slotMetrics();
    const shoreX = W * DDAY_SHORE;
    groups.forEach((group, gi) => {
      const y = lerp(top + 14, bottom - 14, groups.length === 1 ? 0.5 : gi / (groups.length - 1));
      const startX = gi === 0
        ? W * 0.035
        : -Math.max(60, W * 0.07) - (gi - 1) * W * 0.055;
      const boat = {
        x: startX,
        y,
        targetX: shoreX,
        speed: Math.max(46, W * 0.065),
        delay: gi === 0 ? 0 : 1.4 + gi * 1.6,
        units: [],
        offsets: [],
        landed: false,
        phase: gi * 1.7,
        group: gi
      };
      G.boats.push(boat);
      group.forEach((type, j) => {
        const off = { x: (j % 2) * 14 - 7, y: Math.floor(j / 2) * 9 - 5 };
        const u = spawnUnit("player", type, 0, { silent: true });
        if (!u) return;
        u.state = "aboard";
        u.trench = -1;
        u.boat = boat;
        u.fromSea = true;
        u.x = boat.x + off.x;
        u.y = boat.y + off.y;
        u.sx = u.x;
        u.sy = u.y;
        u.tx = u.x;
        u.ty = u.y;
        boat.units.push(u);
        boat.offsets.push(off);
      });
    });
  }

  // Reforços comprados no Dia D também chegam pelo mar. Soldados são
  // agrupados em botes de 4 (tipos mistos permitidos); cada bote só parte
  // quando está cheio. Blindados viajam sozinhos em botes muito mais lentos.
  function attachUnitToBoat(boat, type, trench, slotIndex) {
    const off = { x: (slotIndex % 2) * 14 - 7, y: Math.floor(slotIndex / 2) * 9 - 5 };
    const u = spawnUnit("player", type, trench, { silent: true });
    if (!u) return;
    u.state = "aboard";
    u.trench = -1;
    u.boat = boat;
    u.fromSea = true;
    u.targetTrench = trench;
    u.x = boat.x + off.x;
    u.y = boat.y + off.y;
    u.sx = u.x;
    u.sy = u.y;
    u.tx = u.x;
    u.ty = u.y;
    boat.units.push(u);
    boat.offsets.push(off);
  }

  function addToDdayGroup(type, trench) {
    if (!G.ddayGroupBoat) {
      const { top, bottom } = slotMetrics();
      const lane = (G.ddayLoadLane || 0) % 3;
      G.ddayLoadLane = lane + 1;
      const boat = {
        x: W * 0.09,
        y: lerp(top + 18, bottom - 18, (lane + 0.5) / 3),
        targetX: W * DDAY_SHORE,
        speed: Math.max(46, W * 0.065),
        delay: 0,
        units: [], offsets: [],
        landed: false, loading: true,
        phase: rand(0, Math.PI * 2),
        group: 0
      };
      G.boats.push(boat);
      G.ddayGroupBoat = boat;
    }
    const boat = G.ddayGroupBoat;
    attachUnitToBoat(boat, type, trench, boat.units.length);
    boat.loading = boat.units.length < 4;
    if (!boat.loading) {
      boat.delay = 0.45;
      G.ddayGroupBoat = null;
    }
  }

  function launchDdayTankBoat(type, trench) {
    const { top, bottom } = slotMetrics();
    const boat = {
      x: -Math.max(70, W * 0.09),
      y: lerp(top + 24, bottom - 24, Math.random()),
      targetX: W * DDAY_SHORE,
      // Botes de blindados são bem mais lentos que os de infantaria.
      speed: Math.max(16, W * 0.022),
      delay: 0.8 + Math.random() * 0.5,
      units: [], offsets: [],
      landed: false, loading: false,
      phase: rand(0, Math.PI * 2),
      group: 0, tankBoat: true
    };
    G.boats.push(boat);
    attachUnitToBoat(boat, type, trench, 0);
  }

  function updateLanding(dt) {
    if (!G || !G.boats || !G.boats.length) return;
    G.boats.forEach((b) => {
      if (b.landed || b.loading) return;
      if (b.delay > 0) {
        b.delay -= dt;
        return;
      }
      b.x = Math.min(b.targetX, b.x + b.speed * dt);
      b.bob = Math.sin(G.sceneTime * 2.4 + b.phase) * 1.4;
      b.units.forEach((u, i) => {
        if (u.dead || u.state !== "aboard") return;
        const off = b.offsets[i] || { x: 0, y: 0 };
        u.x = b.x + off.x;
        u.y = b.y + off.y + b.bob;
        u.sx = u.x;
        u.sy = u.y;
      });
      if (b.x >= b.targetX - 0.5) {
        b.landed = true;
        disembarkBoat(b);
      }
    });
  }

  function disembarkBoat(b) {
    const gap = Math.max(1, trenchGap());
    b.units.forEach((u) => {
      if (!u || u.dead || u.state !== "aboard") return;
      const pos = slotPosition(u.targetTrench, "player", u.targetSlot);
      u.state = "moving";
      u.trench = -1;
      u.fromTrench = -1;
      u.boat = null;
      u.fromSea = false;
      u.sx = u.x;
      u.sy = u.y;
      u.tx = pos.x;
      u.ty = pos.y;
      u.progress = 0;
      u.span = Math.max(0.35, Math.hypot(pos.x - u.x, pos.y - u.y) / gap);
      u.facing = 1;
    });
    addBurst(b.x, b.y, "rgba(220,230,225,0.6)", 10, 50);
  }

  // Posiciona as quatro metralhadoras inimigas nos bunkers da linha final.
  function setupDdayDefenses(enemyTrench) {
    const all = stationedUnits(enemyTrench, "enemy");
    const { rows } = slotMetrics();
    const bunkerRows = [...new Set(Array.from({ length: 4 }, (_, i) => Math.round((i * (rows - 1)) / 3)))];
    const gunners = all.filter((u) => u.type === "mg").slice(0, bunkerRows.length);
    const others = all.filter((u) => !gunners.includes(u));
    const used = new Set(bunkerRows);
    let next = 0;
    const place = (u, slot) => {
      u.slot = slot;
      const p = slotPosition(enemyTrench, "enemy", slot);
      u.x = p.x;
      u.y = p.y;
    };
    gunners.forEach((u, i) => {
      place(u, bunkerRows[i]);
      u.inBunker = true;
      u.maxHp = Math.round(u.maxHp * 1.25);
      u.hp = u.maxHp;
    });
    others.forEach((u) => {
      while (used.has(next)) next++;
      place(u, next);
      used.add(next);
      next++;
    });
    G.bunkers = gunners.map((mg, i) => ({ mg, x: mg.x, y: mg.y, seed: i }));
    syncBunkers();
  }

  function syncBunkers() {
    if (!G || !G.bunkers) return;
    G.bunkers.forEach((b) => {
      if (!b.mg) return;
      b.x = b.mg.x;
      b.y = b.mg.y;
    });
  }

  function bunkersAlive() {
    return G && G.bunkers ? G.bunkers.filter((b) => b.mg && !b.mg.dead).length : 0;
  }

  // Garante que os dois lados comecem com um número comparável de tropas.
  // O inimigo recebe reforços históricos até igualar a força inicial aliada.
  function balanceStartingForces() {
    if (!G || isDDay()) return;
    const playerCount = sideUnitCount("player");
    let enemyCount = sideUnitCount("enemy");
    if (!playerCount || enemyCount >= playerCount) return;
    const cfg = G.mission.enemySpawn || { table: [["rifle", 5], ["smg", 3], ["mg", 1]] };
    const table = cfg.table && cfg.table.length ? cfg.table : [["rifle", 5], ["smg", 3], ["mg", 1]];
    while (enemyCount < playerCount && enemyCount < ENEMY_UNIT_CAP) {
      const type = weightedPick(table);
      spawnUnit("enemy", type, 4 + (enemyCount % 3), { silent: true });
      enemyCount++;
    }
  }

  function buildScenery() {
    if (!G) return;
    const b = G.battle;
    const biome = biomeForBattle(b);
    const rng = mulberry32(hashString(`${b.id}|rts|${biome}|${Math.round(W)}x${Math.round(H)}`));
    const S = {
      biome, far: [], craters: [], tufts: [], debris: [], flakes: [],
      rocks: [], patches: [], ripples: [], groundPixels: [], clouds: [],
      smoke: [], sandbags: [], wire: [], scorch: [], fires: [],
      hedgehogs: [], wrecks: []
    };
    const fieldH = Math.max(60, G.fieldBottom - G.fieldTop);
    const fieldY = () => G.fieldTop + 8 + rng() * Math.max(28, fieldH - 14);
    const q = quality();
    const n = (count) => Math.max(1, Math.round(count * q.scenery));

    // Silhuetas distantes: ruínas, árvores, dunas ou pinheiros conforme o bioma.
    for (let i = 0; i < n(22); i++) {
      let type;
      if (biome === "urban") type = rng() > 0.28 ? "ruin" : "tree";
      else if (biome === "forest") type = rng() > 0.18 ? "tree" : "ruin";
      else if (biome === "sand" || biome === "coast") type = rng() > 0.52 ? "dune" : "rock";
      else if (biome === "snow") type = rng() > 0.35 ? "pine" : "rock";
      else type = rng() > 0.55 ? "tree" : "hedge";
      S.far.push({
        x: rng() * W,
        y: G.fieldTop + 4 - rng() * 28,
        w: 24 + rng() * 100,
        h: 8 + rng() * 36,
        type
      });
    }

    // Textura de chão em blocos de 2–4 px, no espírito pixel art.
    const groundCount = Math.max(80, Math.round(clamp(W * 0.5, 260, 760) * q.scenery));
    for (let i = 0; i < groundCount; i++) {
      S.groundPixels.push({
        x: rng() * W,
        y: G.fieldTop + rng() * fieldH,
        s: rng() > 0.92 ? 4 : rng() > 0.8 ? 3 : 2,
        a: 0.04 + rng() * 0.1,
        tone: rng()
      });
    }

    // Crateras e marcas de queimado.
    const craterCount = Math.max(4, Math.round((biome === "snow" ? 14 : 20) * q.scenery));
    for (let i = 0; i < craterCount; i++) {
      S.craters.push({
        x: W * (0.03 + rng() * 0.94),
        y: G.fieldTop + 20 + rng() * Math.max(40, fieldH - 30),
        rx: 8 + rng() * 24,
        ry: 3 + rng() * 7,
        a: 0.14 + rng() * 0.18,
        rim: rng() > 0.45
      });
    }
    for (let i = 0; i < n(7); i++) {
      S.scorch.push({
        x: W * (0.03 + rng() * 0.94),
        y: G.fieldTop + 18 + rng() * Math.max(40, fieldH - 26),
        r: 8 + rng() * 24,
        a: 0.1 + rng() * 0.16
      });
    }

    // Pedras.
    const rockCount = biome === "sand" ? 12 : biome === "snow" ? 22 : biome === "urban" ? 26 : 18;
    for (let i = 0; i < Math.max(3, Math.round(rockCount * q.scenery)); i++) {
      S.rocks.push({
        x: rng() * W,
        y: fieldY(),
        w: 3 + rng() * 9,
        h: 2 + rng() * 5,
        tone: rng()
      });
    }

    // Vegetação rasteira, tufos secos ou neve acumulada.
    const tuftCount = biome === "field" || biome === "forest" ? 90 : biome === "sand" || biome === "coast" ? 30 : 18;
    for (let i = 0; i < Math.max(3, Math.round(tuftCount * q.scenery)); i++) {
      S.tufts.push({
        x: rng() * W,
        y: fieldY(),
        h: 3 + rng() * 8,
        lean: rng() * 6 - 3,
        tone: rng()
      });
    }
    if (biome === "sand" || biome === "coast") {
      for (let i = 0; i < n(34); i++) S.ripples.push({ x: rng() * W, y: fieldY(), w: 10 + rng() * 34, a: 0.08 + rng() * 0.12 });
      for (let i = 0; i < n(9); i++) S.patches.push({ x: rng() * W, y: fieldY(), w: 12 + rng() * 34, h: 2 + rng() * 4, a: 0.08 + rng() * 0.1, kind: "wet" });
    } else if (biome === "snow") {
      for (let i = 0; i < n(30); i++) S.patches.push({ x: rng() * W, y: fieldY(), w: 10 + rng() * 32, h: 2 + rng() * 4, a: 0.4 + rng() * 0.3, kind: "snow" });
    } else {
      for (let i = 0; i < n(18); i++) S.patches.push({ x: rng() * W, y: fieldY(), w: 8 + rng() * 26, h: 2 + rng() * 4, a: 0.08 + rng() * 0.12, kind: "mud" });
    }

    // Sacos de areia e arame farpado espalhados pelo campo.
    const bagCount = biome === "urban" ? 13 : 9;
    for (let i = 0; i < Math.max(2, Math.round(bagCount * q.scenery)); i++) {
      S.sandbags.push({
        x: W * (0.04 + rng() * 0.92),
        y: fieldY(),
        n: 2 + Math.floor(rng() * 4),
        dir: rng() > 0.5 ? 1 : -1,
        tone: rng()
      });
    }
    for (let i = 0; i < n(7); i++) {
      S.wire.push({ x: W * (0.03 + rng() * 0.94), y: fieldY(), w: 18 + rng() * 44 });
    }

    // Praia do Dia D: ouriços antitanque, destroços de botes e arame farpado
    // concentrado diante da linha final.
    if (isDDay()) {
      const shore = W * DDAY_SHORE;
      const beachWidth = Math.max(80, W * 0.62);
      for (let i = 0; i < n(14); i++) {
        S.hedgehogs.push({
          x: shore + 14 + rng() * beachWidth,
          y: fieldY(),
          s: 4 + rng() * 5,
          tilt: rng() * 0.5 - 0.25
        });
      }
      for (let i = 0; i < n(3); i++) {
        S.wrecks.push({
          x: shore + 8 + rng() * W * 0.05,
          y: fieldY(),
          s: 14 + rng() * 12,
          flip: rng() > 0.5
        });
      }
      for (let i = 0; i < n(8); i++) {
        S.wire.push({ x: W * (0.80 + rng() * 0.08), y: fieldY(), w: 20 + rng() * 36 });
      }
    }

    for (let i = 0; i < n(40); i++) {
      S.debris.push({
        x: rng() * W,
        y: fieldY(),
        w: 1 + rng() * 6,
        h: 1 + rng() * 3,
        a: 0.12 + rng() * 0.24,
        tone: rng()
      });
    }

    // Fumaça, brasas e fogo para cenários urbanos ou de cinzas.
    if (biome === "urban" || b.weather === "ash") {
      for (let i = 0; i < n(4); i++) {
        S.fires.push({
          x: rng() * W,
          y: G.fieldTop + 24 + rng() * Math.max(24, fieldH * 0.45),
          h: 8 + rng() * 18,
          phase: rng() * Math.PI * 2
        });
      }
      for (let i = 0; i < n(5); i++) {
        S.smoke.push({
          x: rng() * W,
          y: G.fieldTop + 4,
          drift: -8 + rng() * 16,
          phase: rng() * Math.PI * 2,
          w: 7 + rng() * 14,
          h: 10 + rng() * 22,
          speed: 0.35 + rng() * 0.7
        });
      }
    }

    for (let i = 0; i < n(7); i++) {
      S.clouds.push({
        x: rng() * W,
        y: 10 + rng() * Math.max(16, G.fieldTop * 0.52),
        w: 30 + rng() * 72,
        h: 4 + rng() * 8,
        sp: 1.2 + rng() * 3
      });
    }

    const weather = b.weather;
    const count = weather === "rain" ? 160 : weather === "snow" ? 140 : weather === "ash" ? 100 : weather === "overcast" ? 90 : 0;
    const flakeCount = Math.max(0, Math.round(count * q.weather));
    for (let i = 0; i < flakeCount; i++) {
      S.flakes.push({
        x: rng() * W,
        y: rng() * H,
        sp: 0.55 + rng() * 1.1,
        drift: rng() * 2 - 1,
        size: weather === "rain" ? 0.6 + rng() * 1.1 : weather === "snow" ? 1 + rng() * 2.2 : weather === "overcast" ? 0.5 + rng() * 0.8 : 0.8 + rng() * 1.8
      });
    }
    G.scenery = S;
  }

  function startBattle(battle) {
    if (!battle) return;
    closeModal(true);
    cleanupGame();
    Sound.init();

    $("#game-screen").hidden = false;
    document.body.classList.add("is-playing");
    resizeCanvas();

    const diff = DIFFICULTIES[save.difficulty] || DIFFICULTIES.soldado;
    const mission = battle.mission || {};
    const factionKey = factionForBattle(battle);
    G = {
      battle, mission, diff, factionKey,
      faction: FACTIONS[factionKey],
      enemyFaction: FACTIONS[battle.enemyFaction || "germany"] || FACTIONS.germany,
      phase: "intro", raf: 0, lastTs: 0, sceneTime: 0,
      coins: Math.round((mission.startCoins || 280) * (diff.coin || 1)),
      incomeTimer: INCOME_TICK_SECONDS,
      score: 0, kills: 0, losses: 0, captures: 0,
      selected: null, hoverTrench: null,
      trenches: [], units: [], nextUnitId: 1,
      particles: [], tracers: [], floaters: [], rings: [], grenades: [],
      scenery: null,
      bunkers: [], boats: [], bunkerHintShown: false,
      ddayGroupBoat: null, ddayLoadLane: 0,
      enemyBuyQueue: [],
      enemyReplaceTimer: 0,
      enemyReplacePending: 0,
      enemyAttackTimer: Math.max(7, (mission.enemyAggression || 18) * 0.7),
      ddayAssaultTimer: 10,
      hudAcc: 0, lastHud: 0, sfxCd: 0,
      hintShown: false, hintTimer: null, toastTimer: null, bannerTimer: null, endTimer: null,
      shake: 0, flash: 0, won: false, endReason: "",
      fieldTop: 0, fieldBottom: 0,
      shopOrder: ["rifle", "smg", "mg", "sniper", "at", "mortar", "medic", "tank"],
      trenchSig: ""
    };

    setupShop();
    layoutBattlefield();
    buildTrenches();
    buildScenery();

    $("#game-battle-name").textContent = battle.name;
    $("#game-battle-date").textContent = battle.dateLabel;
    const frontTag = $("#game-front-tag");
    frontTag.textContent = battle.frontLabel;
    frontTag.dataset.front = battle.front;
    $("#game-toast").hidden = true;
    $("#wave-banner").hidden = true;
    $("#game-overlay").classList.remove("is-hidden");

    updateHud(true);
    showIntroOverlay();
    G.lastTs = 0;
    G.raf = requestAnimationFrame(gameLoop);
    requestAnimationFrame(() => { if (G) relayoutField(true); });
  }

  function cleanupGame() {
    if (G) {
      cancelAnimationFrame(G.raf);
      clearTimeout(G.hintTimer);
      clearTimeout(G.toastTimer);
      clearTimeout(G.bannerTimer);
      clearTimeout(G.endTimer);
    }
    G = null;
    const screen = $("#game-screen");
    if (screen) screen.hidden = true;
    document.body.classList.remove("is-playing");
    const overlay = $("#game-overlay");
    if (overlay) {
      overlay.classList.add("is-hidden");
      overlay.innerHTML = "";
    }
    const toast = $("#game-toast");
    if (toast) toast.hidden = true;
    const banner = $("#wave-banner");
    if (banner) banner.hidden = true;
    const shop = $("#unit-shop");
    if (shop) shop.innerHTML = "";
  }

  function exitGame() {
    cleanupGame();
    showView("campaign");
    renderAll();
  }

  function exitToBriefing() {
    if (!G) return;
    const battle = G.battle;
    cleanupGame();
    showView("campaign");
    renderAll();
    openBriefing(battle);
  }

  function showIntroOverlay() {
    if (!G) return;
    G.phase = "intro";
    const b = G.battle;
    const m = G.mission;
    const dday = isDDay();
    const overlay = $("#game-overlay");
    const modeText = dday
      ? "Desembarque: destrua os quatro bunkers e tome a trincheira inimiga para firmar a cabeça de praia."
      : "Avance: use as setas ▶ para tomar as trincheiras uma a uma até a última linha inimiga.";
    const commandText = dday
      ? "Compre tropas para desembarcar na praia, use ▶ para avançar até os bunkers e a trincheira inimiga, e ◀ para recuar."
      : "Compre tropas e use ▶ para avançar linha a linha, ◀ para recuar e BLOQ/PASSAR para definir onde as tropas param.";
    const callout = dday
      ? `<div class="overlay-callout">
          ${icon("ship")}
          <div>
            <strong>Missão especial: o jogo muda aqui</strong>
            <span>Esta batalha não é uma guerra de trincheiras. Você começa no mar, desembarca em botes e avança sob fogo. Destrua os quatro bunkers e tome a trincheira inimiga para vencer. As metralhadoras dos bunkers não avançam sobre a praia e alcançam apenas a segunda posição.</span>
          </div>
        </div>`
      : "";
    overlay.innerHTML = `
      <div class="overlay-inner">
        <div class="overlay-head">
          <span class="overlay-tag">${icon(dday ? "ship" : "trench")} Missão ${String(b.index + 1).padStart(2, "0")} · ${esc(b.frontLabel)}</span>
          <h2>${esc(b.name)}</h2>
          <p>${esc(b.dateLabel)} · ${esc(b.place)}</p>
        </div>
        <div class="overlay-body">
          <p>${esc(b.subtitle)}. ${esc(modeText)}</p>
          ${callout}
          <div class="overlay-objective">
            ${icon("target")}
            <div><strong>Objetivo da missão</strong><span>${esc(b.objective)}</span></div>
          </div>
          <div class="overlay-objective">
            ${icon("users")}
            <div><strong>Seu comando: ${esc(G.faction.label)}</strong><span>${esc(commandText)}</span></div>
          </div>
          <p style="font-size:10px;color:var(--gold-bright);margin-bottom:10px">${icon("star")} Dica: ${esc(m.hint || "Reforce a linha de frente antes de avançar.")}</p>
          <div class="overlay-controls">
            <span><span class="kbd">▶</span> Avançar</span>
            <span><span class="kbd">◀</span> Recuar</span>
            ${dday ? "" : '<span><span class="kbd">BLOQ</span> Barrar passagem</span>'}
            <span><span class="kbd">1-8</span> Comprar</span>
            <span><span class="kbd">Esc</span> Pausa</span>
          </div>
          <div class="overlay-actions">
            <button class="btn btn-primary" data-overlay-action="start" type="button">${icon("play")} Iniciar batalha</button>
            <button class="btn btn-ghost" data-overlay-action="briefing" type="button">${icon("book")} Voltar ao briefing</button>
          </div>
        </div>
        <div class="overlay-footer">
          <span class="overlay-note">${dday ? "Ofensiva anfíbia" : "Ofensiva"}</span>
          <span class="overlay-note">${esc(G.diff.label)} · ${esc(G.faction.short)}</span>
        </div>
      </div>`;
    overlay.classList.remove("is-hidden");
  }

  function beginCombat() {
    if (!G) return;
    $("#game-overlay").classList.add("is-hidden");
    G.phase = "playing";
    G.lastTs = 0;
    Sound.init();
    showBanner(
      isDDay() ? "DESEMBARQUE INICIADO" : "BATALHA INICIADA",
      isDDay() ? "Avance da praia e tome a trincheira inimiga" : "Avance e rompa a linha inimiga"
    );
    clearTimeout(G.hintTimer);
    G.hintTimer = setTimeout(() => {
      if (G && G.phase === "playing" && !G.hintShown) {
        G.hintShown = true;
        showGameToast(G.mission.hint || "Selecione uma trincheira aliada e compre tropas.");
      }
    }, 8000);
  }

  function pauseGame() {
    if (!G || G.phase !== "playing") return;
    G.phase = "paused";
    const overlay = $("#game-overlay");
    overlay.innerHTML = `
      <div class="overlay-inner">
        <div class="overlay-head">
          <span class="overlay-tag">${icon("pause")} Batalha pausada</span>
          <h2>Pausa</h2>
          <p>${esc(G.battle.name)} · ${esc(G.battle.dateLabel)}</p>
        </div>
        <div class="overlay-body">
          <div class="overlay-objective">
            ${icon("target")}
            <div><strong>Objetivo</strong><span>${esc(G.battle.objective)}</span></div>
          </div>
          <div class="result-stats" style="margin-bottom:16px">
            <div class="result-stat"><span>Inimigos eliminados</span><strong>${G.kills}</strong></div>
            <div class="result-stat"><span>Baixas aliadas</span><strong>${G.losses}</strong></div>
            <div class="result-stat"><span>${isDDay() ? "Posições aliadas" : "Linhas aliadas"}</span><strong>${playerOwnedCount()}<small>/${G.trenches.length}</small></strong></div>
            <div class="result-stat"><span>Moedas</span><strong>${fmtCoins(G.coins)}</strong></div>
          </div>
          <div class="pause-graphics">
            <span class="modal-diff-label">Gráficos</span>
            ${Object.entries(GRAPHICS).map(([key, q]) => `<button class="diff-chip graphics-chip ${save.graphics === key ? "active" : ""}" data-graphics="${key}" type="button">${q.label}</button>`).join("")}
          </div>
          <div class="overlay-actions">
            <button class="btn btn-primary" data-overlay-action="resume" type="button">${icon("play")} Continuar</button>
            <button class="btn btn-ghost" data-overlay-action="restart" type="button">${icon("refresh")} Reiniciar</button>
            <button class="btn btn-danger" data-overlay-action="abandon" type="button">${icon("close")} Abandonar missão</button>
          </div>
        </div>
        <div class="overlay-footer">
          <span class="overlay-note">Dificuldade: ${esc(G.diff.label)}</span>
          <span class="overlay-note">${isDDay() ? "Posições" : "Linhas"}: ${playerOwnedCount()}/${G.trenches.length}</span>
        </div>
      </div>`;
    overlay.classList.remove("is-hidden");
    updateHud(true);
  }

  function resumeGame() {
    if (!G || G.phase !== "paused") return;
    $("#game-overlay").classList.add("is-hidden");
    G.phase = "playing";
    G.lastTs = 0;
  }

  function showGameToast(text) {
    if (!G) return;
    const el = $("#game-toast");
    el.textContent = text;
    el.hidden = false;
    clearTimeout(G.toastTimer);
    G.toastTimer = setTimeout(() => { el.hidden = true; }, 3800);
  }

  function showBanner(title, sub) {
    if (!G) return;
    const el = $("#wave-banner");
    el.innerHTML = `<strong>${esc(title)}</strong><span>${esc(sub)}</span>`;
    el.hidden = false;
    el.classList.remove("is-showing");
    void el.offsetWidth;
    el.classList.add("is-showing");
    clearTimeout(G.bannerTimer);
    G.bannerTimer = setTimeout(() => {
      el.hidden = true;
      el.classList.remove("is-showing");
    }, 2400);
  }

  /* ------------------------------------------------------------
     Loja, seleção e ordens
     ------------------------------------------------------------ */
  function setupShop() {
    if (!G) return;
    const shop = $("#unit-shop");
    shop.innerHTML = G.shopOrder.map((type, i) => {
      const def = UNIT_DEFS[type];
      const fullName = G.faction.units[type] || def.label;
      return `<button class="shop-btn" data-buy="${type}" type="button" title="${esc(fullName)} — ${esc(def.role)} · tecla ${i + 1}">
        <span class="shop-name">${esc(def.label)}</span>
        <span class="shop-cost">${icon("coin")}${def.cost}</span>
      </button>`;
    }).join("");
  }

  function selectTrench(index, silent = false) {
    if (!G || index == null || !G.trenches[index]) return;
    if (!isStopTrench(index)) {
      if (!silent) showGameToast("As tropas só podem parar na primeira e na última posição.");
      return;
    }
    if (G.trenches[index].owner !== "player") {
      if (!silent) showGameToast("Só é possível dar ordens a uma posição aliada.");
      return;
    }
    G.selected = index;
    if (!silent) Sound.ui();
    updateHud(true);
  }

  function buyUnit(type) {
    if (!G || G.phase !== "playing") return;
    const def = UNIT_DEFS[type];
    if (!def) return;
    if (unitCapReached()) {
      showGameToast(`Limite de ${PLAYER_UNIT_CAP} tropas atingido.`);
      return;
    }
    if (G.coins < def.cost) {
      showGameToast(`Moedas insuficientes: ${def.cost} necessárias.`);
      return;
    }
    const selectedTrench = G.trenches[G.selected];
    let trench = selectedTrench && isStopTrench(G.selected) && selectedTrench.owner === "player" ? G.selected : highestPlayerTrench();
    if (trench < 0) {
      showGameToast("Você não controla nenhuma posição.");
      return;
    }
    G.coins -= def.cost;
    if (G.selected == null) G.selected = trench;
    if (isDDay()) {
      // No Dia D os reforços chegam de barco: infantaria em grupos de 4 e
      // blindados sozinhos em botes lentos.
      if (type === "tank") launchDdayTankBoat(type, trench);
      else addToDdayGroup(type, trench);
    } else {
      spawnUnit("player", type, trench, { walkIn: true });
    }
    queueEnemyMirror(type);
    floatText(G.trenches[trench].x, G.fieldTop + 22, `-${def.cost}`, "#f0cd82");
    Sound.buy();
    updateHud(true);
  }

  function moveUnits(units, target, side) {
    if (!G || !units.length || target < 0) return false;
    const from = units[0].trench;
    const gap = Math.max(1, trenchGap());
    units.forEach((u) => {
      const slot = nextSlot(target, side);
      const pos = slotPosition(target, side, slot);
      u.state = "moving";
      u.fromTrench = from;
      u.targetTrench = target;
      u.targetSlot = slot;
      u.sx = u.x;
      u.sy = u.y;
      u.tx = pos.x;
      u.ty = pos.y;
      u.progress = 0;
      u.span = Math.max(0.45, Math.hypot(pos.x - u.x, pos.y - u.y) / gap);
      u.facing = target > from ? 1 : -1;
    });
    compactTrench(from, side);
    if (side === "player") Sound.order();
    return true;
  }

  function orderAttack(from = orderSourceIndex()) {
    if (!G || G.phase !== "playing") return;
    if (from == null || !G.trenches[from] || G.trenches[from].owner !== "player") {
      showGameToast("Nenhuma trincheira com tropas para atacar.");
      return;
    }
    const units = stationedUnits(from, "player");
    if (!units.length) {
      showGameToast("Não há tropas nesta posição. Compre reforços na loja.");
      return;
    }
    const target = attackTargetFrom(from);
    if (target < 0) {
      showGameToast(isDDay() ? "Você já está na trincheira final. Não há para onde avançar." : "Você já está na última linha. Não há para onde avançar.");
      return;
    }
    G.selected = from;
    moveUnits(units, target, "player");
    updateHud(true);
  }

  function orderRetreat(from = orderSourceIndex()) {
    if (!G || G.phase !== "playing") return;
    if (from == null || !G.trenches[from] || G.trenches[from].owner !== "player") {
      showGameToast("Nenhuma trincheira com tropas para recuar.");
      return;
    }
    const units = stationedUnits(from, "player");
    if (!units.length) {
      showGameToast("Não há tropas nesta posição para recuar.");
      return;
    }
    const target = retreatTargetFrom(from);
    if (target < 0) {
      showGameToast("Não há uma posição aliada atrás desta.");
      return;
    }
    G.selected = from;
    moveUnits(units, target, "player");
    updateHud(true);
  }

  /* ------------------------------------------------------------
     Simulação
     ------------------------------------------------------------ */
  function updateBattle(dt) {
    if (!G || G.phase !== "playing") return;
    // Renda discreta: +100 moedas a cada 5 segundos.
    G.incomeTimer -= dt;
    while (G.incomeTimer <= 0) {
      G.incomeTimer += INCOME_TICK_SECONDS;
      G.coins += INCOME_TICK_COINS;
    }
    G.sfxCd = Math.max(0, G.sfxCd - dt);
    G.shake = Math.max(0, G.shake - dt * 9);
    G.flash = Math.max(0, G.flash - dt * 2.2);
    G.trenches.forEach((t) => { t.flash = Math.max(0, t.flash - dt * 2); });

    updateLanding(dt);
    updateEnemySpawner(dt);
    updateEnemyAI(dt);
    updateUnits(dt);
    resolveTrenchControl();
    checkBattleEnd();
  }

  // O inimigo compra uma tropa sempre que o jogador compra. A compra entra
  // numa fila curta para não parecer um reflexo instantâneo. Se o jogador
  // comprar um blindado, o inimigo também compra um blindado.
  function queueEnemyMirror(type) {
    if (!G || isDDay()) return;
    G.enemyBuyQueue.push({ delay: rand(0.55, 1.25), type });
  }

  function updateEnemySpawner(dt) {
    if (!G) return;

    for (let i = G.enemyBuyQueue.length - 1; i >= 0; i--) {
      const item = G.enemyBuyQueue[i];
      item.delay -= dt;
      if (item.delay <= 0) {
        G.enemyBuyQueue.splice(i, 1);
        enemySpawnReinforcement(item.type);
      }
    }

    // Reposições chegam uma a uma, a cada 5 segundos.
    if (G.enemyReplacePending > 0) {
      if (G.enemyReplaceTimer <= 0) G.enemyReplaceTimer = ENEMY_REPLACE_COOLDOWN;
      G.enemyReplaceTimer -= dt;
      if (G.enemyReplaceTimer <= 0) {
        if (enemySpawnReinforcement()) G.enemyReplacePending = Math.max(0, G.enemyReplacePending - 1);
        G.enemyReplaceTimer = G.enemyReplacePending > 0 ? ENEMY_REPLACE_COOLDOWN : 0;
      }
    } else {
      G.enemyReplaceTimer = 0;
    }
  }

  function enemySpawnReinforcement(forcedType) {
    if (!G || G.phase !== "playing") return false;
    if (isDDay()) return false;
    const alive = sideUnitCount("enemy");
    if (alive >= ENEMY_UNIT_CAP) return false;
    // Paridade numérica: o inimigo não acumula vantagem enquanto o jogador
    // não compra ou repõe as próprias tropas.
    if (alive > sideUnitCount("player") + 1) return false;
    const enemyTrenches = G.trenches.filter((t) => t.owner === "enemy").sort((a, b) => a.index - b.index);
    if (!enemyTrenches.length) return false;
    let type = chooseEnemyCounter();
    // Espelhamento de blindados: se o jogador comprou um tanque, o inimigo
    // responde com um tanque (respeitando o limite de 3 e a exceção do Dia D).
    if (forcedType === "tank" && !isDDay()) {
      const tanksAlive = G.units.filter((u) => u.side === "enemy" && u.type === "tank" && !u.dead).length;
      if (tanksAlive < 3) type = "tank";
    }
    spawnUnit("enemy", type, enemyTrenches[0].index, { walkIn: true });
    return true;
  }

  // Matriz de eficácia: cada linha é a tropa comprada pelo inimigo e cada
  // coluna é o tipo de tropa do jogador. Valores acima de 1 significam
  // vantagem; abaixo de 1, desvantagem.
  const COUNTER_MATRIX = {
    sniper: { rifle: 0.9, smg: 1.1, mg: 2.2, sniper: 1.4, at: 1.0, mortar: 1.6, medic: 2.0, tank: 0.2 },
    mg:     { rifle: 1.5, smg: 1.7, mg: 0.7, sniper: 0.6, at: 1.1, mortar: 0.9, medic: 1.2, tank: 0.2 },
    mortar: { rifle: 1.6, smg: 1.4, mg: 1.2, sniper: 1.5, at: 1.0, mortar: 1.0, medic: 1.4, tank: 0.4 },
    tank:   { rifle: 1.7, smg: 1.5, mg: 1.1, sniper: 1.6, at: 0.15, mortar: 1.4, medic: 1.5, tank: 0.7 },
    at:     { rifle: 1.1, smg: 1.0, mg: 1.0, sniper: 0.9, at: 0.7, mortar: 1.0, medic: 1.0, tank: 3.4 },
    smg:    { rifle: 1.1, smg: 1.0, mg: 0.6, sniper: 1.7, at: 1.5, mortar: 1.6, medic: 1.0, tank: 0.2 },
    rifle:  { rifle: 1.0, smg: 1.1, mg: 0.7, sniper: 1.0, at: 1.3, mortar: 0.8, medic: 1.0, tank: 0.2 }
  };
  const COUNTER_TYPES = ["rifle", "smg", "mg", "sniper", "at", "mortar", "tank"];

  function chooseEnemyCounter() {
    const cfg = G.mission.enemySpawn || { table: [["rifle", 5], ["smg", 3], ["mg", 1]] };
    const table = cfg.table && cfg.table.length ? cfg.table : [["rifle", 5], ["smg", 3], ["mg", 1]];
    // No Dia D o inimigo é uma força defensiva: metralhadoras, snipers e
    // morteiros, sem compras reativas de blindados ou assalto.
    if (isDDay()) return weightedPick(table);
    const comp = { rifle: 0, smg: 0, mg: 0, sniper: 0, at: 0, mortar: 0, medic: 0, tank: 0 };
    let total = 0;
    G.units.forEach((u) => {
      if (u.dead || u.side !== "player") return;
      comp[u.type] = (comp[u.type] || 0) + 1;
      total++;
    });
    if (!total) return weightedPick(table);

    const tanksAlive = G.units.filter((u) => u.side === "enemy" && u.type === "tank" && !u.dead).length;
    const tankAllowed = G.mission.enemyTankChance > 0 && tanksAlive < 3;
    // Exércitos grandes favorecem armas de área: morteiros cedo, blindados
    // quando a massa cresce o bastante para compensar o custo.
    const mass = Math.max(0, total - 7);

    let bestType = null;
    let bestScore = -Infinity;
    COUNTER_TYPES.forEach((type) => {
      if (type === "tank" && !tankAllowed) return;
      const row = COUNTER_MATRIX[type];
      if (!row) return;
      let score = 0;
      Object.keys(comp).forEach((p) => { score += comp[p] * (row[p] || 0); });
      // Normaliza pelo custo para uma compra barata não virar um blindado.
      score /= Math.sqrt(UNIT_DEFS[type].cost / 70);
      // A massa entra depois da normalização: exércitos grandes passam a
      // favorecer morteiros e, principalmente, blindados.
      if (mass > 0) {
        if (type === "tank") score += mass * 2;
        else if (type === "mortar") score += mass * 0.8;
      }
      if (score > bestScore) { bestScore = score; bestType = type; }
    });
    return bestType || weightedPick(table);
  }

  function updateEnemyAI(dt) {
    if (!G) return;
    // No Dia D os bunkers ficam na defesa, mas contra-ataques de assalto saem
    // da trincheira final a cada 10 segundos.
    if (isDDay()) {
      G.ddayAssaultTimer -= dt;
      while (G.ddayAssaultTimer <= 0) {
        G.ddayAssaultTimer += 10;
        ddaySendAssaultWave();
      }
      return;
    }
    G.enemyAttackTimer -= dt;
    if (G.enemyAttackTimer > 0) return;
    const base = G.mission.enemyAggression || 18;
    // O inimigo pressiona mais conforme o jogador avança pelas linhas.
    const progress = clamp((playerOwnedCount() - 2) / Math.max(1, G.trenches.length - 3), 0, 1);
    const urgency = 1 - progress * 0.52;
    G.enemyAttackTimer = Math.max(3.4, base * (G.diff.spawn || 1) * urgency * rand(0.74, 1.02));
    enemyOrderAttack();
    if (progress > 0.3 && Math.random() < 0.2 + progress * 0.28) enemyOrderAttack(true);
  }

  function ddaySendAssaultWave() {
    const source = G.trenches[G.trenches.length - 1];
    const target = 0;
    if (!source || source.owner !== "enemy" || !G.trenches[target] || G.trenches[target].owner !== "player") return;
    const spawned = [];
    for (let i = 0; i < 2 && sideUnitCount("enemy") < ENEMY_UNIT_CAP; i++) {
      const u = spawnUnit("enemy", "smg", source.index, { silent: true });
      if (u) spawned.push(u);
    }
    if (!spawned.length) return;
    moveUnits(spawned, target, "enemy");
    showGameToast("Contra-ataque alemão: dois soldados de assalto avançam da trincheira.");
  }

  function enemyOrderAttack(secondary = false) {
    if (!G) return;
    const candidates = G.trenches
      .filter((t) => t.owner === "enemy")
      .sort((a, b) => b.index - a.index)
      .map((t) => ({ t, units: stationedUnits(t.index, "enemy") }))
      .filter((c) => c.units.length);
    if (!candidates.length) return;
    const chosen = secondary
      ? (candidates.find((c) => c.units.length >= 2 && c.t.index < G.trenches.length - 1) || candidates[0])
      : candidates[0];
    const source = chosen.t;
    let target = source.index - 1;
    while (target >= 0 && G.trenches[target].owner === "enemy") target--;
    if (target < 0) return;
    moveUnits(chosen.units.slice(0, Math.max(1, chosen.units.length - 1)), target, "enemy");
  }

  function updateUnits(dt) {
    if (!G) return;
    const gap = trenchGap();
    const units = G.units.slice();

    for (const u of units) {
      if (u.dead || u.state === "aboard") continue;
      u.flash = Math.max(0, u.flash - dt * 6);
      u.walk += dt * (u.state === "moving" ? 9 : 1.4);
      u.fireCd -= dt;
      u.grenadeCd = Math.max(0, (u.grenadeCd == null ? GRENADE_COOLDOWN : u.grenadeCd) - dt);

      // Se o caminho ficou livre, a tropa retoma a marcha.
      if (u.state === "blocked" && !standoffBlocked(u, gap)) u.state = "moving";

      if (u.state === "moving") {
        if (standoffBlocked(u, gap)) {
          // Para a alguns metros do inimigo e abre fogo em vez de atravessá-lo.
          u.state = "blocked";
        } else {
          // No Dia D as tropas de assalto mantêm um ritmo mínimo para não
          // chegar à linha inimiga em conta-gotas, um soldado de cada vez.
          const advanceSpeed = isDDay() && u.side === "player"
            ? Math.max(u.def.speed, 0.6)
            : u.def.speed;
          u.progress += (advanceSpeed * dt) / u.span;
          const p = clamp(u.progress, 0, 1);
          u.x = lerp(u.sx, u.tx, p);
          u.y = lerp(u.sy, u.ty, p);
          if (p >= 1) {
            arriveUnit(u);
            continue;
          }
          // Fogo em movimento: no desembarque, os soldados atiram enquanto
          // avançam de cobertura em cobertura (com cadência reduzida).
          if (isDDay() && u.side === "player" && u.type !== "medic" && u.fireCd <= 0) {
            const target = findTarget(u, gap);
            if (target) {
              u.facing = target.x >= u.x ? 1 : -1;
              fireAt(u, target, gap);
              u.fireCd *= 1.55;
            }
          }
          continue;
        }
      }

      if (u.state === "blocked") {
        if (u.fireCd > 0) continue;
        if (u.type === "medic") {
          tryHeal(u, gap);
          continue;
        }
        const target = findTarget(u, gap);
        if (target) {
          u.facing = target.x >= u.x ? 1 : -1;
          fireAt(u, target, gap);
        }
        continue;
      }

      if (u.fireCd > 0) continue;
      if (u.type === "medic") {
        tryHeal(u, gap);
        continue;
      }
      const target = findTarget(u, gap);
      if (target) fireAt(u, target, gap);
    }

    G.units = G.units.filter((u) => !u.dead);
  }

  function standoffBlocked(u, gap) {
    if (!G) return false;
    const factor = isDDay() ? DDAY_STANDOFF_FACTOR : STANDOFF_FACTOR;
    const reach = Math.max(14, gap * (u.type === "tank" ? factor * 1.55 : factor));
    const lane = Math.max(18, gap * 0.16);
    for (const other of G.units) {
      if (other.dead || other.side === u.side || other.state === "aboard") continue;
      const dx = other.x - u.x;
      const dy = other.y - u.y;
      if (Math.abs(dy) > lane) continue;
      const ahead = dx * u.facing;
      if (ahead < -6) continue;
      if (Math.hypot(dx, dy) <= reach) return true;
    }
    return false;
  }

  function arriveUnit(u) {
    u.state = "idle";
    u.trench = u.targetTrench;
    u.slot = u.targetSlot;
    u.progress = 0;
    const pos = slotPosition(u.trench, u.side, u.slot);
    u.x = pos.x;
    u.y = pos.y;
    u.facing = u.side === "player" ? 1 : -1;
    addBurst(pos.x, pos.y + 4, "rgba(180,155,110,0.5)", 5, 30);
  }

  function findTarget(u, gap) {
    if (!G) return null;
    let range = u.def.range * gap;
    // As metralhadoras dos bunkers alcançam apenas a segunda posição:
    // a praia de desembarque fica fora do seu campo de tiro.
    if (isDDay() && u.inBunker && u.type === "mg") {
      const secondLineX = W * DDAY_FRACTIONS[1];
      range = Math.max(range, (u.x - secondLineX) + gap * 0.2);
    }
    const facing = u.facing || (u.side === "player" ? 1 : -1);
    const lane = Math.max(16, gap * 0.2);
    let best = null;
    let bestTier = Infinity;
    let bestDist = Infinity;
    for (const other of G.units) {
      if (other.dead || other.side === u.side || other.state === "aboard") continue;
      const dx = other.x - u.x;
      const dy = other.y - u.y;
      const d = Math.hypot(dx, dy * 0.55);
      if (d > range) continue;

      // Prioridade: alvo à frente e na mesma linha de tiro. Depois, alvos à
      // frente fora da linha; por último, alvos atrás.
      const ahead = dx * facing >= -gap * 0.05;
      const straight = Math.abs(dy) <= lane;
      let tier = !ahead ? 2 : straight ? 0 : 1;
      if (d < gap * 0.42) tier = 0;

      if (tier < bestTier || (tier === bestTier && d < bestDist)) {
        bestTier = tier;
        bestDist = d;
        best = other;
      }
    }
    return best;
  }

  function tryHeal(u, gap) {
    const range = u.def.range * gap;
    let best = null;
    let bestRatio = 1;
    for (const ally of G.units) {
      if (ally.dead || ally.side !== u.side || ally.state === "aboard" || ally.hp >= ally.maxHp) continue;
      const d = Math.hypot(ally.x - u.x, (ally.y - u.y) * 0.55);
      const ratio = ally.hp / ally.maxHp;
      if (d <= range && ratio < bestRatio) {
        best = ally;
        bestRatio = ratio;
      }
    }
    u.fireCd = u.def.fireRate * rand(0.9, 1.15);
    if (!best) return;
    best.hp = Math.min(best.maxHp, best.hp + u.def.heal);
    addTracer(u.x, u.y, best.x, best.y, "rgba(150,225,165,0.8)", 1.2);
    addParticle(best.x, best.y - 8, rand(-6, 6), -20, 0.5, 2, "rgba(150,225,165,0.9)", -40);
  }

  function fireAt(u, target, gap) {
    if (!G) return;
    u.fireCd = u.def.fireRate * (u.inBunker ? 0.5 : 1) * rand(0.9, 1.1);
    let damage = u.def.damage * (u.side === "enemy" ? G.diff.enemyDmg : 1);
    // A areia, a fumaça e a distância tornam o fogo defensivo menos preciso
    // durante o desembarque.
    if (isDDay() && u.side === "enemy") damage *= 0.82;
    if (u.def.armorBonus && target.type === "tank") damage *= u.def.armorBonus;
    if (target.type === "tank" && u.type !== "at") damage *= target.def.armor || 0.45;
    if (u.type === "mortar" || u.type === "tank") damage *= 0.95;

    const isTank = u.type === "tank";
    const isMortar = u.type === "mortar";
    addTracer(u.x, u.y, target.x, target.y, u.side === "player" ? "rgba(245,215,145,0.9)" : "rgba(235,140,110,0.9)", isTank ? 2.1 : 1.2);
    u.flash = 0.1;
    if (isTank) G.shake = Math.max(G.shake, 2.2);
    if (G.sfxCd <= 0) {
      G.sfxCd = isTank ? 0.12 : 0.16;
      Sound.combat(u);
    }

    applyDamage(target, damage, u.side);

    if (u.type === "smg" && u.grenadeCd <= 0) {
      throwGrenade(u, target, gap);
      u.grenadeCd = GRENADE_COOLDOWN;
    }

    if (isMortar || isTank) {
      const radius = (u.def.splash || (isTank ? 0.8 : 0.5)) * gap;
      const splashScale = isTank ? 0.7 : 0.55;
      addExplosion(target.x, target.y, radius, isTank ? "rgba(244,172,92,0.9)" : "rgba(226,160,90,0.8)");
      G.units.forEach((other) => {
        if (other.dead || other === target || other.side !== target.side) return;
        const d = Math.hypot(other.x - target.x, other.y - target.y);
        if (d > radius) return;
        // Dano cai com a distância do ponto de impacto.
        const falloff = 1 - (d / Math.max(1, radius)) * 0.5;
        applyDamage(other, damage * splashScale * falloff, u.side);
      });
    }
  }

  function applyDamage(target, damage, side) {
    if (!target || target.dead) return;
    // Metralhadoras instaladas em bunkers ficam protegidas pelo concreto.
    if (target.inBunker) damage *= 0.7;
    target.hp -= damage;
    target.flash = 0.16;
    if (target.hp <= 0) killUnit(target, side);
  }

  function killUnit(u, killerSide) {
    if (!u || u.dead) return;
    u.dead = true;
    if (u.side === "player") {
      G.losses++;
    } else {
      G.kills++;
      // Cada baixa inimiga agenda uma reposição, respeitando o cooldown de 5s.
      if (!isDDay()) {
        G.enemyReplacePending = Math.min(10, (G.enemyReplacePending || 0) + 1);
        if (G.enemyReplaceTimer <= 0) G.enemyReplaceTimer = ENEMY_REPLACE_COOLDOWN;
      }
    }
    addBurst(u.x, u.y, u.side === "player" ? "rgba(210,198,168,0.9)" : "rgba(190,110,88,0.9)", 12, 75);
    if (u.inBunker) {
      addExplosion(u.x, u.y, 30, "rgba(232,158,88,0.95)");
      Sound.explosion();
      G.shake = Math.max(G.shake, 4.5);
      floatText(u.x, u.y - 26, "BUNKER", "#f0cd82");
    }
    if (u.type === "tank") {
      addExplosion(u.x, u.y, 32, "rgba(230,150,80,0.9)");
      Sound.explosion();
      G.shake = Math.max(G.shake, 5);
    }
    // 30% de chance de um grito a cada baixa, com uma das três gravações.
    if (Math.random() < 0.3) Sound.scream();
    if (G.sfxCd <= 0) {
      G.sfxCd = 0.2;
      Sound.hit();
    }
    floatText(u.x, u.y - 14, killerSide === "player" ? `+${u.side === "enemy" ? 1 : 0}` : "", "rgba(240,205,130,0.8)");
  }

  function resolveTrenchControl() {
    if (!G) return;
    G.trenches.forEach((t) => {
      const p = countAt(t.index, "player");
      const e = countAt(t.index, "enemy");
      let next = t.owner;
      if (t.owner === "player" && p === 0 && e > 0) next = "enemy";
      else if (t.owner === "enemy" && e === 0 && p > 0) next = "player";
      else if (t.owner === "neutral" && p > 0 && e === 0) next = "player";
      else if (t.owner === "neutral" && e > 0 && p === 0) next = "enemy";
      if (next === t.owner) return;

      t.owner = next;
      t.flash = 1.6;
      if (next === "player") {
        G.captures++;
        if (!t.bonusGiven) {
          t.bonusGiven = true;
          G.coins += CAPTURE_BONUS;
          floatText(t.x, G.fieldTop + 32, `+${CAPTURE_BONUS}`, "#f0cd82");
        }
        Sound.capture();
        if (t.index === G.trenches.length - 1) {
          if (!isDDay() || bunkersAlive() === 0) finishBattle(true, victoryReason());
          else if (!G.bunkerHintShown) {
            G.bunkerHintShown = true;
            showGameToast(`Destrua os ${G.bunkers.length} bunkers antes de tomar a posição final.`);
          }
        }
      } else if (next === "enemy") {
        G.flash = 1;
        if (G.selected === t.index) {
          const fallback = G.trenches.filter((x) => x.owner === "player").pop();
          G.selected = fallback ? fallback.index : null;
        }
        if (t.index === 0) finishBattle(false, "O inimigo rompeu sua linha inicial.");
      }
    });
  }

  function victoryReason() {
    return isDDay()
      ? "Você destruiu os bunkers, tomou a trincheira inimiga e firmou a cabeça de praia."
      : "Você rompeu a linha inimiga e tomou a retaguarda.";
  }

  function checkBattleEnd() {
    if (!G || G.phase !== "playing") return;
    if (G.trenches[0].owner === "enemy") {
      finishBattle(false, "O inimigo rompeu sua linha inicial.");
      return;
    }
    if (G.trenches[G.trenches.length - 1].owner === "player" && (!isDDay() || bunkersAlive() === 0)) {
      finishBattle(true, victoryReason());
      return;
    }
  }

  /* ------------------------------------------------------------
     Efeitos visuais
     ------------------------------------------------------------ */
  function addParticle(x, y, vx, vy, life, size, color, gravity = 120) {
    if (!G) return;
    const q = quality();
    // Em qualidade baixa parte das partículas é descartada antes de existir.
    if (q.particles < 1 && Math.random() > q.particles) return;
    const cap = Math.round(320 * Math.max(0.25, q.particles));
    if (G.particles.length > cap) G.particles.shift();
    G.particles.push({ x, y, vx, vy, life, maxLife: life, size, color, gravity });
  }

  function addBurst(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(speed * 0.2, speed);
      addParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, rand(0.25, 0.7), rand(1.1, 3), color, 140);
    }
  }

  function addTracer(x1, y1, x2, y2, color, width = 1.2) {
    if (!G) return;
    const cap = Math.round(80 * Math.max(0.4, quality().effects));
    if (G.tracers.length > cap) G.tracers.shift();
    G.tracers.push({ x1, y1, x2, y2, color, width, life: 0.13, maxLife: 0.13 });
  }

  function throwGrenade(u, target, gap) {
    if (!G) return;
    const cap = Math.round(24 * Math.max(0.4, quality().effects));
    if (G.grenades.length >= cap) G.grenades.shift();
    G.grenades.push({
      sx: u.x, sy: u.y - 8, x: u.x, y: u.y - 8,
      tx: target.x, ty: target.y,
      side: u.side,
      damage: GRENADE_DAMAGE * (u.side === "enemy" ? G.diff.enemyDmg : 1),
      radius: GRENADE_RADIUS * gap,
      t: 0, duration: GRENADE_FUSE, done: false
    });
  }

  function addScorch(x, y, radius) {
    if (!G || !G.scenery) return;
    const list = G.scenery.scorch;
    const cap = Math.round(46 * Math.max(0.25, quality().scenery));
    list.push({ x, y, r: Math.max(6, radius * 0.55), a: 0.14 + Math.random() * 0.1 });
    while (list.length > cap) list.shift();
  }

  function addExplosion(x, y, radius, color) {
    if (!G) return;
    addBurst(x, y, color, 16, 140);
    G.rings.push({ x, y, r: 3, maxR: radius, life: 0.38, maxLife: 0.38, color });
    addScorch(x, y, radius);
    G.shake = Math.max(G.shake, 3.5);
  }

  function floatText(x, y, text, color) {
    if (!G || !text) return;
    G.floaters.push({ x, y, text, color, life: 1, maxLife: 1 });
  }

  function updateEffects(dt) {
    if (!G) return;
    G.particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt;
    });
    G.particles = G.particles.filter((p) => p.life > 0);
    G.grenades.forEach((g) => {
      g.t += dt;
      const p = clamp(g.t / g.duration, 0, 1);
      g.x = lerp(g.sx, g.tx, p);
      g.y = lerp(g.sy, g.ty, p) - Math.sin(p * Math.PI) * 28;
      if (p < 1) return;
      g.done = true;
      addExplosion(g.tx, g.ty, g.radius, "rgba(235,180,105,0.9)");
      G.units.forEach((other) => {
        if (other.dead || other.side === g.side) return;
        const d = Math.hypot(other.x - g.tx, other.y - g.ty);
        if (d > g.radius) return;
        const falloff = 1 - (d / Math.max(1, g.radius)) * 0.5;
        applyDamage(other, g.damage * falloff, g.side);
      });
      if (G.sfxCd <= 0) {
        G.sfxCd = 0.16;
        Sound.explosion();
      }
    });
    G.grenades = G.grenades.filter((g) => !g.done);
    G.tracers.forEach((t) => { t.life -= dt; });
    G.tracers = G.tracers.filter((t) => t.life > 0);
    G.rings.forEach((r) => {
      r.life -= dt;
      r.r = lerp(3, r.maxR, 1 - r.life / r.maxLife);
    });
    G.rings = G.rings.filter((r) => r.life > 0);
    G.floaters.forEach((f) => { f.life -= dt; f.y -= 22 * dt; });
    G.floaters = G.floaters.filter((f) => f.life > 0);
  }

  /* ------------------------------------------------------------
     Loop principal e HUD
     ------------------------------------------------------------ */
  function gameLoop(ts) {
    if (!G) return;
    if (!G.lastTs) G.lastTs = ts;
    let dt = (ts - G.lastTs) / 1000;
    G.lastTs = ts;
    dt = clamp(dt, 0, 0.05);
    G.sceneTime += dt;

    if (G.phase === "playing") updateBattle(dt);
    updateEffects(dt);
    drawBattlefield();
    updateHud();
    G.raf = requestAnimationFrame(gameLoop);
  }

  function updateHud(force = false) {
    if (!G) return;
    const now = performance.now();
    if (!force && now - G.lastHud < quality().hudMs) return;
    G.lastHud = now;

    const owned = playerOwnedCount();
    $("#coin-value").textContent = fmtCoins(G.coins);

    const label = "Avançar";
    const value = `${owned}/${G.trenches.length}`;
    const fill = isDDay()
      ? clamp((owned - 1) / Math.max(1, G.trenches.length - 1), 0, 1) * 100
      : clamp((owned - 2) / Math.max(1, G.trenches.length - 2), 0, 1) * 100;
    $("#objective-label").textContent = label;
    $("#objective-value").textContent = value;
    $("#objective-fill").style.width = `${fill}%`;

    const selected = G.selected != null ? G.trenches[G.selected] : null;
    const deployLine = $("#deploy-line");
    if (deployLine) {
      if (isDDay()) {
        const onBoard = G.ddayGroupBoat
          ? G.ddayGroupBoat.units.filter((u) => u && !u.dead && u.state === "aboard").length
          : 0;
        deployLine.textContent = `Bote ${onBoard}/4`;
      } else {
        deployLine.textContent = selected ? positionLabel(G.selected) : "Automático";
      }
    }
    const deployDock = $("#deploy-dock");
    if (deployDock) {
      const isGroupDock = isDDay();
      deployDock.classList.toggle("is-empty", !selected && !isGroupDock);
      const deployLabel = $("#deploy-label", deployDock);
      if (deployLabel) deployLabel.textContent = isGroupDock ? "Bote" : "Reforços";
    }

    const capReached = unitCapReached();
    $$("#unit-shop .shop-btn").forEach((btn) => {
      const def = UNIT_DEFS[btn.dataset.buy];
      if (!def) return;
      const blocked = capReached || G.coins < def.cost;
      btn.classList.toggle("is-disabled", blocked);
      btn.setAttribute("aria-disabled", String(blocked));
    });
  }

  /* ------------------------------------------------------------
     Fim de batalha
     ------------------------------------------------------------ */
  function computeRank() {
    let pts = 0;
    if (G.won) pts += 2;
    const lossLimit = G.diff === DIFFICULTIES.veterano ? 5 : G.diff === DIFFICULTIES.recruta ? 10 : 8;
    if (G.losses <= lossLimit) pts++;
    if (G.captures >= 3) pts++;
    if (G.kills >= 15) pts++;
    if (playerOwnedCount() >= 3) pts++;
    if (pts >= 5) return "ouro";
    if (pts >= 3) return "prata";
    return "bronze";
  }

  function finishBattle(won, reason) {
    if (!G || G.phase === "ended") return;
    G.phase = "ended";
    G.won = won;
    G.endReason = reason || "";
    const battle = G.battle;
    G.score = Math.max(0, Math.round(G.kills * 35 + G.captures * 70 + Math.floor(G.coins) * 0.4 + (won ? 600 : 0) - G.losses * 12));

    let rank = null;
    let newBest = false;
    if (won) {
      rank = computeRank();
      const prev = save.best[battle.id];
      const better = !prev || !RANKS[prev.rank] || RANKS[rank].order > RANKS[prev.rank].order || (RANKS[rank].order === RANKS[prev.rank].order && G.score > (prev.score || 0));
      if (better) {
        save.best[battle.id] = { rank, score: G.score, kills: G.kills, captures: G.captures, losses: G.losses, date: Date.now() };
        newBest = true;
      }
      save.completed[battle.id] = { rank, score: G.score, kills: G.kills, captures: G.captures, losses: G.losses, date: Date.now() };
      persist();
    }

    renderAll();
    showBanner(won ? "VITÓRIA" : "DERROTA", reason || (won ? "Missão cumprida" : "A linha não resistiu"));
    if (won) Sound.victory(); else Sound.defeat();

    G.endTimer = setTimeout(() => {
      G.endTimer = null;
      if (!G) return;
      showResultModal(won, rank, reason, newBest);
    }, 950);
  }

  function showResultModal(won, rank, reason, newBest) {
    if (!G) return;
    const b = G.battle;
    const idx = BATTLES.indexOf(b);
    const next = BATTLES[idx + 1] || null;
    const rankBlock = won
      ? `<div class="result-rank">
          ${icon("medal")}
          <div>
            <strong>${newBest ? "Novo melhor posto" : "Posto conquistado"} · ${rankLabel(rank)}</strong>
            <span>${rank === "ouro" ? "Comando exemplar: a linha foi rompida com poucas baixas e grande iniciativa." : rank === "prata" ? "Boa condução da batalha. A história registra sua passagem pelo front." : "Missão cumprida. A experiência vale mais que a glória."}</span>
          </div>
        </div>`
      : `<div class="result-rank" style="border-color:rgba(225,106,80,0.32);background:rgba(225,106,80,0.06)">
          ${icon("shield")}
          <div>
            <strong style="color:#f2a18f">Missão não cumprida</strong>
            <span>${esc(reason || "A linha não resistiu.")} Reorganize suas trincheiras e tente outra vez.</span>
          </div>
        </div>`;

    const actions = [
      won && next ? `<button class="btn btn-primary" data-result="next" type="button">Próxima batalha ${icon("arrow")}</button>` : "",
      `<button class="btn ${won && next ? "btn-ghost" : "btn-primary"}" data-result="retry" type="button">${icon("refresh")} Jogar novamente</button>`,
      `<button class="btn btn-ghost" data-result="campaign" type="button">${icon("grid")} Campanha</button>`
    ].filter(Boolean).join("");

    const html = `
      <div class="result-head ${won ? "" : "is-defeat"}">
        <div class="result-emblem">${icon(won ? "medal" : "close")}</div>
        <div>
          <span class="eyebrow">${won ? "Relatório de vitória" : "Relatório de batalha"} · Batalha ${String(idx + 1).padStart(2, "0")}</span>
          <h2>${won ? "Missão cumprida" : "Missão falhou"}</h2>
          <p>${esc(b.name)} · ${esc(b.dateLabel)} · ${esc(b.place)}</p>
        </div>
      </div>
      <div class="result-body">
        <div class="result-stats">
          <div class="result-stat"><span>Inimigos eliminados</span><strong>${G.kills}</strong></div>
          <div class="result-stat"><span>Baixas aliadas</span><strong>${G.losses}</strong></div>
          <div class="result-stat"><span>${isDDay() ? "Posições tomadas" : "Trincheiras tomadas"}</span><strong>${G.captures}</strong></div>
          <div class="result-stat"><span>Pontos</span><strong>${Math.round(G.score).toLocaleString("pt-BR")}</strong></div>
        </div>
        ${rankBlock}
        <div class="result-recap">
          <h3>O que esta batalha ensinou</h3>
          <ul>${b.takeaways.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
        </div>
        <div class="result-fact">
          <h3>Você sabia?</h3>
          <p>${esc(b.funFact)}</p>
        </div>
      </div>
      <div class="result-footer">
        <div class="result-footer-left">
          <span class="modal-small-note">Dificuldade: ${esc(DIFFICULTIES[save.difficulty].label)} · ${esc(b.frontLabel)}</span>
        </div>
        <div class="modal-footer-actions">${actions}</div>
      </div>`;

    mountModal("result-panel", html, { label: won ? "Vitória" : "Derrota", dismissible: false });
  }

  /* ------------------------------------------------------------
     Renderização do campo
     ------------------------------------------------------------ */
  function drawBattlefield() {
    if (!G) return;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (G.shake > 0) ctx.translate(rand(-1, 1) * G.shake, rand(-1, 1) * G.shake);

    drawSky();
    drawGround();
    drawSceneryDetails();
    drawTrenches();
    drawBunkers();
    drawBoats();
    drawUnits();
    drawEffects();
    drawOrderArrows();
    ctx.restore();
    drawGloomOverlay();
    drawWeather();
    drawScreenFlash();
  }

  function drawSky() {
    const pal = G.battle.palette;
    const S = G.scenery;
    const horizon = G.fieldTop + 30;
    const g = ctx.createLinearGradient(0, 0, 0, horizon);
    g.addColorStop(0, pal.sky[0]);
    g.addColorStop(0.55, pal.sky[1]);
    g.addColorStop(1, pal.sky[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, horizon);

    const sunX = W * 0.72;
    const sunY = Math.max(26, G.fieldTop * 0.37);
    const sunR = Math.min(W, H) * 0.045;
    if (isDDay()) {
      // Céu de 6 de junho de 1944: encoberto, sem sol visível, apenas um clarão
      // pálido por trás da camada de nuvens baixas.
      if (quality().effects > 0.6) {
        const sg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 5);
        sg.addColorStop(0, rgba(pal.sun, 0.14));
        sg.addColorStop(0.5, rgba(pal.sun, 0.06));
        sg.addColorStop(1, rgba(pal.sun, 0));
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunR * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      const s = Math.max(7, Math.round(sunR));
      px(sunX - s * 1.4, sunY - s * 0.4, s * 2.8, s * 0.8, rgba(pal.sun, 0.16));
      px(sunX - s, sunY - s * 0.8, s * 2, s * 0.4, rgba(pal.sun, 0.1));
    } else {
      if (quality().effects > 0.6) {
        const sg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 3.6);
        sg.addColorStop(0, rgba(pal.sun, 0.38));
        sg.addColorStop(0.35, rgba(pal.sun, 0.14));
        sg.addColorStop(1, rgba(pal.sun, 0));
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunR * 3.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sol em blocos, com cantos recortados.
      const s = Math.max(7, Math.round(sunR));
      const sunCol = rgba(pal.sun, 0.62);
      px(sunX - s, sunY - s * 0.5, s * 2, s, sunCol);
      px(sunX - s * 0.5, sunY - s, s, s * 2, sunCol);
      px(sunX - s * 1.5, sunY - s * 0.2, s, s * 0.4, rgba(pal.sun, 0.35));
      px(sunX + s * 0.5, sunY - s * 0.2, s, s * 0.4, rgba(pal.sun, 0.35));
    }

    if (S) {
      // Nuvens em blocos, à deriva.
      S.clouds.forEach((c) => {
        const x = mod(c.x + G.sceneTime * c.sp, W + 180) - 90;
        if (isDDay()) {
          const col = rgba(pal.sky[0], 0.34);
          px(x, c.y, c.w * 1.25, c.h * 1.2, col);
          px(x + c.w * 0.2, c.y - c.h * 0.9, c.w * 0.7, c.h * 1.1, col);
          px(x + c.w * 0.5, c.y - c.h * 1.5, c.w * 0.4, c.h, rgba(pal.sky[1], 0.26));
        } else {
          const col = rgba(pal.haze, 0.14);
          px(x, c.y, c.w, c.h, col);
          px(x + c.w * 0.2, c.y - c.h * 0.7, c.w * 0.55, c.h, col);
          px(x + c.w * 0.5, c.y - c.h * 1.2, c.w * 0.3, c.h, col);
        }
      });

      // Fumaça de incêndios distantes.
      const smokeLayers = quality().effects < 0.65 ? 2 : 4;
      S.smoke.forEach((sm) => {
        const x = mod(sm.x + G.sceneTime * sm.drift * 2.5, W + 60) - 30;
        const rise = mod(G.sceneTime * sm.speed * 28 + sm.phase * 18, 72);
        for (let i = 0; i < smokeLayers; i++) {
          const alpha = 0.12 * (1 - i * 0.2);
          const w = sm.w * (1 - i * 0.1);
          px(x + Math.sin(G.sceneTime * 0.7 + sm.phase + i) * 5, sm.y - i * 9 - rise, w, sm.h * 0.45, `rgba(32,26,23,${alpha})`);
        }
      });

      // Brasas e chamas no horizonte.
      S.fires.forEach((f) => {
        const flick = 0.65 + Math.sin(G.sceneTime * 9 + f.phase) * 0.35;
        const h = f.h * flick;
        px(f.x, f.y - h, 2, h, "rgba(235,120,55,0.55)");
        px(f.x + 2, f.y - h * 0.7, 2, h * 0.7, "rgba(255,186,88,0.45)");
        px(f.x - 1, f.y - h * 0.35, 2, h * 0.35, "rgba(255,215,130,0.35)");
      });

      // Silhuetas do horizonte.
      S.far.forEach((f) => {
        const dark = rgba(pal.mid, 0.24);
        const soft = rgba(pal.far, 0.18);
        if (f.type === "tree") {
          px(f.x + f.w * 0.44, f.y - f.h * 0.38, Math.max(2, f.w * 0.09), f.h * 0.38, rgba(pal.mid, 0.2));
          px(f.x, f.y - f.h * 0.68, f.w * 0.8, f.h * 0.22, soft);
          px(f.x + f.w * 0.14, f.y - f.h * 0.9, f.w * 0.52, f.h * 0.3, soft);
          px(f.x + f.w * 0.3, f.y - f.h, f.w * 0.2, f.h * 0.25, soft);
        } else if (f.type === "pine") {
          px(f.x + f.w * 0.44, f.y - f.h * 0.3, 2, f.h * 0.3, dark);
          px(f.x + f.w * 0.15, f.y - f.h * 0.45, f.w * 0.5, f.h * 0.18, dark);
          px(f.x + f.w * 0.24, f.y - f.h * 0.68, f.w * 0.34, f.h * 0.2, dark);
          px(f.x + f.w * 0.33, f.y - f.h * 0.88, f.w * 0.16, f.h * 0.2, dark);
        } else if (f.type === "ruin") {
          px(f.x, f.y - f.h * 0.72, f.w * 0.42, f.h * 0.72, dark);
          px(f.x + f.w * 0.32, f.y - f.h * 0.46, f.w * 0.34, f.h * 0.46, dark);
          px(f.x + f.w * 0.6, f.y - f.h * 0.25, f.w * 0.2, f.h * 0.25, dark);
          px(f.x + f.w * 0.08, f.y - f.h * 0.52, f.w * 0.08, f.h * 0.12, rgba(pal.sky[0], 0.45));
          px(f.x + f.w * 0.24, f.y - f.h * 0.36, f.w * 0.08, f.h * 0.12, rgba(pal.sky[0], 0.35));
        } else if (f.type === "dune") {
          px(f.x, f.y - f.h * 0.22, f.w, f.h * 0.22, rgba(pal.far, 0.3));
          px(f.x + f.w * 0.18, f.y - f.h * 0.38, f.w * 0.55, f.h * 0.18, rgba(pal.far, 0.24));
        } else if (f.type === "hedge") {
          px(f.x, f.y - f.h * 0.34, f.w, f.h * 0.34, soft);
          for (let i = 0; i < 4; i++) px(f.x + f.w * (0.08 + i * 0.22), f.y - f.h * (0.42 + (i % 2) * 0.12), f.w * 0.18, f.h * 0.18, soft);
        } else {
          px(f.x, f.y - f.h * 0.5, f.w * 0.62, f.h * 0.5, dark);
          px(f.x + f.w * 0.16, f.y - f.h * 0.78, f.w * 0.3, f.h * 0.3, dark);
          px(f.x + f.w * 0.06, f.y - f.h * 0.6, f.w * 0.14, f.h * 0.2, soft);
        }
      });
    }

    if (isDDay()) {
      const fog = ctx.createLinearGradient(0, G.fieldTop - 26, 0, G.fieldTop + 18);
      fog.addColorStop(0, rgba(pal.haze, 0));
      fog.addColorStop(0.6, rgba(pal.haze, 0.2));
      fog.addColorStop(1, rgba(pal.haze, 0.05));
      ctx.fillStyle = fog;
      ctx.fillRect(0, G.fieldTop - 26, W, 44);
    }
    ctx.fillStyle = rgba(pal.haze, isDDay() ? 0.2 : 0.12);
    ctx.fillRect(0, G.fieldTop - 4, W, 8);
  }

  function drawDdayGround() {
    const pal = G.battle.palette;
    const S = G.scenery;
    const top = G.fieldTop;
    const h = H - top;
    const shoreX = W * DDAY_SHORE;

    // Canal: água fria e escura, como no amanhecer encoberto da Normandia.
    const sea = ctx.createLinearGradient(0, top, 0, H);
    sea.addColorStop(0, "#3a5058");
    sea.addColorStop(0.35, "#27424a");
    sea.addColorStop(1, "#101f24");
    ctx.fillStyle = sea;
    ctx.fillRect(0, top, shoreX, h);

    // Ondas em faixas horizontais, animadas.
    const waves = 9;
    for (let i = 0; i < waves; i++) {
      const y = top + 12 + (i / (waves - 1)) * (h - 20);
      const drift = Math.sin(G.sceneTime * 0.9 + i * 1.3) * 12;
      const a = 0.08 + (i % 3) * 0.03;
      ctx.strokeStyle = `rgba(150,182,186,${a})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= shoreX; x += 24) {
        const yy = y + Math.sin((x + drift + i * 40) * 0.035) * 2.4;
        ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }

    // Espuma na arrebentação.
    for (let i = 0; i < 7; i++) {
      const y = top + 10 + (i / 6) * (h - 16);
      const wob = Math.sin(G.sceneTime * 1.8 + i * 1.7) * 4;
      px(shoreX - 8 + wob, y, 7, 2, `rgba(214,228,224,${0.16 + (i % 2) * 0.08})`);
      px(shoreX - 20 + wob * 0.5, y + 5, 5, 1, "rgba(214,228,224,0.1)");
    }

    // Areia molhada e areia seca.
    const sand = ctx.createLinearGradient(0, top, 0, H);
    sand.addColorStop(0, pal.ground);
    sand.addColorStop(0.45, pal.groundDark);
    sand.addColorStop(1, "#14110d");
    ctx.fillStyle = sand;
    ctx.fillRect(shoreX, top, W - shoreX, h);

    const wet = ctx.createLinearGradient(shoreX, 0, shoreX + 46, 0);
    wet.addColorStop(0, "rgba(44,58,60,0.6)");
    wet.addColorStop(0.45, "rgba(58,68,64,0.28)");
    wet.addColorStop(1, "rgba(58,68,64,0)");
    ctx.fillStyle = wet;
    ctx.fillRect(shoreX, top, 46, h);

    // Linha de espuma molhada acompanha a maré.
    ctx.strokeStyle = "rgba(206,220,214,0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = top; y <= H; y += 18) {
      const xx = shoreX + Math.sin(y * 0.05 + G.sceneTime * 1.4) * 3;
      if (y === top) ctx.moveTo(xx, y); else ctx.lineTo(xx, y);
    }
    ctx.stroke();

    if (!S) return;

    // A textura de areia fica restrita à praia, nunca sobre a água.
    S.patches.forEach((p) => {
      if (p.x < shoreX) return;
      if (p.kind === "wet") {
        px(p.x, p.y, p.w, p.h, `rgba(56,70,74,${p.a})`);
        px(p.x + 3, p.y, p.w * 0.4, 1, `rgba(178,198,198,${p.a * 0.7})`);
      } else {
        px(p.x, p.y, p.w, p.h, `rgba(30,24,17,${p.a})`);
      }
    });

    S.groundPixels.forEach((p) => {
      if (p.x < shoreX) return;
      const col = p.tone > 0.55 ? rgba(pal.haze, p.a) : `rgba(14,11,8,${p.a * 1.4})`;
      px(p.x, p.y, p.s, p.s, col);
    });

    S.ripples.forEach((r) => {
      if (r.x < shoreX) return;
      px(r.x, r.y, r.w, 1, `rgba(250,232,190,${r.a})`);
      px(r.x + r.w * 0.2, r.y + 2, r.w * 0.6, 1, `rgba(80,64,44,${r.a * 0.8})`);
    });

    const shade = ctx.createLinearGradient(0, top, 0, H);
    shade.addColorStop(0, "rgba(10,12,9,0.24)");
    shade.addColorStop(0.2, "rgba(10,12,9,0.02)");
    shade.addColorStop(1, "rgba(4,5,3,0.4)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, top, W, h);
  }

  function drawGround() {
    const pal = G.battle.palette;
    const S = G.scenery;
    const top = G.fieldTop;
    const h = H - top;

    if (isDDay()) {
      drawDdayGround();
      return;
    }

    const g = ctx.createLinearGradient(0, top, 0, H);
    g.addColorStop(0, pal.ground);
    g.addColorStop(0.42, pal.groundDark);
    g.addColorStop(1, "#14110d");
    ctx.fillStyle = g;
    ctx.fillRect(0, top, W, h);

    if (!S) return;

    // Manchas de bioma: neve, lama ou areia molhada.
    S.patches.forEach((p) => {
      if (p.kind === "snow") {
        px(p.x, p.y, p.w, p.h, `rgba(236,242,250,${p.a})`);
        px(p.x + 2, p.y - 1, p.w * 0.55, 1, `rgba(255,255,255,${p.a * 0.8})`);
        px(p.x + p.w - 4, p.y + p.h, 3, 1, "rgba(120,132,146,0.2)");
      } else if (p.kind === "wet") {
        px(p.x, p.y, p.w, p.h, `rgba(56,70,74,${p.a})`);
        px(p.x + 3, p.y, p.w * 0.4, 1, `rgba(178,198,198,${p.a * 0.7})`);
      } else {
        px(p.x, p.y, p.w, p.h, `rgba(30,24,17,${p.a})`);
      }
    });

    // Textura pixelada espalhada por todo o campo.
    S.groundPixels.forEach((p) => {
      const col = p.tone > 0.55 ? rgba(pal.haze, p.a) : `rgba(14,11,8,${p.a * 1.4})`;
      px(p.x, p.y, p.s, p.s, col);
    });

    // Linhas de areia, gravetos e pedriscos acompanham o chão.
    S.ripples.forEach((r) => {
      px(r.x, r.y, r.w, 1, `rgba(250,232,190,${r.a})`);
      px(r.x + r.w * 0.2, r.y + 2, r.w * 0.6, 1, `rgba(80,64,44,${r.a * 0.8})`);
    });

    const shade = ctx.createLinearGradient(0, top, 0, H);
    shade.addColorStop(0, "rgba(10,12,9,0.26)");
    shade.addColorStop(0.2, "rgba(10,12,9,0.02)");
    shade.addColorStop(1, "rgba(4,5,3,0.4)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, top, W, h);
  }

  function drawSceneryDetails() {
    const S = G.scenery;
    if (!S) return;
    const pal = G.battle.palette;
    const dday = isDDay();
    const shoreX = W * DDAY_SHORE;

    // Marcas de queimado deixadas por explosões.
    S.scorch.forEach((s) => {
      const r = Math.round(s.r);
      for (let i = 0; i < 4; i++) {
        const w = r * (1 - i * 0.2);
        px(s.x - w / 2, s.y - r * 0.12 + i * r * 0.12, w, Math.max(1, r * 0.16), `rgba(24,18,13,${s.a * (1 - i * 0.18)})`);
      }
    });

    // Crateras em blocos, com borda iluminada.
    S.craters.forEach((c) => {
      const layers = [
        { s: 1, a: c.a },
        { s: 0.72, a: c.a * 0.85 },
        { s: 0.44, a: c.a * 0.7 }
      ];
      layers.forEach((l) => {
        px(c.x - c.rx * l.s, c.y - c.ry * l.s, c.rx * 2 * l.s, Math.max(1, c.ry * 2 * l.s), `rgba(18,14,10,${l.a})`);
      });
      px(c.x - c.rx * 0.8, c.y - c.ry, c.rx * 1.4, 1, `rgba(225,206,172,${c.a * 0.45})`);
      px(c.x - c.rx, c.y + c.ry, c.rx * 0.6, 1, `rgba(90,74,52,${c.a * 0.4})`);
      if (c.rim) px(c.x + c.rx * 0.55, c.y - c.ry * 0.6, 2, 2, "rgba(58,49,35,0.5)");
    });

    // Detritos: lascas, pedriscos e madeira quebrada.
    S.debris.forEach((d) => {
      const col = d.tone > 0.6 ? `rgba(196,178,142,${d.a})` : `rgba(30,25,18,${d.a})`;
      px(d.x, d.y, d.w, d.h, col);
      if (d.w > 4) px(d.x + 1, d.y - 1, 1, 1, `rgba(210,192,158,${d.a * 0.7})`);
    });

    // Pedras angulares em duas tonalidades.
    S.rocks.forEach((r) => {
      if (dday && r.x < shoreX) return;
      const main = r.tone > 0.5 ? pal.mid : pal.groundDark;
      px(r.x, r.y - r.h, r.w, r.h, rgba(main, 0.85));
      px(r.x, r.y - r.h, r.w, 1, rgba(pal.haze, 0.4));
      px(r.x + 1, r.y - r.h - 1, Math.max(1, r.w * 0.5), 1, rgba(pal.haze, 0.32));
      px(r.x + r.w - 2, r.y - 1, 2, 1, "rgba(12,10,7,0.55)");
    });

    // Ouriços antitanque e botes destruídos espalhados pela praia.
    if (dday) {
      S.hedgehogs.forEach((h) => drawHedgehog(h, pal));
      S.wrecks.forEach((w) => drawWreck(w, pal));
    }

    // Sacos de areia empilhados.
    S.sandbags.forEach((b) => {
      const bagCol = b.tone > 0.5 ? rgba(pal.haze, 0.72) : rgba(pal.ground, 0.9);
      for (let i = 0; i < b.n; i++) {
        const bx = b.x + i * 7 * b.dir;
        const by = b.y - (i % 2) * 4;
        px(bx, by - 4, 7, 4, bagCol);
        px(bx, by - 4, 7, 1, "rgba(255,246,218,0.22)");
        px(bx + 1, by - 3, 5, 1, "rgba(60,48,32,0.22)");
        px(bx + 3, by - 5, 1, 2, "rgba(40,32,22,0.35)");
      }
    });

    // Arame farpado.
    S.wire.forEach((w) => {
      ctx.strokeStyle = "rgba(40,36,29,0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w.x, w.y);
      ctx.lineTo(w.x + w.w, w.y - 1);
      ctx.stroke();
      for (let x = w.x + 4; x < w.x + w.w; x += 9) {
        px(x, w.y - 5, 1, 5, "rgba(38,34,27,0.6)");
        px(x - 2, w.y - 4, 5, 1, "rgba(38,34,27,0.45)");
      }
    });

    // Vegetação rasteira: tufos secos, capim ou neve.
    S.tufts.forEach((t) => {
      if (dday && t.x < shoreX) return;
      const col = rgba(pal.far, clamp(t.a + 0.12, 0, 0.7));
      px(t.x, t.y - t.h * 0.5, 1, t.h * 0.5, col);
      px(t.x + 1, t.y - t.h, 1, t.h, col);
      px(t.x + 2, t.y - t.h * 0.6, 1, t.h * 0.6, col);
      px(t.x + Math.round(t.lean), t.y - t.h * 0.85, 1, Math.max(1, t.h * 0.3), col);
    });
  }

  function drawHedgehog(h, pal) {
    const s = Math.max(3, h.s);
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(0, 1, s * 1.1, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(h.tilt || 0);
    // Três vigas de aço cruzadas, no estilo dos ouriços de praia.
    ctx.strokeStyle = "rgba(44,47,43,0.95)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-s, 0);
    ctx.lineTo(s * 0.55, -s * 1.25);
    ctx.moveTo(s, 0);
    ctx.lineTo(-s * 0.55, -s * 1.25);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -s * 1.55);
    ctx.stroke();
    ctx.strokeStyle = "rgba(126,128,114,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-s * 0.9, -1);
    ctx.lineTo(s * 0.5, -s * 1.2);
    ctx.moveTo(s * 0.9, -1);
    ctx.lineTo(-s * 0.5, -s * 1.2);
    ctx.stroke();
    px(-s * 0.15, -s * 1.55, 2, 3, "rgba(150,150,132,0.5)");
    ctx.restore();
  }

  function drawWreck(w, pal) {
    const s = Math.max(9, w.s);
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.scale(w.flip ? -1 : 1, 1);
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath();
    ctx.ellipse(0, 1, s, s * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    // Casco encalhado e inclinado, com a rampa aberta.
    px(-s, -s * 0.5, s * 2, s * 0.5, "rgba(56,58,53,0.96)");
    px(-s, -s * 0.5, s * 2, 2, "rgba(122,124,110,0.45)");
    px(-s * 0.72, -s * 0.78, s * 1.2, s * 0.3, "rgba(70,72,64,0.96)");
    px(s * 0.62, -s * 0.32, s * 0.52, s * 0.32, "rgba(46,48,43,0.96)");
    px(-s * 0.42, -s * 0.28, s * 0.6, s * 0.2, "rgba(14,18,18,0.92)");
    px(-s * 0.2, -s * 0.42, s * 0.3, 1, "rgba(126,74,50,0.6)");
    px(-s * 0.55, -s * 0.14, 2, s * 0.14, "rgba(126,74,50,0.5)");
    ctx.restore();
  }

  function drawTrenches() {
    if (isDDay()) {
      G.trenches.forEach((t) => {
        if (!isStopTrench(t.index)) return;
        if (t.index === 0) drawBeachCover(t);
        else drawTrench(t);
      });
      return;
    }
    G.trenches.forEach((t) => drawTrench(t));
  }

  function drawBeachCover(t) {
    const top = G.fieldTop + 8;
    const bottom = G.fieldBottom - 4;
    const pal = G.battle.palette;
    const owner = OWNER_COLORS[t.owner] || OWNER_COLORS.neutral;
    const selected = G.selected === t.index;
    const hovered = G.hoverTrench === t.index && t.owner === "player";

    // Areia revolvida em volta da cobertura.
    ctx.fillStyle = "rgba(20,18,14,0.14)";
    rr(t.x - 13, top, 26, bottom - top, 6);
    ctx.fill();

    // Coberturas quebradas: ouriços, sacos de areia e pedras ao longo da linha.
    const step = Math.max(18, quality().trenchStep + 10);
    for (let y = top + 14, i = 0; y < bottom - 8; y += step, i++) {
      const x = t.x + Math.sin((y + t.index * 29) * 0.4) * 4;
      if ((i + t.index) % 3 === 0) {
        ctx.strokeStyle = "rgba(44,47,43,0.85)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x - 5, y);
        ctx.lineTo(x + 3, y - 9);
        ctx.moveTo(x + 5, y);
        ctx.lineTo(x - 3, y - 9);
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - 11);
        ctx.stroke();
      } else {
        px(x - 8, y - 4, 16, 4, rgba(pal.haze, 0.48));
        px(x - 8, y - 4, 16, 1, "rgba(255,246,218,0.18)");
        px(x - 4, y - 6, 8, 2, rgba(pal.ground, 0.7));
        px(x + 4, y - 1, 2, 1, "rgba(12,10,7,0.45)");
      }
    }

    // A posição inicial aliada recebe um pequeno posto de comando.
    if (t.index === 0) {
      const fy = top + 12;
      px(t.x - 1, fy, 2, 20, "rgba(26,24,18,0.9)");
      px(t.x + 1, fy + 1, 12, 8, rgba(owner, 0.85));
      px(t.x + 1, fy + 1, 12, 1, "rgba(255,246,218,0.35)");
      px(t.x - 4, fy + 20, 8, 2, "rgba(20,18,12,0.7)");
    }

    if (t.owner !== "neutral") {
      ctx.strokeStyle = rgba(owner, 0.35);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(t.x + (t.owner === "player" ? -16 : 16), top + 6);
      ctx.lineTo(t.x + (t.owner === "player" ? -16 : 16), bottom - 6);
      ctx.stroke();
    }

    if (t.flash > 0) {
      ctx.fillStyle = rgba(owner, t.flash * 0.15);
      ctx.fillRect(t.x - 22, top, 44, bottom - top);
    }

    // Marcador discreto da posição.
    ctx.fillStyle = "rgba(8,10,7,0.72)";
    ctx.beginPath();
    ctx.arc(t.x, top + 3, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(owner, 0.7);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(t.x, top + 3, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = rgba(owner, 0.9);
    ctx.font = "700 8px 'Silkscreen', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(t.index + 1), t.x, top + 3.5);

    if (selected) {
      const pulse = 0.55 + Math.sin(G.sceneTime * 3.5) * 0.22;
      ctx.strokeStyle = `rgba(231,194,106,${pulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -G.sceneTime * 20;
      ctx.beginPath();
      ctx.moveTo(t.x, top - 5);
      ctx.lineTo(t.x, bottom + 5);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (hovered) {
      ctx.strokeStyle = "rgba(231,194,106,0.28)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(t.x, top - 2);
      ctx.lineTo(t.x, bottom + 2);
      ctx.stroke();
    }
  }

  function drawTrench(t) {
    const top = G.fieldTop + 8;
    const bottom = G.fieldBottom - 4;
    const pal = G.battle.palette;
    const owner = OWNER_COLORS[t.owner] || OWNER_COLORS.neutral;
    const selected = G.selected === t.index;
    const hovered = G.hoverTrench === t.index && t.owner === "player";

    ctx.fillStyle = "rgba(18,15,11,0.42)";
    rr(t.x - 15, top, 30, bottom - top, 8);
    ctx.fill();

    ctx.strokeStyle = "rgba(28,22,16,0.75)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(t.x, top + 4);
    ctx.lineTo(t.x, bottom - 2);
    ctx.stroke();

    ctx.strokeStyle = rgba(owner, 0.24 + (t.owner === "neutral" ? 0 : 0.14));
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(t.x, top + 5);
    ctx.lineTo(t.x, bottom - 3);
    ctx.stroke();

    const sandStep = quality().trenchStep;
    for (let y = top + 7, i = 0; y < bottom - 2; y += sandStep, i++) {
      const wobble = Math.sin((y + t.index * 17) * 0.35) * 1.8;
      ctx.fillStyle = i % 2 === 0 ? rgba(pal.ground, 0.8) : rgba(pal.haze, 0.55);
      ctx.beginPath();
      ctx.ellipse(t.x - 13 + wobble, y, 8, 4, 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = i % 2 === 0 ? rgba(pal.haze, 0.55) : rgba(pal.ground, 0.75);
      ctx.beginPath();
      ctx.ellipse(t.x + 13 - wobble, y + 8, 8, 4, -0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    if (t.owner !== "neutral") {
      ctx.strokeStyle = rgba(owner, 0.5);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(t.x + (t.owner === "player" ? -17 : 17), top + 4);
      ctx.lineTo(t.x + (t.owner === "player" ? -17 : 17), bottom - 4);
      ctx.stroke();
    }

    if (t.flash > 0) {
      ctx.fillStyle = rgba(owner, t.flash * 0.15);
      ctx.fillRect(t.x - 22, top, 44, bottom - top);
    }

    ctx.fillStyle = "rgba(8,10,7,0.8)";
    ctx.beginPath();
    ctx.arc(t.x, top + 3, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(owner, 0.85);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(t.x, top + 3, 8.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = rgba(owner, 0.95);
    ctx.font = "700 9px 'Silkscreen', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(t.index + 1), t.x, top + 3.5);

    if (selected) {
      const pulse = 0.55 + Math.sin(G.sceneTime * 3.5) * 0.22;
      ctx.strokeStyle = `rgba(231,194,106,${pulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -G.sceneTime * 20;
      ctx.beginPath();
      ctx.moveTo(t.x, top - 5);
      ctx.lineTo(t.x, bottom + 5);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = `rgba(231,194,106,${pulse + 0.15})`;
      ctx.lineWidth = 2.4;
      ["top", "bottom"].forEach((where) => {
        const y = where === "top" ? top - 5 : bottom + 5;
        ctx.beginPath();
        ctx.moveTo(t.x - 11, y + (where === "top" ? 7 : -7));
        ctx.lineTo(t.x - 11, y);
        ctx.lineTo(t.x + 11, y);
        ctx.lineTo(t.x + 11, y + (where === "top" ? 7 : -7));
        ctx.stroke();
      });
    } else if (hovered) {
      ctx.strokeStyle = "rgba(231,194,106,0.28)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(t.x, top - 2);
      ctx.lineTo(t.x, bottom + 2);
      ctx.stroke();
    }
  }

  function drawBunkers() {
    if (!G || !G.bunkers || !G.bunkers.length) return;
    G.bunkers.forEach((b) => {
      const x = b.x;
      const y = b.y;
      const w = 54;
      const h = 30;

      if (!b.mg || b.mg.dead) {
        px(x - w / 2 + 4, y - 5, w - 6, 5, "rgba(52,52,48,0.78)");
        px(x - 12, y - 11, 9, 6, "rgba(72,70,64,0.85)");
        px(x + 5, y - 9, 12, 4, "rgba(68,66,60,0.85)");
        px(x + 18, y - 6, 7, 3, "rgba(58,56,52,0.8)");
        return;
      }

      ctx.fillStyle = "rgba(0,0,0,0.34)";
      ctx.beginPath();
      ctx.ellipse(x + 5, y + 6, w * 0.62, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Corpo de concreto.
      px(x - w / 2 + 5, y - h, w, h, "rgba(88,90,84,0.98)");
      px(x - w / 2 + 5, y - h, w, 3, "rgba(132,134,122,0.8)");
      px(x - w / 2 + 5, y - 4, w, 4, "rgba(52,54,50,0.95)");
      px(x - w / 2 + 5, y - h + 6, w, 1, "rgba(64,66,60,0.6)");

      // Telhado inclinado e laje.
      px(x - w / 2 + 1, y - h - 5, w - 2, 6, "rgba(72,74,68,0.98)");
      px(x - w / 2 + 9, y - h - 8, w - 20, 4, "rgba(96,98,88,0.95)");

      // Seteira virada para a praia, com cano de metralhadora.
      px(x - w / 2 + 3, y - h + 9, 11, 7, "rgba(12,14,14,0.96)");
      px(x - w / 2 + 3, y - h + 9, 11, 1, "rgba(150,152,138,0.4)");
      px(x - w / 2 - 3, y - h + 11, 9, 2, "rgba(24,24,22,0.95)");

      // Manchas e marcas de desgaste.
      px(x - 6, y - h + 4, 2, h - 8, "rgba(44,46,42,0.35)");
      px(x + 10, y - h + 6, 1, h - 10, "rgba(44,46,42,0.28)");
      px(x + 16, y - h + 10, 2, 2, "rgba(40,42,38,0.4)");

      // Sacos de areia na base.
      for (let i = 0; i < 4; i++) {
        const bx = x - w / 2 + 8 + i * 10;
        px(bx, y - 3 - (i % 2) * 2, 9, 3, "rgba(120,112,88,0.85)");
        px(bx, y - 3 - (i % 2) * 2, 9, 1, "rgba(190,180,150,0.25)");
      }
    });
  }

  function drawBoats() {
    if (!G || !G.boats || !G.boats.length) return;
    G.boats.forEach((b) => {
      drawBoat(b);
      b.units.forEach((u) => {
        if (!u || u.dead || u.state !== "aboard") return;
        drawUnit(u);
      });
    });
  }

  function drawBoat(b) {
    const x = b.x;
    const y = b.y + (b.bob || 0);
    const w = 34;

    // Esteira de espuma deixada pelo bote (não enquanto carrega tropas).
    if (!b.landed && !b.loading) {
      const wake = ctx.createLinearGradient(x - w - 28, 0, x - w, 0);
      wake.addColorStop(0, "rgba(190,210,208,0)");
      wake.addColorStop(1, "rgba(190,210,208,0.22)");
      ctx.fillStyle = wake;
      ctx.beginPath();
      ctx.moveTo(x - w - 28, y + 2);
      ctx.lineTo(x - w, y - 3);
      ctx.lineTo(x - w, y + 6);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(x, y + 5, w + 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Casco, bordas e rampa de desembarque.
    px(x - w, y - 6, w * 2, 12, "rgba(52,56,52,0.98)");
    px(x - w, y - 6, w * 2, 2, "rgba(104,108,96,0.55)");
    px(x - w, y + 4, w * 2, 2, "rgba(28,32,30,0.9)");
    px(x - w, y - 9, w * 2, 3, "rgba(74,78,70,0.95)");
    for (let rx = x - w + 4; rx < x + w; rx += 9) {
      px(rx, y - 9, 2, 3, "rgba(96,100,90,0.7)");
    }
    px(x + w - 2, y - 8, 10, 14, "rgba(66,70,64,0.98)");
    px(x + w + 6, y - 7, 2, 12, "rgba(40,44,40,0.9)");
    px(x - w - 4, y - 4, 5, 8, "rgba(40,44,40,0.95)");
    px(x - w + 2, y + 6, w * 2 - 4, 1, "rgba(200,220,216,0.3)");
    px(x - w + 6, y - 3, 8, 1, "rgba(126,74,50,0.4)");

    // Quadrado de 4 posições: mostra quantos soldados já foram comprados
    // para este bote.
    if (b.loading) {
      const onBoard = b.units.filter((u) => u && !u.dead && u.state === "aboard").length;
      const s = 6;
      const sp = 2;
      const total = s * 2 + sp;
      const sx = x - total / 2;
      const sy = y - 26;
      for (let i = 0; i < 4; i++) {
        const gx = sx + (i % 2) * (s + sp);
        const gy = sy + Math.floor(i / 2) * (s + sp);
        ctx.fillStyle = i < onBoard ? "rgba(231,194,106,0.95)" : "rgba(16,24,26,0.6)";
        ctx.fillRect(gx, gy, s, s);
        ctx.strokeStyle = "rgba(231,194,106,0.7)";
        ctx.lineWidth = 1;
        ctx.strokeRect(gx + 0.5, gy + 0.5, s - 1, s - 1);
      }
    }
  }

  function drawGloomOverlay() {
    if (!isDDay()) return;
    // Luz cinzenta e fria, própria do tempo encoberto na Normandia.
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(20,30,38,0.3)");
    g.addColorStop(0.5, "rgba(24,32,36,0.14)");
    g.addColorStop(1, "rgba(10,14,16,0.34)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const v = ctx.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.25, W / 2, H * 0.5, Math.max(W, H) * 0.72);
    v.addColorStop(0, "rgba(10,16,20,0)");
    v.addColorStop(1, "rgba(8,12,16,0.42)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  function drawUnits() {
    const sorted = G.units.slice().sort((a, b) => a.y - b.y);
    sorted.forEach((u) => {
      if (u.dead || u.state === "aboard") return;
      drawUnit(u);
    });
  }

  function drawUnit(u) {
    const colors = colorsForUnit(u);
    const x = u.x;
    const y = u.y + (u.state === "moving" ? Math.sin(u.walk) * 1.8 : Math.sin(G.sceneTime * 1.6 + u.id) * 0.6);
    const facing = inTransit(u) ? u.facing : (u.side === "player" ? 1 : -1);
    const selected = u.side === "player" && u.trench === G.selected && !inTransit(u);

    if (selected) {
      const pulse = 0.35 + Math.sin(G.sceneTime * 3.4) * 0.12;
      ctx.strokeStyle = `rgba(231,194,106,${pulse})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(x, y + 8, u.type === "tank" ? 46 : 22, u.type === "tank" ? 9 : 6.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(x, y);

    // Sombra elíptica comum a todas as tropas.
    if (quality().shadows) {
      ctx.fillStyle = "rgba(0,0,0,0.34)";
      ctx.beginPath();
      ctx.ellipse(0, u.type === "tank" ? 8 : 7, u.type === "tank" ? 44 : 15, u.type === "tank" ? 8 : 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (u.type === "tank") {
      drawTankUnit(u, colors, facing);
    } else {
      drawSoldierUnit(u, colors, facing);
    }

    if (u.flash > 0.03) {
      ctx.globalAlpha = clamp(u.flash * 3, 0, 0.4);
      ctx.fillStyle = "#fff3cf";
      ctx.beginPath();
      ctx.arc(0, u.type === "tank" ? -16 : -12, u.type === "tank" ? 20 : 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    if (u.hp < u.maxHp || selected) {
      drawUnitHealth(u, x, y);
    }
  }

  function drawSoldierUnit(u, colors, facing) {
    const moving = u.state === "moving";
    const swing = moving ? Math.sin(u.walk * 1.7) : 0;
    const stride = Math.round(swing * 2.2);
    const bob = moving
      ? (Math.abs(Math.sin(u.walk * 1.7)) > 0.55 ? -1 : 0)
      : (Math.sin(G.sceneTime * 1.6 + u.id) > 0.88 ? -1 : 0);

    ctx.save();
    if (facing < 0) ctx.scale(-1, 1);
    ctx.scale(SOLDIER_SCALE, SOLDIER_SCALE);
    // Mantém os pés na mesma linha de solo e aplica o balanço em pixels de tela.
    ctx.translate(0, bob / SOLDIER_SCALE - 3.5);

    // Pernas e botas: uma perna recua enquanto a outra avança.
    px(-2 + stride, 1, 2, 4, colors.pantsDark);
    px(-3 + stride, 5, 3, 2, colors.boots);
    px(1 - stride, 0, 2, 5, colors.pants);
    px(0 - stride, 5, 3, 2, colors.boots);

    // Tronco, cinto e mochila.
    px(-3, -7, 6, 8, colors.body);
    px(-3, -7, 2, 8, colors.bodyDark);
    px(1, -6, 2, 7, colors.bodyLight);
    px(-3, -8, 6, 1, colors.bodyLight);
    px(-3, -1, 6, 1, colors.boots);
    px(-1, -1, 1, 1, colors.accent);

    if (u.type === "medic") {
      px(-6, -6, 3, 6, "#e9e5d7");
      px(-5, -5, 1, 3, "#b8453c");
      px(-6, -4, 3, 1, "#b8453c");
    } else {
      px(-5, -6, 2, 5, colors.bodyDark);
      px(-5, -6, 2, 1, colors.body);
    }

    // Cabeça e capacete.
    px(-2, -11, 5, 4, colors.skin);
    px(-2, -11, 1, 4, colors.skinDark);
    px(2, -10, 1, 1, colors.outline);
    px(-3, -13, 6, 2, colors.helmet);
    px(-4, -11, 8, 1, colors.helmetDark);
    px(-2, -14, 4, 1, colors.helmet);
    px(2, -12, 1, 1, colors.helmetDark);

    // Braço da frente segurando a arma.
    px(1, -6, 2, 3, colors.bodyLight);
    px(2, -4, 2, 2, colors.skin);

    let muzzleX = 0;
    let muzzleY = -3;

    if (u.type === "rifle") {
      px(0, -4, 3, 2, colors.rifleLight);
      px(2, -4, 9, 1, colors.rifle);
      px(2, -3, 5, 1, colors.rifleLight);
      muzzleX = 11; muzzleY = -4;
    } else if (u.type === "smg") {
      px(0, -4, 3, 2, colors.rifleLight);
      px(2, -4, 6, 2, colors.rifle);
      px(3, -2, 1, 2, colors.rifle);
      muzzleX = 8; muzzleY = -3;
    } else if (u.type === "mg") {
      px(-1, -4, 4, 2, colors.rifleLight);
      px(2, -4, 9, 2, colors.rifle);
      px(2, -2, 2, 2, colors.rifleLight);
      px(7, -2, 1, 4, colors.rifle);
      px(10, -2, 1, 4, colors.rifle);
      muzzleX = 11; muzzleY = -3;
    } else if (u.type === "sniper") {
      px(0, -4, 3, 2, colors.rifleLight);
      px(2, -4, 12, 1, colors.rifle);
      px(4, -6, 3, 1, colors.rifleLight);
      px(5, -5, 1, 1, colors.rifleLight);
      muzzleX = 14; muzzleY = -4;
    } else if (u.type === "at") {
      px(-2, -7, 4, 2, colors.rifleLight);
      px(1, -7, 9, 2, colors.rifle);
      px(9, -7, 3, 2, colors.rifleLight);
      muzzleX = 12; muzzleY = -6;
    } else if (u.type === "mortar") {
      px(-1, 0, 5, 1, colors.rifle);
      px(2, -2, 1, 2, colors.rifle);
      px(3, -4, 1, 2, colors.rifle);
      px(4, -6, 1, 2, colors.rifleLight);
      px(5, -8, 1, 2, colors.rifleLight);
      muzzleX = 5; muzzleY = -9;
    } else if (u.type === "medic") {
      px(2, -4, 2, 2, colors.skin);
      px(3, -3, 2, 1, "#e9e5d7");
      px(4, -4, 1, 3, "#b8453c");
    }

    if (u.flash > 0.06 && u.type !== "medic") {
      px(muzzleX, muzzleY - 1, 3, 3, "rgba(255,222,140,0.95)");
      px(muzzleX + 1, muzzleY - 2, 1, 1, "rgba(255,248,214,0.9)");
      px(muzzleX - 1, muzzleY, 1, 1, "rgba(255,176,90,0.85)");
    }

    ctx.restore();
  }

  function drawTankUnit(u, colors, facing) {
    ctx.save();
    if (facing < 0) ctx.scale(-1, 1);
    ctx.scale(TANK_SCALE, TANK_SCALE);
    // Mantém as esteiras apoiadas na mesma linha de solo dos soldados.
    ctx.translate(0, 8 / TANK_SCALE - 8);

    const roll = u.state === "moving" ? Math.floor(u.walk * 1.4) % 2 : 0;

    // Esteira e rodas.
    px(-17, 3, 34, 5, colors.outline);
    px(-16, 4, 32, 3, "#26251f");
    for (let x = -15; x <= 14; x += 4) {
      px(x + roll, 5, 2, 2, "#4b493d");
      px(x + roll, 4, 1, 1, "#6d6a58");
    }
    px(-18, 4, 2, 3, colors.outline);
    px(17, 4, 2, 3, colors.outline);

    // Casco com frente inclinada.
    px(-15, -2, 29, 5, colors.body);
    px(-15, -2, 29, 1, colors.bodyLight);
    px(-15, 2, 29, 1, colors.bodyDark);
    px(13, -3, 3, 2, colors.body);
    px(15, -2, 2, 1, colors.bodyLight);
    px(-18, -2, 3, 5, colors.bodyDark);
    px(-18, -1, 3, 1, colors.body);

    // Detalhes do casco.
    px(-10, -1, 5, 1, colors.bodyDark);
    px(-2, 0, 7, 1, colors.bodyDark);
    px(8, -1, 4, 1, colors.bodyDark);
    px(-13, 1, 2, 1, colors.outline);
    px(-4, 1, 2, 1, colors.outline);

    // Torre e mantelete.
    px(-7, -8, 13, 6, colors.body);
    px(-7, -8, 13, 1, colors.bodyLight);
    px(-7, -3, 13, 1, colors.bodyDark);
    px(-5, -9, 9, 1, colors.bodyLight);
    px(4, -7, 3, 4, colors.bodyDark);
    px(5, -6, 2, 2, colors.rifleLight);

    // Canhão.
    px(6, -7, 12, 2, colors.rifle);
    px(6, -7, 12, 1, colors.rifleLight);
    px(17, -7, 3, 2, colors.outline);

    // Marcações e farol.
    px(-12, -6, 4, 1, colors.accent);
    px(13, -2, 2, 1, "rgba(255,236,170,0.7)");

    ctx.restore();
  }

  function drawUnitHealth(u, x, y) {
    const ratio = clamp(u.hp / u.maxHp, 0, 1);
    const tank = u.type === "tank";
    const w = tank ? 76 : 42;
    const top = Math.round(y - (tank ? 42 : 40));
    px(x - w / 2 - 1, top - 1, w + 2, 5, "rgba(5,7,5,0.82)");
    px(x - w / 2, top, w, 3, "rgba(255,255,255,0.08)");
    px(x - w / 2, top, Math.max(1, w * ratio), 3, ratio > 0.55 ? "#8fb98a" : ratio > 0.28 ? "#d5b15f" : "#c9614b");
  }

  function drawOrderArrows() {
    if (!G) return;
    G.trenches.forEach((t) => {
      if (t.owner !== "player" || !isStopTrench(t.index)) return;
      const rects = orderButtonRects(t);
      const hasTroops = stationedUnits(t.index, "player").length > 0;
      const hover = G.orderHover && G.orderHover.index === t.index ? G.orderHover : null;
      if (!isDDay()) drawBlockButton(rects.block, t.blocked !== false, Boolean(hover && hover.block));
      drawOrderArrow(rects.attack, 1, hasTroops && attackTargetFrom(t.index) >= 0, Boolean(hover && hover.dir === 1));
      drawOrderArrow(rects.retreat, -1, hasTroops && retreatTargetFrom(t.index) >= 0, Boolean(hover && hover.dir === -1));
    });
  }

  function drawBlockButton(r, blocked, hovered) {
    const bg = blocked
      ? (hovered ? "rgba(156,67,52,0.42)" : "rgba(48,21,17,0.88)")
      : (hovered ? "rgba(118,158,99,0.42)" : "rgba(16,34,20,0.88)");
    px(r.x, r.y, r.w, r.h, bg);

    ctx.strokeStyle = blocked
      ? (hovered ? "#ffb29a" : "rgba(211,106,79,0.76)")
      : (hovered ? "#c6eca9" : "rgba(143,185,138,0.76)");
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);

    const iconX = r.x + Math.max(7, Math.round(r.h * 0.62));
    const cy = r.y + r.h / 2;
    const col = blocked ? "#ffd0bd" : "#d6f0c4";
    if (blocked) {
      px(iconX - 2, cy - 1, 5, 4, col);
      px(iconX - 1, cy - 4, 3, 1, col);
      px(iconX - 2, cy - 3, 1, 3, col);
      px(iconX + 2, cy - 3, 1, 3, col);
    } else {
      px(iconX - 4, cy - 1, 3, 2, col);
      px(iconX - 2, cy - 3, 2, 2, col);
      px(iconX, cy - 1, 3, 2, col);
      px(iconX + 2, cy - 3, 2, 2, col);
    }

    ctx.fillStyle = col;
    const fs = Math.max(7, Math.round(r.h * 0.55));
    ctx.font = `700 ${fs}px 'Silkscreen', monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(blocked ? "BLOQ" : "PASSAR", r.x + r.w / 2 + 3, cy + 0.5);
  }

  function drawOrderArrow(r, dir, enabled, hovered) {
    const bg = enabled
      ? (hovered ? "rgba(231,194,106,0.28)" : "rgba(9,13,10,0.82)")
      : "rgba(9,13,10,0.42)";
    px(r.x, r.y, r.w, r.h, bg);
    px(r.x, r.y, r.w, 1, enabled ? "rgba(255,246,218,0.2)" : "rgba(255,255,255,0.06)");

    ctx.strokeStyle = enabled
      ? (hovered ? "#ffe6a8" : "rgba(231,194,106,0.62)")
      : "rgba(150,156,140,0.26)";
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);

    const u = Math.max(2, Math.round(r.w * 0.11));
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const col = enabled ? (hovered ? "#fff0c0" : "#e7c26a") : "rgba(155,160,145,0.4)";
    if (dir > 0) {
      px(cx - u * 2, cy - u * 3, u, u * 6, col);
      px(cx - u, cy - u * 2, u, u * 4, col);
      px(cx, cy - u, u, u * 2, col);
      px(cx + u, cy - u * 0.5, u, u, col);
    } else {
      px(cx + u, cy - u * 3, u, u * 6, col);
      px(cx, cy - u * 2, u, u * 4, col);
      px(cx - u, cy - u, u, u * 2, col);
      px(cx - u * 2, cy - u * 0.5, u, u, col);
    }

    if (hovered && enabled) {
      px(r.x - 1, r.y - 1, r.w + 2, 1, "rgba(255,230,168,0.5)");
      px(r.x - 1, r.y + r.h, r.w + 2, 1, "rgba(255,230,168,0.5)");
    }
  }

  function drawEffects() {
    const q = quality();
    G.grenades.forEach((g) => {
      ctx.fillStyle = "rgba(18,22,18,0.95)";
      ctx.beginPath();
      ctx.arc(g.x, g.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,220,150,0.9)";
      ctx.fillRect(g.x - 1, g.y - 4.5, 2, 2);
    });
    G.tracers.forEach((t) => {
      const a = clamp(t.life / t.maxLife, 0, 1);
      ctx.strokeStyle = t.color;
      ctx.globalAlpha = a;
      ctx.lineWidth = t.width;
      ctx.beginPath();
      ctx.moveTo(t.x1, t.y1);
      ctx.lineTo(t.x2, t.y2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    if (q.effects >= 0.55) {
      G.rings.forEach((r) => {
        const a = clamp(r.life / r.maxLife, 0, 1);
        ctx.strokeStyle = r.color.replace(/[\d.]+\)$/, `${a * 0.8})`);
        ctx.lineWidth = 2.4 * a;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
      });
    }

    G.particles.forEach((p) => {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      const s = Math.max(0.7, p.size * a);
      if (q.simpleParticles) {
        ctx.fillRect(p.x - s, p.y - s, s * 2, s * 2);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });

    G.floaters.forEach((f) => {
      const a = clamp(f.life / f.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = f.color;
      ctx.font = "700 10px 'Silkscreen', monospace";
      ctx.textAlign = "center";
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    });
  }

  function drawWeather() {
    if (!G || !G.scenery) return;
    const weather = G.battle.weather;
    if (weather === "clear") return;
    const flakes = G.scenery.flakes;
    const q = quality();
    const step = Math.max(1, Math.round(1 / Math.max(0.1, q.weather)));
    ctx.save();
    if (weather === "overcast") {
      // Garoa fina e constante sob o céu encoberto.
      ctx.strokeStyle = "rgba(170,192,198,0.2)";
      ctx.lineWidth = 1;
      for (let i = 0; i < flakes.length; i += step) {
        const f = flakes[i];
        const x = mod(f.x + G.sceneTime * f.drift * 14, W + 20) - 10;
        const y = mod(f.y + G.sceneTime * f.sp * 150, H + 16) - 8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 1, y + 5);
        ctx.stroke();
      }
    } else if (weather === "rain") {
      ctx.strokeStyle = "rgba(180,205,215,0.36)";
      ctx.lineWidth = 1;
      for (let i = 0; i < flakes.length; i += step) {
        const f = flakes[i];
        const x = mod(f.x + G.sceneTime * f.drift * 24, W + 30) - 15;
        const y = mod(f.y + G.sceneTime * f.sp * 260, H + 20) - 10;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 1.5, y + 10);
        ctx.stroke();
      }
    } else {
      const snow = weather === "snow";
      ctx.fillStyle = snow ? "rgba(240,246,252,0.72)" : "rgba(228,148,92,0.42)";
      for (let i = 0; i < flakes.length; i += step) {
        const f = flakes[i];
        const x = mod(f.x + G.sceneTime * f.drift * (snow ? 20 : 30), W + 20) - 10;
        const y = mod(f.y + G.sceneTime * f.sp * (snow ? 72 : 110), H + 20) - 10;
        if (q.simpleParticles) {
          ctx.fillRect(x, y, f.size * 1.6, f.size * 1.6);
        } else {
          ctx.beginPath();
          ctx.arc(x, y, f.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  function drawScreenFlash() {
    if (!G || G.flash <= 0) return;
    if (quality().effects < 0.55) return;
    const a = clamp(G.flash * 0.16, 0, 0.22);
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, "rgba(180,50,35,0)");
    g.addColorStop(1, `rgba(180,50,35,${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  /* ------------------------------------------------------------
     Entrada — canvas, HUD e teclado
     ------------------------------------------------------------ */
  function updatePointer(e) {
    if (!G) return;
    const rect = canvasEl.getBoundingClientRect();
    const x = clamp(e.clientX - rect.left, 0, W);
    const y = clamp(e.clientY - rect.top, 0, H);
    G.pointer = { x, y };
    G.orderHover = arrowAt(x, y);
    G.hoverTrench = G.orderHover ? null : trenchAt(x, y);
    canvasEl.style.cursor = G.orderHover ? "pointer" : "crosshair";
  }

  function trenchAt(x, y) {
    if (!G) return null;
    if (y < G.fieldTop - 14 || y > G.fieldBottom + 18) return null;
    let best = null;
    let bestDist = Infinity;
    G.trenches.forEach((t) => {
      if (!isStopTrench(t.index)) return;
      const d = Math.abs(x - t.x);
      if (d < bestDist) {
        bestDist = d;
        best = t;
      }
    });
    const threshold = Math.max(24, Math.min(52, W * 0.035));
    return best && bestDist <= threshold ? best.index : null;
  }

  canvasEl.addEventListener("pointermove", updatePointer);
  canvasEl.addEventListener("pointerleave", () => {
    if (!G) return;
    G.orderHover = null;
    G.hoverTrench = null;
    canvasEl.style.cursor = "crosshair";
  });
  canvasEl.addEventListener("pointerdown", (e) => {
    if (!G || G.phase !== "playing") return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    updatePointer(e);
    if (G.orderHover) {
      const { index, dir, block } = G.orderHover;
      G.selected = index;
      if (block) toggleTrenchBlock(index);
      else if (dir > 0) orderAttack(index);
      else orderRetreat(index);
      updateHud(true);
      e.preventDefault();
      return;
    }
    const idx = G.hoverTrench;
    if (idx == null) return;
    if (G.trenches[idx].owner === "player") selectTrench(idx);
    else showGameToast("Essa trincheira não está sob seu controle.");
    e.preventDefault();
  });
  canvasEl.addEventListener("contextmenu", (e) => e.preventDefault());

  $("#game-pause").addEventListener("click", () => {
    if (!G) return;
    if (G.phase === "playing") pauseGame();
    else if (G.phase === "paused") resumeGame();
  });

  $("#game-overlay").addEventListener("click", (e) => {
    const btn = e.target instanceof Element ? e.target.closest("[data-overlay-action]") : null;
    if (!btn || !G) return;
    const action = btn.dataset.overlayAction;
    if (action === "start") beginCombat();
    else if (action === "resume") resumeGame();
    else if (action === "restart") startBattle(G.battle);
    else if (action === "abandon") exitGame();
    else if (action === "briefing") exitToBriefing();
  });

  $("#unit-shop").addEventListener("click", (e) => {
    const btn = e.target instanceof Element ? e.target.closest("[data-buy]") : null;
    if (btn) buyUnit(btn.dataset.buy);
  });

  document.addEventListener("keydown", (e) => {
    if (modalData) {
      if (e.key === "Escape" && modalData.opts.dismissible !== false) { e.preventDefault(); closeModal(); return; }
      if (e.key === "Tab") {
        const focusables = $$("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])", modalData.panel).filter((el) => !el.disabled && el.offsetParent !== null);
        if (focusables.length) {
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
      return;
    }

    if (G) {
      if (e.key === "Escape" || e.key === "p" || e.key === "P") {
        if (G.phase === "playing") { e.preventDefault(); pauseGame(); }
        else if (G.phase === "paused") { e.preventDefault(); resumeGame(); }
        return;
      }
      if (G.phase !== "playing") return;
      if (e.code === "KeyA" || e.code === "KeyQ") { e.preventDefault(); orderAttack(); }
      else if (e.code === "KeyR" || e.code === "KeyE") { e.preventDefault(); orderRetreat(); }
      else if (e.code === "KeyB") {
        e.preventDefault();
        const idx = isStopTrench(G.selected) && G.trenches[G.selected]?.owner === "player" ? G.selected : orderSourceIndex();
        if (idx != null) toggleTrenchBlock(idx);
      }
      else if (/^Digit[1-8]$/.test(e.code)) {
        e.preventDefault();
        if (e.repeat) return;
        const type = G.shopOrder[parseInt(e.code.slice(5), 10) - 1];
        if (type) buyUnit(type);
      }
      return;
    }

    if ($("#view-campaign")?.classList.contains("active") && /^[a-z]$/i.test(e.key) && !e.repeat && !e.ctrlKey && !e.altKey && !e.metaKey) {
      unlockBuffer = (unlockBuffer + e.key.toLowerCase()).slice(-UNLOCK_CODE.length);
      if (unlockBuffer === UNLOCK_CODE) {
        unlockBuffer = "";
        if (!save.unlockedAll) {
          save.unlockedAll = true;
          persist();
          renderAll();
          toast("Código secreto ativado", "Todas as batalhas foram desbloqueadas!");
        }
      }
    }

    if ((e.key === "Enter" || e.key === " ") && document.activeElement?.classList?.contains("battle-card")) {
      e.preventDefault();
      openBattleById(document.activeElement.dataset.battleId);
    }
  });

  function relayoutField(force = false) {
    if (!G) return;
    const prevTop = G.fieldTop;
    const prevBottom = G.fieldBottom;
    layoutBattlefield();
    const changed = Math.abs(prevTop - G.fieldTop) > 0.5 || Math.abs(prevBottom - G.fieldBottom) > 0.5;
    if (force || changed) {
      buildScenery();
      G.trenchSig = "";
      updateHud(true);
    }
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { if (G) relayoutField(true); });
  }

  window.addEventListener("resize", () => {
    if (!G) return;
    resizeCanvas();
    relayoutField(true);
  });

  if (typeof ResizeObserver !== "undefined") {
    const dockEl = $("#battle-dock");
    const topEl = $(".game-top");
    const observer = new ResizeObserver(() => relayoutField());
    if (dockEl) observer.observe(dockEl);
    if (topEl) observer.observe(topEl);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && G && G.phase === "playing") pauseGame();
  });

  /* ------------------------------------------------------------
     Fundo do hero: ordem das fotos aleatória a cada carregamento
     ------------------------------------------------------------ */
  (function shuffleHeroBackground() {
    const layers = document.querySelectorAll(".hero-bg span");
    if (!layers.length) return;
    const images = [
      "Images/Bg1.jpg",
      "Images/Bg2.png",
      "Images/Bg3.jpg",
      "Images/Bg4.jpg",
      "Images/Bg5.jpg",
      "Images/Bg6.jpg",
    ];
    for (let i = images.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [images[i], images[j]] = [images[j], images[i]];
    }
    layers.forEach((layer, i) => {
      layer.style.backgroundImage = `url("${images[i]}")`;
      layer.style.animationDelay = `${i * 7}s`;
    });
  })();

  /* ------------------------------------------------------------
     Inicialização da campanha
     ------------------------------------------------------------ */
  renderAll();
  showView("campaign");
  const resetProgressBtn = $("#reset-progress");
  if (resetProgressBtn) resetProgressBtn.addEventListener("click", openConfirmReset);
})();
