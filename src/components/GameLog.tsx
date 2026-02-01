import { type FC } from 'react';
import { motion } from 'framer-motion';
import type { LogEntry } from '../types/gameTypes';

interface GameLogProps {
  logs: LogEntry[];
}

export const GameLog: FC<GameLogProps> = ({ logs }) => {
  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'drink':
        return 'badge-warning';
      case 'social':
        return 'badge text-red-400 bg-red-900 bg-opacity-20';
      case 'system':
        return 'badge-success';
      default:
        return 'badge';
    }
  };

  const getBadgeText = (type: string) => {
    switch (type) {
      case 'drink':
        return 'Drink';
      case 'social':
        return 'Social';
      case 'system':
        return 'Game';
      default:
        return 'Info';
    }
  };

  return (
    <motion.div className="card h-96 overflow-hidden flex flex-col">
      <h3 className="text-lg font-semibold mb-4">Game Log</h3>
      <div className="flex-1 overflow-y-auto space-y-2">
        {logs.length === 0 ? (
          <p className="text-gray-400 text-sm">Game log will appear here...</p>
        ) : (
          logs.map((log, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(index * 0.05, 0.3) }}
              className="bg-primary p-2 rounded border border-accent border-opacity-20 text-sm"
            >
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-500 font-mono shrink-0">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                <span className={`badge text-xs shrink-0 ${getBadgeColor(log.type)}`}>
                  {getBadgeText(log.type)}
                </span>
                <span className="text-white flex-1">{log.message}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};
