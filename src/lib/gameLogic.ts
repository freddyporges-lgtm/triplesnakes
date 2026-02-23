import type { GameState, Player, OutcomeData, TurnOutcome, ScoreApplyResult } from '../types/gameTypes';

// Generate random room code
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create initial game state
export function createInitialGameState(): GameState {
  return {
    players: [],
    target: 100,
    round: 1,
    currentIndex: 0,
    started: false,
    phase: 'normal',
    winnerId: null,
    ultimateWinnerId: null,
    loserId: null,
    gameComplete: false,
    consecutiveZeroTurnsInRound: 0,
    turnsThisRound: 0,
    lastLeaderId: null,
    roundScores: [],
    showRoundByRound: false,
    rebuttalTurnsTaken: 0,
    rebuttalHit100Order: [],
    rollOffPlayerIds: [],
    rollOffIndex: 0,
    rollOffSetupMode: false,
    rollOffRoundComplete: false,
    previousWinnerId: null,
    previousLoserId: null,
  };
}

// Create new game with same players (remembers previous winner/loser)
export function createNewGameWithPlayers(state: GameState): GameState {
  return {
    players: state.players.map(p => ({ ...p, score: 0 })),
    target: 100,
    round: 1,
    currentIndex: 0,
    started: true,
    phase: 'normal',
    winnerId: null,
    ultimateWinnerId: state.ultimateWinnerId,
    loserId: null,
    gameComplete: false,
    consecutiveZeroTurnsInRound: 0,
    turnsThisRound: 0,
    lastLeaderId: null,
    roundScores: [],
    showRoundByRound: false,
    rebuttalTurnsTaken: 0,
    rebuttalHit100Order: [],
    rollOffPlayerIds: [],
    rollOffIndex: 0,
    rollOffSetupMode: false,
    rollOffRoundComplete: false,
    previousWinnerId: state.ultimateWinnerId,
    previousLoserId: state.loserId,
  };
}

// Player management
export function addPlayer(state: GameState, name: string): GameState {
  const id = `p-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  return {
    ...state,
    players: [...state.players, { id, name, score: 0 }],
  };
}

export function removePlayer(state: GameState, index: number): GameState {
  return {
    ...state,
    players: state.players.filter((_, i) => i !== index),
  };
}

// Score utilities
export function getLeaderId(state: GameState): string | null {
  if (state.players.length === 0) return null;
  let best = state.players[0];
  state.players.forEach(p => {
    if (p.score > best.score) best = p;
  });
  const leaders = state.players.filter(p => p.score === best.score);
  return leaders.length === 1 ? best.id : null;
}

export function getLeaderScore(state: GameState): number {
  if (state.players.length === 0) return 0;
  return Math.max(...state.players.map(p => p.score));
}

export function getCurrentPlayer(state: GameState): Player | null {
  if (state.gameComplete) return null;
  const inRollOff = state.phase === 'winRollOff' || state.phase === 'lastRollOff';
  if (inRollOff && !state.rollOffSetupMode) {
    const currentId = state.rollOffPlayerIds[state.rollOffIndex];
    return state.players.find(p => p.id === currentId) || null;
  }
  if (inRollOff && state.rollOffSetupMode) return null;
  return state.players[state.currentIndex] || null;
}

// Turn scoring — uses typed OutcomeData discriminated union
export function computeTurnScore(outcomeData: OutcomeData, state: GameState): TurnOutcome {
  const events: string[] = [];

  switch (outcomeData.type) {
    case 'zeroPoints':
      return { score: 0, events };

    case 'bust77':
      return { score: 77, events: ['bustTo77'] };

    case 'tripleSnakes': {
      const mode = outcomeData.mode;
      return mode === '3'
        ? { score: 3, events: ['tripleSnakesTurn'] }
        : { score: getLeaderScore(state), events: ['tripleSnakesTieLeader'] };
    }

    case 'match': {
      let score = 0;
      const f1 = parseInt(outcomeData.face1 ?? '', 10);
      const c1 = parseInt(outcomeData.count1 ?? '', 10);
      const f2 = parseInt(outcomeData.face2 ?? '', 10);
      const c2 = parseInt(outcomeData.count2 ?? '', 10);
      if (!isNaN(f1) && !isNaN(c1)) score += f1 * c1;
      if (!isNaN(f2) && !isNaN(c2)) score += f2 * c2;
      return { score: score || 0, events };
    }

    case 'doubleDouble': {
      const p1 = parseInt(outcomeData.pair1Face ?? '', 10);
      const p2 = parseInt(outcomeData.pair2Face ?? '', 10);
      if (isNaN(p1) || isNaN(p2)) return { score: 0, events };
      return { score: p1 * 2 + p2 * 2, events };
    }

    case 'fourKind': {
      const face = parseInt(outcomeData.face ?? '', 10);
      if (isNaN(face)) return { score: 0, events };
      const useBonus = outcomeData.useBonus === true;
      const normal = 4 * face;
      const bonus = face === 1 ? 30 : 30 - face;
      events.push('fourKind');
      return { score: useBonus ? bonus : normal, events };
    }

    case 'straight': {
      const result = outcomeData.result;
      if (result === 'fail') return { score: 0, events: ['straightFail'] };
      return { score: result === '34' ? 34 : 35, events: ['straightSuccess'] };
    }

    default:
      return { score: 0, events };
  }
}

// Apply score — pure, does not mutate player. Caller applies player.score = result.after.
export function applyScore(
  player: Player,
  delta: number,
  state: GameState
): ScoreApplyResult {
  const before = player.score;
  let after = before + delta;
  let bust = false;

  if (after > state.target && state.phase !== 'winRollOff') {
    bust = true;
    after = 77;
  }

  return { before, after, bust };
}

// Round snapshot — returns new state
export function snapshotRoundTotals(state: GameState): GameState {
  const scores: Record<string, number> = {};
  state.players.forEach(p => {
    scores[p.id] = p.score;
  });
  const newRoundScores = state.roundScores.filter(r => r.round !== state.round);
  return { ...state, roundScores: [...newRoundScores, { round: state.round, scores }] };
}

// Turn advancement — returns new state
export function advanceTurn(state: GameState): GameState {
  const inRollOff = state.phase === 'winRollOff' || state.phase === 'lastRollOff';

  if (inRollOff && !state.rollOffSetupMode) {
    let rollOffIndex = state.rollOffIndex + 1;
    let rollOffRoundComplete = false;
    if (rollOffIndex >= state.rollOffPlayerIds.length) {
      rollOffIndex = 0;
      rollOffRoundComplete = true;
    }
    return { ...state, rollOffIndex, rollOffRoundComplete };
  }

  let currentIndex = state.currentIndex + 1;
  let turnsThisRound = state.turnsThisRound + 1;

  // In rebuttal, skip winner
  if (state.phase === 'rebuttal' && state.winnerId) {
    const winnerIndex = state.players.findIndex(p => p.id === state.winnerId);
    if (currentIndex === winnerIndex) {
      currentIndex++;
    }
  }

  if (currentIndex >= state.players.length) {
    const snapshotted = snapshotRoundTotals(state);
    currentIndex = 0;
    turnsThisRound = 0;

    // Skip winner at start of round in rebuttal
    if (state.phase === 'rebuttal' && state.winnerId) {
      const winnerIndex = state.players.findIndex(p => p.id === state.winnerId);
      if (currentIndex === winnerIndex) {
        currentIndex++;
      }
    }

    return {
      ...snapshotted,
      currentIndex,
      round: state.round + 1,
      turnsThisRound,
      consecutiveZeroTurnsInRound: 0,
    };
  }

  return { ...state, currentIndex, turnsThisRound };
}

export function getCompletedRoundsCount(state: GameState): number {
  return state.roundScores.length;
}

// Win state evaluation — returns new state + flags
export function evaluateWinState(
  state: GameState,
  player: Player
): { state: GameState; shouldShowWinnerRollOff: boolean; shouldShowLoserRollOff: boolean; gameComplete: boolean } {
  const flags = {
    shouldShowWinnerRollOff: false,
    shouldShowLoserRollOff: false,
    gameComplete: false,
  };

  let s = state;

  if (s.phase === 'normal') {
    if (player.score === s.target && !s.winnerId) {
      s = { ...s, winnerId: player.id, phase: 'rebuttal', rebuttalTurnsTaken: 0, rebuttalHit100Order: [] };
    }
  } else if (s.phase === 'rebuttal') {
    // Track players who hit target during rebuttal
    if (player.score === s.target && player.id !== s.winnerId) {
      if (!s.rebuttalHit100Order.includes(player.id)) {
        s = { ...s, rebuttalHit100Order: [...s.rebuttalHit100Order, player.id] };
      }
    }

    // Count this turn
    if (player.id !== s.winnerId) {
      s = { ...s, rebuttalTurnsTaken: s.rebuttalTurnsTaken + 1 };
    }

    const rebuttalDone = s.rebuttalTurnsTaken >= s.players.length - 1;
    if (rebuttalDone) {
      const winner = s.players.find(p => p.id === s.winnerId);
      const tiesAt100 = s.players.filter(p => p.score === s.target);

      if (tiesAt100.length > 1) {
        s = {
          ...s,
          phase: 'winRollOff',
          rollOffPlayerIds: tiesAt100.map(p => p.id),
          rollOffIndex: 0,
          rollOffSetupMode: true,
          rollOffRoundComplete: false,
        };
        flags.shouldShowWinnerRollOff = true;
      } else {
        const minScore = Math.min(...s.players.map(p => p.score));
        const lastPlace = s.players.filter(p => p.score === minScore);

        if (lastPlace.length > 1) {
          s = {
            ...s,
            phase: 'lastRollOff',
            rollOffPlayerIds: lastPlace.map(p => p.id),
            rollOffIndex: 0,
            rollOffSetupMode: true,
            rollOffRoundComplete: false,
          };
          flags.shouldShowLoserRollOff = true;
        } else {
          s = {
            ...s,
            ultimateWinnerId: winner?.id || null,
            loserId: lastPlace[0]?.id || null,
            gameComplete: true,
            phase: 'gameComplete',
          };
          flags.gameComplete = true;
        }
      }
    }
  }

  return { state: s, ...flags };
}

// Roll-off results — returns new state + flag
export function checkRollOffResults(state: GameState): { state: GameState; gameComplete: boolean } {
  let s = state;

  if (s.phase === 'winRollOff') {
    const scores = s.rollOffPlayerIds.map(id => ({
      id,
      score: s.players.find(p => p.id === id)!.score,
    }));
    const maxScore = Math.max(...scores.map(p => p.score));
    const leaders = scores.filter(p => p.score === maxScore);

    if (leaders.length === 1) {
      s = { ...s, ultimateWinnerId: leaders[0].id };

      const minScore = Math.min(...s.players.map(p => p.score));
      const lastPlace = s.players.filter(p => p.score === minScore);

      if (lastPlace.length > 1) {
        s = {
          ...s,
          phase: 'lastRollOff',
          rollOffPlayerIds: lastPlace.map(p => p.id),
          rollOffIndex: 0,
          rollOffSetupMode: true,
          rollOffRoundComplete: false,
        };
      } else {
        s = {
          ...s,
          loserId: lastPlace[0]?.id || null,
          gameComplete: true,
          phase: 'gameComplete',
        };
        return { state: s, gameComplete: true };
      }
    }
  } else if (s.phase === 'lastRollOff') {
    const scores = s.rollOffPlayerIds.map(id => ({
      id,
      score: s.players.find(p => p.id === id)!.score,
    }));
    const maxScore = Math.max(...scores.map(p => p.score));
    const minScore = Math.min(...scores.map(p => p.score));

    if (maxScore !== minScore) {
      const loser = scores.find(p => p.score === minScore)!;
      s = { ...s, loserId: loser.id, gameComplete: true, phase: 'gameComplete' };
      return { state: s, gameComplete: true };
    }
  }

  return { state: s, gameComplete: false };
}

// Leader and tie handling — returns new state + events
export function checkLeaderAndTies(
  state: GameState,
  currentPlayer: Player
): { state: GameState; events: string[] } {
  const events: string[] = [];
  const completedRounds = getCompletedRoundsCount(state);
  let s = state;

  if (state.phase === 'normal' && completedRounds >= 3) {
    const playersAtSame = state.players.filter(p => p.score === currentPlayer.score);
    if (playersAtSame.length >= 2) {
      events.push('tiedPlayers');
    }

    const leaderId = getLeaderId(state);
    if (leaderId && leaderId !== state.lastLeaderId) {
      s = { ...s, lastLeaderId: leaderId };
      events.push('leaderChanged');
    }
  }

  return { state: s, events };
}

// Group drink check — returns new state + flag
export function checkZeroRoundGroupDrink(state: GameState): { state: GameState; groupDrink: boolean } {
  if (
    state.consecutiveZeroTurnsInRound >= state.players.length &&
    state.phase === 'normal' &&
    state.players.length >= 4
  ) {
    return { state: { ...state, consecutiveZeroTurnsInRound: 0 }, groupDrink: true };
  }
  return { state, groupDrink: false };
}

// Reorder roll-off players — returns new state
export function reorderRollOffPlayer(state: GameState, playerId: string, direction: 'up' | 'down'): GameState {
  const currentIdx = state.rollOffPlayerIds.indexOf(playerId);
  if (currentIdx === -1) return state;

  const newIndex = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
  if (newIndex < 0 || newIndex >= state.rollOffPlayerIds.length) return state;

  const newIds = [...state.rollOffPlayerIds];
  [newIds[currentIdx], newIds[newIndex]] = [newIds[newIndex], newIds[currentIdx]];
  return { ...state, rollOffPlayerIds: newIds };
}

// Start roll-off from setup mode — returns new state
export function startRollOff(state: GameState): GameState {
  return { ...state, rollOffSetupMode: false, rollOffIndex: 0, rollOffRoundComplete: false };
}
