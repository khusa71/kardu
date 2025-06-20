import { supabaseStorage } from './supabase-storage-service.js';

async function testStorageBucket() {
  console.log('Testing Supabase Storage S3 bucket functionality...');
  
  try {
    // Test 1: CSV Export
    console.log('1. Testing CSV export upload...');
    const csvResult = await supabaseStorage.uploadCSVExport('test-user', 999, 'Question,Answer\nTest Question,Test Answer');
    console.log('✅ CSV upload successful:', csvResult.key);

    // Test 2: JSON Export  
    console.log('2. Testing JSON export upload...');
    const jsonResult = await supabaseStorage.uploadJSONExport('test-user', 999, JSON.stringify([{front: 'Test', back: 'Answer'}]));
    console.log('✅ JSON upload successful:', jsonResult.key);

    // Test 3: Download functionality
    console.log('3. Testing file download...');
    const downloadedData = await supabaseStorage.downloadFile(csvResult.key);
    console.log('✅ Download successful, size:', downloadedData.length, 'bytes');

    // Test 4: File deletion
    console.log('4. Testing file cleanup...');
    const deleteResult1 = await supabaseStorage.deleteFile(csvResult.key);
    const deleteResult2 = await supabaseStorage.deleteFile(jsonResult.key);
    console.log('✅ Cleanup successful:', deleteResult1 && deleteResult2);

    // Test 5: PDF upload with buffer
    console.log('5. Testing PDF upload...');
    const testBuffer = Buffer.from('PDF test content');
    const pdfResult = await supabaseStorage.uploadPDF('test-user', 999, testBuffer, 'test.pdf');
    console.log('✅ PDF upload successful:', pdfResult.key);
    
    // Cleanup PDF
    await supabaseStorage.deleteFile(pdfResult.key);
    console.log('✅ PDF cleanup successful');

    console.log('\n✅ All S3 bucket tests passed - Supabase Storage is working correctly');
    return true;

  } catch (error) {
    console.error('\n❌ S3 bucket test failed:', error.message);
    console.error('Error details:', error);
    return false;
  }
}

export { testStorageBucket };