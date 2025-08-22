#!/usr/bin/env node

/**
 * Script per verificare gli indici esistenti nel database MongoDB
 * 
 * Uso:
 *   node scripts/checkIndexes.js [--mongo-uri=mongodb://localhost:27017/omega]
 */

const mongoose = require('mongoose');

// Parsing argomenti - supporta sia --mongo-uri che --mongo_uri
const args = process.argv.slice(2);
const mongoUriArg = args.find(arg => arg.startsWith('--mongo-uri=') || arg.startsWith('--mongo_uri='));
const mongoUri = mongoUriArg?.split('=')[1] || 
                 process.env.MONGO_URI || 
                 'mongodb://localhost:27017/omega';

console.log('🔍 Database Indexes Report');
console.log('==========================');
console.log(`MongoDB URI: ${mongoUri}`);
console.log('');

/**
 * Stampa gli indici di una collezione in formato leggibile
 */
function formatIndex(index) {
  const key = JSON.stringify(index.key);
  const unique = index.unique ? ' [UNIQUE]' : '';
  const ttl = index.expireAfterSeconds !== undefined ? ` [TTL: ${index.expireAfterSeconds}s]` : '';
  const text = index.textIndexVersion ? ' [TEXT]' : '';
  return `    ${index.name}: ${key}${unique}${ttl}${text}`;
}

/**
 * Analizza gli indici di tutte le collezioni
 */
async function analyzeIndexes() {
  try {
    // Lista delle collezioni esistenti
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections:`);
    console.log('');
    
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`📁 Collection: ${collectionName}`);
      
      try {
        const indexes = await mongoose.connection.db.collection(collectionName).listIndexes().toArray();
        
        if (indexes.length > 0) {
          console.log(`  📈 Indexes (${indexes.length}):`);
          indexes.forEach(index => {
            console.log(formatIndex(index));
          });
          
          // Statistiche aggiuntive
          const stats = await mongoose.connection.db.collection(collectionName).stats();
          console.log(`  📊 Documents: ${stats.count || 0}`);
          console.log(`  📊 Size: ${((stats.size || 0) / 1024).toFixed(2)} KB`);
          console.log(`  📊 Avg document size: ${stats.avgObjSize ? (stats.avgObjSize / 1024).toFixed(2) + ' KB' : 'N/A'}`);
          
        } else {
          console.log('  ⚠️  No indexes found!');
        }
        
      } catch (err) {
        console.log(`  ❌ Error reading indexes: ${err.message}`);
      }
      
      console.log('');
    }
    
    // Analisi performance suggerita
    console.log('🚀 Performance Analysis:');
    console.log('========================');
    
    // Verifica componenti (collezione più importante)
    if (collections.some(c => c.name === 'components')) {
      const componentIndexes = await mongoose.connection.db.collection('components').listIndexes().toArray();
      const hasCommessaIdIndex = componentIndexes.some(idx => idx.key.commessaId);
      const hasBarcodeIndex = componentIndexes.some(idx => idx.key.barcode);
      const hasStatusIndex = componentIndexes.some(idx => idx.key.status);
      
      console.log('📦 Components Collection:');
      console.log(`  ${hasCommessaIdIndex ? '✅' : '❌'} commessaId index`);
      console.log(`  ${hasBarcodeIndex ? '✅' : '❌'} barcode index`);
      console.log(`  ${hasStatusIndex ? '✅' : '❌'} status index`);
      
      if (!hasCommessaIdIndex || !hasBarcodeIndex || !hasStatusIndex) {
        console.log('  ⚠️  Missing critical indexes! Run: npm run init-db');
      }
      console.log('');
    }
    
    // Verifica altre collezioni chiave
    const criticalCollections = ['commessas', 'users', 'refreshtokens'];
    for (const collName of criticalCollections) {
      if (collections.some(c => c.name === collName)) {
        const indexes = await mongoose.connection.db.collection(collName).listIndexes().toArray();
        const indexCount = indexes.length;
        console.log(`📋 ${collName}: ${indexCount} indexes ${indexCount < 2 ? '⚠️' : '✅'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error analyzing indexes:', error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected successfully!');
    console.log('');
    
    await analyzeIndexes();
    
    console.log('✅ Index analysis completed!');
    
  } catch (error) {
    console.error('❌ Index analysis failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

// Esegui script
if (require.main === module) {
  main();
}

module.exports = { analyzeIndexes };
