// Test per il parsing dei trattamenti
const testTreatmentParsing = () => {
  console.log('=== TEST PARSING TRATTAMENTI ===');
  
  // Test case 1: stringa con +
  const test1 = "nichelatura + marcatura + affettatura";
  let trattamenti1 = [];
  if (test1 && typeof test1 === 'string') {
    trattamenti1 = test1
      .split(/[+,;]/)
      .map(t => t.trim().toLowerCase())
      .filter(t => t && t.length > 0);
  }
  console.log('Input:', test1);
  console.log('Output:', trattamenti1);
  console.log('Risultato atteso: [nichelatura, marcatura, affettatura]');
  console.log('Test 1:', JSON.stringify(trattamenti1) === JSON.stringify(['nichelatura', 'marcatura', 'affettatura']) ? '✅ PASS' : '❌ FAIL');
  
  // Test case 2: stringa con virgole
  const test2 = "zincatura, verniciatura, assemblaggio";
  let trattamenti2 = [];
  if (test2 && typeof test2 === 'string') {
    trattamenti2 = test2
      .split(/[+,;]/)
      .map(t => t.trim().toLowerCase())
      .filter(t => t && t.length > 0);
  }
  console.log('\nInput:', test2);
  console.log('Output:', trattamenti2);
  console.log('Risultato atteso: [zincatura, verniciatura, assemblaggio]');
  console.log('Test 2:', JSON.stringify(trattamenti2) === JSON.stringify(['zincatura', 'verniciatura', 'assemblaggio']) ? '✅ PASS' : '❌ FAIL');
  
  // Test case 3: stringa mista
  const test3 = "sabbiatura; anodizzazione + controllo qualità, packaging";
  let trattamenti3 = [];
  if (test3 && typeof test3 === 'string') {
    trattamenti3 = test3
      .split(/[+,;]/)
      .map(t => t.trim().toLowerCase())
      .filter(t => t && t.length > 0);
  }
  console.log('\nInput:', test3);
  console.log('Output:', trattamenti3);
  console.log('Risultato atteso: [sabbiatura, anodizzazione, controllo qualità, packaging]');
  console.log('Test 3:', JSON.stringify(trattamenti3) === JSON.stringify(['sabbiatura', 'anodizzazione', 'controllo qualità', 'packaging']) ? '✅ PASS' : '❌ FAIL');
  
  // Test case 4: stringa vuota/null
  const test4 = "";
  let trattamenti4 = [];
  if (test4 && typeof test4 === 'string') {
    trattamenti4 = test4
      .split(/[+,;]/)
      .map(t => t.trim().toLowerCase())
      .filter(t => t && t.length > 0);
  }
  console.log('\nInput:', test4);
  console.log('Output:', trattamenti4);
  console.log('Risultato atteso: []');
  console.log('Test 4:', JSON.stringify(trattamenti4) === JSON.stringify([]) ? '✅ PASS' : '❌ FAIL');
  
  console.log('\n=== FINE TEST ===');
};

// Esegui i test
testTreatmentParsing();
