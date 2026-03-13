import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scoreboard } from './Scoreboard';
import { DiceDisplay } from './DiceDisplay';
import {
  TUTORIAL_STEPS,
  createTutorialInitialState,
  type TutorialStep,
} from '../lib/tutorialData';
import type { GameState } from '../types/gameTypes';

interface TutorialProps {
  onExit: () => void;
  onStartGame: () => void;
}

type DiceAnimState = 'idle' | 'rolling' | 'settled';

export const Tutorial: React.FC<TutorialProps> = ({ onExit, onStartGame }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [gameState, setGameState] = useState<GameState>(createTutorialInitialState);
  const [diceAnim, setDiceAnim] = useState<DiceAnimState>('idle');

  const step = TUTORIAL_STEPS[stepIndex];
  const totalSteps = TUTORIAL_STEPS.length;
  const progress = ((stepIndex + 1) / totalSteps) * 100;

  const applyScore = useCallback((s: TutorialStep, choiceScoreChange?: number) => {
    if (!s.playerName) return;

    setGameState((prev) => {
      const players = prev.players.map((p) => ({ ...p }));
      const playerMap: Record<string, number> = { You: 0, Snake: 1, Viper: 2 };
      const player = players[playerMap[s.playerName!]];
      if (!player) return prev;

      if (s.isBust) {
        player.score = 77;
      } else if (choiceScoreChange !== undefined) {
        // For choice steps, scoreChange is absolute target for 'tie' or delta for '3pts'
        player.score = choiceScoreChange;
      } else if (s.scoreChange !== undefined) {
        player.score += s.scoreChange;
      }

      return { ...prev, players };
    });
  }, []);

  const applyFastForward = useCallback((s: TutorialStep) => {
    if (!s.fastForwardScores) return;
    setGameState((prev) => {
      const players = prev.players.map((p) => ({
        ...p,
        score: s.fastForwardScores![p.id] ?? p.score,
      }));
      return { ...prev, players };
    });
  }, []);

  const updateCurrentPlayer = useCallback((s: TutorialStep) => {
    if (s.currentPlayerIndex !== undefined) {
      setGameState((prev) => ({ ...prev, currentIndex: s.currentPlayerIndex! }));
    }
  }, []);

  const advance = useCallback(() => {
    setDiceAnim('idle');
    setStepIndex((prev) => Math.min(prev + 1, totalSteps - 1));
  }, [totalSteps]);

  // Update current player highlight when step changes
  useEffect(() => {
    updateCurrentPlayer(step);
  }, [stepIndex, step, updateCurrentPlayer]);

  // Auto-advance for opponent rolls
  useEffect(() => {
    if (step.phase === 'opponentRoll') {
      const t1 = setTimeout(() => setDiceAnim('rolling'), 200);
      const t2 = setTimeout(() => setDiceAnim('settled'), 900);
      const t3 = setTimeout(() => {
        applyScore(step);
        advance();
      }, 2500);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
    if (step.phase === 'fastForward') {
      const t = setTimeout(() => {
        applyFastForward(step);
        advance();
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [stepIndex, step, advance, applyScore, applyFastForward]);

  // Player roll: start dice animation, settle after delay
  useEffect(() => {
    if (step.phase === 'playerRoll') {
      const t1 = setTimeout(() => setDiceAnim('rolling'), 100);
      const t2 = setTimeout(() => setDiceAnim('settled'), 800);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [stepIndex, step.phase]);

  const handleContinue = () => {
    if (step.phase === 'playerRoll' && diceAnim === 'settled') {
      applyScore(step);
      advance();
    } else if (step.phase === 'coach') {
      advance();
    }
  };

  const handleChoice = (option: NonNullable<typeof step.choiceOptions>[0]) => {
    const isAbsoluteSet = option.value === 'tie';
    if (isAbsoluteSet) {
      applyScore(step, option.scoreChange);
    } else {
      // For '3pts', add to current score
      setGameState((prev) => {
        const players = prev.players.map((p) => ({ ...p }));
        players[0].score += option.scoreChange;
        return { ...prev, players };
      });
    }
    advance();
  };

  const showDice = step.diceRoll && (step.phase === 'playerRoll' || step.phase === 'opponentRoll');
  const showContinue =
    (step.phase === 'coach') ||
    (step.phase === 'playerRoll' && diceAnim === 'settled');

  return (
    <div className="tutorial-container">
      {/* Header */}
      <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
        <button className="btn btn-secondary btn-sm" onClick={onExit}>
          ← Back
        </button>
        <span className="muted" style={{ fontSize: '0.75rem' }}>
          {stepIndex + 1} / {totalSteps}
        </span>
        <button className="btn btn-secondary btn-sm" onClick={onExit}>
          Skip
        </button>
      </div>

      {/* Progress bar */}
      <div className="tutorial-progress">
        <motion.div
          className="tutorial-progress-bar"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Scoreboard */}
      <div className="scoreboard" style={{ marginTop: 10 }}>
        <Scoreboard state={gameState} isViewer={true} />
      </div>

      {/* Dice display */}
      <AnimatePresence mode="wait">
        {showDice && diceAnim !== 'idle' && (
          <motion.div
            key={step.id + '-dice'}
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            style={{ textAlign: 'center' }}
          >
            <div className="muted" style={{ marginBottom: 8, fontSize: '0.8rem' }}>
              {step.playerName}&apos;s Roll
            </div>
            <DiceDisplay
              dice={step.diceRoll!.dice}
              greenDieValue={step.diceRoll!.greenDie}
              highlightIndices={step.diceRoll!.highlightIndices}
              rolling={diceAnim === 'rolling'}
            />
            <AnimatePresence>
              {diceAnim === 'settled' && step.outcomeLabel && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ marginTop: 12 }}
                >
                  <span className="pill">{step.outcomeLabel}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fast-forward overlay */}
      <AnimatePresence>
        {step.phase === 'fastForward' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{ textAlign: 'center', padding: '32px 0' }}
          >
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)' }}
            >
              {step.coachText}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Choice buttons (Triple Snakes) */}
      <AnimatePresence>
        {step.phase === 'choice' && step.choiceOptions && (
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="cols-2" style={{ gap: 10 }}>
              {step.choiceOptions.map((opt) => (
                <button
                  key={opt.value}
                  className="btn"
                  onClick={() => handleChoice(opt)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End screen */}
      {step.phase === 'end' && (
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginTop: 16 }}
        >
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>You&apos;re Ready!</h2>
          <p className="muted" style={{ marginTop: 12, lineHeight: 1.5 }}>
            {step.coachText}
          </p>
          <button className="btn" style={{ marginTop: 20, width: '100%' }} onClick={onStartGame}>
            Start a Real Game!
          </button>
          <button
            className="btn btn-secondary"
            style={{ marginTop: 10, width: '100%' }}
            onClick={onExit}
          >
            Back to Menu
          </button>
        </motion.div>
      )}

      {/* Coach overlay */}
      {step.phase !== 'end' && step.phase !== 'fastForward' && (
        <div className="coach-overlay">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              className="coach-bubble"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="coach-icon">🐍</div>
              <div className="coach-text">{step.coachText}</div>
            </motion.div>
          </AnimatePresence>

          {showContinue && (
            <motion.button
              className="btn coach-continue"
              onClick={handleContinue}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Continue
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
};
