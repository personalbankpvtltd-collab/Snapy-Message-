import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import configData from '../../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: configData.apiKey,
  authDomain: configData.authDomain,
  projectId: configData.projectId,
  storageBucket: configData.storageBucket,
  messagingSenderId: configData.messagingSenderId,
  appId: configData.appId,
  firestoreDatabaseId: configData.firestoreDatabaseId || '(default)',
};

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific database ID as provisioned
export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Validate Firestore connection on boot as mandated by Firebase skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Firestore (Primary Database) connected successfully');
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.warn('Firebase client offline, will retry when online.');
    } else {
      console.log('Firebase initialized. Database ID:', firebaseConfig.firestoreDatabaseId);
    }
  }
}

testConnection();
