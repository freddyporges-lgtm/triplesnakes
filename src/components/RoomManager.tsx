import { type FC, useState } from 'react';

interface RoomManagerProps {
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onShowTutorial?: () => void;
}

export const RoomManager: FC<RoomManagerProps> = ({ onCreateRoom, onJoinRoom, onShowTutorial }) => {
  const [joinInput, setJoinInput] = useState('');

  return (
    <div className="card">
      <h2>Join or Create Game</h2>

      <div className="mt-8">
        <button className="btn" onClick={onCreateRoom}>
          Create New Game
        </button>
      </div>

      <div className="join-section">
        <label>Or join an existing game as viewer:</label>
        <div className="row mt-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Enter room code"
              maxLength={6}
              style={{ textTransform: 'uppercase' }}
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onJoinRoom(joinInput);
              }}
            />
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => onJoinRoom(joinInput)}>
            Join
          </button>
        </div>
      </div>

      {onShowTutorial && (
        <div className="join-section" style={{ textAlign: 'center' }}>
          <button
            className="btn btn-secondary"
            style={{ width: '100%' }}
            onClick={onShowTutorial}
          >
            How to Play
          </button>
        </div>
      )}
    </div>
  );
};
