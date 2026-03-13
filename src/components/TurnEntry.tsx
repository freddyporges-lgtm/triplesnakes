import { type FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OutcomeData } from '../types/gameTypes';
import { Die } from './DiceDisplay';

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

function OutcomeExplainer({ type }: { type: OutcomeData['type'] }) {
  const content: Record<OutcomeData['type'], { heading: string; lines: string[] }> = {
    match: {
      heading: 'Score = face value × count',
      lines: [
        'Two 5s = 10 pts, Three 4s = 12 pts',
        'Can score a second match in the same roll',
      ],
    },
    doubleDouble: {
      heading: 'Two different pairs in one roll',
      lines: [
        'Score = (pair 1 × 2) + (pair 2 × 2)',
        'E.g. two 3s + two 5s = 6 + 10 = 16 pts',
      ],
    },
    fourKind: {
      heading: 'Four matching dice in one roll',
      lines: [
        'Normal: 4 × face value (e.g. four 5s = 20)',
        'Bonus: 30 − face value (e.g. four 5s = 25)',
        'Bonus for 1s: always 30 pts',
        'Everyone else drinks!',
      ],
    },
    straight: {
      heading: 'All different faces on the first roll',
      lines: [
        'Must include the green die',
        '34 or 35 pts depending on the combination',
        'Failed straight = 0 pts, drink up',
      ],
    },
    tripleSnakes: {
      heading: 'Three 1s (snake eyes) rolled',
      lines: [
        '3 pts: take the safe points',
        'Tie Leader: jump to the leader\'s score',
      ],
    },
    zeroPoints: {
      heading: 'No matching dice this roll',
      lines: [
        'Snake Eyes: rolled a 1 — drink!',
        'No Matches: just no points, no drink',
      ],
    },
    bust77: {
      heading: 'Score went over 100 — reset to 77',
      lines: [
        'Any roll that pushes you past the target',
        'Drink and get sent back to 77',
      ],
    },
  };

  const c = content[type];
  return (
    <div className="outcome-explainer">
      <div className="outcome-explainer-heading">{c.heading}</div>
      {c.lines.map((line, i) => (
        <div key={i} className="outcome-explainer-line">{line}</div>
      ))}
    </div>
  );
}

function DicePicker({ value, onChange, startFace = 2 }: { value?: string; onChange: (face: string) => void; startFace?: number }) {
  const faces = Array.from({ length: 7 - startFace }, (_, i) => i + startFace);
  return (
    <div className="dice-picker">
      {faces.map(f => (
        <button
          key={f}
          type="button"
          className={`die-btn${value === String(f) ? ' selected' : ''}`}
          onClick={() => onChange(String(f))}
        >
          <Die face={f} />
        </button>
      ))}
    </div>
  );
}

function CountPicker({ value, onChange }: { value?: string; onChange: (count: string) => void }) {
  return (
    <div className="match-count-picker">
      <button
        type="button"
        className={`btn btn-secondary btn-sm${value === '2' ? ' selected' : ''}`}
        onClick={() => onChange('2')}
      >
        ×2
      </button>
      <button
        type="button"
        className={`btn btn-secondary btn-sm${value === '3' ? ' selected' : ''}`}
        onClick={() => onChange('3')}
      >
        ×3
      </button>
    </div>
  );
}

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
    setFormData(
      outcome === 'zeroPoints' ? { zeroType: 'snakeEyes' } :
      outcome === 'fourKind' ? { useBonus: true } :
      {}
    );
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
          <div>
            <DicePicker value={d.face1} onChange={(f) => setFormData({ ...d, face1: f })} startFace={2} />
            <CountPicker value={d.count1} onChange={(c) => setFormData({ ...d, count1: c })} />
          </div>
        );
      }

      case 'doubleDouble': {
        const d = formData as DoubleDoubleForm;
        return (
          <div>
            <label className="mt-4" style={{ fontSize: 12, color: '#888' }}>Pair 1</label>
            <DicePicker value={d.pair1Face} onChange={(f) => setFormData({ ...d, pair1Face: f })} startFace={2} />
            <label className="mt-8" style={{ fontSize: 12, color: '#888' }}>Pair 2</label>
            <DicePicker value={d.pair2Face} onChange={(f) => setFormData({ ...d, pair2Face: f })} startFace={2} />
          </div>
        );
      }

      case 'fourKind': {
        const d = formData as FourKindForm;
        const useBonus = d.useBonus !== false; // default to true
        const face = parseInt(d.face ?? '', 10);
        const normalPts = !isNaN(face) ? `${4 * face} pts` : '?';
        const bonusPts = !isNaN(face) ? `${face === 1 ? 30 : 30 - face} pts` : '?';
        return (
          <div>
            <DicePicker value={d.face} onChange={(f) => setFormData({ ...d, face: f })} startFace={1} />
            <div className="match-count-picker" style={{ marginTop: 8 }}>
              <button
                type="button"
                className={`btn btn-secondary btn-sm${!useBonus ? ' selected' : ''}`}
                onClick={() => setFormData({ ...d, useBonus: false })}
              >
                Normal ({normalPts})
              </button>
              <button
                type="button"
                className={`btn btn-secondary btn-sm${useBonus ? ' selected' : ''}`}
                onClick={() => setFormData({ ...d, useBonus: true })}
              >
                Bonus ({bonusPts})
              </button>
            </div>
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
            <OutcomeExplainer type={selectedOutcome} />
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
