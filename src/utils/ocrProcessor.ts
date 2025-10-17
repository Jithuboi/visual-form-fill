import Tesseract from 'tesseract.js';
import { TableRow } from '@/components/WorksheetTable';

// Preprocess image for better OCR accuracy
const preprocessImage = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Convert to grayscale and increase contrast
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        
        // Apply thresholding with contrast enhancement
        const threshold = 128;
        const enhanced = gray > threshold ? 255 : 0;
        
        data[i] = enhanced;     // R
        data[i + 1] = enhanced; // G
        data[i + 2] = enhanced; // B
      }

      // Put processed image back
      ctx.putImageData(imageData, 0, 0);

      // Convert to blob URL
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob));
        }
      });
    };

    img.src = URL.createObjectURL(file);
  });
};

export const processImageWithOCR = async (
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<TableRow[]> => {
  try {
    // Preprocess image for better OCR
    const preprocessedUrl = await preprocessImage(imageFile);
    
    const result = await Tesseract.recognize(preprocessedUrl, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });

    // Clean up preprocessed image URL
    URL.revokeObjectURL(preprocessedUrl);

    const text = result.data.text;
    console.log('OCR Result:', text);

    // Parse the extracted text into structured data
    return parseWorksheetText(text);
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to process image');
  }
};

// Detect if a line is a section header
const isSectionHeader = (line: string): boolean => {
  const upper = line.toUpperCase();
  const trimmed = line.trim();
  
  // Section headers are usually:
  // - All caps or mostly caps
  // - Shorter than 50 characters
  // - Don't start with numbers or bullet points
  // - May contain keywords like STATEMENT, TOTAL, PROFIT, etc.
  
  const hasNoNumbers = !/^\d/.test(trimmed);
  const isShortEnough = trimmed.length < 50;
  const hasMostlyCaps = (upper.match(/[A-Z]/g) || []).length > trimmed.length * 0.5;
  
  const keywords = ['STATEMENT', 'ASSETS', 'LIABILITIES', 'EQUITY', 'SALES', 'EXPENSES', 
                   'PROFIT', 'REVENUE', 'INCOME', 'COST', 'OWNER'];
  const hasKeyword = keywords.some(k => upper.includes(k));
  
  return hasNoNumbers && isShortEnough && (hasMostlyCaps || hasKeyword);
};

const parseWorksheetText = (text: string): TableRow[] => {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const rows: TableRow[] = [];
  let currentCategory = 'Uncategorized';
  let indentLevel = 0;

  for (const line of lines) {
    // Skip very short lines, lines with only numbers, or lines with only symbols
    if (line.length < 2 || /^[\d\.\s]+$/.test(line) || /^[^\w\s]+$/.test(line)) continue;

    // Check if this is a section header
    if (isSectionHeader(line)) {
      currentCategory = formatLabel(line);
      indentLevel = 0;
      continue;
    }

    // Detect indentation level (approximation based on leading spaces or special chars)
    const leadingSpaces = line.match(/^[\s\-\+\•\*]*/)?.[0].length || 0;
    indentLevel = Math.floor(leadingSpaces / 2);

    // Extract label and value
    // Try to find numbers at the end of the line
    const valueMatch = line.match(/\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*$/);
    const label = valueMatch 
      ? line.substring(0, line.lastIndexOf(valueMatch[0])).trim()
      : line;
    const value = valueMatch ? valueMatch[1].replace(/,/g, '') : '';

    // Clean and format the label
    const cleanLabel = formatLabel(label);
    
    // Skip if label is too short or generic
    if (cleanLabel.length < 2) continue;

    rows.push({
      label: cleanLabel,
      value,
      category: currentCategory,
      indentLevel,
    });
  }

  // If no data was extracted, provide a minimal default
  if (rows.length === 0) {
    return getDefaultStructure();
  }

  return rows;
};

const formatLabel = (label: string): string => {
  // Clean up common OCR issues
  return label
    .replace(/[|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
};

const getDefaultStructure = (): TableRow[] => {
  return [
    { label: 'Item 1', value: '', category: 'Section 1', indentLevel: 0 },
    { label: 'Item 2', value: '', category: 'Section 1', indentLevel: 0 },
    { label: 'Item 3', value: '', category: 'Section 2', indentLevel: 0 },
  ];
};
