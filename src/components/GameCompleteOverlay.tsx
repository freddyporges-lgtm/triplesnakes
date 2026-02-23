import type { FC } from 'react';
import type { Player } from '../types/gameTypes';

interface GameCompleteOverlayProps {
  winner: Player | undefined;
  loser: Player | undefined;
  isViewer: boolean;
  onNewGame: () => void;
}

export const GameCompleteOverlay: FC<GameCompleteOverlayProps> = ({
  winner,
  loser,
  isViewer,
  onNewGame,
}) => {
  return (
    <div className="game-over-banner show">
      <div className="game-over-content">
        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🏆</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '5px' }}>
          GAME OVER
        </div>
        <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', margin: '15px 0' }} />

        <div style={{ marginBottom: '20px' }}>
          <div className="muted" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Ultimate Winner
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent)', marginTop: '5px' }}>
            {winner?.name || '-'}
          </div>
        </div>

        <div style={{ marginBottom: '25px' }}>
          <div className="muted" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Takes the Shot 🥃
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--danger)', marginTop: '5px' }}>
            {loser?.name || '-'}
          </div>
        </div>

        {!isViewer && (
          <button className="btn" style={{ width: '100%' }} onClick={onNewGame}>
            New Game
          </button>
        )}
      </div>
    </div>
  );
};
