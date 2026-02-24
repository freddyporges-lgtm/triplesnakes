import type { GameState, OutcomeType } from '../types/gameTypes';
import { createInitialGameState } from './gameLogic';

export type TutorialPhase =
  | 'coach'
  | 'playerRoll'
  | 'opponentRoll'
  | 'choice'
  | 'fastForward'
  | 'end';

export interface TutorialDiceRoll {
  dice: number[];
  greenDie?: number;
  highlightIndices?: number[];
}

export interface TutorialStep {
  id: string;
  phase: TutorialPhase;
  playerName?: 'You' | 'Snake' | 'Viper';
  coachText: string;
  outcomeType?: OutcomeType;
  outcomeLabel?: string;
  diceRoll?: TutorialDiceRoll;
  scoreChange?: number;
  isBust?: boolean;
  choiceOptions?: { label: string; value: string; scoreChange: number }[];
  fastForwardScores?: Record<string, number>;
  currentPlayerIndex?: number;
}

const YOU = 0;
const SNAKE = 1;
const VIPER = 2;

export const TUTORIAL_STEPS: TutorialStep[] = [
  // === ROUND 1: Roll and Score ===
  {
    id: 'intro',
    phase: 'coach',
    coachText: "Welcome to Triple Snakes! You roll 4 dice and try to score points. First to exactly 100 wins. Let's learn by playing!",
  },
  {
    id: 'r1-you',
    phase: 'playerRoll',
    playerName: 'You',
    currentPlayerIndex: YOU,
    coachText: "You rolled two 4s — that's a Match! Face value times count: 4 × 2 = 8 points.",
    outcomeType: 'match',
    outcomeLabel: 'Match: Two 4s = 8 pts',
    diceRoll: { dice: [4, 4, 2, 5], highlightIndices: [0, 1] },
    scoreChange: 8,
  },
  {
    id: 'r1-snake',
    phase: 'opponentRoll',
    playerName: 'Snake',
    currentPlayerIndex: SNAKE,
    coachText: 'Snake rolled three 3s — 9 points!',
    outcomeType: 'match',
    outcomeLabel: 'Match: Three 3s = 9 pts',
    diceRoll: { dice: [3, 3, 3, 1], highlightIndices: [0, 1, 2] },
    scoreChange: 9,
  },
  {
    id: 'r1-viper',
    phase: 'opponentRoll',
    playerName: 'Viper',
    currentPlayerIndex: VIPER,
    coachText: 'Viper matched two 2s for 4 points.',
    outcomeType: 'match',
    outcomeLabel: 'Match: Two 2s = 4 pts',
    diceRoll: { dice: [2, 2, 6, 3], highlightIndices: [0, 1] },
    scoreChange: 4,
  },

  // === ROUND 2: The Good, the Bad, and the Lucky ===
  {
    id: 'r2-intro',
    phase: 'coach',
    coachText: "Nice start! Now let's see some different outcomes — the good, the bad, and the lucky.",
  },
  {
    id: 'r2-you-dd',
    phase: 'playerRoll',
    playerName: 'You',
    currentPlayerIndex: YOU,
    coachText: 'Double Double! Two 3s and two 5s. Each pair scores double: (3×2) + (5×2) = 16 points!',
    outcomeType: 'doubleDouble',
    outcomeLabel: 'Double Double = 16 pts',
    diceRoll: { dice: [3, 3, 5, 5], highlightIndices: [0, 1, 2, 3] },
    scoreChange: 16,
  },
  {
    id: 'r2-snake-eyes',
    phase: 'opponentRoll',
    playerName: 'Snake',
    currentPlayerIndex: SNAKE,
    coachText: "Snake Eyes! Two 1s means zero points. That's gotta sting.",
    outcomeType: 'zeroPoints',
    outcomeLabel: '🐍 Snake Eyes = 0 pts',
    diceRoll: { dice: [1, 1, 4, 6], highlightIndices: [0, 1] },
    scoreChange: 0,
  },
  {
    id: 'r2-viper-noMatch',
    phase: 'opponentRoll',
    playerName: 'Viper',
    currentPlayerIndex: VIPER,
    coachText: 'No matches at all — nothing lines up. Viper scores zero.',
    outcomeType: 'zeroPoints',
    outcomeLabel: 'No Matches = 0 pts',
    diceRoll: { dice: [2, 5, 3, 6] },
    scoreChange: 0,
  },
  {
    id: 'r2-you-4k',
    phase: 'playerRoll',
    playerName: 'You',
    currentPlayerIndex: YOU,
    coachText: "Four-of-a-Kind! Four 5s = 20 points. These are rare and powerful. Some groups play a bonus chart where this would be worth even more!",
    outcomeType: 'fourKind',
    outcomeLabel: 'Four-of-a-Kind: 5s = 20 pts',
    diceRoll: { dice: [5, 5, 5, 5], highlightIndices: [0, 1, 2, 3] },
    scoreChange: 20,
  },
  {
    id: 'r2-snake-straight',
    phase: 'opponentRoll',
    playerName: 'Snake',
    currentPlayerIndex: SNAKE,
    coachText: 'A Straight! 1-2-3-4 on the first throw, and the green die was a 5. That\'s 34 points — one of the best outcomes in the game!',
    outcomeType: 'straight',
    outcomeLabel: 'Straight = 34 pts',
    diceRoll: { dice: [1, 2, 3, 4], greenDie: 5, highlightIndices: [0, 1, 2, 3] },
    scoreChange: 34,
  },
  {
    id: 'r2-viper-failStraight',
    phase: 'opponentRoll',
    playerName: 'Viper',
    currentPlayerIndex: VIPER,
    coachText: "Viper almost had a straight but the green die didn't complete the run. Failed straight = zero points.",
    outcomeType: 'straight',
    outcomeLabel: 'Failed Straight = 0 pts',
    diceRoll: { dice: [1, 2, 3, 6], greenDie: 4 },
    scoreChange: 0,
  },

  // === ROUND 3: Triple Snakes ===
  {
    id: 'r3-ff',
    phase: 'fastForward',
    coachText: 'A few rounds pass...',
    fastForwardScores: { 'tutorial-you': 44, 'tutorial-snake': 52, 'tutorial-viper': 38 },
  },
  {
    id: 'r3-you-ts',
    phase: 'playerRoll',
    playerName: 'You',
    currentPlayerIndex: YOU,
    coachText: "TRIPLE SNAKES! Three 1s — the game's signature roll. You have a choice...",
    outcomeType: 'tripleSnakes',
    outcomeLabel: 'Triple Snakes!',
    diceRoll: { dice: [1, 1, 1, 3], highlightIndices: [0, 1, 2] },
  },
  {
    id: 'r3-choice',
    phase: 'choice',
    playerName: 'You',
    currentPlayerIndex: YOU,
    coachText: "Take 3 points? Or JUMP to the leader's score? Snake has 52 — you could catch up instantly!",
    choiceOptions: [
      { label: 'Take 3 Points', value: '3pts', scoreChange: 3 },
      { label: 'Tie the Leader (52)', value: 'tie', scoreChange: 52 },
    ],
  },

  // === ROUND 4: The Bust ===
  {
    id: 'r4-ff',
    phase: 'fastForward',
    coachText: 'More rounds pass...',
    fastForwardScores: { 'tutorial-you': 96, 'tutorial-snake': 88, 'tutorial-viper': 72 },
  },
  {
    id: 'r4-bust',
    phase: 'playerRoll',
    playerName: 'You',
    currentPlayerIndex: YOU,
    coachText: 'Your score would be 96 + 16 = 112 — over 100! You BUST and get sent back to 77.',
    outcomeType: 'bust77',
    outcomeLabel: 'BUST! Reset to 77',
    diceRoll: { dice: [3, 3, 5, 5], highlightIndices: [0, 1, 2, 3] },
    scoreChange: 0,
    isBust: true,
  },
  {
    id: 'r4-explain',
    phase: 'coach',
    coachText: "Be careful as you approach 100 — overshooting sends you back to 77. You need to land on exactly 100!",
  },

  // === ROUND 5: The Finish ===
  {
    id: 'r5-ff',
    phase: 'fastForward',
    coachText: 'Final rounds...',
    fastForwardScores: { 'tutorial-you': 94, 'tutorial-snake': 100, 'tutorial-viper': 85 },
  },
  {
    id: 'r5-rebuttal',
    phase: 'coach',
    coachText: "Snake hit exactly 100! But it's not over — every other player gets one Rebuttal turn to try to tie.",
  },
  {
    id: 'r5-you-tie',
    phase: 'playerRoll',
    playerName: 'You',
    currentPlayerIndex: YOU,
    coachText: "You scored 6, bringing you to 100! You tied Snake! In a real game, this triggers a Winner's Roll-Off to decide who wins.",
    outcomeType: 'match',
    outcomeLabel: 'Match: Two 3s = 6 pts',
    diceRoll: { dice: [3, 3, 6, 5], highlightIndices: [0, 1] },
    scoreChange: 6,
  },

  // === END ===
  {
    id: 'end',
    phase: 'end',
    coachText: "That's Triple Snakes! Matches, doubles, straights, the signature Triple Snakes roll, busts, and rebuttals. Ready to play for real?",
  },
];

export function createTutorialInitialState(): GameState {
  return {
    ...createInitialGameState(),
    players: [
      { id: 'tutorial-you', name: 'You', score: 0 },
      { id: 'tutorial-snake', name: 'Snake', score: 0 },
      { id: 'tutorial-viper', name: 'Viper', score: 0 },
    ],
    started: true,
    target: 100,
  };
}
