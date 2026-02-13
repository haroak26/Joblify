/**
 * File validation utilities for secure file upload handling
 * Validates files by checking magic bytes (file signatures) to prevent
 * malicious files from being accepted based on MIME type spoofing
 */

// File size limits
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

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
