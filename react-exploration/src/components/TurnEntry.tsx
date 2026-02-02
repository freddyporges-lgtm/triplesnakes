import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OutcomeType } from '../types/gameTypes';

interface TurnEntryProps {
  onSubmit: (outcomeType: OutcomeType, data: Record<string, any>) => void;
  disabled?: boolean;
}

const outcomeTypes: { value: OutcomeType; label: string; description: string }[] = [
  { value: 'match', label: 'Match', description: 'Two-of-a-kind or three-of-a-kind' },
  { value: 'doubleDouble', label: 'Double Double', description: 'Two different matching pairs' },
  { value: 'fourKind', label: 'Four-of-a-Kind', description: 'Four matching dice' },
  { value: 'straight', label: 'Straight', description: 'First-roll straight with green die' },
  { value: 'tripleSnakes', label: 'Triple Snakes', description: 'Three 1s rolled' },
  { value: 'zeroPoints', label: 'Zero Points', description: 'No scoring matches' },
  { value: 'bust77', label: 'Bust (77)', description: 'Reset to 77' },
];

export const TurnEntry: React.FC<TurnEntryProps> = ({ onSubmit, disabled = false }) => {
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeType | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleOutcomeSelect = (outcome: OutcomeType) => {
    setSelectedOutcome(outcome);
    // Default to snake eyes for zero points
    if (outcome === 'zeroPoints') {
      setFormData({ zeroType: 'snakeEyes' });
    } else {
      setFormData({});
    }
  };

  const handleSubmit = () => {
    if (selectedOutcome) {
      onSubmit(selectedOutcome, formData);
      setSelectedOutcome(null);
      setFormData({});
    }
  };

  const renderOutcomeForm = () => {
    switch (selectedOutcome) {
      case 'match':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                min="1"
                max="6"
                placeholder="Face 1"
                className="input-field"
                value={formData.face1 || ''}
                onChange={(e) => setFormData({ ...formData, face1: e.target.value })}
              />
              <input
                type="number"
                min="2"
                max="3"
                placeholder="Count"
                className="input-field"
                value={formData.count1 || ''}
                onChange={(e) => setFormData({ ...formData, count1: e.target.value })}
              />
              <input
                type="number"
                min="1"
                max="6"
                placeholder="Face 2 (optional)"
                className="input-field"
                value={formData.face2 || ''}
                onChange={(e) => setFormData({ ...formData, face2: e.target.value })}
              />
              <input
                type="number"
                min="2"
                max="3"
                placeholder="Count"
                className="input-field"
                value={formData.count2 || ''}
                onChange={(e) => setFormData({ ...formData, count2: e.target.value })}
              />
            </div>
          </div>
        );

      case 'doubleDouble':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                min="1"
                max="6"
                placeholder="Pair 1 Face"
                className="input-field"
                value={formData.pair1Face || ''}
                onChange={(e) => setFormData({ ...formData, pair1Face: e.target.value })}
              />
              <input
                type="number"
                min="1"
                max="6"
                placeholder="Pair 2 Face"
                className="input-field"
                value={formData.pair2Face || ''}
                onChange={(e) => setFormData({ ...formData, pair2Face: e.target.value })}
              />
            </div>
          </div>
        );

      case 'fourKind':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                min="1"
                max="6"
                placeholder="Face value"
                className="input-field"
                value={formData.face || ''}
                onChange={(e) => setFormData({ ...formData, face: e.target.value })}
              />
              <select
                className="input-field"
                value={formData.useBonus ? 'bonus' : 'normal'}
                onChange={(e) => setFormData({ ...formData, useBonus: e.target.value === 'bonus' })}
              >
                <option value="normal">Normal (4 × Face)</option>
                <option value="bonus">Bonus (1→30, 2→28, ...)</option>
              </select>
            </div>
          </div>
        );

      case 'straight':
        return (
          <div className="space-y-4">
            <select
              className="input-field w-full"
              value={formData.result || ''}
              onChange={(e) => setFormData({ ...formData, result: e.target.value })}
            >
              <option value="">Select result...</option>
              <option value="34">Success (34 points)</option>
              <option value="35">Success (35 points)</option>
              <option value="fail">Failed</option>
            </select>
          </div>
        );

      case 'tripleSnakes':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                className={`btn-secondary ${
                  formData.mode === 'tieLeader' ? 'bg-highlight' : ''
                }`}
                onClick={() => setFormData({ ...formData, mode: 'tieLeader' })}
              >
                Tie Leader
              </button>
              <button
                className={`btn-secondary ${formData.mode === '3' ? 'bg-highlight' : ''}`}
                onClick={() => setFormData({ ...formData, mode: '3' })}
              >
                3 Points
              </button>
            </div>
          </div>
        );

      case 'zeroPoints':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">What caused the zero points?</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                className={`btn-secondary ${
                  formData.zeroType === 'snakeEyes' ? 'bg-highlight' : ''
                }`}
                onClick={() => setFormData({ ...formData, zeroType: 'snakeEyes' })}
              >
                🐍 Snake Eyes
              </button>
              <button
                className={`btn-secondary ${
                  formData.zeroType === 'noMatches' ? 'bg-highlight' : ''
                }`}
                onClick={() => setFormData({ ...formData, zeroType: 'noMatches' })}
              >
                ✗ No Matches
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div className="card space-y-6">
      <h2 className="text-2xl font-bold">Turn Entry</h2>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-300">Select outcome type:</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {outcomeTypes.map(type => (
            <motion.button
              key={type.value}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleOutcomeSelect(type.value)}
              className={`p-3 rounded-lg border transition-all ${
                selectedOutcome === type.value
                  ? 'bg-highlight border-highlight'
                  : 'bg-secondary border-accent border-opacity-30 hover:border-accent'
              }`}
            >
              <div className="font-semibold text-sm">{type.label}</div>
              <div className="text-xs text-gray-400 mt-1">{type.description}</div>
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedOutcome && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {renderOutcomeForm()}

            <div className="flex gap-3 pt-4">
              <button
                className="btn-primary flex-1"
                onClick={handleSubmit}
                disabled={disabled}
              >
                Submit
              </button>
              <button
                className="btn-secondary flex-1"
                onClick={() => {
                  setSelectedOutcome(null);
                  setFormData({});
                }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
