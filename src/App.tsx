import { useState, useEffect, useRef } from 'react';
import { Setup } from './components/Setup';
import { Scoreboard } from './components/Scoreboard';
import { TurnEntry } from './components/TurnEntry';
import type { GameState, LogEntry, OutcomeType } from './types/gameTypes';
import {
  createInitialGameState,
  createNewGameWithPlayers,
  computeTurnScore,
  applyScore,
  advanceTurn,
  evaluateWinState,
  checkRollOffResults,
  checkLeaderAndTies,
  checkZeroRoundGroupDrink,
  reorderRollOffPlayer,
  startRollOff,
  generateRoomCode,
} from './lib/gameLogic';
import { initializeFirebase, syncStateToFirebase, listenToRoom, checkRoomExists } from './lib/firebase';

function App() {
  const [state, setState] = useState<GameState>(createInitialGameState());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isViewer, setIsViewer] = useState(false);
  const [showRoomJoin, setShowRoomJoin] = useState(true);
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize Firebase
  useEffect(() => {
    try {
      initializeFirebase();
      setFirebaseInitialized(true);
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
    }
  }, []);

  // Check for room in URL
  useEffect(() => {
    if (firebaseInitialized) {
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get('room');
      if (urlRoom) {
        handleJoinRoom(urlRoom.toUpperCase());
      }
    }
  }, [firebaseInitialized]);

  const addLog = (message: string, type: 'info' | 'drink' | 'social' | 'system' = 'info') => {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      message,
      type,
    };
    setLogs(prev => [logEntry, ...prev]);
  };

  const handleCreateRoom = () => {
    const code = generateRoomCode();
    setRoomCode(code);
    setIsViewer(false);
    setShowRoomJoin(false);
    addLog(`Room created: ${code}`, 'system');
    window.history.replaceState({}, '', `?room=${code}`);
  };

  const handleJoinRoom = async (code: string) => {
    const exists = await checkRoomExists(code);
    if (exists) {
      setRoomCode(code);
      setIsViewer(true);
      setShowRoomJoin(false);
      addLog(`Joined room: ${code}`, 'system');

      // Listen to room updates
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      unsubscribeRef.current = listenToRoom(code, (updates) => {
        setState(prev => ({ ...prev, ...updates }));
      });
    } else {
      alert('Room not found. Please check the code.');
    }
  };

  const handleStartGame = () => {
    addLog('Game started!', 'system');
    if (roomCode && !isViewer) {
      syncStateToFirebase(roomCode, state);
    }
  };

  const handleTurnSubmit = (outcomeType: OutcomeType, data: Record<string, any>) => {
    const newState = { ...state };
    const currentPlayer = newState.players[newState.currentIndex];

    if (!currentPlayer) return;

    // Compute score
    const outcome = computeTurnScore(outcomeType, data, newState);
    const scoreResult = applyScore(currentPlayer, outcome.score, newState);

    // Log the outcome
    let message = `${currentPlayer.name}: ${outcomeType} (${scoreResult.after})`;
    let logType: 'info' | 'drink' | 'social' | 'system' = 'info';

    if (scoreResult.bust) {
      message += ' - BUST!';
      logType = 'drink';
    } else if (outcome.events.includes('straightFail')) {
      message += ' - Straight failed';
      logType = 'drink';
    } else if (outcome.events.includes('fourKind')) {
      logType = 'social';
    } else if (outcome.events.includes('tripleSnakesTieLeader')) {
      logType = 'social';
    } else if (outcome.score === 0) {
      // Add sub-type for zero points (snake eyes vs no matches)
      if (data.zeroType === 'snakeEyes') {
        message += ' - 🐍 Snake Eyes';
      } else if (data.zeroType === 'noMatches') {
        message += ' - No Matches';
      }
      logType = 'drink';
      newState.consecutiveZeroTurnsInRound++;
    } else {
      newState.consecutiveZeroTurnsInRound = 0;
    }

    addLog(message, logType);

    // Check for group drink
    if (checkZeroRoundGroupDrink(newState)) {
      addLog('All players scored 0 this round! Group drink!', 'social');
    }

    // Evaluate win state
    const winStateInfo = evaluateWinState(newState, currentPlayer);
    if (winStateInfo.shouldShowWinnerRollOff) {
      addLog("Winner's Roll-Off started!", 'system');
    } else if (winStateInfo.shouldShowLoserRollOff) {
      addLog("Loser's Roll-Off started!", 'system');
    } else if (winStateInfo.gameComplete) {
      addLog('Game complete!', 'system');
    }

    // Check for rebuttal win
    if (newState.phase === 'rebuttal' && currentPlayer.score === newState.target) {
      addLog(`${currentPlayer.name} ties at ${newState.target}!`, 'system');
    }

    // Check leader changes
    const leaderEvents = checkLeaderAndTies(newState, currentPlayer);
    if (leaderEvents.includes('leaderChanged')) {
      addLog('Leader changed! Non-leaders drink!', 'drink');
    }
    if (leaderEvents.includes('tiedPlayers')) {
      addLog('Players are tied! All tied players drink!', 'drink');
    }

    // Advance turn
    advanceTurn(newState);

    // Check roll-off results if in roll-off and round is complete
    if ((newState.phase === 'winRollOff' || newState.phase === 'lastRollOff') && newState.rollOffRoundComplete) {
      const rollOffResult = checkRollOffResults(newState);
      if (rollOffResult.gameComplete) {
        addLog('Game complete!', 'system');
      }
      newState.rollOffRoundComplete = false;
    }

    setState(newState);

    // Sync to Firebase
    if (roomCode && !isViewer) {
      syncStateToFirebase(roomCode, newState);
    }
  };

  const handleStateChange = (newState: GameState) => {
    setState(newState);
    if (roomCode && !isViewer) {
      syncStateToFirebase(roomCode, newState);
    }
  };

  const handleRollOffReorder = (playerId: string, direction: 'up' | 'down') => {
    const newState = { ...state };
    reorderRollOffPlayer(newState, playerId, direction);
    setState(newState);
    if (roomCode && !isViewer) {
      syncStateToFirebase(roomCode, newState);
    }
  };

  const handleStartRollOff = () => {
    const newState = { ...state };
    startRollOff(newState);
    setState(newState);
    if (roomCode && !isViewer) {
      syncStateToFirebase(roomCode, newState);
    }
  };

  const handleNewGame = () => {
    const newState = createNewGameWithPlayers(state);
    setState(newState);
    setLogs([]);
    addLog('New game started with same players!', 'system');
    if (roomCode && !isViewer) {
      syncStateToFirebase(roomCode, newState);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <img src="Triple Snakes-B3.png" alt="Triple Snakes header logo" className="logo-top" />
      </header>

      {/* Main App */}
      <main className="app">
        <h1>Triple Snakes Scorekeeper</h1>
        <div className="tagline">Smart scorekeeper for the Triple Snakes dice game.</div>

        {/* Room Banner (shown when hosting) */}
        {roomCode && !isViewer && (
          <div className="room-banner">
            <div>Room Code:</div>
            <div className="room-code">{roomCode}</div>
            <div className="room-link">{window.location.origin}?room={roomCode}</div>
            <button
              className="btn btn-sm mt-4"
              onClick={() => {
                const url = `${window.location.origin}?room=${roomCode}`;
                navigator.clipboard.writeText(url);
              }}
            >
              Copy Link
            </button>
          </div>
        )}

        {/* Viewer Banner (shown when viewing) */}
        {isViewer && (
          <div className="viewer-banner">
            <div>👁 Viewing Live Scoreboard</div>
          </div>
        )}

        {/* Setup Card */}
        {!state.started && showRoomJoin && (
          <div className="card">
            <h2>Join or Create Game</h2>

            {/* Create Room */}
            <div className="mt-8">
              <button className="btn" onClick={handleCreateRoom}>
                Create New Game
              </button>
            </div>

            {/* Join Room Section */}
            <div className="join-section">
              <label>Or join an existing game as viewer:</label>
              <div className="row mt-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Enter room code"
                    maxLength={6}
                    style={{ textTransform: 'uppercase' }}
                    value={joinRoomInput}
                    onChange={(e) => setJoinRoomInput(e.target.value.toUpperCase())}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleJoinRoom(joinRoomInput);
                      }
                    }}
                  />
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleJoinRoom(joinRoomInput)}
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Setup Component */}
        {!state.started && !showRoomJoin && (
          <Setup
            state={state}
            onStateChange={handleStateChange}
            onStartGame={handleStartGame}
          />
        )}

        {/* Game Content */}
        {state.started && (
          <>
            {/* Scoreboard */}
            <div className="scoreboard">
              <Scoreboard
                state={state}
                onRollOffReorder={handleRollOffReorder}
                isViewer={isViewer}
              />
            </div>

            {/* Controls */}
            {!isViewer && !state.gameComplete && (
              <>
                {state.rollOffSetupMode && (state.phase === 'winRollOff' || state.phase === 'lastRollOff') ? (
                  <div className="mt-6 text-center">
                    <div className="muted mb-4">Use ▲▼ arrows to set the roll-off order. #1 rolls first.</div>
                    <button className="btn" onClick={handleStartRollOff}>
                      Start Roll-Off
                    </button>
                  </div>
                ) : (
                  <TurnEntry onSubmit={handleTurnSubmit} disabled={isViewer} />
                )}
              </>
            )}

            {/* Game Complete */}
            {state.gameComplete && (
              <div style={{
                display: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.9)',
                zIndex: 3000,
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
              }}>
                <div style={{
                  background: 'radial-gradient(circle at top, #0a1f28, #020509 70%)',
                  borderRadius: '20px',
                  border: '3px solid var(--accent)',
                  boxShadow: '0 0 40px rgba(29,214,143,0.3)',
                  padding: '30px 40px',
                  textAlign: 'center',
                  maxWidth: '400px',
                  width: '90%',
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🏆</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '5px' }}>GAME OVER</div>
                  <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', margin: '15px 0' }}></div>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ultimate Winner</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent)', marginTop: '5px' }}>
                      {state.players.find(p => p.id === state.ultimateWinnerId)?.name || '-'}
                    </div>
                  </div>
                  <div style={{ marginBottom: '25px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Takes the Shot 🥃</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--danger)', marginTop: '5px' }}>
                      {state.players.find(p => p.id === state.loserId)?.name || '-'}
                    </div>
                  </div>
                  {!isViewer && (
                    <button className="btn" onClick={handleNewGame} style={{ width: '100%' }}>
                      New Game
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Game Log */}
            <div className="card">
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ marginBottom: 0 }}>Game Tracker</h2>
                {!isViewer && (
                  <button className="btn btn-danger btn-sm" onClick={() => window.location.reload()}>
                    End Game
                  </button>
                )}
              </div>
              <div className="log">
                {logs.map((log, idx) => (
                  <div key={idx} className={`log-entry ${log.type === 'system' ? 'system-message' : ''}`}>
                    <strong>{log.type === 'drink' ? '🥤' : log.type === 'social' ? '🎉' : 'ℹ️'}</strong> {log.message}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <img src="Triple Snakes-B5.png" alt="Triple Snakes footer logo" className="logo-bottom" />
      </footer>
    </div>
  );
}

export default App;
