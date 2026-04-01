import { useState, useEffect, useRef } from 'react';
import { Setup } from './components/Setup';
import { Scoreboard } from './components/Scoreboard';
import { TurnEntry } from './components/TurnEntry';
import { GameLog } from './components/GameLog';
import { RoomManager } from './components/RoomManager';
import { GameCompleteOverlay } from './components/GameCompleteOverlay';
import { Tutorial } from './components/Tutorial';
import type { GameState, LogEntry, OutcomeData } from './types/gameTypes';
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
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [undoSnapshot, setUndoSnapshot] = useState<{ state: GameState; logs: LogEntry[] } | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    try {
      initializeFirebase();
      setFirebaseInitialized(true);
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
    }
  }, []);

  useEffect(() => {
    if (firebaseInitialized) {
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get('room');
      if (urlRoom) {
        handleJoinRoom(urlRoom.toUpperCase());
      }
    }
  }, [firebaseInitialized]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const logEntry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
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
    syncStateToFirebase(code, state);
  };

  const handleJoinRoom = async (code: string) => {
    const exists = await checkRoomExists(code);
    if (exists) {
      setRoomCode(code);
      setIsViewer(true);
      setShowRoomJoin(false);
      addLog(`Joined room: ${code}`, 'system');

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

  const handleTurnSubmit = (outcomeData: OutcomeData) => {
    // Save snapshot for undo
    setUndoSnapshot({ state, logs: [...logs] });

    // Deep-clone players so mutations never touch the previous state snapshot
    let s: GameState = { ...state, players: state.players.map(p => ({ ...p })) };
    const currentPlayer = s.players[s.currentIndex];

    if (!currentPlayer) return;

    // Compute and apply score
    const outcome = computeTurnScore(outcomeData, s);
    const scoreResult = applyScore(currentPlayer, outcome.score, s);
    currentPlayer.score = scoreResult.after;

    // Build log message
    let message = `${currentPlayer.name}: ${outcomeData.type} (${scoreResult.after})`;
    let logType: LogEntry['type'] = 'info';

    if (scoreResult.bust) {
      message += ' - BUST!';
      logType = 'drink';
    } else if (outcome.events.includes('straightFail')) {
      message += ' - Straight failed';
      logType = 'drink';
    } else if (outcome.events.includes('fourKind') || outcome.events.includes('tripleSnakesTieLeader')) {
      logType = 'social';
    } else if (outcome.score === 0) {
      if (outcomeData.type === 'zeroPoints') {
        message += outcomeData.zeroType === 'snakeEyes' ? ' - 🐍 Snake Eyes' : ' - No Matches';
      }
      logType = 'drink';
      s = { ...s, consecutiveZeroTurnsInRound: s.consecutiveZeroTurnsInRound + 1 };
    } else {
      s = { ...s, consecutiveZeroTurnsInRound: 0 };
    }

    addLog(message, logType);

    // Group drink check
    const { state: s2, groupDrink } = checkZeroRoundGroupDrink(s);
    s = s2;
    if (groupDrink) addLog('All players scored 0 this round! Group drink!', 'social');

    // Win state evaluation
    const { state: s3, ...winFlags } = evaluateWinState(s, currentPlayer);
    s = s3;
    if (winFlags.shouldShowWinnerRollOff) addLog("Winner's Roll-Off started!", 'system');
    else if (winFlags.shouldShowLoserRollOff) addLog("Loser's Roll-Off started!", 'system');
    else if (winFlags.gameComplete) addLog('Game complete!', 'system');

    if (s.phase === 'rebuttal' && currentPlayer.score === s.target) {
      addLog(`${currentPlayer.name} ties at ${s.target}!`, 'system');
    }

    // Leader/tie events
    const { state: s4, events: leaderEvents } = checkLeaderAndTies(s, currentPlayer);
    s = s4;
    if (leaderEvents.includes('leaderChanged')) addLog('Leader changed! Non-leaders drink!', 'drink');
    if (leaderEvents.includes('tiedPlayers')) addLog('Players are tied! All tied players drink!', 'drink');

    // Advance turn
    s = advanceTurn(s);

    // Roll-off round complete?
    if ((s.phase === 'winRollOff' || s.phase === 'lastRollOff') && s.rollOffRoundComplete) {
      const { state: s5, gameComplete } = checkRollOffResults(s);
      s = { ...s5, rollOffRoundComplete: false };
      if (gameComplete) addLog('Game complete!', 'system');
    }

    setState(s);
    if (roomCode && !isViewer) syncStateToFirebase(roomCode, s);
  };

  const handleUndo = () => {
    if (!undoSnapshot) return;
    setState(undoSnapshot.state);
    setLogs(undoSnapshot.logs);
    setUndoSnapshot(null);
    if (roomCode && !isViewer) syncStateToFirebase(roomCode, undoSnapshot.state);
  };

  const handleStateChange = (newState: GameState) => {
    setState(newState);
    if (roomCode && !isViewer) syncStateToFirebase(roomCode, newState);
  };

  const handleRollOffReorder = (playerId: string, direction: 'up' | 'down') => {
    const newState = reorderRollOffPlayer(state, playerId, direction);
    setState(newState);
    if (roomCode && !isViewer) syncStateToFirebase(roomCode, newState);
  };

  const handleStartRollOff = () => {
    const newState = startRollOff(state);
    setState(newState);
    if (roomCode && !isViewer) syncStateToFirebase(roomCode, newState);
  };

  const handleNewGame = () => {
    const newState = createNewGameWithPlayers(state);
    setState(newState);
    setLogs([]);
    setUndoSnapshot(null);
    addLog('New game started with same players!', 'system');
    if (roomCode && !isViewer) syncStateToFirebase(roomCode, newState);
  };

  // Screen Wake Lock — keep screen on during active game
  useEffect(() => {
    if (!state.started) return;
    let wakeLock: WakeLockSentinel | null = null;
    let released = false;

    const acquire = async () => {
      try {
        if (!released && 'wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch { /* silently ignore — user navigated away or API unavailable */ }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      wakeLock?.release();
    };
  }, [state.started]);

  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <img src="/Triple Snakes-B3.png" alt="Triple Snakes header logo" className="logo-top" />
      </header>

      <main className="app">
        <h1>Triple Snakes Scorekeeper</h1>
        <div className="tagline">Smart scorekeeper for the Triple Snakes dice game.</div>

        {/* Tutorial */}
        {showTutorial && (
          <Tutorial
            onExit={() => setShowTutorial(false)}
            onStartGame={() => {
              setShowTutorial(false);
              handleCreateRoom();
            }}
          />
        )}

        {/* Room banner (host) */}
        {!showTutorial && roomCode && !isViewer && (
          <div className="room-banner">
            <div>Room Code:</div>
            <div className="room-code">{roomCode}</div>
            <div className="room-link">{window.location.origin}?room={roomCode}</div>
            <button
              className="btn btn-sm mt-4"
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}?room=${roomCode}`)}
            >
              Copy Link
            </button>
          </div>
        )}

        {/* Viewer banner */}
        {!showTutorial && isViewer && (
          <div className="viewer-banner">👁 Viewing Live Scoreboard</div>
        )}

        {/* Join/create flow */}
        {!showTutorial && !state.started && showRoomJoin && (
          <RoomManager
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onShowTutorial={() => setShowTutorial(true)}
          />
        )}

        {/* Player setup */}
        {!showTutorial && !state.started && !showRoomJoin && (
          <Setup state={state} onStateChange={handleStateChange} onStartGame={handleStartGame} />
        )}

        {/* Active game */}
        {!showTutorial && state.started && (
          <>
            <div className="scoreboard">
              <Scoreboard state={state} onRollOffReorder={handleRollOffReorder} isViewer={isViewer} />
            </div>

            {!isViewer && !state.gameComplete && undoSnapshot && (
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={handleUndo}>
                  Undo Last Turn
                </button>
              </div>
            )}

            {!isViewer && !state.gameComplete && (
              <>
                {state.rollOffSetupMode && (state.phase === 'winRollOff' || state.phase === 'lastRollOff') ? (
                  <div className="mt-6" style={{ textAlign: 'center' }}>
                    <div className="muted" style={{ marginBottom: '8px' }}>
                      Use ▲▼ arrows to set the roll-off order. #1 rolls first.
                    </div>
                    <button className="btn" onClick={handleStartRollOff}>
                      Start Roll-Off
                    </button>
                  </div>
                ) : (
                  <TurnEntry onSubmit={handleTurnSubmit} gameState={state} disabled={isViewer} />
                )}
              </>
            )}

            {state.gameComplete && (
              <GameCompleteOverlay
                winner={state.players.find(p => p.id === state.ultimateWinnerId)}
                loser={state.players.find(p => p.id === state.loserId)}
                isViewer={isViewer}
                onNewGame={handleNewGame}
              />
            )}

            <GameLog
              logs={logs}
              isViewer={isViewer}
              onEndGame={() => window.location.reload()}
            />
          </>
        )}
      </main>

      <footer className="app-footer">
        <img src="/Triple Snakes-B5.png" alt="Triple Snakes footer logo" className="logo-bottom" />
      </footer>
    </div>
  );
}

export default App;
