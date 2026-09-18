/* ==========================================================================
   CodeAlpha Hangman Game — Premium Chrome Edition
   Frontend logic: UI rendering, animations and fetch() calls to Flask.

   The browser NEVER decides the rules: every guess is sent to the Python
   backend (/api/guess) and the returned state is simply displayed here.
   ========================================================================== */

"use strict";

(() => {
  /* ---------- Element references ---------- */
  const els = {
    statusChip: document.getElementById("status-chip"),
    statusText: document.getElementById("status-text"),
    newGameButton: document.getElementById("new-game-button"),
    howToPlayButton: document.getElementById("how-to-play-button"),
    statAttempts: document.getElementById("stat-attempts"),
    statWrong: document.getElementById("stat-wrong"),
    statScore: document.getElementById("stat-score"),
    statStreak: document.getElementById("stat-streak"),
    wordTiles: document.getElementById("word-tiles"),
    statusLine: document.getElementById("status-line"),
    letterInput: document.getElementById("letter-input"),
    guessButton: document.getElementById("guess-button"),
    keyboard: document.getElementById("keyboard"),
    particles: document.getElementById("particles"),
    modal: document.getElementById("how-to-play-modal"),
    modalBackdrop: document.getElementById("modal-backdrop"),
    modalCloseButton: document.getElementById("modal-close-button"),
    overlay: document.getElementById("result-overlay"),
    confetti: document.getElementById("confetti"),
    resultCard: document.getElementById("result-card"),
    resultTitle: document.getElementById("result-title"),
    resultSubtitle: document.getElementById("result-subtitle"),
    summaryResult: document.getElementById("summary-result"),
    summaryWord: document.getElementById("summary-word"),
    summaryScore: document.getElementById("summary-score"),
    summaryWrong: document.getElementById("summary-wrong"),
    summaryAttempts: document.getElementById("summary-attempts"),
    summaryStreak: document.getElementById("summary-streak"),
    playAgainButton: document.getElementById("play-again-button"),
    toastContainer: document.getElementById("toast-container"),
  };

  const PART_IDS = ["part-head", "part-body", "part-arm1", "part-arm2", "part-leg1", "part-leg2"];
  const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
  const CONFETTI_COLORS = ["#22d3ee", "#8b5cf6", "#34d399", "#fbbf24", "#fb7185", "#e8eefb"];
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Toast style for each backend message type ("info" stays on the status line). */
  const TOAST_TYPES = { success: "success", danger: "error", warning: "warn" };

  let currentState = null;
  let sending = false;      // true while a request is in flight
  let lastMessage = "";     // prevents duplicate toasts

  /* Last values shown in the statistics bar (used to animate changes). */
  const lastStats = { attempts: 6, wrong: 0, score: 0, streak: 0 };

  /* ======================================================================
     Talking to the Flask backend
     ====================================================================== */

  async function api(path, { method = "GET", body } = {}) {
    const options = { method, headers: { "Content-Type": "application/json" } };
    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }
    const response = await fetch(path, options);
    if (!response.ok) {
      throw new Error("Request failed with status " + response.status);
    }
    return response.json();
  }

  async function startNewGame() {
    if (sending) return;
    sending = true;
    lastMessage = "";
    try {
      const state = await api("/api/new", { method: "POST" });
      hideResult();
      applyState(state);
    } catch (error) {
      showToast("Could not reach the game server. Is app.py still running?", "error");
    } finally {
      sending = false;
    }
  }

  async function sendGuess(rawValue) {
    if (sending) return;

    const letter = String(rawValue !== undefined ? rawValue : els.letterInput.value || "").trim();

    /* Light frontend validation — the Python backend validates again. */
    if (letter === "") {
      showToast("Please enter one letter.", "warn");
      els.letterInput.focus();
      return;
    }
    if (letter.length > 1) {
      showToast("Please enter only one letter at a time.", "warn");
      els.letterInput.select();
      return;
    }
    if (!/^[a-zA-Z]$/.test(letter)) {
      showToast("Please enter a valid alphabet letter.", "warn");
      els.letterInput.select();
      return;
    }

    sending = true;
    try {
      const state = await api("/api/guess", { method: "POST", body: { letter: letter } });
      if (state.clear_input) {
        els.letterInput.value = "";
      } else {
        els.letterInput.select();
      }
      applyState(state);
    } catch (error) {
      showToast("Could not reach the game server. Is app.py still running?", "error");
    } finally {
      sending = false;
    }
  }

  /* ======================================================================
     Rendering the game state
     ====================================================================== */

  function applyState(state) {
    currentState = state;
    renderStatusChip(state);
    renderTiles(state);
    renderStatusLine(state);
    renderHangman(state);
    renderStats(state);
    updateKeyboard(state);
    applyControls(state);
    maybeToast(state);

    if (state.status === "won" || state.status === "lost") {
      showResult(state);
    }
  }

  function renderStatusChip(state) {
    els.statusChip.classList.remove("playing", "won", "lost");
    els.statusChip.classList.add(state.status);

    if (state.status === "won") {
      els.statusText.textContent = "YOU WON";
      document.title = "You won! — CodeAlpha Hangman";
    } else if (state.status === "lost") {
      els.statusText.textContent = "GAME OVER";
      document.title = "Game over — CodeAlpha Hangman";
    } else {
      els.statusText.textContent = "LIVE GAME";
      document.title = "CodeAlpha Hangman — Premium Edition";
    }
  }

  function renderTiles(state) {
    const display = state.word_display;

    /* Rebuild the tiles only when the number of letters changes. */
    if (els.wordTiles.children.length !== display.length) {
      els.wordTiles.innerHTML = "";
      display.forEach(() => {
        const tile = document.createElement("span");
        tile.className = "tile";
        els.wordTiles.appendChild(tile);
      });
    }

    Array.from(els.wordTiles.children).forEach((tile, index) => {
      const char = display[index];
      if (tile.textContent !== char) {
        tile.textContent = char;
      }
      tile.classList.toggle("revealed", char !== "_");
    });
  }

  function renderStatusLine(state) {
    els.statusLine.textContent = state.message;
    els.statusLine.className = "status-line " + (state.message_type || "info");
  }

  function renderHangman(state) {
    const wrongCount = state.wrong_letters.length;
    PART_IDS.forEach((id, index) => {
      const part = document.getElementById(id);
      if (part) {
        part.classList.toggle("shown", index < wrongCount);
      }
    });
  }

  function renderStats(state) {
    animateNumber(els.statAttempts, lastStats.attempts, state.attempts_left, (v) => String(v));
    animateNumber(els.statWrong, lastStats.wrong, state.attempts_used, (v) => v + " / " + state.attempts_max);
    animateNumber(els.statScore, lastStats.score, state.score, (v) => String(v));
    animateNumber(els.statStreak, lastStats.streak, state.streak, (v) => String(v));

    lastStats.attempts = state.attempts_left;
    lastStats.wrong = state.attempts_used;
    lastStats.score = state.score;
    lastStats.streak = state.streak;
  }

  /* Count-up animation for a statistic value. */
  function animateNumber(element, from, to, format, duration = 550) {
    const token = (element._animToken = (element._animToken || 0) + 1);

    if (REDUCED_MOTION || from === to) {
      element.textContent = format(to);
      return;
    }

    const startTime = performance.now();
    const step = (now) => {
      if (element._animToken !== token) return; // a newer animation took over
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = format(Math.round(from + (to - from) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function applyControls(state) {
    const playing = state.status === "playing";
    els.letterInput.disabled = !playing;
    els.guessButton.disabled = !playing;
    if (playing) {
      els.letterInput.focus();
    }
  }

  /* ======================================================================
     Virtual keyboard
     ====================================================================== */

  function buildKeyboard() {
    KEYBOARD_ROWS.forEach((row) => {
      const rowElement = document.createElement("div");
      rowElement.className = "keyboard-row";
      row.split("").forEach((letter) => {
        const key = document.createElement("button");
        key.type = "button";
        key.className = "key";
        key.dataset.key = letter;
        key.textContent = letter;
        key.addEventListener("click", () => {
          els.letterInput.value = letter;
          sendGuess(letter);
        });
        rowElement.appendChild(key);
      });
      els.keyboard.appendChild(rowElement);
    });
  }

  function updateKeyboard(state) {
    const guessed = new Set(state.guessed_letters);
    const correct = new Set(state.correct_letters);
    const wrong = new Set(state.wrong_letters);
    const playing = state.status === "playing";

    els.keyboard.querySelectorAll(".key").forEach((key) => {
      const letter = key.dataset.key;
      key.classList.toggle("correct", correct.has(letter));
      key.classList.toggle("wrong", wrong.has(letter));
      key.disabled = !playing || guessed.has(letter);
    });
  }

  /* ======================================================================
     Toasts
     ====================================================================== */

  function showToast(text, type, lifetime = 2600) {
    const toast = document.createElement("div");
    toast.className = "toast " + (type || "");
    toast.textContent = text;
    els.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("out");
      setTimeout(() => toast.remove(), 400);
    }, lifetime);
  }

  function maybeToast(state) {
    if (!state.message || state.message === lastMessage) return;
    lastMessage = state.message;

    /* Win/loss are celebrated by the overlay instead of a toast. */
    if (state.status !== "playing") return;

    const type = TOAST_TYPES[state.message_type];
    if (type) {
      showToast(state.message, type);
    }
  }

  /* ======================================================================
     Win / loss overlay
     ====================================================================== */

  function showResult(state) {
    if (!els.overlay.classList.contains("hidden")) return; // already visible

    const won = state.status === "won";

    els.resultCard.classList.toggle("win", won);
    els.resultCard.classList.toggle("loss", !won);

    els.resultTitle.textContent = won ? "YOU WON!" : "GAME OVER";
    els.resultTitle.classList.toggle("win", won);
    els.resultTitle.classList.toggle("loss", !won);

    els.resultSubtitle.textContent = won
      ? "You guessed every letter of the secret word."
      : "The word was: " + state.secret_word;

    els.summaryResult.textContent = won ? "VICTORY" : "DEFEAT";
    els.summaryResult.classList.toggle("win", won);
    els.summaryResult.classList.toggle("loss", !won);
    els.summaryWord.textContent = state.secret_word || "—";
    els.summaryScore.textContent = String(state.score);
    els.summaryWrong.textContent = state.attempts_used + " / " + state.attempts_max;
    els.summaryAttempts.textContent = state.attempts_used + " of " + state.attempts_max + " used";
    els.summaryStreak.textContent = String(state.streak);

    els.playAgainButton.textContent = won ? "PLAY AGAIN" : "TRY AGAIN";

    els.overlay.classList.remove("hidden");

    if (won) {
      spawnConfetti();
    } else {
      clearConfetti();
    }

    els.playAgainButton.focus();
  }

  function hideResult() {
    els.overlay.classList.add("hidden");
    els.resultCard.classList.remove("win", "loss");
    els.resultTitle.classList.remove("win", "loss");
    els.summaryResult.classList.remove("win", "loss");
    clearConfetti();
  }

  function spawnConfetti() {
    if (REDUCED_MOTION) return;
    clearConfetti();

    for (let i = 0; i < 90; i += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = Math.random() * 100 + "%";
      piece.style.width = 6 + Math.random() * 7 + "px";
      piece.style.height = 10 + Math.random() * 9 + "px";
      piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      piece.style.animationDuration = 2.6 + Math.random() * 2.4 + "s";
      piece.style.animationDelay = Math.random() * 0.9 + "s";
      els.confetti.appendChild(piece);
    }
  }

  function clearConfetti() {
    els.confetti.innerHTML = "";
  }

  /* ======================================================================
     How to Play modal
     ====================================================================== */

  function openModal() {
    els.modal.classList.remove("hidden");
    els.modalCloseButton.focus();
  }

  function closeModal() {
    els.modal.classList.add("hidden");
    els.howToPlayButton.focus();
  }

  /* ======================================================================
     Decorative effects (particles, card tilt, background parallax)
     ====================================================================== */

  function spawnParticles() {
    if (REDUCED_MOTION) return;
    for (let i = 0; i < 18; i += 1) {
      const particle = document.createElement("span");
      particle.className = "particle";
      const size = 2 + Math.random() * 4;
      particle.style.width = size + "px";
      particle.style.height = size + "px";
      particle.style.left = Math.random() * 100 + "%";
      particle.style.animationDuration = 6 + Math.random() * 7 + "s";
      particle.style.animationDelay = Math.random() * 6 + "s";
      els.particles.appendChild(particle);
    }
  }

  function enableCardTilt() {
    if (REDUCED_MOTION) return;

    document.querySelectorAll(".tilt").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const dx = (event.clientX - rect.left) / rect.width - 0.5;
        const dy = (event.clientY - rect.top) / rect.height - 0.5;
        const rotateX = (-dy * 3).toFixed(2);
        const rotateY = (dx * 3).toFixed(2);
        card.style.transform =
          "perspective(900px) rotateX(" + rotateX + "deg) rotateY(" + rotateY + "deg)";
      });
      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });
  }

  function enableParallax() {
    if (REDUCED_MOTION) return;

    let queued = false;
    let nextX = 0;
    let nextY = 0;

    document.addEventListener("pointermove", (event) => {
      nextX = ((event.clientX / window.innerWidth) - 0.5) * 30;
      nextY = ((event.clientY / window.innerHeight) - 0.5) * 30;

      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        document.body.style.setProperty("--px", nextX.toFixed(1) + "px");
        document.body.style.setProperty("--py", nextY.toFixed(1) + "px");
      });
    });
  }

  /* ======================================================================
     Events
     ====================================================================== */

  function bindEvents() {
    els.guessButton.addEventListener("click", () => sendGuess());
    els.newGameButton.addEventListener("click", () => startNewGame());
    els.playAgainButton.addEventListener("click", () => startNewGame());

    els.howToPlayButton.addEventListener("click", openModal);
    els.modalCloseButton.addEventListener("click", closeModal);
    els.modalBackdrop.addEventListener("click", closeModal);

    /* Physical keyboard: letters fill the input, Enter submits. */
    document.addEventListener("keydown", (event) => {
      const modalOpen = !els.modal.classList.contains("hidden");

      if (event.key === "Escape") {
        if (modalOpen) closeModal();
        return;
      }

      if (modalOpen) {
        if (event.key === "Enter") {
          event.preventDefault();
          closeModal();
        } else if (event.key.length === 1) {
          event.preventDefault(); // don't type behind the modal
        }
        return;
      }

      const overlayOpen = !els.overlay.classList.contains("hidden");
      if (overlayOpen) {
        if (event.key === "Enter") {
          event.preventDefault();
          startNewGame();
        }
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        sendGuess();
        return;
      }

      if (/^[a-zA-Z]$/.test(event.key)) {
        event.preventDefault();
        els.letterInput.value = event.key;
        els.letterInput.focus();
      }
    });
  }

  /* ======================================================================
     Start
     ====================================================================== */

  async function init() {
    buildKeyboard();
    spawnParticles();
    enableCardTilt();
    enableParallax();
    bindEvents();

    try {
      const state = await api("/api/state");
      applyState(state);
    } catch (error) {
      showToast("Could not load the game. Please refresh the page.", "error");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
