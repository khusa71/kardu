// Test the comprehensive JSON parsing solution directly
async function testJsonParsing() {
  try {
    console.log('Testing comprehensive JSON parsing solution...');
    
    // Test different OpenRouter response formats that were causing failures
    const testResponses = [
      // Case 1: JSON wrapped in markdown code blocks
      '```json\n[{"front": "What is photosynthesis?", "back": "The process by which plants convert light energy into chemical energy"}]\n```',
      
      // Case 2: JSON with extra markdown
      '```\n[{"front": "Define democracy", "back": "A system of government by the people"}]\n```',
      
      // Case 3: JSON embedded in text
      'Here are the flashcards:\n[{"front": "What is gravity?", "back": "A force that attracts objects toward each other"}]\nEnd of response.',
      
      // Case 4: Plain JSON array
      '[{"front": "What is DNA?", "back": "Deoxyribonucleic acid, the molecule that carries genetic information"}]'
    ];
    
    // Test each response format
    for (let i = 0; i < testResponses.length; i++) {
      console.log(`\nTesting response format ${i + 1}:`);
      
      const response = await fetch('http://localhost:5000/api/test-json-parser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: testResponses[i] })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Parsed successfully: ${result.flashcards.length} flashcards`);
        console.log(`First card: "${result.flashcards[0].front}" -> "${result.flashcards[0].back}"`);
      } else {
        const error = await response.text();
        console.log(`❌ Parsing failed: ${error}`);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testJsonParsing();