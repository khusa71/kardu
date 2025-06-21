import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function createBucket() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // List existing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }
    
    console.log('Existing buckets:', buckets?.map(b => b.name) || []);
    
    // Check if studycards-files bucket exists
    const bucketName = 'studycards-files';
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (bucketExists) {
      console.log(`✅ Bucket '${bucketName}' already exists`);
      return;
    }
    
    // Create the bucket
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: false,
      allowedMimeTypes: ['application/pdf', 'text/csv', 'application/json', 'text/plain', 'application/octet-stream'],
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
    });
    
    if (error) {
      console.error('Error creating bucket:', error);
      return;
    }
    
    console.log(`✅ Successfully created bucket '${bucketName}'`);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createBucket();