/**
 * Script per popolare l'anagrafica trattamenti con valori comuni
 * Usage: node scripts/seed-treatments.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Treatment = require('../models/Treatment');

const commonTreatments = [
  'Zincatura elettrolitica',
  'Anodizzazione neutra',
  'Anodizzazione dura',
  'Nichelatura chimica',
  'vern.7035',
  'vern.7037',
  'vern.1021',
  'Marcatura laser',
  'Passivazione',
  'Cromatura',
  'Sabbiatura',
  'Lucidatura',
  'Micropallinatura',
  'Fosfatazione',
  'Verniciatura a polvere',
  'Ossidazione nera'
];

async function seedTreatments() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/omega');
    console.log('Connected!');
    
    console.log('Seeding treatments...');
    
    for (const treatmentName of commonTreatments) {
      await Treatment.findOneAndUpdate(
        { name: treatmentName },
        { 
          name: treatmentName,
          usageCount: 0,
          lastUsedAt: new Date()
        },
        { 
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      );
      console.log(`✓ ${treatmentName}`);
    }
    
    console.log('\n✅ Seeding completed!');
    console.log(`Created/updated ${commonTreatments.length} treatments`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding treatments:', error);
    process.exit(1);
  }
}

seedTreatments();
