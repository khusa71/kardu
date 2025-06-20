// Direct validation of comprehensive JSON parsing logic
async function testParsingLogic() {
  console.log('Testing comprehensive JSON parsing logic...');
  
  const testCases = [
    {
      name: "Markdown wrapped JSON",
      content: '```json\n[{"front": "What is photosynthesis?", "back": "The process by which plants convert light energy"}]\n```'
    },
    {
      name: "Generic markdown blocks", 
      content: '```\n[{"front": "Define democracy", "back": "A system of government by the people"}]\n```'
    },
    {
      name: "Embedded JSON in text",
      content: 'Here are the flashcards:\n[{"front": "What is gravity?", "back": "A force that attracts objects"}]\nEnd of response.'
    },
    {
      name: "Plain JSON array",
      content: '[{"front": "What is DNA?", "back": "Deoxyribonucleic acid"}]'
    },
    {
      name: "Nested object with flashcards array",
      content: '{"flashcards": [{"front": "What is evolution?", "back": "The process of species change over time"}]}'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\nTesting: ${testCase.name}`);
    
    try {
      // Apply the same parsing logic from ai-service.ts
      let jsonContent = testCase.content.trim();
      
      // Method 1: Extract from markdown code blocks
      const markdownMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (markdownMatch) {
        jsonContent = markdownMatch[1].trim();
        console.log('  ✓ Extracted from markdown blocks');
      }
      
      // Method 2: Clean up any remaining markdown artifacts
      jsonContent = jsonContent
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '')
        .replace(/^```\s*/i, '')
        .trim();
      
      // Method 3: Handle cases where JSON is embedded in text
      const embeddedJsonMatch = jsonContent.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      if (embeddedJsonMatch && !jsonContent.startsWith('[') && !jsonContent.startsWith('{')) {
        jsonContent = embeddedJsonMatch[1];
        console.log('  ✓ Extracted embedded JSON');
      }
      
      const parsed = JSON.parse(jsonContent);
      const flashcards = Array.isArray(parsed) ? parsed : parsed.flashcards || [];
      
      if (!Array.isArray(flashcards) || flashcards.length === 0) {
        console.log('  ❌ No valid flashcards found');
      } else {
        console.log(`  ✅ Successfully parsed ${flashcards.length} flashcards`);
        console.log(`    First card: "${flashcards[0].front}" -> "${flashcards[0].back}"`);
      }
      
    } catch (error) {
      console.log(`  ❌ Parsing failed: ${error.message}`);
    }
  }
  
  console.log('\n✅ Comprehensive JSON parsing validation completed');
}

testParsingLogic().catch(console.error);