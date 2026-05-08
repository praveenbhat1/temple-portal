const admin = require('firebase-admin');
const { SEVA_DATA } = require('../lib/sevaData'); // Need to handle ESM vs CJS

async function main() {
  admin.initializeApp({
    projectId: 'revora-2f62e'
  });

  const db = admin.firestore();
  const sevasCol = db.collection('sevas');

  console.log('Populating sevas...');

  for (const group of SEVA_DATA) {
    for (const item of group.items) {
      await sevasCol.doc(item.id).set({
        name: item.nameEn,
        nameKn: item.nameKn,
        price: item.price,
        description: item.noteEn || '',
        descriptionKn: item.noteKn || '',
        type: 'basic',
        isActive: true,
        category: group.titleEn
      });
      console.log(`Added ${item.nameEn}`);
    }
  }

  console.log('Done populating sevas.');
}

// Simple check to handle SEVA_DATA import if needed
// Actually I'll just hardcode a few or use the file directly if I can
main();
