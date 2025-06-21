// Simple verification script to check if flashcards table exists
const { exec } = require('child_process');

// Test if we can query the flashcards table through the API
async function verifyFlashcardsTable() {
  console.log('Checking if flashcards table exists...');
  
  try {
    // Try to make a simple query to check table existence
    const response = await fetch('http://localhost:5000/api/test-flashcards-table', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.text();
      console.log('✅ Flashcards table verified:', result);
    } else {
      console.log('❌ Flashcards table not accessible:', response.status);
    }
  } catch (error) {
    console.log('❌ Error testing flashcards table:', error.message);
  }
}

verifyFlashcardsTable();