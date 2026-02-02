import { useState } from 'react';
import type { OutcomeType } from '../types/gameTypes';

interface TurnEntryProps {
  onSubmit: (outcomeType: OutcomeType, data: Record<string, any>) => void;
  disabled?: boolean;
}

// Die face definitions - which pips to show for each face
const DIE_FACES: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

// Component to render a single die face
const DieFace: React.FC<{ face: number }> = ({ face }) => (
  <div className="die">
    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((pos) => (
      <div
        key={pos}
        className={`pip ${DIE_FACES[face].includes(pos) ? '' : 'opacity-0'}`}
        style={{ opacity: DIE_FACES[face].includes(pos) ? 1 : 0 }}
      />
    ))}
  </div>
);

// Die picker button component
const DieButton: React.FC<{ face: number; selected: boolean; onClick: () => void }> = ({
  face,
  selected,
  onClick,
}) => (
  <button
    type="button"
    className={`die-btn ${selected ? 'selected' : ''}`}
    onClick={onClick}
    aria-label={`Face ${face}`}
  >
    <DieFace face={face} />
  </button>
);

export const TurnEntry: React.FC<TurnEntryProps> = ({ onSubmit, disabled = false }) => {
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeType | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleOutcomeSelect = (outcome: OutcomeType) => {
    setSelectedOutcome(outcome);
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
          <div>
            <div className="mt-8">
              <h3 style={{ margin: '0 0 4px' }}>Match</h3>
              <div className="mt-4">
                <label style={{ display: 'block', marginBottom: '4px' }}>Select Dice Face</label>
                <div className="dice-picker">
                  {[2, 3, 4, 5, 6].map(face => (
                    <DieButton
                      key={`match-${face}`}
                      face={face}
                      selected={formData.matchFace1 === face}
                      onClick={() => setFormData({ ...formData, matchFace1: face })}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-6">
                <label style={{ display: 'block', marginBottom: '4px' }}>How many matches</label>
                <div className="match-count-picker">
                  {[2, 3].map(count => (
                    <button
                      key={`match-count-${count}`}
                      type="button"
                      className={`match-count-btn ${formData.matchCount1 === count ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, matchCount1: count })}
                    >
                      {count}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'doubleDouble':
        return (
          <div>
            <div className="mt-8">
              <h3 style={{ margin: '0 0 4px' }}>Double Double Match</h3>
              <div className="mt-4">
                <label style={{ display: 'block', marginBottom: '4px' }}>First matching pair</label>
                <div className="dice-picker">
                  {[2, 3, 4, 5, 6].map(face => (
                    <DieButton
                      key={`dd-pair1-${face}`}
                      face={face}
                      selected={formData.ddPair1Face === face}
                      onClick={() => setFormData({ ...formData, ddPair1Face: face })}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <label style={{ display: 'block', marginBottom: '4px' }}>Second matching pair</label>
                <div className="dice-picker">
                  {[2, 3, 4, 5, 6].map(face => (
                    <DieButton
                      key={`dd-pair2-${face}`}
                      face={face}
                      selected={formData.ddPair2Face === face}
                      onClick={() => setFormData({ ...formData, ddPair2Face: face })}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-4 muted">
                Use when two different pairs are made on the final roll. Score follows your Double Double rules (sum of both pairs).
              </div>
            </div>
          </div>
        );

      case 'fourKind':
        return (
          <div>
            <div className="mt-8">
              <label style={{ display: 'block', marginBottom: '4px' }}>Four-of-a-kind face</label>
              <div className="dice-picker">
                {[1, 2, 3, 4, 5, 6].map(face => (
                  <DieButton
                    key={`fourKind-${face}`}
                    face={face}
                    selected={formData.fourKindFace === face}
                    onClick={() => setFormData({ ...formData, fourKindFace: face })}
                  />
                ))}
              </div>
              <div className="mt-6">
                <label style={{ display: 'block', marginBottom: '4px' }}>Use bonus?</label>
                <div className="match-count-picker">
                  <button
                    type="button"
                    className={`match-count-btn ${formData.fourKindBonus === 'bonus' ? 'selected' : ''}`}
                    onClick={() => setFormData({ ...formData, fourKindBonus: 'bonus' })}
                  >
                    Yes (use bonus)
                  </button>
                  <button
                    type="button"
                    className={`match-count-btn ${formData.fourKindBonus === 'normal' ? 'selected' : ''}`}
                    onClick={() => setFormData({ ...formData, fourKindBonus: 'normal' })}
                  >
                    No (mathematical score)
                  </button>
                </div>
              </div>
              <div className="mt-4 muted">Bonus table: 1→30, 2→28, 3→27, 4→26, 5→25, 6→24 (or normal sum 4×face).</div>
            </div>
          </div>
        );

      case 'straight':
        return (
          <div className="mt-8">
            <label>Straight attempt result</label>
            <select
              value={formData.straightResult || ''}
              onChange={(e) => setFormData({ ...formData, straightResult: e.target.value })}
            >
              <option value="success34">Completed straight, take 34</option>
              <option value="success35">Completed straight, take 35</option>
              <option value="fail">Failed (0 points)</option>
            </select>
            <div className="mt-4 muted">Only valid if the straight was from the first roll using the green die.</div>
          </div>
        );

      case 'tripleSnakes':
        return (
          <div className="mt-8">
            <div className="mt-4">
              <label style={{ display: 'block', marginBottom: '8px' }}>Triple Snakes scoring</label>
              <div className="match-count-picker" style={{ marginBottom: '6px' }}>
                <button
                  type="button"
                  className={`match-count-btn ${formData.tripleSnakesMode === 'tieLeader' ? 'selected' : ''}`}
                  onClick={() => setFormData({ ...formData, tripleSnakesMode: 'tieLeader' })}
                >
                  Tie Current Leader
                </button>
                <button
                  type="button"
                  className={`match-count-btn ${formData.tripleSnakesMode === '3' ? 'selected' : ''}`}
                  onClick={() => setFormData({ ...formData, tripleSnakesMode: '3' })}
                >
                  Take 3 points
                </button>
              </div>
            </div>
            <div className="mt-4 muted">Tie-the-leader sets this player's total score equal to the current highest score on the board.</div>
          </div>
        );

      case 'zeroPoints':
        return (
          <div className="mt-8">
            <label>What caused the zero points?</label>
            <div className="match-count-picker">
              <button
                type="button"
                className={`match-count-btn ${formData.zeroType === 'snakeEyes' ? 'selected' : ''}`}
                onClick={() => setFormData({ ...formData, zeroType: 'snakeEyes' })}
              >
                🐍 Snake Eyes
              </button>
              <button
                type="button"
                className={`match-count-btn ${formData.zeroType === 'noMatches' ? 'selected' : ''}`}
                onClick={() => setFormData({ ...formData, zeroType: 'noMatches' })}
              >
                ✗ No Matches
              </button>
            </div>
          </div>
        );

      case 'bust77':
        return null;

      default:
        return null;
    }
  };

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ marginBottom: '2px' }}>Current turn</h2>
        <span className="pill">Turn Entry</span>
      </div>
      <div className="muted">Enter what actually happened this turn. The app will handle scoring, busts, and drinking prompts.</div>

      <div className="mt-8">
        <label>Outcome type</label>
        <div className="radio-row">
          {(['match', 'doubleDouble', 'fourKind', 'straight', 'tripleSnakes', 'zeroPoints', 'bust77'] as OutcomeType[]).map(type => (
            <label
              key={type}
              className={`radio-pill ${selectedOutcome === type ? 'selected' : ''}`}
              style={{ cursor: 'pointer' }}
            >
              <input
                type="radio"
                name="outcomeType"
                value={type}
                checked={selectedOutcome === type}
                onChange={() => handleOutcomeSelect(type)}
                style={{ marginRight: '4px' }}
              />
              {type === 'match' && 'Match'}
              {type === 'doubleDouble' && 'Double Double Match'}
              {type === 'fourKind' && 'Four-of-a-kind'}
              {type === 'straight' && 'Straight attempt'}
              {type === 'tripleSnakes' && 'Triple Snakes'}
              {type === 'zeroPoints' && 'Zero Points'}
              {type === 'bust77' && 'Bust (77)'}
            </label>
          ))}
        </div>
      </div>

      {selectedOutcome && (
        <>
          {renderOutcomeForm()}

          <div className="divider"></div>

          <div className="mt-8 row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="btn" onClick={handleSubmit} disabled={disabled}>
              Submit turn
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSelectedOutcome(null);
                setFormData({});
              }}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
};
