// Direct test of Supabase Storage using the configured service
import { supabaseStorage } from './server/supabase-storage-service.js';
import fs from 'fs';

async function testSupabaseStorage() {
  try {
    console.log('Testing Supabase Storage S3 bucket connectivity...');
    
    // Create a test file
    const testContent = `Test file created at ${new Date().toISOString()}`;
    const testBuffer = Buffer.from(testContent, 'utf8');
    const testUserId = 'test-user-123';
    const testJobId = 999;
    
    console.log('1. Testing PDF upload...');
    const uploadResult = await supabaseStorage.uploadPDF(testUserId, testJobId, testBuffer, 'test-document.pdf');
    console.log('✅ PDF upload successful:', uploadResult.key);
    
    console.log('2. Testing file download...');
    const downloadBuffer = await supabaseStorage.downloadFile(uploadResult.key);
    console.log('✅ Download successful, size:', downloadBuffer.length);
    
    console.log('3. Testing file deletion...');
    const deleteResult = await supabaseStorage.deleteFile(uploadResult.key);
    console.log('✅ Delete successful:', deleteResult);
    
    console.log('4. Testing export generation...');
    const mockFlashcards = [
      { front: 'What is React?', back: 'A JavaScript library for building user interfaces' },
      { front: 'What is Node.js?', back: 'A JavaScript runtime built on Chrome\'s V8 engine' }
    ];
    
    const exportResults = await supabaseStorage.generateAndUploadExports(testUserId, testJobId, mockFlashcards);
    console.log('✅ Export generation successful:', Object.keys(exportResults));
    
    // Cleanup exports
    for (const [format, fileInfo] of Object.entries(exportResults)) {
      if (fileInfo && fileInfo.key) {
        await supabaseStorage.deleteFile(fileInfo.key);
        console.log(`✅ Cleaned up ${format} export`);
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Supabase Storage test failed:', error.message);
    console.error('Error details:', error);
    return false;
  }
}

testSupabaseStorage().then(success => {
  console.log(success ? '\n✅ All Supabase Storage tests passed' : '\n❌ Supabase Storage has issues');
  process.exit(success ? 0 : 1);
});