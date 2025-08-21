const mongoose = require('mongoose');
const Component = require('../models/Component');
const Commessa = require('../models/Commessa');

// Connect to a test database
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/omega-test';

async function createTestData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Component.deleteMany({});
    await Commessa.deleteMany({});

    // Create test commesse
    const commessa1 = await Commessa.create({
      code: 'C001',
      name: 'Test Commessa 1',
      notes: 'Test commessa'
    });

    const commessa2 = await Commessa.create({
      code: 'C002', 
      name: 'Test Commessa 2',
      notes: 'Another test commessa'
    });

    // Create test components
    const components = [
      {
        commessaId: commessa1._id,
        commessaCode: commessa1.code,
        commessaName: commessa1.name,
        name: 'Component 1',
        status: '1', // in lavorazione
        verificato: false,
        trattamenti: ['nichelatura'],
        allowedStatuses: ['1','2','3','5','6','4:nichelatura:PREP','4:nichelatura:IN','4:nichelatura:ARR']
      },
      {
        commessaId: commessa1._id,
        commessaCode: commessa1.code,
        commessaName: commessa1.name,
        name: 'Component 2',
        status: '5', // pronto da spedire
        verificato: true,
        allowedStatuses: ['1','2','3','5','6']
      },
      {
        commessaId: commessa2._id,
        commessaCode: commessa2.code,
        commessaName: commessa2.name,
        name: 'Component 3', 
        status: '6', // spedito
        verificato: true,
        history: [
          { 
            from: '5', 
            to: '6', 
            date: new Date(), // oggi
            note: 'shipped today' 
          }
        ],
        allowedStatuses: ['1','2','3','5','6']
      },
      {
        commessaId: commessa2._id,
        commessaCode: commessa2.code,
        commessaName: commessa2.name,
        name: 'Component 4',
        status: '4:marcatura:IN', // in trattamento
        verificato: false,
        trattamenti: ['marcatura'],
        allowedStatuses: ['1','2','3','5','6','4:marcatura:PREP','4:marcatura:IN','4:marcatura:ARR']
      }
    ];

    for (const comp of components) {
      await Component.create(comp);
    }

    console.log('Test data created successfully!');
    console.log('Created 2 commesse and 4 components');
    process.exit(0);
  } catch (error) {
    console.error('Error creating test data:', error);
    process.exit(1);
  }
}

createTestData();