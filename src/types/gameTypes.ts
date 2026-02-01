// Game state and player types
export interface Player {
  id: string;
  name: string;
  score: number;
}

export interface RoundScore {
  round: number;
  scores: Record<string, number>;
}

export type GamePhase = 'normal' | 'rebuttal' | 'winRollOff' | 'lastRollOff' | 'gameComplete';

export interface GameState {
  players: Player[];
  target: number;
  round: number;
  currentIndex: number;
  started: boolean;
  phase: GamePhase;
  winnerId: string | null;
  ultimateWinnerId: string | null;
  loserId: string | null;
  gameComplete: boolean;
  consecutiveZeroTurnsInRound: number;
  turnsThisRound: number;
  lastLeaderId: string | null;
  roundScores: RoundScore[];
  showRoundByRound: boolean;
  rebuttalTurnsTaken: number;
  rebuttalHit100Order: string[];
  rollOffPlayerIds: string[];
  rollOffIndex: number;
  rollOffSetupMode: boolean;
  rollOffRoundComplete: boolean;
}

export type OutcomeType =
  | 'match'
  | 'doubleDouble'
  | 'fourKind'
  | 'straight'
  | 'tripleSnakes'
  | 'zeroPoints'
  | 'bust77';

export interface TurnOutcome {
  score: number;
  events: string[];
}

export interface ScoreApplyResult {
  before: number;
  after: number;
  bust: boolean;
}

export interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'drink' | 'social' | 'system';
}

export interface GameEvent {
  type: 'scoreUpdated' | 'phaseChanged' | 'turnAdvanced' | 'gameCompleted' | 'logAdded';
  data: unknown;
}
