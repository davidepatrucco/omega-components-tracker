const mongoose = require('mongoose');
const Component = require('../models/Component');

// URI temporaneo per la migrazione
const MONGO_URI = 'mongodb+srv://omega-dev:pkkNBZtd1gAmShgp@bifadevelopment.hmkg9f4.mongodb.net/omega-dev';

async function fixMissingHistory() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Trova componenti con stato diverso da "1" ma history vuoto
    const componentsWithMissingHistory = await Component.find({
      $and: [
        { status: { $ne: '1' } }, // Status non è "1" (stato iniziale)
        { 
          $or: [
            { history: { $exists: false } }, // History non esiste
            { history: { $size: 0 } }        // History esiste ma è vuoto
          ]
        }
      ]
    });

    console.log(`Found ${componentsWithMissingHistory.length} components with missing history`);

    for (const component of componentsWithMissingHistory) {
      console.log(`Fixing component ${component._id} (${component.descrizioneComponente}) - Status: ${component.status}`);
      
      // Crea un entry di history generica
      const historyEntry = {
        from: '1', // Assumiamo che sia partito da stato "1"
        to: component.status,
        date: component.updatedAt || component.createdAt || new Date(),
        note: 'Migrazione automatica - storico recuperato',
        user: 'sistema',
        _id: new mongoose.Types.ObjectId()
      };

      // Inizializza history se non esiste
      if (!component.history) {
        component.history = [];
      }

      // Aggiungi l'entry
      component.history.push(historyEntry);

      // Salva il componente
      await component.save();
      console.log(`✓ Fixed component ${component._id}`);
    }

    console.log(`Migration completed. Fixed ${componentsWithMissingHistory.length} components.`);
    
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Esegui la migrazione se chiamato direttamente
if (require.main === module) {
  fixMissingHistory();
}

module.exports = { fixMissingHistory };
