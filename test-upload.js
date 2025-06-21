import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

async function testUpload() {
  try {
    // Create a simple test PDF (just text content for testing)
    const testPdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000125 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n197\n%%EOF');
    
    const formData = new FormData();
    formData.append('pdfs', testPdfContent, {
      filename: 'test.pdf',
      contentType: 'application/pdf'
    });
    formData.append('subject', 'Test Subject');
    formData.append('difficulty', 'intermediate');
    formData.append('flashcardCount', '5');
    formData.append('apiProvider', 'basic');
    formData.append('focusAreas', JSON.stringify({ concepts: true, definitions: true }));

    console.log('Sending test upload request...');
    
    const response = await fetch('http://localhost:5000/api/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': 'Bearer test-token-will-fail-auth-but-show-where-error-occurs'
      }
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', responseText);

  } catch (error) {
    console.error('Test upload error:', error.message);
  }
}

testUpload();