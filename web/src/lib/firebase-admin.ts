import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

export const isEmulatorMode = process.env.USE_FIREBASE_EMULATOR === 'true' || !!process.env.FIRESTORE_EMULATOR_HOST;
const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST || (process.env.USE_FIREBASE_EMULATOR === 'true' ? '127.0.0.1:8080' : undefined);

if (firestoreEmulatorHost && !process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = firestoreEmulatorHost;
}

declare global {
  // eslint-disable-next-line no-var
  var __adminFirestoreSettingsApplied: boolean | undefined;
}

function initFirebase() {
  if (getApps().length > 0) return;
  const serviceAccountPath = path.join(process.cwd(), '..', 'serviceAccountKey.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8')) as Record<string, unknown>;
  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || 'the-administration-3a072',
  });
}

initFirebase();

export const db = getFirestore();

if (firestoreEmulatorHost && !globalThis.__adminFirestoreSettingsApplied) {
  try {
    db.settings({ host: firestoreEmulatorHost, ssl: false });
    globalThis.__adminFirestoreSettingsApplied = true;
  } catch (error) {
    // Next.js dev reload can re-evaluate modules after Firestore was already initialized.
    // In that case, preserve the existing client instead of throwing on repeated settings().
    if (!(error instanceof Error) || !error.message.includes('Firestore has already been initialized')) {
      throw error;
    }
    globalThis.__adminFirestoreSettingsApplied = true;
  }
}

if (firestoreEmulatorHost) {
  console.log(`[Firebase Admin] ⚡ Emulator mode — connected to ${firestoreEmulatorHost}`);
}
