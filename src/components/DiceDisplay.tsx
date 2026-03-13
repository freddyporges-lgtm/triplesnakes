import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

interface DiceDisplayProps {
  dice: number[];
  greenDieValue?: number;
  highlightIndices?: number[];
  rolling?: boolean;
}

const PIP_POSITIONS: Record<number, number[]> = {
  1: [5],
  2: [3, 7],
  3: [3, 5, 7],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

export function Die({ face, highlighted, isGreen }: { face: number; highlighted?: boolean; isGreen?: boolean }) {
  const positions = PIP_POSITIONS[face] || [];
  return (
    <div
      className={`die tutorial-die${highlighted ? ' tutorial-die-highlighted' : ''}${isGreen ? ' tutorial-die-green' : ''}`}
    >
      {positions.map((pos) => (
        <div key={pos} className={`pip pos-${pos}`} />
      ))}
    </div>
  );
}

export const DiceDisplay: React.FC<DiceDisplayProps> = ({
  dice,
  greenDieValue,
  highlightIndices = [],
  rolling = false,
}) => {
  const [displayFaces, setDisplayFaces] = useState(dice);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (rolling) {
      intervalRef.current = setInterval(() => {
        setDisplayFaces(
          dice.map(() => Math.floor(Math.random() * 6) + 1)
        );
      }, 80);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setDisplayFaces(dice);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [rolling, dice]);

  return (
    <div className="tutorial-dice-row">
      {displayFaces.map((face, i) => (
        <motion.div
          key={i}
          animate={
            rolling
              ? { rotate: [0, 12, -8, 4, 0], scale: [1, 1.08, 0.96, 1] }
              : { rotate: 0, scale: 1 }
          }
          transition={{ duration: 0.4, repeat: rolling ? Infinity : 0 }}
        >
          <Die face={face} highlighted={!rolling && highlightIndices.includes(i)} />
        </motion.div>
      ))}
      {greenDieValue !== undefined && (
        <motion.div
          animate={
            rolling
              ? { rotate: [0, -10, 8, -4, 0], scale: [1, 1.08, 0.96, 1] }
              : { rotate: 0, scale: 1 }
          }
          transition={{ duration: 0.4, repeat: rolling ? Infinity : 0 }}
        >
          <Die
            face={rolling ? Math.floor(Math.random() * 6) + 1 : greenDieValue}
            isGreen
            highlighted={!rolling}
          />
        </motion.div>
      )}
    </div>
  );
};
