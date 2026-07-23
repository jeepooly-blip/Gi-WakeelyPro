import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, (firebaseConfig as any).firestoreDatabaseId || '(default)');

export default app;
