const admin = require('firebase-admin');
const projectId = process.env.FIREBASE_PROJECT_ID;
admin.initializeApp({ projectId, credential: admin.credential.applicationDefault() });
const db = admin.firestore();
(async () => {
  const collections = await db.listCollections();
  console.log('Top-level collections:', collections.map(c => c.id));
  const snap = await db.collection('training_scenarios').limit(5).get();
  console.log('Fetched', snap.size, 'training_scenarios (first 5 returned)');
  snap.forEach(doc => {
    const data = doc.data();
    const opt = (data.options && data.options[0]) || {};
    console.log('---');
    console.log('id:', doc.id);
    console.log('title:', data.title);
    console.log('outcomeHeadline:', opt.outcomeHeadline);
    console.log('outcomeSummary:', opt.outcomeSummary);
    console.log('outcomeContext:', opt.outcomeContext);
  });
  process.exit(0);
})();
