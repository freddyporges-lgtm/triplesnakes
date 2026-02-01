import { type FC } from 'react';
import { motion } from 'framer-motion';
import type { GameState } from '../types/gameTypes';
import { getLeaderId, getCurrentPlayer } from '../lib/gameLogic';

interface ScoreboardProps {
  state: GameState;
  onRollOffReorder?: (playerId: string, direction: 'up' | 'down') => void;
  isViewer?: boolean;
}

export const Scoreboard: FC<ScoreboardProps> = ({ state, onRollOffReorder, isViewer = false }) => {
  const leaderId = getLeaderId(state);
  const currentPlayer = getCurrentPlayer(state);
  const inRollOff = state.phase === 'winRollOff' || state.phase === 'lastRollOff';

  const getPlayersToShow = () => {
    let playersToShow = state.players;
    if (inRollOff && state.rollOffPlayerIds.length > 0) {
      const rollOffPlayers = state.rollOffPlayerIds
        .map(id => state.players.find(p => p.id === id))
        .filter((p): p is typeof state.players[0] => p !== undefined);
      const otherPlayers = state.players.filter(p => !state.rollOffPlayerIds.includes(p.id));
      playersToShow = [...rollOffPlayers, ...otherPlayers];
    }
    return playersToShow;
  };

  const phaseText = {
    normal: 'Normal Play',
    rebuttal: `Rebuttal (${(state.players.length - 1) - state.rebuttalTurnsTaken} left)`,
    winRollOff: state.rollOffSetupMode ? "Winner's Roll-Off (Set Order)" : "Winner's Roll-Off",
    lastRollOff: state.rollOffSetupMode ? "Loser's Roll-Off (Set Order)" : "Loser's Roll-Off",
    gameComplete: 'Game Over',
  };

  const roundText = state.gameComplete
    ? 'Final'
    : inRollOff && !state.rollOffSetupMode
      ? `Turn ${state.rollOffIndex + 1} of ${state.rollOffPlayerIds.length}`
      : inRollOff && state.rollOffSetupMode
        ? 'Setup'
        : `Round ${state.round}`;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={containerVariants}>
      {/* Phase and Round Info */}
      <motion.div variants={itemVariants} className="flex gap-4 justify-center">
        <div className="badge-success text-center px-4 py-2">Round: {roundText}</div>
        <div className="badge text-center px-4 py-2">{phaseText[state.phase]}</div>
        <div className="badge-warning text-center px-4 py-2">Target: {state.target}</div>
      </motion.div>

      {/* Current Player */}
      {currentPlayer && (
        <motion.div variants={itemVariants} className="text-center">
          <p className="text-sm text-gray-400 mb-1">Current Player</p>
          <p className="text-2xl font-bold text-highlight">{currentPlayer.name}</p>
        </motion.div>
      )}

      {/* Players List */}
      <motion.div variants={itemVariants} className="space-y-3">
        {getPlayersToShow().map((player) => {
          const isInRollOff = inRollOff && state.rollOffPlayerIds.includes(player.id);
          const rollOffPosition = isInRollOff ? state.rollOffPlayerIds.indexOf(player.id) : -1;
          const isCurrentTurn = inRollOff
            ? player.id === state.rollOffPlayerIds[state.rollOffIndex]
            : state.players.indexOf(player) === state.currentIndex;

          const isLeader = player.id === leaderId;
          const isWinner = player.id === state.ultimateWinnerId;
          const isLoser = player.id === state.loserId && state.gameComplete;
          const isTiedWinner = state.rebuttalHit100Order.includes(player.id) && player.id !== state.winnerId;

          return (
            <motion.div
              key={player.id}
              layout
              variants={itemVariants}
              className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-300 ${
                isCurrentTurn
                  ? 'bg-highlight bg-opacity-20 border-highlight'
                  : 'bg-secondary border-accent border-opacity-30'
              }`}
            >
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-semibold text-white">{player.name}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {isInRollOff && (
                      <span className="badge text-xs">#{rollOffPosition + 1}</span>
                    )}
                    {isWinner && (
                      <span className="badge-success text-xs">🏆 Winner</span>
                    )}
                    {isTiedWinner && (
                      <span className="badge text-xs">Tied Winner</span>
                    )}
                    {isLoser && (
                      <span className="badge text-xs bg-red-900 bg-opacity-20 text-red-400">
                        Takes Shot
                      </span>
                    )}
                    {inRollOff && !isInRollOff && (
                      <span className="badge text-xs opacity-50">Spectating</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <motion.div
                  key={player.score}
                  initial={{ scale: 1.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`text-3xl font-bold ${
                    isLeader ? 'text-success' : 'text-white'
                  }`}
                >
                  {player.score}
                </motion.div>

                {/* Roll-off reorder buttons */}
                {isInRollOff && state.rollOffSetupMode && !isViewer && onRollOffReorder && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => onRollOffReorder(player.id, 'up')}
                      disabled={rollOffPosition === 0}
                      className="px-2 py-1 text-xs bg-accent rounded hover:bg-highlight disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => onRollOffReorder(player.id, 'down')}
                      disabled={rollOffPosition === state.rollOffPlayerIds.length - 1}
                      className="px-2 py-1 text-xs bg-accent rounded hover:bg-highlight disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ▼
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};
