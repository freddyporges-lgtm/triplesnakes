import type { GameState, Player, OutcomeType, TurnOutcome, ScoreApplyResult } from '../types/gameTypes';

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

// Turn scoring
export function computeTurnScore(
  outcomeType: OutcomeType,
  outcomeData: Record<string, any>,
  state: GameState
): TurnOutcome {
  const events: string[] = [];

  switch (outcomeType) {
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
      const f1 = parseInt(outcomeData.face1, 10);
      const c1 = parseInt(outcomeData.count1, 10);
      const f2 = parseInt(outcomeData.face2, 10);
      const c2 = parseInt(outcomeData.count2, 10);
      if (!isNaN(f1) && !isNaN(c1)) score += f1 * c1;
      if (!isNaN(f2) && !isNaN(c2)) score += f2 * c2;
      return { score: score || 0, events };
    }

    case 'doubleDouble': {
      const p1 = parseInt(outcomeData.pair1Face, 10);
      const p2 = parseInt(outcomeData.pair2Face, 10);
      if (isNaN(p1) || isNaN(p2)) return { score: 0, events };
      return { score: p1 * 2 + p2 * 2, events };
    }

    case 'fourKind': {
      const face = parseInt(outcomeData.face, 10);
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

// Apply score changes
export function applyScore(
  player: Player,
  delta: number,
  state: GameState
): ScoreApplyResult {
  const before = player.score;
  let after = before + delta;
  let bust = false;

  // Busts only happen in normal play, rebuttal, and loser's roll-off (not winner's roll-off)
  if (after > state.target && state.phase !== 'winRollOff') {
    bust = true;
    after = 77;
  }

  player.score = after;
  return { before, after, bust };
}

// Turn advancement
export function advanceTurn(state: GameState): void {
  const inRollOff = state.phase === 'winRollOff' || state.phase === 'lastRollOff';

  if (inRollOff && !state.rollOffSetupMode) {
    state.rollOffIndex++;
    if (state.rollOffIndex >= state.rollOffPlayerIds.length) {
      state.rollOffIndex = 0;
      state.rollOffRoundComplete = true;
    }
    return;
  }

  state.currentIndex++;
  state.turnsThisRound++;

  // In rebuttal, skip winner
  if (state.phase === 'rebuttal' && state.winnerId) {
    const winnerIndex = state.players.findIndex(p => p.id === state.winnerId);
    if (state.currentIndex === winnerIndex) {
      state.currentIndex++;
    }
  }

  if (state.currentIndex >= state.players.length) {
    snapshotRoundTotals(state);
    state.currentIndex = 0;
    state.round++;
    state.turnsThisRound = 0;
    state.consecutiveZeroTurnsInRound = 0;

    // Skip winner at start of round in rebuttal
    if (state.phase === 'rebuttal' && state.winnerId) {
      const winnerIndex = state.players.findIndex(p => p.id === state.winnerId);
      if (state.currentIndex === winnerIndex) {
        state.currentIndex++;
      }
    }
  }
}

// Round snapshot
export function snapshotRoundTotals(state: GameState): void {
  const scores: Record<string, number> = {};
  state.players.forEach(p => {
    scores[p.id] = p.score;
  });
  state.roundScores = state.roundScores.filter(r => r.round !== state.round);
  state.roundScores.push({ round: state.round, scores });
}

export function getCompletedRoundsCount(state: GameState): number {
  return state.roundScores.length;
}

// Win state evaluation
export function evaluateWinState(
  state: GameState,
  player: Player
): { shouldShowWinnerRollOff: boolean; shouldShowLoserRollOff: boolean; gameComplete: boolean } {
  const result = {
    shouldShowWinnerRollOff: false,
    shouldShowLoserRollOff: false,
    gameComplete: false,
  };

  if (state.phase === 'normal') {
    if (player.score === state.target && !state.winnerId) {
      state.winnerId = player.id;
      state.phase = 'rebuttal';
      state.rebuttalTurnsTaken = 0;
      state.rebuttalHit100Order = [];
    }
  } else if (state.phase === 'rebuttal') {
    // Track players who hit 100 during rebuttal
    if (player.score === state.target && player.id !== state.winnerId) {
      if (!state.rebuttalHit100Order.includes(player.id)) {
        state.rebuttalHit100Order.push(player.id);
      }
    }

    // Count this turn
    if (player.id !== state.winnerId) {
      state.rebuttalTurnsTaken++;
    }

    const rebuttalDone = state.rebuttalTurnsTaken >= state.players.length - 1;
    if (rebuttalDone) {
      const winner = state.players.find(p => p.id === state.winnerId);
      const tiesAt100 = state.players.filter(p => p.score === state.target);

      if (tiesAt100.length > 1) {
        // Start winner's roll-off
        state.phase = 'winRollOff';
        state.rollOffPlayerIds = tiesAt100.map(p => p.id);
        state.rollOffIndex = 0;
        state.rollOffSetupMode = true;
        state.rollOffRoundComplete = false;
        result.shouldShowWinnerRollOff = true;
      } else {
        // Check for loser's roll-off
        const minScore = Math.min(...state.players.map(p => p.score));
        const lastPlace = state.players.filter(p => p.score === minScore);

        if (lastPlace.length > 1) {
          // Start loser's roll-off
          state.phase = 'lastRollOff';
          state.rollOffPlayerIds = lastPlace.map(p => p.id);
          state.rollOffIndex = 0;
          state.rollOffSetupMode = true;
          state.rollOffRoundComplete = false;
          result.shouldShowLoserRollOff = true;
        } else {
          // Game complete
          state.ultimateWinnerId = winner?.id || null;
          state.loserId = lastPlace[0]?.id || null;
          state.gameComplete = true;
          state.phase = 'gameComplete';
          result.gameComplete = true;
        }
      }
    }
  }

  return result;
}

// Roll-off results
export function checkRollOffResults(state: GameState): { gameComplete: boolean } {
  const result = { gameComplete: false };

  if (state.phase === 'winRollOff') {
    const maxScore = Math.max(...state.rollOffPlayerIds.map(id => state.players.find(p => p.id === id)!.score));
    const leaders = state.rollOffPlayerIds.filter(id => state.players.find(p => p.id === id)!.score === maxScore);

    if (leaders.length === 1) {
      state.ultimateWinnerId = leaders[0];

      // Check for loser's roll-off
      const minScore = Math.min(...state.players.map(p => p.score));
      const lastPlace = state.players.filter(p => p.score === minScore);

      if (lastPlace.length > 1) {
        state.phase = 'lastRollOff';
        state.rollOffPlayerIds = lastPlace.map(p => p.id);
        state.rollOffIndex = 0;
        state.rollOffSetupMode = true;
        state.rollOffRoundComplete = false;
      } else {
        state.loserId = lastPlace[0]?.id || null;
        state.gameComplete = true;
        state.phase = 'gameComplete';
        result.gameComplete = true;
      }
    }
  } else if (state.phase === 'lastRollOff') {
    const rollOffScores = state.rollOffPlayerIds.map(id => ({
      id,
      score: state.players.find(p => p.id === id)!.score,
    }));

    const maxScore = Math.max(...rollOffScores.map(p => p.score));
    const minScore = Math.min(...rollOffScores.map(p => p.score));

    if (maxScore !== minScore) {
      const loser = rollOffScores.find(p => p.score === minScore)!;
      state.loserId = loser.id;
      state.gameComplete = true;
      state.phase = 'gameComplete';
      result.gameComplete = true;
    }
  }

  return result;
}

// Leader and tie handling
export function checkLeaderAndTies(state: GameState, currentPlayer: Player): string[] {
  const events: string[] = [];
  const completedRounds = getCompletedRoundsCount(state);

  if (state.phase === 'normal' && completedRounds >= 3) {
    const playersAtSame = state.players.filter(p => p.score === currentPlayer.score);
    if (playersAtSame.length >= 2) {
      events.push('tiedPlayers');
    }

    const leaderId = getLeaderId(state);
    if (leaderId && leaderId !== state.lastLeaderId) {
      state.lastLeaderId = leaderId;
      events.push('leaderChanged');
    }
  }

  return events;
}

// Group drink check (only applies for 4+ players)
export function checkZeroRoundGroupDrink(state: GameState): boolean {
  if (
    state.consecutiveZeroTurnsInRound >= state.players.length &&
    state.phase === 'normal' &&
    state.players.length >= 4
  ) {
    state.consecutiveZeroTurnsInRound = 0;
    return true;
  }
  return false;
}

// Reorder roll-off players
export function reorderRollOffPlayer(state: GameState, playerId: string, direction: 'up' | 'down'): void {
  const currentIndex = state.rollOffPlayerIds.indexOf(playerId);
  if (currentIndex === -1) return;

  const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (newIndex < 0 || newIndex >= state.rollOffPlayerIds.length) return;

  // Swap
  const temp = state.rollOffPlayerIds[currentIndex];
  state.rollOffPlayerIds[currentIndex] = state.rollOffPlayerIds[newIndex];
  state.rollOffPlayerIds[newIndex] = temp;
}

// Start roll-off from setup mode
export function startRollOff(state: GameState): void {
  state.rollOffSetupMode = false;
  state.rollOffIndex = 0;
  state.rollOffRoundComplete = false;
}
