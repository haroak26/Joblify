/**
 * File validation utilities for secure file upload handling
 * Validates files by checking magic bytes (file signatures) to prevent
 * malicious files from being accepted based on MIME type spoofing
 */

// File size limits
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_DOCX_ENTRY_COUNT = 1000;
const MAX_DOCX_TOTAL_UNCOMPRESSED_BYTES = 30 * 1024 * 1024; // 30MB
const MAX_DOCX_SINGLE_ENTRY_UNCOMPRESSED_BYTES = 10 * 1024 * 1024; // 10MB

const DOCX_REQUIRED_ENTRIES = [
  '[Content_Types].xml',
  '_rels/.rels',
  'word/document.xml',
];

/**
 * File magic bytes (file signatures) for supported file types
 */
const FILE_SIGNATURES = {
  pdf: [
    Buffer.from([0x25, 0x50, 0x44, 0x46]), // %PDF
  ],
  docx: [
    Buffer.from([0x50, 0x4B, 0x03, 0x04]), // PK.. (ZIP archive, used by DOCX)
    Buffer.from([0x50, 0x4B, 0x05, 0x06]), // PK.. (empty ZIP archive)
    Buffer.from([0x50, 0x4B, 0x07, 0x08]), // PK.. (spanned ZIP archive)
  ],
};

/**
 * Check if buffer starts with any of the given signatures
 */
function matchesSignature(buffer: Buffer, signatures: Buffer[]): boolean {
  return signatures.some(signature => 
    buffer.subarray(0, signature.length).equals(signature)
  );
}

/**
 * Validate PDF file by magic bytes
 */
export function isPDF(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  return matchesSignature(buffer, FILE_SIGNATURES.pdf);
}

/**
 * Validate DOCX file by magic bytes (ZIP signature)
 * Note: DOCX files are ZIP archives, so we validate the ZIP signature
 * Additional validation could check for specific DOCX internal structure
 */
export function isDOCX(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  return matchesSignature(buffer, FILE_SIGNATURES.docx);
}

type ZipValidationResult = {
  valid: boolean;
  error?: string;
  entries?: Set<string>;
};

/**
 * Validate ZIP archive structure and enforce archive guardrails.
 */
function validateZipStructure(buffer: Buffer): ZipValidationResult {
  if (buffer.length < 22) {
    return { valid: false, error: 'Invalid DOCX archive: file is too small' };
  }

  // Find End of Central Directory (EOCD) record. ZIP comment max is 65535 bytes.
  const maxEocdSearchBack = Math.min(buffer.length, 22 + 0xffff);
  let eocdOffset = -1;

  for (let offset = buffer.length - 22; offset >= buffer.length - maxEocdSearchBack; offset--) {
    if (offset < 0 || offset + 4 > buffer.length) {
      continue;
    }

    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }

  if (eocdOffset === -1) {
    return { valid: false, error: 'Invalid DOCX archive: missing ZIP end-of-directory record' };
  }

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);

  if (entryCount === 0) {
    return { valid: false, error: 'Invalid DOCX archive: no files found in ZIP' };
  }

  if (entryCount > MAX_DOCX_ENTRY_COUNT) {
    return {
      valid: false,
      error: `DOCX archive has too many entries (${entryCount}). Maximum allowed is ${MAX_DOCX_ENTRY_COUNT}`,
    };
  }

  if (centralDirectoryOffset + centralDirectorySize > buffer.length) {
    return { valid: false, error: 'Invalid DOCX archive: malformed central directory' };
  }

  const entries = new Set<string>();
  let offset = centralDirectoryOffset;
  const endOffset = centralDirectoryOffset + centralDirectorySize;
  let totalUncompressedSize = 0;

  while (offset < endOffset) {
    if (offset + 46 > buffer.length) {
      return { valid: false, error: 'Invalid DOCX archive: truncated central directory entry' };
    }

    const signature = buffer.readUInt32LE(offset);
    if (signature !== 0x02014b50) {
      return { valid: false, error: 'Invalid DOCX archive: unexpected central directory signature' };
    }

    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraFieldLength = buffer.readUInt16LE(offset + 30);
    const fileCommentLength = buffer.readUInt16LE(offset + 32);

    const fileNameStart = offset + 46;
    const fileNameEnd = fileNameStart + fileNameLength;
    const nextEntryOffset = fileNameEnd + extraFieldLength + fileCommentLength;

    if (nextEntryOffset > buffer.length || nextEntryOffset > endOffset + 1024) {
      return { valid: false, error: 'Invalid DOCX archive: corrupt central directory metadata' };
    }

    const fileName = buffer.toString('utf8', fileNameStart, fileNameEnd).replace(/\\/g, '/');
    if (fileName) {
      entries.add(fileName);
    }

    if (uncompressedSize > MAX_DOCX_SINGLE_ENTRY_UNCOMPRESSED_BYTES) {
      return {
        valid: false,
        error: `DOCX archive entry '${fileName || '(unknown)'}' is too large. Maximum uncompressed entry size is ${MAX_DOCX_SINGLE_ENTRY_UNCOMPRESSED_BYTES / (1024 * 1024)}MB`,
      };
    }

    // Additional compressed-size guardrail catches suspicious entries with very large payload claims.
    if (compressedSize > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `DOCX archive entry '${fileName || '(unknown)'}' has suspicious compressed size`,
      };
    }

    totalUncompressedSize += uncompressedSize;
    if (totalUncompressedSize > MAX_DOCX_TOTAL_UNCOMPRESSED_BYTES) {
      return {
        valid: false,
        error: `DOCX archive expands to ${Math.ceil(totalUncompressedSize / (1024 * 1024))}MB, exceeding ${MAX_DOCX_TOTAL_UNCOMPRESSED_BYTES / (1024 * 1024)}MB limit`,
      };
    }

    offset = nextEntryOffset;
  }

  return { valid: true, entries };
}

function validateDOCXStructure(buffer: Buffer): { valid: boolean; error?: string } {
  const zipValidation = validateZipStructure(buffer);
  if (!zipValidation.valid) {
    return { valid: false, error: zipValidation.error };
  }

  const entries = zipValidation.entries ?? new Set<string>();
  const missingEntries = DOCX_REQUIRED_ENTRIES.filter(entry => !entries.has(entry));

  if (missingEntries.length > 0) {
    return {
      valid: false,
      error: `Invalid DOCX structure: missing required file(s): ${missingEntries.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validate file based on expected MIME type and magic bytes
 */
export function validateFile(
  buffer: Buffer,
  expectedMimeType: string
): { valid: boolean; error?: string } {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'Empty file' };
  }

  // Check file size
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'File too large (max 10MB)' };
  }

  // Validate based on MIME type
  switch (expectedMimeType) {
    case 'application/pdf':
      if (!isPDF(buffer)) {
        return { valid: false, error: 'Invalid PDF file format' };
      }
      break;
    
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      if (!isDOCX(buffer)) {
        return { valid: false, error: 'Invalid DOCX file format' };
      }
      {
        const docxValidation = validateDOCXStructure(buffer);
        if (!docxValidation.valid) {
          return { valid: false, error: docxValidation.error || 'Invalid DOCX file format' };
        }
      }
      break;
    
    default:
      return { valid: false, error: 'Unsupported file type' };
  }

  return { valid: true };
}

/**
 * Get human-readable file type name
 */
export function getFileTypeName(mimeType: string): string {
  switch (mimeType) {
    case 'application/pdf':
      return 'PDF';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'DOCX';
    default:
      return 'Unknown';
  }
}
