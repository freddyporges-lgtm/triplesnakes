import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";
 import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
  import {
    getDatabase,
    ref,
    set,
    remove
  } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";

  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  };

  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);

  const state = {
    players: [],
    target: 100,
    round: 1,
    currentIndex: 0,
    started: false,
    phase: "normal",
    winnerId: null,
    consecutiveZeroTurnsInRound: 0,
    turnsThisRound: 0,
    lastLeaderId: null,
    roundScores: [],
    showRoundByRound: false,
    gameId: null
  };

  const qs = (sel) => document.querySelector(sel);
  const setupCard = qs("#setupCard");
  const scoreCard = qs("#scoreCard");
  const turnCard = qs("#turnCard");
  const logCard = qs("#logCard");
  const playersSetupList = qs("#playersSetupList");
  const playersList = qs("#playersList");
  const roundChip = qs("#roundChip");
  const phaseChip = qs("#phaseChip");
  const turnPlayerPill = qs("#turnPlayerPill");
  const logContainer = qs("#logContainer");
  const targetScoreLabel = qs("#targetScoreLabel");
  const turnHint = qs("#turnHint");
  const roundByRoundContainer = qs("#roundByRoundContainer");
  const scoreboardTitle = qs("#scoreboardTitle");
  const roundByRoundBtn = qs("#roundByRoundBtn");
  const hofToggleBtn = document.getElementById("hofToggle");
  const hofSection = document.getElementById("hall-of-fame");
  const eventToast = document.getElementById("eventToast");
  const eventToastText = document.getElementById("eventToastText");
  const editScoreWrapper = qs("#editScoreWrapper");
  const endGameBtn = document.getElementById("endGameBtn");

  const viewerLinkCard = qs("#viewerLinkCard");
  const viewerUrlInput = qs("#viewerUrlInput");
  const copyViewerUrlBtn = qs("#copyViewerUrlBtn");
  const gameIdLabel = qs("#gameIdLabel");

  let toastTimeout;
  const toastQueue = [];
  let toastActive = false;

  function getBaseViewerUrl() {
    const origin = window.location.origin;
    return origin + "/board.html";
  }

  function makeGameId() {
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let id = "";
    for (let i = 0; i < 6; i++) {
      id += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return id;
  }

  function updateShareUi() {
    if (!state.gameId) {
      viewerLinkCard.style.display = "none";
      return;
    }
    const url = `${getBaseViewerUrl()}?game=${encodeURIComponent(state.gameId)}`;
    viewerUrlInput.value = url;
    gameIdLabel.textContent = `Game ID: ${state.gameId}`;
    viewerLinkCard.style.display = "block";
  }

  copyViewerUrlBtn.addEventListener("click", () => {
    if (!viewerUrlInput.value) return;
    viewerUrlInput.select();
    viewerUrlInput.setSelectionRange(0, viewerUrlInput.value.length);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(viewerUrlInput.value).catch(() => {});
    }
  });

  hofToggleBtn.addEventListener("click", () => {
    const isHidden = hofSection.style.display === "none" || hofSection.style.display === "";
    hofSection.style.display = isHidden ? "block" : "none";
    if (isHidden) {
      hofSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  function positionEventToast() {
    if (!eventToast || !scoreCard) return;
    const rect = scoreCard.getBoundingClientRect();
    eventToast.style.top = rect.top + "px";
    eventToast.style.left = rect.left + "px";
    eventToast.style.width = rect.width + "px";
    eventToast.style.height = rect.height + "px";
  }

  function showEventToast(message) {
    positionEventToast();
    eventToastText.textContent = message;
    eventToast.style.display = "block";
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      eventToast.style.display = "none";
      toastActive = false;
      if (toastQueue.length > 0) {
        const next = toastQueue.shift();
        startToast(next);
      }
    }, 3000);
  }

  function startToast(message) {
    toastActive = true;
    showEventToast(message);
  }

  function queueToast(message) {
    if (!eventToast || !scoreCard) return;
    if (toastActive) {
      toastQueue.push(message);
    } else {
      startToast(message);
    }
  }

  window.addEventListener("resize", () => {
    if (eventToast.style.display === "block") positionEventToast();
  });
  window.addEventListener("scroll", () => {
    if (eventToast.style.display === "block") positionEventToast();
  });

  function renderSetupPlayers() {
    playersSetupList.innerHTML = "";
    state.players.forEach((p, i) => {
      const div = document.createElement("div");
      div.className = "player-row";
      div.innerHTML = `
        <div>${p.name}</div>
        <button class="btn btn-secondary btn-sm" data-remove="${i}">Remove</button>
      `;
      playersSetupList.appendChild(div);
    });
    playersSetupList.querySelectorAll("[data-remove]").forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.remove, 10);
        state.players.splice(idx, 1);
        renderSetupPlayers();
      };
    });
  }

  function getLeaderId() {
    if (state.players.length === 0) return null;
    let best = state.players[0];
    state.players.forEach(p => {
      if (p.score > best.score) best = p;
    });
    const leaders = state.players.filter(p => p.score === best.score);
    return leaders.length === 1 ? best.id : null;
  }

  function getLeaderScore() {
    if (state.players.length === 0) return 0;
    let best = state.players[0].score;
    state.players.forEach(p => {
      if (p.score > best) best = p.score;
    });
    return best;
  }

  function renderScoreboardNormal() {
    playersList.innerHTML = "";
    const leaderId = getLeaderId();
    state.players.forEach((p, i) => {
      const div = document.createElement("div");
      div.className = "player-row" + (i === state.currentIndex ? " current-turn" : "");
      const scoreClass = "score" + (p.id === leaderId ? " leader" : "");
      div.innerHTML = `
        <div class="player-main">
          <span>${p.name}</span>
          ${p.id === state.winnerId ? '<span class="pill-warning">Winner</span>' : ""}
        </div>
        <div><span class="${scoreClass}">${p.score}</span></div>
      `;
      playersList.appendChild(div);
    });
    playersList.style.display = "flex";
    roundByRoundContainer.style.display = "none";
    scoreboardTitle.textContent = "Triple Snakes Arena";
    roundByRoundBtn.textContent = "Round by Round Scores";
    roundByRoundBtn.setAttribute("aria-pressed", "false");
  }

  function renderScoreboardRoundByRound() {
    const maxRound = state.roundScores.length
      ? Math.max(...state.roundScores.map(r => r.round))
      : state.round - 1;
    if (maxRound <= 0) {
      roundByRoundContainer.innerHTML = "<div class='muted'>No completed rounds yet.</div>";
    } else {
      const roundMap = {};
      state.roundScores.forEach(r => {
        roundMap[r.round] = r.scores;
      });

      let html = "<table class='round-table'><thead><tr>";
      html += "<th>Player</th>";
      for (let r = 1; r <= maxRound; r++) {
        html += `<th>R${r}</th>`;
      }
      html += "</tr></thead><tbody>";

      state.players.forEach(p => {
        html += `<tr><td class="player-name">${p.name}</td>`;
        for (let r = 1; r <= maxRound; r++) {
          const scoresForRound = roundMap[r] || {};
          const val = scoresForRound[p.id];
          html += `<td>${typeof val === "number" ? val : "-"}</td>`;
        }
        html += "</tr>";
      });

      html += "</tbody></table>";
      roundByRoundContainer.innerHTML = html;
    }

    playersList.style.display = "none";
    roundByRoundContainer.style.display = "block";
    scoreboardTitle.textContent = "Round by Round Scores";
    roundByRoundBtn.textContent = "Return to Scoreboard";
    roundByRoundBtn.setAttribute("aria-pressed", "true");
  }

  function renderScoreboard() {
    if (state.showRoundByRound) {
      renderScoreboardRoundByRound();
    } else {
      renderScoreboardNormal();
    }
    roundChip.textContent = `Round ${state.round}`;
    const phaseText = {
      normal: "Normal play",
      rebuttal: "Rebuttal round",
      winRollOff: "Winner roll-off",
      lastRollOff: "Last-place roll-off"
    }[state.phase];
    phaseChip.textContent = phaseText;
    const currentPlayer = state.players[state.currentIndex];
    turnPlayerPill.textContent = currentPlayer ? currentPlayer.name : "Player ?";
    targetScoreLabel.textContent = state.target;
    updateShareUi();
  }

  function addLog(msg, type = "info") {
    const div = document.createElement("div");
    div.className = "log-entry";
    let badge = "";
    if (type === "drink") {
      badge = ' <span class="pill pill-warning">Drink</span>';
    } else if (type === "social") {
      badge = ' <span class="pill pill-danger">Social</span>';
    } else if (type === "system") {
      badge = ' <span class="pill">Game</span>';
      div.classList.add("system-message");
    }
    div.innerHTML = `<strong>${new Date().toLocaleTimeString()}</strong>${badge} – ${msg}`;
    logContainer.prepend(div);
  }

  function snapshotRoundTotals() {
    const scores = {};
    state.players.forEach(p => {
      scores[p.id] = p.score;
    });
    state.roundScores = state.roundScores.filter(r => r.round !== state.round);
    state.roundScores.push({ round: state.round, scores });
  }

  function getCompletedRoundsCount() {
    return state.roundScores.length;
  }

  function advanceTurn() {
    state.currentIndex++;
    state.turnsThisRound++;
    if (state.currentIndex >= state.players.length) {
      snapshotRoundTotals();
      state.currentIndex = 0;
      state.round++;
      state.turnsThisRound = 0;
      state.consecutiveZeroTurnsInRound = 0;

      if (state.round === 4) {
        const msg = "Start of Round 4 -- Ties and Lead Change Drinks Now in Effect";
        addLog(msg, "system");
        queueToast(msg);
      }
    }
    renderScoreboard();
    syncGameState();
  }

  function applyScore(player, delta) {
    const before = player.score;
    let after = before + delta;
    let bust = false;
    if (after > state.target && state.phase !== "winRollOff" && state.phase !== "lastRollOff") {
      bust = true;
      after = 77;
    }
    player.score = after;
    return { before, after, bust };
  }

  function handleLeaderAndTies(currentPlayer) {
    const completedRounds = getCompletedRoundsCount();
    if (state.phase === "normal" && completedRounds >= 3) {
      const playersAtSame = state.players.filter(p => p.score === currentPlayer.score);
      if (playersAtSame.length >= 2) {
        const names = playersAtSame.map(p => p.name).join(" & ");
        const msg = `${names} are tied at ${currentPlayer.score}. All tied players drink.`;
        addLog(msg, "drink");
        queueToast(msg);
      }

      const leaderId = getLeaderId();
      if (leaderId && leaderId !== state.lastLeaderId) {
        const leader = state.players.find(p => p.id === leaderId);
        const others = state.players.filter(p => p.id !== leaderId);
        if (others.length > 0) {
          const msg = `Leader changed to ${leader.name}. All non-leaders drink.`;
          addLog(msg, "drink");
          queueToast(msg);
        }
        state.lastLeaderId = leaderId;
      }
    }
  }

  function checkZeroRoundGroupDrink() {
    if (state.consecutiveZeroTurnsInRound >= state.players.length && state.phase === "normal") {
      const msg = "All players netted 0 this round in consecutive turns. Group must shotgun or take a shot.";
      addLog(msg, "social");
      queueToast("Group 0 round – social drink!");
      state.consecutiveZeroTurnsInRound = 0;
    }
  }

  function evaluateWinState(player) {
    if (state.phase === "normal") {
      if (player.score === state.target && !state.winnerId) {
        state.winnerId = player.id;
        state.phase = "rebuttal";
        const msg = `${player.name} reached ${state.target}. Rebuttal round begins (others get one more turn).`;
        addLog(msg, "system");
        queueToast(`${player.name} hit ${state.target}! Rebuttal round.`);
      }
    } else if (state.phase === "rebuttal") {
      const others = state.players.filter(p => p.id !== state.winnerId);
      const rebuttalDone = state.turnsThisRound >= others.length;
      if (rebuttalDone) {
        const winner = state.players.find(p => p.id === state.winnerId);
        const tiesAt100 = state.players.filter(p => p.score === state.target);
        if (tiesAt100.length > 1) {
          state.phase = "winRollOff";
          const msg = "Multiple players tied at 100 after rebuttal. Winner roll-off begins.";
          addLog(msg, "system");
          queueToast("Winner roll-off begins!");
        } else {
          const minScore = Math.min(...state.players.map(p => p.score));
          const lastPlace = state.players.filter(p => p.score === minScore);
          if (lastPlace.length > 1) {
            state.phase = "lastRollOff";
            const msg = `Multiple players tied for last at ${minScore}. Last-place roll-off begins.`;
            addLog(msg, "system");
            queueToast("Last-place roll-off begins!");
          } else {
            const msg = `${winner.name} wins the game. Last-place is ${lastPlace[0].name}.`;
            addLog(msg, "system");
            queueToast(`${winner.name} wins! ${lastPlace[0].name} is last.`);
          }
        }
      }
    } else if (state.phase === "winRollOff") {
      const tieGroup = state.players.filter(p => p.score === state.target);
      if (tieGroup.length === 1) {
        const msg = `${tieGroup[0].name} wins the winner roll-off.`;
        addLog(msg, "system");
        queueToast(msg);
      }
    } else if (state.phase === "lastRollOff") {
      const minScore = Math.min(...state.players.map(p => p.score));
      const last = state.players.filter(p => p.score === minScore);
      if (last.length === 1) {
        const msg = `${last[0].name} loses the last-place roll-off.`;
        addLog(msg, "system");
        queueToast(msg);
      }
    }
  }

  function computeTurnScore() {
    const outcomeType = document.querySelector('input[name="outcomeType"]:checked').value;
    let score = 0;
    let events = [];

    if (outcomeType === "zeroPoints") {
      return { score: 0, events };
    }

    if (outcomeType === "bust77") {
      return { score: 77, events: ["bustTo77"] };
    }

    if (outcomeType === "tripleSnakes") {
      const mode = qs("#tripleSnakesMode").value;
      if (mode === "3") {
        return { score: 3, events: ["tripleSnakesTurn"] };
      } else {
        const leaderScore = getLeaderScore();
        return { score: leaderScore, events: ["tripleSnakesTieLeader"] };
      }
    }

    if (outcomeType === "match") {
      const f1 = parseInt(qs("#matchFace1").value, 10);
      const c1 = parseInt(qs("#matchCount1").value, 10);
      const f2 = parseInt(qs("#matchFace2").value, 10);
      const c2 = parseInt(qs("#matchCount2").value, 10);

      if (!isNaN(f1) && !isNaN(c1)) {
        score += f1 * c1;
      }
      if (!isNaN(f2) && !isNaN(c2)) {
        score += f2 * c2;
      }
      return { score: score || 0, events };
    }

    if (outcomeType === "doubleDouble") {
      const p1 = parseInt(qs("#ddPair1Face").value, 10);
      const p2 = parseInt(qs("#ddPair2Face").value, 10);
      if (isNaN(p1) || isNaN(p2)) return { score: 0, events };
      const s = p1 * 2 + p2 * 2;
      return { score: s, events };
    }

    if (outcomeType === "fourKind") {
      const face = parseInt(qs("#fourKindFace").value, 10);
      if (isNaN(face)) return { score: 0, events };
      const mode = qs("#fourKindBonus").value;
      const normal = 4 * face;
      const bonus = face === 1 ? 30 : (30 - face);
      let chosen = normal;
      if (mode === "bonus") chosen = bonus;
      else if (mode === "normal") chosen = normal;
      else chosen = Math.max(normal, bonus);
      events.push("fourKind");
      return { score: chosen, events };
    }

    if (outcomeType === "straight") {
      const res = qs("#straightResult").value;
      if (res === "fail") {
        return { score: 0, events: ["straightFail"] };
      } else if (res === "success34") {
        return { score: 34, events: ["straightSuccess"] };
      } else {
        return { score: 35, events: ["straightSuccess"] };
      }
    }

    return { score: 0, events };
  }

  function updateOutcomeFields() {
    const outcomeType = document.querySelector('input[name="outcomeType"]:checked').value;
    const blocks = {
      match: qs("#matchFields"),
      doubleDouble: qs("#doubleDoubleFields"),
      fourKind: qs("#fourKindFields"),
      straight: qs("#straightFields"),
      tripleSnakes: qs("#tripleSnakesFields"),
      zeroPoints: null,
      bust77: null
    };
    qs("#matchFields").style.display = "none";
    qs("#doubleDoubleFields").style.display = "none";
    qs("#fourKindFields").style.display = "none";
    qs("#straightFields").style.display = "none";
    qs("#tripleSnakesFields").style.display = "none";
    if (blocks[outcomeType]) blocks[outcomeType].style.display = "block";

    const hints = {
      match: "Use for two-of-a-kind and three-of-a-kind matched dice.",
      doubleDouble: "Use when two different matching pairs are made on the final roll.",
      fourKind: "Use when four-of-a-kind ended the turn (with or without bonus).",
      straight: "Use only when a first-roll straight and green die were used.",
      tripleSnakes: "Use when rolling three 1s and choosing between tying the leader or taking 3 points.",
      zeroPoints: "Use when the turn ends with 0 points (no matches or snake eyes).",
      bust77: "Use when the player busts and must reset directly to 77."
    };
    turnHint.textContent = hints[outcomeType] || "";
  }

  qs("#outcomeTypeGroup").addEventListener("change", (e) => {
    if (e.target.name === "outcomeType") {
      document.querySelectorAll("#outcomeTypeGroup .radio-pill").forEach(l => {
        l.classList.remove("selected");
      });
      e.target.closest(".radio-pill").classList.add("selected");
      updateOutcomeFields();
    }
  });

  const tripleSnakesHelp = document.getElementById("tripleSnakesHelp");
  document.querySelectorAll("#tripleSnakesToggle .match-count-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#tripleSnakesToggle .match-count-btn")
        .forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      qs("#tripleSnakesMode").value = btn.dataset.mode;

      if (btn.dataset.mode === "tieLeader") {
        tripleSnakesHelp.textContent =
          "Tie-the-leader sets this player's total score equal to the current highest score on the board.";
      } else {
        tripleSnakesHelp.textContent =
          "The player can select 3 points if its a better outcome for their game.";
      }
    });
  });

  document.querySelectorAll("#fourKindBonusGroup .match-count-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#fourKindBonusGroup .match-count-btn")
        .forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      qs("#fourKindBonus").value = btn.dataset.mode;
    });
  });

  function resetStateOnly() {
    state.players = [];
    state.target = 100;
    state.round = 1;
    state.currentIndex = 0;
    state.started = false;
    state.phase = "normal";
    state.winnerId = null;
    state.consecutiveZeroTurnsInRound = 0;
    state.turnsThisRound = 0;
    state.lastLeaderId = null;
    state.roundScores = [];
    state.showRoundByRound = false;
    state.gameId = null;
  }

  function resetToHome() {
    const oldGameId = state.gameId;
    resetStateOnly();
    logContainer.innerHTML = "";
    setupCard.style.display = "block";
    scoreCard.style.display = "none";
    turnCard.style.display = "none";
    logCard.style.display = "none";
    editScoreWrapper.style.display = "none";
    renderSetupPlayers();
    updateShareUi();
    if (oldGameId) {
      remove(ref(db, `games/${oldGameId}`)).catch(() => {});
    }
  }

  const addPlayerBtn = qs("#addPlayerBtn");
  addPlayerBtn.addEventListener("click", () => {
    const nameInput = qs("#playerName");
    const name = nameInput.value.trim();
    if (!name) return;
    state.players.push({
      id: 'p-' + Math.random().toString(16).slice(2) + Date.now().toString(16),
      name,
      score: 0
    });
    nameInput.value = "";
    renderSetupPlayers();
  });

  qs("#resetGameBtn").onclick = resetToHome;
  endGameBtn.onclick = resetToHome;

  function syncGameState() {
    if (!state.gameId) return;
    const payload = {
      players: state.players,
      target: state.target,
      round: state.round,
      currentIndex: state.currentIndex,
      phase: state.phase,
      winnerId: state.winnerId,
      roundScores: state.roundScores
    };
    set(ref(db, `games/${state.gameId}`), payload).catch(() => {});
  }

  qs("#startGameBtn").onclick = () => {
    if (state.players.length < 2) {
      alert("Add at least 2 players.");
      return;
    }
    state.round = 1;
    state.currentIndex = 0;
    state.started = true;
    state.phase = "normal";
    state.winnerId = null;
    state.consecutiveZeroTurnsInRound = 0;
    state.turnsThisRound = 0;
    state.lastLeaderId = null;
    state.roundScores = [];
    state.showRoundByRound = false;
    state.gameId = makeGameId();

    setupCard.style.display = "none";
    scoreCard.style.display = "block";
    turnCard.style.display = "block";
    logCard.style.display = "block";
    editScoreWrapper.style.display = "block";
    const msg = `Game ${state.gameId} started. First player begins at Round 1.`;
    addLog(msg, "system");
    queueToast("Game started – Round 1.");
    updateOutcomeFields();
    renderScoreboard();
    syncGameState();
  };

  qs("#skipTurnBtn").onclick = () => {
    const p = state.players[state.currentIndex];
    const msg = `${p.name}'s turn skipped.`;
    addLog(msg, "system");
    queueToast(msg);
    advanceTurn();
  };

  roundByRoundBtn.onclick = () => {
    state.showRoundByRound = !state.showRoundByRound;
    renderScoreboard();
    syncGameState();
  };

  qs("#submitTurnBtn").onclick = () => {
    const p = state.players[state.currentIndex];
    const outcomeType = document.querySelector('input[name="outcomeType"]:checked').value;
    const res = computeTurnScore();
    let turnScore = res.score;
    const events = res.events;
    let before = p.score;
    let after = p.score;

    if (outcomeType === "bust77") {
      before = p.score;
      after = 77;
      p.score = 77;
      const msg = `${p.name} selected Bust (77): score set from ${before} to 77.`;
      addLog(msg, "drink");
      queueToast(`${p.name} busts to 77. Drink!`);
      state.consecutiveZeroTurnsInRound = 0;
    } else if (outcomeType === "tripleSnakes") {
      const mode = qs("#tripleSnakesMode").value;
      const leaderScore = getLeaderScore();
      before = p.score;
      if (mode === "3") {
        after = before + 3;
        p.score = after;
        const msg = `${p.name} chose Triple Snakes for 3 points (from ${before} to ${after}).`;
        addLog(msg, "social");
        queueToast(`Triple Snakes! ${p.name} scores +3 and calls a social.`);
      } else {
        after = leaderScore;
        p.score = after;
        const msg = `${p.name} used Triple Snakes to tie the leader at ${after}.`;
        addLog(msg, "social");
        queueToast(`Triple Snakes! ${p.name} ties the leader at ${after}. Social drink!`);
      }
      state.consecutiveZeroTurnsInRound = 0;
    } else {
      if (turnScore === 0) {
        state.consecutiveZeroTurnsInRound++;
        const zeroMsg = `${p.name} scored 0 this turn.`;
        addLog(zeroMsg, "drink");
        queueToast(`${p.name} drinks – 0 points.`);
      } else {
        state.consecutiveZeroTurnsInRound = 0;
      }
      checkZeroRoundGroupDrink();

      const result = applyScore(p, turnScore);
      before = result.before;
      after = result.after;

      if (result.bust && (state.phase === "normal" || state.phase === "rebuttal")) {
        const msg = `${p.name} busted over ${state.target} and resets to 77. Drinks.`;
        addLog(msg, "drink");
        queueToast(`${p.name} busts! Reset to 77 and drink.`);
      }

      if (turnScore === 0) {
        const baseMsg = `${p.name} scored 0 (remains at ${after}).`;
        addLog(baseMsg, "info");
      } else {
        const baseMsg = `${p.name} scored ${turnScore} (from ${before} to ${after}).`;
        addLog(baseMsg, "info");
      }
    }

    if (events.includes("fourKind")) {
      const msg = `${p.name} rolled four-of-a-kind. Social drink.`;
      addLog(msg, "social");
      queueToast(`Four-of-a-kind! Social drink.`);
    }
    if (events.includes("straightSuccess")) {
      const msg = `${p.name} completed the straight via green die.`;
      addLog(msg, "info");
      queueToast(`Straight! ${p.name} scores big.`);
    }
    if (events.includes("straightFail")) {
      const msg = `${p.name} failed to complete the straight and scored 0.`;
      addLog(msg, "drink");
      queueToast(`${p.name} drinks – straight failed.`);
    }

    handleLeaderAndTies(p);
    evaluateWinState(p);

    state.showRoundByRound = false;
    advanceTurn();
  };

  qs("#editScoreBtn").onclick = () => {
    if (state.players.length === 0) return;

    const names = state.players
      .map((p, idx) => `${idx + 1}: ${p.name} (${p.score})`)
      .join("\n");
    const which = prompt(
      "Edit which player? Enter the number:\n\n" + names
    );
    if (!which) return;

    const idx = parseInt(which, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= state.players.length) {
      alert("Invalid player number.");
      return;
    }

    const player = state.players[idx];
    const newScoreStr = prompt(
      `New total score for ${player.name}? (current: ${player.score})`
    );
    if (newScoreStr === null || newScoreStr === "") return;

    const newScore = parseInt(newScoreStr, 10);
    if (isNaN(newScore) || newScore < 0) {
      alert("Please enter a valid non-negative number.");
      return;
    }

    const oldScore = player.score;
    player.score = newScore;

    const msg = `Score edited for ${player.name}: ${oldScore} → ${newScore}.`;
    addLog(msg, "system");
    queueToast(`Score edited: ${player.name} is now at ${newScore}.`);

    renderScoreboard();
    syncGameState();
  };

  const matchFaceInput = qs("#matchFace1");
  const matchCountInput = qs("#matchCount1");
  document.querySelectorAll("#matchDicePicker .die-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#matchDicePicker .die-btn")
        .forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      matchFaceInput.value = btn.dataset.face;
    });
  });
  document.querySelectorAll("#matchCountPicker .match-count-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#matchCountPicker .match-count-btn")
        .forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      matchCountInput.value = btn.dataset.count;
    });
  });

  const fourKindFaceInput = qs("#fourKindFace");
  document.querySelectorAll("#fourKindDicePicker .die-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#fourKindDicePicker .die-btn")
        .forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      fourKindFaceInput.value = btn.dataset.face;
    });
  });

  const ddPair1FaceInput = qs("#ddPair1Face");
  const ddPair2FaceInput = qs("#ddPair2Face");
  document.querySelectorAll("#ddPair1Picker .die-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#ddPair1Picker .die-btn")
        .forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      ddPair1FaceInput.value = btn.dataset.face;
    });
  });
  document.querySelectorAll("#ddPair2Picker .die-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#ddPair2Picker .die-btn")
        .forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      ddPair2FaceInput.value = btn.dataset.face;
    });
  });

  renderSetupPlayers();
