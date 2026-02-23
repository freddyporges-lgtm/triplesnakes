import { type FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OutcomeData } from '../types/gameTypes';

interface TurnEntryProps {
  onSubmit: (outcomeData: OutcomeData) => void;
  disabled?: boolean;
}

const outcomeTypes: { value: OutcomeData['type']; label: string; description: string }[] = [
  { value: 'match', label: 'Match', description: 'Two-of-a-kind or three-of-a-kind' },
  { value: 'doubleDouble', label: 'Double Double', description: 'Two different matching pairs' },
  { value: 'fourKind', label: 'Four-of-a-Kind', description: 'Four matching dice' },
  { value: 'straight', label: 'Straight', description: 'First-roll straight with green die' },
  { value: 'tripleSnakes', label: 'Triple Snakes', description: 'Three 1s rolled' },
  { value: 'zeroPoints', label: 'Zero Points', description: 'No scoring matches' },
  { value: 'bust77', label: 'Bust (77)', description: 'Reset to 77' },
];

// Per-outcome form state types (no `type` field — that comes from selectedOutcome)
type MatchForm = { face1?: string; count1?: string; face2?: string; count2?: string };
type DoubleDoubleForm = { pair1Face?: string; pair2Face?: string };
type FourKindForm = { face?: string; useBonus?: boolean };
type StraightForm = { result?: '34' | '35' | 'fail' | '' };
type TripleSnakesForm = { mode?: 'tieLeader' | '3' };
type ZeroPointsForm = { zeroType?: 'snakeEyes' | 'noMatches' };
type FormData = MatchForm | DoubleDoubleForm | FourKindForm | StraightForm | TripleSnakesForm | ZeroPointsForm | Record<string, never>;

export const TurnEntry: FC<TurnEntryProps> = ({ onSubmit, disabled = false }) => {
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeData['type'] | null>(null);
  const [formData, setFormData] = useState<FormData>({});

  const handleOutcomeSelect = (outcome: OutcomeData['type']) => {
    setSelectedOutcome(outcome);
    setFormData(outcome === 'zeroPoints' ? { zeroType: 'snakeEyes' } : {});
  };

  const handleSubmit = () => {
    if (!selectedOutcome) return;
    const outcomeData = { type: selectedOutcome, ...formData } as OutcomeData;
    onSubmit(outcomeData);
    setSelectedOutcome(null);
    setFormData({});
  };

  const renderOutcomeForm = () => {
    switch (selectedOutcome) {
      case 'match': {
        const d = formData as MatchForm;
        return (
          <div className="cols-2">
            <input type="number" min="1" max="6" placeholder="Face 1"
              value={d.face1 || ''} onChange={(e) => setFormData({ ...d, face1: e.target.value })} />
            <input type="number" min="2" max="3" placeholder="Count"
              value={d.count1 || ''} onChange={(e) => setFormData({ ...d, count1: e.target.value })} />
            <input type="number" min="1" max="6" placeholder="Face 2 (optional)"
              value={d.face2 || ''} onChange={(e) => setFormData({ ...d, face2: e.target.value })} />
            <input type="number" min="2" max="3" placeholder="Count"
              value={d.count2 || ''} onChange={(e) => setFormData({ ...d, count2: e.target.value })} />
          </div>
        );
      }

      case 'doubleDouble': {
        const d = formData as DoubleDoubleForm;
        return (
          <div className="cols-2">
            <input type="number" min="1" max="6" placeholder="Pair 1 Face"
              value={d.pair1Face || ''} onChange={(e) => setFormData({ ...d, pair1Face: e.target.value })} />
            <input type="number" min="1" max="6" placeholder="Pair 2 Face"
              value={d.pair2Face || ''} onChange={(e) => setFormData({ ...d, pair2Face: e.target.value })} />
          </div>
        );
      }

      case 'fourKind': {
        const d = formData as FourKindForm;
        return (
          <div className="cols-2">
            <input type="number" min="1" max="6" placeholder="Face value"
              value={d.face || ''} onChange={(e) => setFormData({ ...d, face: e.target.value })} />
            <select value={d.useBonus ? 'bonus' : 'normal'}
              onChange={(e) => setFormData({ ...d, useBonus: e.target.value === 'bonus' })}>
              <option value="normal">Normal (4 × Face)</option>
              <option value="bonus">Bonus (1→30, 2→28, ...)</option>
            </select>
          </div>
        );
      }

      case 'straight': {
        const d = formData as StraightForm;
        return (
          <select value={d.result || ''}
            onChange={(e) => setFormData({ ...d, result: e.target.value as StraightForm['result'] })}>
            <option value="">Select result...</option>
            <option value="34">Success (34 points)</option>
            <option value="35">Success (35 points)</option>
            <option value="fail">Failed</option>
          </select>
        );
      }

      case 'tripleSnakes': {
        const d = formData as TripleSnakesForm;
        return (
          <div className="cols-2">
            <button
              className={`btn btn-secondary btn-sm${d.mode === 'tieLeader' ? ' selected' : ''}`}
              onClick={() => setFormData({ ...d, mode: 'tieLeader' })}
            >
              Tie Leader
            </button>
            <button
              className={`btn btn-secondary btn-sm${d.mode === '3' ? ' selected' : ''}`}
              onClick={() => setFormData({ ...d, mode: '3' })}
            >
              3 Points
            </button>
          </div>
        );
      }

      case 'zeroPoints': {
        const d = formData as ZeroPointsForm;
        return (
          <div className="cols-2">
            <button
              className={`btn btn-secondary btn-sm${d.zeroType === 'snakeEyes' ? ' selected' : ''}`}
              onClick={() => setFormData({ ...d, zeroType: 'snakeEyes' })}
            >
              🐍 Snake Eyes
            </button>
            <button
              className={`btn btn-secondary btn-sm${d.zeroType === 'noMatches' ? ' selected' : ''}`}
              onClick={() => setFormData({ ...d, zeroType: 'noMatches' })}
            >
              ✗ No Matches
            </button>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="card">
      <h2>Turn Entry</h2>

      <div className="mt-8">
        <label>Select outcome type:</label>
        <div className="radio-row mt-4">
          {outcomeTypes.map(type => (
            <motion.button
              key={type.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleOutcomeSelect(type.value)}
              className={`radio-pill${selectedOutcome === type.value ? ' selected' : ''}`}
            >
              {type.label}
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
            className="mt-8"
          >
            {renderOutcomeForm()}

            <div className="row mt-8">
              <button className="btn flex-1" onClick={handleSubmit} disabled={disabled}>
                Submit Turn
              </button>
              <button
                className="btn btn-secondary flex-1"
                onClick={() => { setSelectedOutcome(null); setFormData({}); }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
