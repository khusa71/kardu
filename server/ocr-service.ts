import { spawn } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, readFile } from 'fs/promises';
import path from 'path';

export interface OCRResult {
  text: string;
  confidence: number;
  isScanned: boolean;
}

export async function detectIfScanned(pdfPath: string): Promise<boolean> {
  try {
    // Use PyMuPDF to check text content
    const pythonScript = `
import fitz
import sys

pdf_path = sys.argv[1]
doc = fitz.open(pdf_path)

total_chars = 0
for page in doc:
    text = page.get_text()
    total_chars += len(text.strip())

# If very little text found, likely scanned
is_scanned = total_chars < 100
print("true" if is_scanned else "false")
doc.close()
`;
    
    const tempScript = path.join('/tmp', `detect_${Date.now()}.py`);
    await writeFile(tempScript, pythonScript);
    
    const result = await new Promise<string>((resolve, reject) => {
      const process = spawn('python3', [tempScript, pdfPath]);
      let output = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Detection failed with code ${code}`));
        }
      });
    });
    
    await unlink(tempScript);
    return result === 'true';
  } catch (error) {
    console.error('Error detecting if PDF is scanned:', error);
    return false; // Assume text-based if detection fails
  }
}

export async function extractTextWithOCR(pdfPath: string, maxPages?: number): Promise<OCRResult> {
  try {
    // First check if document is scanned
    const isScanned = await detectIfScanned(pdfPath);
    
    if (!isScanned) {
      // Extract text normally
      const text = await extractTextFromPDF(pdfPath, maxPages);
      return {
        text,
        confidence: 0.95,
        isScanned: false
      };
    }
    
    // For scanned documents, use OCR
    const pythonScript = `
import fitz
import pytesseract
from PIL import Image
import io
import sys

pdf_path = sys.argv[1]
doc = fitz.open(pdf_path)

all_text = []
total_confidence = 0
page_count = 0

for page_num in range(len(doc)):
    page = doc[page_num]
    
    # Convert page to image
    mat = fitz.Matrix(2.0, 2.0)  # Higher resolution for better OCR
    pix = page.get_pixmap(matrix=mat)
    img_data = pix.tobytes("png")
    
    # Use Tesseract OCR
    image = Image.open(io.BytesIO(img_data))
    
    # Get text with confidence
    ocr_data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
    
    page_text = []
    confidences = []
    
    for i, text in enumerate(ocr_data['text']):
        if text.strip():
            page_text.append(text)
            confidences.append(int(ocr_data['conf'][i]))
    
    if page_text:
        page_content = ' '.join(page_text)
        all_text.append(page_content)
        
        # Calculate average confidence for this page
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        total_confidence += avg_confidence
        page_count += 1

doc.close()

final_text = '\\n\\n'.join(all_text)
final_confidence = total_confidence / page_count if page_count > 0 else 0

print(f"CONFIDENCE:{final_confidence}")
print(f"TEXT:{final_text}")
`;
    
    const tempScript = path.join('/tmp', `ocr_${Date.now()}.py`);
    await writeFile(tempScript, pythonScript);
    
    const result = await new Promise<string>((resolve, reject) => {
      const process = spawn('python3', [tempScript, pdfPath]);
      let output = '';
      let error = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`OCR failed: ${error}`));
        }
      });
    });
    
    await unlink(tempScript);
    
    // Parse the result
    const lines = result.split('\n');
    const confidenceLine = lines.find(line => line.startsWith('CONFIDENCE:'));
    const textLine = lines.find(line => line.startsWith('TEXT:'));
    
    const confidence = confidenceLine ? parseFloat(confidenceLine.split(':')[1]) : 0;
    const text = textLine ? textLine.substring(5) : '';
    
    return {
      text,
      confidence: confidence / 100, // Convert to 0-1 scale
      isScanned: true
    };
    
  } catch (error) {
    console.error('OCR extraction failed:', error);
    throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractTextFromPDF(pdfPath: string, maxPages?: number): Promise<string> {
  const pythonScript = `
import fitz
import sys

pdf_path = sys.argv[1]
max_pages = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] != 'None' else None
doc = fitz.open(pdf_path)

text_content = []
total_pages = len(doc)
pages_to_process = min(total_pages, max_pages) if max_pages else total_pages

for page_num in range(pages_to_process):
    page = doc[page_num]
    text = page.get_text()
    if text.strip():
        text_content.append(text)

doc.close()

processed_text = '\\n\\n'.join(text_content)
if max_pages and total_pages > max_pages:
    processed_text += f'\\n\\n[Note: Only the first {pages_to_process} of {total_pages} pages were processed due to plan limits]'

print(processed_text)
`;
  
  const tempScript = path.join('/tmp', `extract_${Date.now()}.py`);
  await writeFile(tempScript, pythonScript);
  
  try {
    const result = await new Promise<string>((resolve, reject) => {
      const args = [tempScript, pdfPath];
      if (maxPages !== undefined) {
        args.push(maxPages.toString());
      }
      
      const process = spawn('python3', args);
      let output = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Text extraction failed with code ${code}`));
        }
      });
    });
    
    return result;
  } finally {
    await unlink(tempScript);
  }
}