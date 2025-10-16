import Tesseract from 'tesseract.js';
import { TableRow } from '@/components/WorksheetTable';
import { extract, token_set_ratio } from 'fuzzball';

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

// Known field names for fuzzy matching
const KNOWN_FIELDS = {
  assets: [
    'CASH',
    'INVENTORY',
    'ACCOUNTS RECEIVABLE',
    'SUPPLIES',
    'EQUIPMENT',
    'TOTAL ASSETS'
  ],
  liabilities: [
    'NOTES PAYABLE',
    'ACCOUNTS PAYABLE',
    'TOTAL LIABILITIES'
  ],
  equity: [
    'ORIGINAL INVESTMENT',
    'CAPITAL',
    'EARNINGS WEEK TO DATE',
    'NET INCOME',
    'DRAWINGS',
    'TOTAL LIABILITIES & OWNERS EQUITY',
    'TOTAL EQUITY'
  ]
};

const fuzzyMatchField = (text: string): { match: string; category: 'assets' | 'liabilities' | 'equity' } | null => {
  const cleanText = text.toUpperCase().replace(/[^A-Z\s]/g, '');
  
  // Try to match against known fields using fuzzy matching
  for (const [category, fields] of Object.entries(KNOWN_FIELDS)) {
    const matches = extract(cleanText, fields, { scorer: token_set_ratio, limit: 1 });
    if (matches.length > 0 && matches[0][1] > 60) { // 60% match threshold
      return { 
        match: matches[0][0], 
        category: category as 'assets' | 'liabilities' | 'equity' 
      };
    }
  }
  
  return null;
};

const parseWorksheetText = (text: string): TableRow[] => {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const rows: TableRow[] = [];
  let currentCategory: 'assets' | 'liabilities' | 'equity' = 'assets';

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    // Detect section headers with fuzzy matching
    if (lowerLine.includes('asset') || /ass[e3]t/i.test(line)) {
      currentCategory = 'assets';
      continue;
    } else if (lowerLine.includes('liabilit') || /liabilit/i.test(line)) {
      currentCategory = 'liabilities';
      continue;
    } else if (lowerLine.includes('equity') || lowerLine.includes('owner')) {
      currentCategory = 'equity';
      continue;
    }

    // Skip very short lines or lines with only numbers
    if (line.length < 3 || /^\d+$/.test(line)) continue;

    // Try fuzzy matching first
    const fuzzyMatch = fuzzyMatchField(line);
    if (fuzzyMatch) {
      const valueMatch = line.match(/(\d+(?:\.\d+)?)/);
      rows.push({
        label: fuzzyMatch.match,
        value: valueMatch ? valueMatch[1] : '',
        category: fuzzyMatch.category,
      });
      continue;
    }

    // Fallback: Try to extract label and value
    const match = line.match(/^(.+?)(?:\s+(\d+(?:\.\d+)?))?$/);
    
    if (match) {
      const label = match[1].trim();
      const value = match[2] || '';

      // Skip if it's likely a header or too generic
      if (label.length > 2 && !lowerLine.includes('table')) {
        rows.push({
          label: formatLabel(label),
          value,
          category: currentCategory,
        });
      }
    }
  }

  // If no data was extracted or very little, provide default structure
  if (rows.length < 3) {
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
