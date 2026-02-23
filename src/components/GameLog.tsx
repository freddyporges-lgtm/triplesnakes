import { type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LogEntry } from '../types/gameTypes';

interface GameLogProps {
  logs: LogEntry[];
  onEndGame?: () => void;
  isViewer?: boolean;
}

const typeIcon: Record<LogEntry['type'], string> = {
  drink: '🥤',
  social: '🎉',
  system: '✅',
  info: 'ℹ️',
};

export const GameLog: FC<GameLogProps> = ({ logs, onEndGame, isViewer }) => {
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ marginBottom: 0 }}>Game Tracker</h2>
        {!isViewer && onEndGame && (
          <button className="btn btn-danger btn-sm" onClick={onEndGame}>
            End Game
          </button>
        )}
      </div>
      <div className="log mt-6">
        <AnimatePresence initial={false}>
          {logs.length === 0 ? (
            <p className="muted">Game log will appear here...</p>
          ) : (
            logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className={`log-entry${log.type === 'system' ? ' system-message' : ''}`}
              >
                <strong>{typeIcon[log.type]}</strong> {log.message}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
