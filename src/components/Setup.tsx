import { type FC, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameState } from '../types/gameTypes';
import { addPlayer, removePlayer } from '../lib/gameLogic';

interface SetupProps {
  state: GameState;
  onStateChange: (state: GameState) => void;
  onStartGame: () => void;
}

export const Setup: FC<SetupProps> = ({ state, onStateChange, onStartGame }) => {
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
      className="card"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div>
        <motion.div variants={itemVariants}>
          <h2>Player Setup</h2>
        </motion.div>

        <motion.div variants={itemVariants}>
          <label>Player Name</label>
          <div className="row mt-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Enter player name..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
              />
            </div>
            <button className="btn btn-sm" onClick={handleAddPlayer}>
              Add
            </button>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="mt-8">
          <label>Players ({state.players.length})</label>
          <div className="players-list mt-4">
            {state.players.map((player, index) => (
              <motion.div
                key={player.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="player-row"
              >
                <span>{player.name}</span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleRemovePlayer(index)}
                >
                  Remove
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="mt-8">
          <button
            className="btn"
            style={{ width: '100%' }}
            onClick={handleStartGame}
            disabled={state.players.length < 2}
          >
            Start Game
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
};
