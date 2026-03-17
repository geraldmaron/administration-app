import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serviceAccount = require('../serviceAccountKey.json');
const { initializeAuditConfig } = require('../functions/lib/lib/audit-rules.js');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'the-administration-3a072',
  });
}

const db = admin.firestore();

async function test() {
  try {
    await initializeAuditConfig(db);
    console.log('✅ initializeAuditConfig succeeded');
  } catch (error) {
    console.error('❌ initializeAuditConfig failed:', error.message);
  }
}

test();
