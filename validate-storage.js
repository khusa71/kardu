// Direct validation of Supabase Storage S3 bucket functionality
import { createClient } from '@supabase/supabase-js';

// Use the same configuration as the server
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'kardu-bucket';

async function validateS3Bucket() {
  console.log('🔍 Validating Supabase Storage S3 bucket functionality...\n');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Missing Supabase credentials');
    console.log('   Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    return false;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Test 1: Check bucket existence
    console.log('1. Checking bucket existence...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log('❌ Failed to list buckets:', bucketsError.message);
      return false;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    console.log(`   Bucket "${bucketName}" exists: ${bucketExists ? '✅' : '❌'}`);
    
    if (!bucketExists) {
      console.log('❌ Target bucket not found');
      return false;
    }
    
    // Test 2: Upload test file
    console.log('\n2. Testing file upload...');
    const testContent = `Test file uploaded at ${new Date().toISOString()}`;
    const testFileName = `test-${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(testFileName, testContent, {
        contentType: 'text/plain',
        upsert: false
      });
    
    if (uploadError) {
      console.log('❌ Upload failed:', uploadError.message);
      return false;
    }
    
    console.log('   Upload successful:', uploadData.path);
    
    // Test 3: Download test file
    console.log('\n3. Testing file download...');
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(testFileName);
    
    if (downloadError) {
      console.log('❌ Download failed:', downloadError.message);
      return false;
    }
    
    const downloadedText = await downloadData.text();
    console.log('   Download successful, content verified:', downloadedText.includes('Test file'));
    
    // Test 4: List files
    console.log('\n4. Testing file listing...');
    const { data: files, error: listError } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 10 });
    
    if (listError) {
      console.log('❌ List failed:', listError.message);
      return false;
    }
    
    console.log(`   Found ${files?.length || 0} files in bucket`);
    
    // Test 5: Delete test file
    console.log('\n5. Testing file deletion...');
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove([testFileName]);
    
    if (deleteError) {
      console.log('❌ Delete failed:', deleteError.message);
      return false;
    }
    
    console.log('   Deletion successful');
    
    console.log('\n✅ All S3 bucket validation tests passed');
    console.log('   - Bucket exists and is accessible');
    console.log('   - Upload functionality working');
    console.log('   - Download functionality working');
    console.log('   - File listing working');
    console.log('   - Delete functionality working');
    
    return true;
    
  } catch (error) {
    console.log('❌ Validation failed with error:', error.message);
    return false;
  }
}

validateS3Bucket().then(success => {
  console.log(success ? '\n🎉 S3 bucket is fully functional' : '\n💥 S3 bucket has issues');
  process.exit(success ? 0 : 1);
});