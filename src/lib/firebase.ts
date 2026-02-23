import { initializeApp } from 'firebase/app';
import { getDatabase, Database, ref, set, onValue, off, get } from 'firebase/database';
import type { GameState } from '../types/gameTypes';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let db: Database | null = null;

export function initializeFirebase(): Database {
  if (!db) {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
  }
  return db;
}

export function getFirebaseDB(): Database {
  if (!db) {
    throw new Error('Firebase not initialized. Call initializeFirebase first.');
  }
  return db;
}

export async function syncStateToFirebase(roomCode: string, state: GameState): Promise<void> {
  const db = getFirebaseDB();
  const roomRef = ref(db, `rooms/${roomCode}`);

  const dataToSync = {
    players: state.players,
    target: state.target,
    round: state.round,
    currentIndex: state.currentIndex,
    phase: state.phase,
    winnerId: state.winnerId,
    ultimateWinnerId: state.ultimateWinnerId,
    loserId: state.loserId,
    gameComplete: state.gameComplete,
    roundScores: state.roundScores,
    rebuttalTurnsTaken: state.rebuttalTurnsTaken,
    rebuttalHit100Order: state.rebuttalHit100Order,
    rollOffPlayerIds: state.rollOffPlayerIds,
    rollOffIndex: state.rollOffIndex,
    rollOffSetupMode: state.rollOffSetupMode,
    rollOffRoundComplete: state.rollOffRoundComplete,
    lastUpdate: Date.now(),
  };

  await set(roomRef, dataToSync);
}

export function listenToRoom(
  roomCode: string,
  onUpdate: (state: Partial<GameState>) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getFirebaseDB();
  const roomRef = ref(db, `rooms/${roomCode}`);

  const listener = onValue(
    roomRef,
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        onUpdate({
          players: data.players || [],
          target: data.target || 100,
          round: data.round || 1,
          currentIndex: data.currentIndex || 0,
          phase: data.phase || 'normal',
          winnerId: data.winnerId || null,
          ultimateWinnerId: data.ultimateWinnerId || null,
          loserId: data.loserId || null,
          gameComplete: data.gameComplete || false,
          roundScores: data.roundScores || [],
          rebuttalTurnsTaken: data.rebuttalTurnsTaken || 0,
          rebuttalHit100Order: data.rebuttalHit100Order || [],
          rollOffPlayerIds: data.rollOffPlayerIds || [],
          rollOffIndex: data.rollOffIndex || 0,
          rollOffSetupMode: data.rollOffSetupMode || false,
          rollOffRoundComplete: data.rollOffRoundComplete || false,
        });
      }
    },
    (error) => {
      if (onError) onError(error);
    }
  );

  return () => off(roomRef, 'value', listener);
}

// Uses get() for a single read — no subscription leak
export async function checkRoomExists(roomCode: string): Promise<boolean> {
  try {
    const db = getFirebaseDB();
    const snapshot = await get(ref(db, `rooms/${roomCode}`));
    return snapshot.exists();
  } catch {
    return false;
  }
}
