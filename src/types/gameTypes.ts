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
  previousWinnerId: string | null;
  previousLoserId: string | null;
}

export type OutcomeType =
  | 'match'
  | 'doubleDouble'
  | 'fourKind'
  | 'straight'
  | 'tripleSnakes'
  | 'zeroPoints'
  | 'bust77'
  | 'manualScore';

export type OutcomeData =
  | { type: 'match'; face1?: string; count1?: string; face2?: string; count2?: string }
  | { type: 'doubleDouble'; pair1Face?: string; pair2Face?: string }
  | { type: 'fourKind'; face?: string; useBonus?: boolean }
  | { type: 'straight'; result?: '34' | '35' | 'fail' | '' }
  | { type: 'tripleSnakes'; mode?: 'tieLeader' | '3' }
  | { type: 'zeroPoints'; zeroType?: 'snakeEyes' | 'noMatches' }
  | { type: 'bust77' }
  | { type: 'manualScore'; score: number };

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
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'drink' | 'social' | 'system';
}

export interface GameEvent {
  type: 'scoreUpdated' | 'phaseChanged' | 'turnAdvanced' | 'gameCompleted' | 'logAdded';
  data: unknown;
}
