import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';

export interface PageCountResult {
  pageCount: number;
  hasText: boolean;
  isScanned: boolean;
}

/**
 * Extract page count and basic PDF information using PyMuPDF
 */
export async function getPageCount(pdfPath: string): Promise<PageCountResult> {
  try {
    const pythonScript = `
import fitz
import sys

pdf_path = sys.argv[1]
doc = fitz.open(pdf_path)

page_count = len(doc)
total_chars = 0
text_pages = 0

# Check text content to determine if it's scanned
for page_num in range(min(5, page_count)):  # Check first 5 pages for efficiency
    page = doc[page_num]
    text = page.get_text()
    chars_on_page = len(text.strip())
    total_chars += chars_on_page
    
    if chars_on_page > 50:  # Page has meaningful text
        text_pages += 1

doc.close()

# Determine if document is likely scanned
avg_chars_per_page = total_chars / min(5, page_count) if page_count > 0 else 0
has_text = total_chars > 100
is_scanned = avg_chars_per_page < 50 and text_pages == 0

print(f"PAGE_COUNT:{page_count}")
print(f"HAS_TEXT:{has_text}")
print(f"IS_SCANNED:{is_scanned}")
`;

    const tempScript = path.join('/tmp', `pagecount_${Date.now()}.py`);
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
          reject(new Error(`Page count extraction failed: ${error}`));
        }
      });
    });

    await unlink(tempScript);

    // Parse the result
    const lines = result.split('\n');
    const pageCountLine = lines.find(line => line.startsWith('PAGE_COUNT:'));
    const hasTextLine = lines.find(line => line.startsWith('HAS_TEXT:'));
    const isScannedLine = lines.find(line => line.startsWith('IS_SCANNED:'));

    const pageCount = pageCountLine ? parseInt(pageCountLine.split(':')[1]) : 0;
    const hasText = hasTextLine ? hasTextLine.split(':')[1] === 'True' : false;
    const isScanned = isScannedLine ? isScannedLine.split(':')[1] === 'True' : false;

    return {
      pageCount,
      hasText,
      isScanned
    };

  } catch (error) {
    console.error('Error extracting page count:', error);
    throw new Error(`Page count extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get page limits based on user tier
 */
export function getPageLimits(isPremium: boolean) {
  return {
    maxPagesPerFile: isPremium ? 100 : 20,
    monthlyPageLimit: isPremium ? 10000 : 60, // 20 pages * 3 uploads for free
    monthlyUploadLimit: isPremium ? 100 : 3
  };
}

/**
 * Check if user can process a PDF with given page count
 */
export function canProcessPDF(
  pageCount: number,
  isPremium: boolean,
  monthlyPagesProcessed: number,
  monthlyUploads: number
): {
  canProcess: boolean;
  reason?: string;
  maxPages?: number;
  pagesWillProcess?: number;
} {
  const limits = getPageLimits(isPremium);
  
  // Check upload limit
  if (monthlyUploads >= limits.monthlyUploadLimit) {
    return {
      canProcess: false,
      reason: `Monthly upload limit reached (${limits.monthlyUploadLimit} ${isPremium ? 'uploads' : 'uploads'})`
    };
  }

  // Check if file exceeds per-file page limit
  if (pageCount > limits.maxPagesPerFile) {
    return {
      canProcess: true,
      reason: `File has ${pageCount} pages, but only first ${limits.maxPagesPerFile} will be processed`,
      maxPages: limits.maxPagesPerFile,
      pagesWillProcess: limits.maxPagesPerFile
    };
  }

  // Check monthly page limit
  if (monthlyPagesProcessed + pageCount > limits.monthlyPageLimit) {
    const remainingPages = limits.monthlyPageLimit - monthlyPagesProcessed;
    if (remainingPages <= 0) {
      return {
        canProcess: false,
        reason: `Monthly page limit reached (${limits.monthlyPageLimit} pages)`
      };
    }

    return {
      canProcess: true,
      reason: `Only ${remainingPages} pages remaining in monthly limit`,
      maxPages: remainingPages,
      pagesWillProcess: remainingPages
    };
  }

  return {
    canProcess: true,
    pagesWillProcess: pageCount
  };
}