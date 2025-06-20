// Test Supabase Storage S3 compatibility
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testS3Storage() {
  try {
    console.log('Testing Supabase Storage S3 bucket...');
    
    // Test bucket access
    const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'kardu-bucket';
    
    // List files in bucket
    const { data: files, error: listError } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 10 });
    
    if (listError) {
      console.error('Bucket list error:', listError.message);
      return false;
    }
    
    console.log(`✅ Bucket accessible. Found ${files?.length || 0} files`);
    
    // Test upload small file
    const testContent = 'test-content-' + Date.now();
    const testFileName = `test-${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(testFileName, testContent, {
        contentType: 'text/plain'
      });
    
    if (uploadError) {
      console.error('Upload error:', uploadError.message);
      return false;
    }
    
    console.log('✅ Upload successful:', uploadData?.path);
    
    // Test download
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(testFileName);
    
    if (downloadError) {
      console.error('Download error:', downloadError.message);
      return false;
    }
    
    console.log('✅ Download successful');
    
    // Clean up test file
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove([testFileName]);
    
    if (deleteError) {
      console.warn('Cleanup warning:', deleteError.message);
    } else {
      console.log('✅ Cleanup successful');
    }
    
    return true;
    
  } catch (error) {
    console.error('S3 Storage test failed:', error.message);
    return false;
  }
}

testS3Storage().then(success => {
  console.log(success ? '✅ S3 bucket working correctly' : '❌ S3 bucket has issues');
  process.exit(success ? 0 : 1);
});