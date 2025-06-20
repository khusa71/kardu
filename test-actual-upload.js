// Test actual upload process to identify why no database records are created
import FormData from 'form-data';
import fetch from 'node-fetch';
import fs from 'fs';

async function testActualUpload() {
  console.log('Testing actual upload process...\n');

  try {
    // Create a simple text file to simulate PDF upload
    const testContent = `JavaScript Fundamentals

Variables store data values in JavaScript:
- let for changeable variables
- const for constants
- var for legacy variables

Functions perform specific tasks:
function greet(name) {
    return "Hello " + name;
}

Arrays store multiple values:
let fruits = ["apple", "banana"];

Objects store key-value pairs:
let person = {name: "John", age: 30};`;

    fs.writeFileSync('test-upload.txt', testContent);
    
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
    formData.append('pdfs', fs.createReadStream('test-upload.txt'));
    formData.append('subject', 'JavaScript');
    formData.append('difficulty', 'beginner');
    formData.append('apiProvider', 'basic');
    formData.append('flashcardCount', '5');
    formData.append('focusAreas', JSON.stringify({
      concepts: true,
      definitions: true,
      examples: false,
      procedures: false
    }));
    
    console.log('Uploading file...');
    
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
    
    // Check database for created jobs
    console.log('\nChecking database for created jobs...');
    
    const { data: jobs, error } = await supabase
      .from('flashcard_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.log('Database query error:', error.message);
    } else {
      console.log('Jobs in database:', jobs.length);
      jobs.forEach((job, index) => {
        console.log(`Job ${index + 1}:`, {
          id: job.id,
          filename: job.filename,
          status: job.status,
          created_at: job.created_at
        });
      });
    }
    
    // Cleanup
    fs.unlinkSync('test-upload.txt');
    await supabase.auth.signOut();
    
    return uploadResult.jobs?.length > 0;
    
  } catch (error) {
    console.log('Upload test failed:', error.message);
    return false;
  }
}

testActualUpload().then(success => {
  console.log(success ? '\nUpload created database records' : '\nUpload did not create database records');
  process.exit(success ? 0 : 1);
});