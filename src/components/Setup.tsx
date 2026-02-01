import { useState } from 'react';
import { motion } from 'framer-motion';
import type { GameState } from '../types/gameTypes';
import { addPlayer, removePlayer } from '../lib/gameLogic';

interface SetupProps {
  state: GameState;
  onStateChange: (state: GameState) => void;
  onStartGame: () => void;
}

export const Setup: React.FC<SetupProps> = ({ state, onStateChange, onStartGame }) => {
  const [playerName, setPlayerName] = useState('');

  const handleAddPlayer = () => {
    if (playerName.trim()) {
      const newState = addPlayer(state, playerName.trim());
      onStateChange(newState);
      setPlayerName('');
    }
  };

  const handleRemovePlayer = (index: number) => {
    const newState = removePlayer(state, index);
    onStateChange(newState);
  };

  const handleStartGame = () => {
    if (state.players.length >= 2) {
      const newState = { ...state, started: true };
      onStateChange(newState);
      onStartGame();
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="card max-w-2xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="space-y-8">
        <motion.div variants={itemVariants}>
          <h1 className="text-4xl font-bold mb-2">Triple Snakes</h1>
          <p className="text-gray-400">Set up your game and add players</p>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-gray-300 mb-2 block">Player Name</span>
            <div className="flex gap-3">
              <input
                type="text"
                className="input-field flex-1"
                placeholder="Enter player name..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
              />
              <button
                className="btn-primary"
                onClick={handleAddPlayer}
              >
                Add Player
              </button>
            </div>
          </label>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-3">
          <h2 className="text-lg font-semibold">Players ({state.players.length})</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {state.players.map((player, index) => (
              <motion.div
                key={player.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center justify-between bg-primary p-3 rounded-lg border border-accent border-opacity-30"
              >
                <span className="text-white font-medium">{player.name}</span>
                <button
                  className="btn-small"
                  onClick={() => handleRemovePlayer(index)}
                >
                  Remove
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <button
            className={`btn-primary w-full text-lg py-4 ${
              state.players.length < 2 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={handleStartGame}
            disabled={state.players.length < 2}
          >
            Start Game ({state.players.length}/2+)
          </button>
          {state.players.length < 2 && (
            <p className="text-sm text-gray-400 mt-2 text-center">
              Add at least 2 players to start
            </p>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};
