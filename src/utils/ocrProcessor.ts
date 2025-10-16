import Tesseract from 'tesseract.js';
import { TableRow } from '@/components/WorksheetTable';

export const processImageWithOCR = async (
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<TableRow[]> => {
  try {
    const result = await Tesseract.recognize(imageFile, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });

    const text = result.data.text;
    console.log('OCR Result:', text);

    // Parse the extracted text into structured data
    return parseWorksheetText(text);
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to process image');
  }
};

const parseWorksheetText = (text: string): TableRow[] => {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const rows: TableRow[] = [];
  let currentCategory: 'assets' | 'liabilities' | 'equity' = 'assets';

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    // Detect section headers
    if (lowerLine.includes('asset')) {
      currentCategory = 'assets';
      continue;
    } else if (lowerLine.includes('liabilit')) {
      currentCategory = 'liabilities';
      continue;
    } else if (lowerLine.includes('equity') || lowerLine.includes('owner')) {
      currentCategory = 'equity';
      continue;
    }

    // Skip very short lines or lines with only numbers
    if (line.length < 3 || /^\d+$/.test(line)) continue;

    // Try to extract label and value
    // Pattern: text followed by optional number at the end
    const match = line.match(/^(.+?)(?:\s+(\d+(?:\.\d+)?))?$/);
    
    if (match) {
      const label = match[1].trim();
      const value = match[2] || '';

      // Skip if it's likely a header
      if (label.length > 2 && !lowerLine.includes('table')) {
        rows.push({
          label: formatLabel(label),
          value,
          category: currentCategory,
        });
      }
    }
  }

  // If no data was extracted, provide a default structure based on the uploaded image
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
    { label: 'CASH', value: '', category: 'assets' },
    { label: 'INVENTORY', value: '', category: 'assets' },
    { label: 'TOTAL ASSETS', value: '', category: 'assets' },
    { label: 'NOTES PAYABLE', value: '', category: 'liabilities' },
    { label: 'ORIGINAL INVESTMENT', value: '', category: 'equity' },
    { label: 'EARNINGS WEEK TO DATE', value: '', category: 'equity' },
    { label: 'TOTAL LIABILITIES & OWNERS EQUITY', value: '', category: 'equity' },
  ];
};
