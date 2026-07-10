/**
 * RAG Document Processor
 * Handles text extraction from various file formats and chunking.
 */

const fs = require('fs');
const path = require('path');

/* ============================================================
   Text Extraction — per file type
   ============================================================ */

/**
 * Extract text content from a file based on its extension.
 * @param {string} filePath - Absolute path to the file
 * @param {string} mimeType - MIME type (optional, falls back to extension)
 * @returns {Promise<string>} Extracted plain text
 */
async function extractText(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase().replace('.', '');

  switch (ext) {
    case 'txt':
    case 'md':
    case 'csv':
      return fs.readFileSync(filePath, 'utf-8');

    case 'pdf':
      return extractPDF(filePath);

    case 'docx':
      return extractDOCX(filePath);

    case 'xlsx':
      return extractXLSX(filePath);

    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
}

/** Extract text from PDF using pdf-parse */
async function extractPDF(filePath) {
  try {
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (err) {
    console.error('PDF extraction failed:', err.message);
    throw new Error('PDF-Extraktion fehlgeschlagen: ' + err.message);
  }
}

/** Extract text from DOCX by parsing the XML inside the zip */
async function extractDOCX(filePath) {
  try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(filePath);
    const entry = zip.getEntry('word/document.xml');
    if (!entry) throw new Error('No document.xml found in DOCX');

    const xml = entry.getData().toString('utf-8');
    // Strip XML tags and extract text content
    const text = xml
      .replace(/<w:br[^>]*\/>/g, '\n')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return text;
  } catch (err) {
    console.error('DOCX extraction failed:', err.message);
    throw new Error('DOCX-Extraktion fehlgeschlagen: ' + err.message);
  }
}

/** Extract text from XLSX using the xlsx library */
async function extractXLSX(filePath) {
  try {
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(filePath);
    const lines = [];

    workbook.SheetNames.forEach(function(sheetName) {
      lines.push('=== Sheet: ' + sheetName + ' ===');
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
      lines.push(csv);
    });

    return lines.join('\n\n');
  } catch (err) {
    console.error('XLSX extraction failed:', err.message);
    throw new Error('XLSX-Extraktion fehlgeschlagen: ' + err.message);
  }
}

/* ============================================================
   Text Chunking
   ============================================================ */

/**
 * Split text into overlapping chunks for embedding.
 * @param {string} text - The full document text
 * @param {object} options
 * @param {number} options.chunkSize - Target chunk size in characters (default: 1000)
 * @param {number} options.chunkOverlap - Overlap between chunks in characters (default: 200)
 * @param {string} options.separator - Preferred split boundary (default: paragraph)
 * @returns {Array<{text: string, index: number, start: number, end: number}>}
 */
function chunkText(text, options) {
  var opts = Object.assign({ chunkSize: 1000, chunkOverlap: 200, separator: '\n\n' }, options || {});

  if (!text || text.trim().length === 0) return [];

  // First split by paragraphs
  var paragraphs = text.split(opts.separator).filter(function(p) { return p.trim().length > 0; });

  var chunks = [];
  var currentChunk = '';
  var chunkStart = 0;
  var position = 0;

  for (var i = 0; i < paragraphs.length; i++) {
    var para = paragraphs[i].trim();

    // If a single paragraph exceeds chunk size, split it by sentences
    if (para.length > opts.chunkSize) {
      // Flush current chunk first
      if (currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          index: chunks.length,
          start: chunkStart,
          end: position
        });
        // Overlap: keep tail of current chunk
        var overlapText = currentChunk.slice(-opts.chunkOverlap);
        currentChunk = overlapText;
        chunkStart = position - overlapText.length;
      }

      // Split long paragraph by sentences
      var sentences = para.match(/[^.!?]+[.!?]+[\s]*/g) || [para];
      for (var j = 0; j < sentences.length; j++) {
        currentChunk += sentences[j];
        if (currentChunk.length >= opts.chunkSize) {
          chunks.push({
            text: currentChunk.trim(),
            index: chunks.length,
            start: chunkStart,
            end: position + currentChunk.length
          });
          var overlap = currentChunk.slice(-opts.chunkOverlap);
          chunkStart = position + currentChunk.length - overlap.length;
          currentChunk = overlap;
        }
      }
    } else {
      // Normal case: accumulate paragraphs
      if (currentChunk.length + para.length + 2 > opts.chunkSize && currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          index: chunks.length,
          start: chunkStart,
          end: position
        });
        var overlap = currentChunk.slice(-opts.chunkOverlap);
        chunkStart = position - overlap.length;
        currentChunk = overlap + '\n\n' + para;
      } else {
        if (currentChunk.length > 0) currentChunk += '\n\n';
        currentChunk += para;
      }
    }

    position += para.length + opts.separator.length;
  }

  // Flush remaining
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      index: chunks.length,
      start: chunkStart,
      end: position
    });
  }

  return chunks;
}

/* ============================================================
   Full Processing Pipeline
   ============================================================ */

/**
 * Process a document: extract text and split into chunks.
 * @param {string} filePath
 * @param {object} options - Chunking options
 * @returns {Promise<{text: string, chunks: Array}>}
 */
async function processDocument(filePath, options) {
  var text = await extractText(filePath);
  var chunks = chunkText(text, options);
  return { text: text, chunks: chunks };
}

module.exports = {
  extractText: extractText,
  chunkText: chunkText,
  processDocument: processDocument
};
