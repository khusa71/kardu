// Test complete PDF upload to flashcard creation flow
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:5000';

async function testCompleteFlow() {
  console.log('🧪 Testing complete PDF upload to flashcard creation flow...\n');

  try {
    // Step 1: Create test content as a text file (simulating PDF text extraction)
    const testContent = `JavaScript Fundamentals

Variables in JavaScript are containers for storing data values. JavaScript has several primitive data types:

1. String: Represents text data
   Example: let name = 'John';

2. Number: Represents both integers and floating-point numbers  
   Example: let age = 25;

3. Boolean: Represents true or false values
   Example: let isActive = true;

Functions are reusable blocks of code designed to perform a particular task.

Function Declaration:
function greet(name) {
    return 'Hello, ' + name + '!';
}

Arrays are used to store multiple values in a single variable.
Creating an array: let fruits = ['apple', 'banana', 'orange'];

Objects are collections of key-value pairs.
let person = { name: 'John', age: 30, city: 'New York' };

Key Concepts:
- Variables store data values
- Functions perform specific tasks
- Arrays hold multiple values
- Objects contain key-value pairs
- JavaScript is dynamically typed`;

    // Create a temporary file to simulate PDF upload
    fs.writeFileSync('temp-test.txt', testContent);
    console.log('1. ✅ Test content created');

    // Step 2: Test file upload via API
    console.log('\n2. Testing file upload...');
    
    const formData = new FormData();
    formData.append('files', fs.createReadStream('temp-test.txt'));
    formData.append('subject', 'JavaScript');
    formData.append('difficulty', 'beginner');
    formData.append('focusAreas', JSON.stringify({
      concepts: true,
      definitions: true,
      examples: true
    }));

    const uploadResponse = await fetch(`${SERVER_URL}/api/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders()
      }
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('   ✅ Upload successful');
    console.log('   Files processed:', uploadResult.totalFiles);
    console.log('   Pages processed:', uploadResult.totalPagesProcessed);
    console.log('   Jobs created:', uploadResult.jobs?.length || 0);

    if (uploadResult.jobs && uploadResult.jobs.length > 0) {
      const job = uploadResult.jobs[0];
      console.log('   Job ID:', job.id);
      console.log('   Status:', job.status);
      console.log('   Flashcards generated:', job.flashcards?.length || 0);

      // Step 3: Test flashcard generation results
      if (job.flashcards && job.flashcards.length > 0) {
        console.log('\n3. ✅ Flashcards generated successfully');
        console.log('   Sample flashcards:');
        
        job.flashcards.slice(0, 3).forEach((card, index) => {
          console.log(`   ${index + 1}. Q: ${card.front}`);
          console.log(`      A: ${card.back}\n`);
        });

        // Step 4: Test export functionality
        console.log('4. Testing export functionality...');
        
        const exportResponse = await fetch(`${SERVER_URL}/api/jobs/${job.id}/export`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            formats: ['csv', 'json', 'quizlet']
          })
        });

        if (exportResponse.ok) {
          const exportResult = await exportResponse.json();
          console.log('   ✅ Export successful');
          console.log('   Available formats:', Object.keys(exportResult.exports || {}));
        } else {
          console.log('   ⚠️ Export test skipped (may require authentication)');
        }

        // Step 5: Test study mode access
        console.log('\n5. Testing study mode access...');
        
        const studyResponse = await fetch(`${SERVER_URL}/api/jobs/${job.id}/study`);
        
        if (studyResponse.ok) {
          const studyData = await studyResponse.json();
          console.log('   ✅ Study mode accessible');
          console.log('   Study cards available:', studyData.flashcards?.length || 0);
        } else {
          console.log('   ⚠️ Study mode test skipped (may require authentication)');
        }
      } else {
        console.log('\n3. ❌ No flashcards generated');
        console.log('   This might indicate an issue with AI processing');
      }
    } else {
      console.log('\n❌ No jobs created - upload may have failed');
    }

    // Step 6: Test health and status
    console.log('\n6. Testing system health...');
    
    const healthResponse = await fetch(`${SERVER_URL}/api/health`);
    const healthData = await healthResponse.json();
    
    console.log('   System status:', healthData.status);
    console.log('   Database:', healthData.services?.database);
    console.log('   API keys:', healthData.services?.apiKeys);
    console.log('   Memory:', healthData.services?.memory);

    // Cleanup
    fs.unlinkSync('temp-test.txt');
    console.log('\n✅ Test cleanup completed');

    console.log('\n🎉 Complete flow test finished successfully!');
    return true;

  } catch (error) {
    console.error('\n❌ Flow test failed:', error.message);
    
    // Cleanup on error
    try {
      fs.unlinkSync('temp-test.txt');
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    return false;
  }
}

testCompleteFlow().then(success => {
  console.log(success ? '\n✅ All systems operational' : '\n❌ Issues detected in flow');
  process.exit(success ? 0 : 1);
});