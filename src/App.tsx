import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Setup } from './components/Setup';
import { Scoreboard } from './components/Scoreboard';
import { TurnEntry } from './components/TurnEntry';
import { GameLog } from './components/GameLog';
import type { GameState, LogEntry, OutcomeType } from './types/gameTypes';
import {
  createInitialGameState,
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
    const newState = createInitialGameState();
    setState(newState);
    setLogs([]);
    addLog('New game started!', 'system');
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
    <div className="min-h-screen bg-primary text-white p-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-5xl font-bold text-highlight">🐍 Triple Snakes</h1>
          <p className="text-gray-400">A modern dice game scorekeeper</p>
        </motion.div>

        {/* Room Info */}
        {roomCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card text-center space-y-2"
          >
            <p className="text-sm text-gray-400">
              {isViewer ? 'Viewing room:' : 'Room code:'}
            </p>
            <p className="text-2xl font-mono font-bold text-highlight">{roomCode}</p>
            {!isViewer && (
              <p className="text-sm text-gray-400">
                Share:{' '}
                <code className="bg-secondary px-2 py-1 rounded">
                  {window.location.origin}?room={roomCode}
                </code>
              </p>
            )}
          </motion.div>
        )}

        {/* Main Content */}
        {showRoomJoin && !state.started ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card max-w-2xl mx-auto space-y-6"
          >
            <h2 className="text-2xl font-bold">Join or Create Game</h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-semibold">Join Existing Room</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    className="input-field flex-1"
                    placeholder="Enter room code..."
                    value={joinRoomInput}
                    onChange={(e) => setJoinRoomInput(e.target.value.toUpperCase())}
                    onKeyPress={(e) =>
                      e.key === 'Enter' && handleJoinRoom(joinRoomInput)
                    }
                  />
                  <button
                    className="btn-primary"
                    onClick={() => handleJoinRoom(joinRoomInput)}
                  >
                    Join
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-accent border-opacity-30"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-primary text-gray-400">or</span>
                </div>
              </div>

              <button
                className="btn-primary w-full text-lg py-4"
                onClick={handleCreateRoom}
              >
                Create New Game
              </button>
            </div>
          </motion.div>
        ) : !state.started ? (
          <Setup
            state={state}
            onStateChange={handleStateChange}
            onStartGame={handleStartGame}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
              >
                <Scoreboard
                  state={state}
                  onRollOffReorder={handleRollOffReorder}
                  isViewer={isViewer}
                />
              </motion.div>

              {!isViewer && !state.gameComplete && (
                <>
                  {state.rollOffSetupMode && (state.phase === 'winRollOff' || state.phase === 'lastRollOff') ? (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="btn-primary w-full text-lg py-4"
                      onClick={handleStartRollOff}
                    >
                      Start Roll-Off
                    </motion.button>
                  ) : (
                    <TurnEntry onSubmit={handleTurnSubmit} disabled={isViewer} />
                  )}
                </>
              )}

              {state.gameComplete && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="card text-center space-y-6"
                >
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Ultimate Winner</p>
                      <p className="text-3xl font-bold text-success">
                        {state.players.find(p => p.id === state.ultimateWinnerId)?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Takes Shot</p>
                      <p className="text-3xl font-bold text-highlight">
                        {state.players.find(p => p.id === state.loserId)?.name}
                      </p>
                    </div>
                  </div>

                  {!isViewer && (
                    <button
                      className="btn-primary w-full text-lg py-4"
                      onClick={handleNewGame}
                    >
                      Start New Game
                    </button>
                  )}
                </motion.div>
              )}
            </div>

            <div>
              <GameLog logs={logs} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
