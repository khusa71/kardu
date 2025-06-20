// Direct test of job processing with comprehensive JSON parsing
async function testJobProcessing() {
  try {
    console.log('Starting direct job processing test...');
    
    // Call the background processing function directly
    const response = await fetch('http://localhost:5000/api/test-process-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: 9 })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Processing initiated:', result);
    } else {
      console.error('Processing failed:', await response.text());
    }
    
    // Monitor progress
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const statusResponse = await fetch('http://localhost:5000/api/jobs/9');
      const status = await statusResponse.json();
      
      console.log(`Progress: ${status.progress}% - ${status.currentTask} - Status: ${status.status}`);
      
      if (status.status === 'completed') {
        console.log('✅ Job completed successfully!');
        console.log(`Generated ${JSON.parse(status.flashcards || '[]').length} flashcards`);
        break;
      } else if (status.status === 'failed') {
        console.log('❌ Job failed:', status.errorMessage);
        break;
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testJobProcessing();