#!/usr/bin/env python3
import sys
import fitz  # PyMuPDF
import json

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF file using PyMuPDF."""
    try:
        doc = fitz.open(pdf_path)
        text_content = []
        
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text()
            if text.strip():  # Only add non-empty pages
                text_content.append(text)
        
        doc.close()
        
        # Join all pages with double newlines
        full_text = "\n\n".join(text_content)
        
        # Basic text cleaning
        # Remove excessive whitespace
        lines = full_text.split('\n')
        cleaned_lines = []
        for line in lines:
            cleaned_line = ' '.join(line.split())  # Remove extra spaces
            if cleaned_line:  # Only keep non-empty lines
                cleaned_lines.append(cleaned_line)
        
        return '\n'.join(cleaned_lines)
        
    except Exception as e:
        print(f"Error extracting text from PDF: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python pdf-processor.py <pdf_path>", file=sys.stderr)
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    extracted_text = extract_text_from_pdf(pdf_path)
    
    # Output the extracted text to stdout
    print(extracted_text)
