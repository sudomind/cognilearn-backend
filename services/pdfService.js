const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

/**
 * Extract text and metadata from a PDF file.
 * @param {string} filePath - Absolute path to the PDF file
 * @returns {{ text: string, pages: number, info: object }}
 */
async function extractPDFContent(filePath) {
  // Validate file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`PDF file not found: ${filePath}`);
  }

  const dataBuffer = fs.readFileSync(filePath);

  if (dataBuffer.length === 0) {
    throw new Error('PDF file is empty');
  }

  let data;
  try {
    data = await pdfParse(dataBuffer, {
      // Limit pages for very large documents
      max: 100,
    });
  } catch (err) {
    throw new Error(`Failed to parse PDF: ${err.message}`);
  }

  const text = cleanExtractedText(data.text);

  if (!text || text.length < 50) {
    throw new Error('Could not extract readable text from PDF. The file may be scanned or image-based.');
  }

  return {
    text,
    pages:    data.numpages || 0,
    textLength: text.length,
    info: {
      title:    data.info?.Title    || null,
      author:   data.info?.Author   || null,
      subject:  data.info?.Subject  || null,
      creator:  data.info?.Creator  || null,
    },
  };
}

/**
 * Clean and normalize extracted PDF text
 */
function cleanExtractedText(rawText) {
  if (!rawText) return '';

  return rawText
    // Remove null bytes
    .replace(/\0/g, '')
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive blank lines (keep max 2 consecutive)
    .replace(/\n{3,}/g, '\n\n')
    // Remove lines that are just whitespace
    .replace(/^\s+$/gm, '')
    // Normalize spaces
    .replace(/[ \t]+/g, ' ')
    // Trim
    .trim();
}

/**
 * Safely delete a file from disk
 */
function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error(`Warning: Could not delete file ${filePath}:`, err.message);
  }
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

module.exports = { extractPDFContent, deleteFile, getFileSize };
