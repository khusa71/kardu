// Test upload with actual PDF file to validate complete flow
import FormData from 'form-data';
import fetch from 'node-fetch';
import fs from 'fs';

async function testRealPDFUpload() {
  console.log('Testing PDF upload with real file...\n');

  try {
    // Check if PDF file exists
    const pdfPath = 'attached_assets/jess303_1750455240816.pdf';
    if (!fs.existsSync(pdfPath)) {
      console.log('PDF file not found at:', pdfPath);
      return false;
    }
    
    console.log('PDF file found, size:', fs.statSync(pdfPath).size, 'bytes');
    
    // Get authentication token
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: signInData } = await supabase.auth.signInWithPassword({
      email: 'demo@kardu.io',
      password: 'demo123456'
    });
    
    if (!signInData.session) {
      console.log('Failed to authenticate');
      return false;
    }
    
    console.log('Authenticated successfully');
    
    // Create form data for upload
    const formData = new FormData();
    formData.append('pdfs', fs.createReadStream(pdfPath));
    formData.append('subject', 'History');
    formData.append('difficulty', 'intermediate');
    formData.append('apiProvider', 'basic');
    formData.append('flashcardCount', '10');
    formData.append('focusAreas', JSON.stringify({
      concepts: true,
      definitions: true,
      examples: true,
      procedures: false
    }));
    
    console.log('Uploading PDF file...');
    
    // Make upload request
    const uploadResponse = await fetch('http://localhost:5000/api/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${signInData.session.access_token}`,
        ...formData.getHeaders()
      }
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.log('Upload failed:', uploadResponse.status, errorText);
      return false;
    }
    
    const uploadResult = await uploadResponse.json();
    console.log('Upload response:', JSON.stringify(uploadResult, null, 2));
    
    if (!uploadResult.jobs || uploadResult.jobs.length === 0) {
      console.log('No jobs created in upload response');
      return false;
    }
    
    const jobId = uploadResult.jobs[0].jobId;
    console.log('\nJob created with ID:', jobId);
    
    // Poll job status
    console.log('Monitoring job progress...');
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    
    while (attempts < maxAttempts) {
      const statusResponse = await fetch(`http://localhost:5000/api/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${signInData.session.access_token}`
        }
      });
      
      if (!statusResponse.ok) {
        console.log('Failed to get job status:', statusResponse.status);
        break;
      }
      
      const jobStatus = await statusResponse.json();
      console.log(`Status: ${jobStatus.status} (attempt ${attempts + 1}/${maxAttempts})`);
      
      if (jobStatus.status === 'completed') {
        console.log('\nJob completed successfully!');
        console.log('Flashcard count:', jobStatus.flashcards ? JSON.parse(jobStatus.flashcards).length : 0);
        
        // Check database for the job
        const { data: jobs, error } = await supabase
          .from('flashcard_jobs')
          .select('*')
          .eq('id', jobId)
          .single();
        
        if (error) {
          console.log('Database query error:', error.message);
        } else {
          console.log('Job found in database:', {
            id: jobs.id,
            filename: jobs.filename,
            status: jobs.status,
            page_count: jobs.page_count,
            flashcard_count: jobs.flashcards ? JSON.parse(jobs.flashcards).length : 0
          });
        }
        
        await supabase.auth.signOut();
        return true;
      }
      
      if (jobStatus.status === 'failed') {
        console.log('Job failed:', jobStatus.error_message);
        break;
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    }
    
    console.log('Job did not complete within timeout period');
    await supabase.auth.signOut();
    return false;
    
  } catch (error) {
    console.log('Test failed:', error.message);
    return false;
  }
}

testRealPDFUpload().then(success => {
  console.log(success ? '\n✅ PDF upload and processing completed successfully!' : '\n❌ PDF upload test failed');
  process.exit(success ? 0 : 1);
});