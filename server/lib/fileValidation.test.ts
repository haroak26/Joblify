import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFile } from './fileValidation';

type ZipEntry = {
  name: string;
  data: Buffer;
};

function createZip(entries: ZipEntry[]): Buffer {
  const localFileParts: Buffer[] = [];
  const centralDirectoryParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const fileName = Buffer.from(entry.name, 'utf8');
    const data = entry.data;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // local file header signature
    localHeader.writeUInt16LE(20, 4); // version needed to extract
    localHeader.writeUInt16LE(0, 6); // general purpose bit flag
    localHeader.writeUInt16LE(0, 8); // compression method (store)
    localHeader.writeUInt16LE(0, 10); // file mod time
    localHeader.writeUInt16LE(0, 12); // file mod date
    localHeader.writeUInt32LE(0, 14); // CRC32 (unused by validator)
    localHeader.writeUInt32LE(data.length, 18); // compressed size
    localHeader.writeUInt32LE(data.length, 22); // uncompressed size
    localHeader.writeUInt16LE(fileName.length, 26); // file name length
    localHeader.writeUInt16LE(0, 28); // extra field length

    localFileParts.push(localHeader, fileName, data);

    const centralDirectoryHeader = Buffer.alloc(46);
    centralDirectoryHeader.writeUInt32LE(0x02014b50, 0); // central directory signature
    centralDirectoryHeader.writeUInt16LE(20, 4); // version made by
    centralDirectoryHeader.writeUInt16LE(20, 6); // version needed
    centralDirectoryHeader.writeUInt16LE(0, 8); // flags
    centralDirectoryHeader.writeUInt16LE(0, 10); // compression
    centralDirectoryHeader.writeUInt16LE(0, 12); // mod time
    centralDirectoryHeader.writeUInt16LE(0, 14); // mod date
    centralDirectoryHeader.writeUInt32LE(0, 16); // CRC32
    centralDirectoryHeader.writeUInt32LE(data.length, 20); // compressed size
    centralDirectoryHeader.writeUInt32LE(data.length, 24); // uncompressed size
    centralDirectoryHeader.writeUInt16LE(fileName.length, 28); // file name length
    centralDirectoryHeader.writeUInt16LE(0, 30); // extra length
    centralDirectoryHeader.writeUInt16LE(0, 32); // comment length
    centralDirectoryHeader.writeUInt16LE(0, 34); // disk number
    centralDirectoryHeader.writeUInt16LE(0, 36); // internal attrs
    centralDirectoryHeader.writeUInt32LE(0, 38); // external attrs
    centralDirectoryHeader.writeUInt32LE(offset, 42); // relative offset of local header

    centralDirectoryParts.push(centralDirectoryHeader, fileName);

    offset += localHeader.length + fileName.length + data.length;
  }

  const localFilesBuffer = Buffer.concat(localFileParts);
  const centralDirectoryBuffer = Buffer.concat(centralDirectoryParts);

  const endOfCentralDirectory = Buffer.alloc(22);
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0); // EOCD signature
  endOfCentralDirectory.writeUInt16LE(0, 4); // number of this disk
  endOfCentralDirectory.writeUInt16LE(0, 6); // disk where central directory starts
  endOfCentralDirectory.writeUInt16LE(entries.length, 8); // number of central directory records on this disk
  endOfCentralDirectory.writeUInt16LE(entries.length, 10); // total number of central directory records
  endOfCentralDirectory.writeUInt32LE(centralDirectoryBuffer.length, 12); // size of central directory
  endOfCentralDirectory.writeUInt32LE(localFilesBuffer.length, 16); // offset of start of central directory
  endOfCentralDirectory.writeUInt16LE(0, 20); // ZIP comment length

  return Buffer.concat([localFilesBuffer, centralDirectoryBuffer, endOfCentralDirectory]);
}

test('accepts a structurally valid DOCX archive', () => {
  const docxBuffer = createZip([
    { name: '[Content_Types].xml', data: Buffer.from('<Types/>') },
    { name: '_rels/.rels', data: Buffer.from('<Relationships/>') },
    { name: 'word/document.xml', data: Buffer.from('<w:document/>') },
    { name: 'word/styles.xml', data: Buffer.from('<w:styles/>') },
  ]);

  const result = validateFile(
    docxBuffer,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  );

  assert.equal(result.valid, true);
  assert.equal(result.error, undefined);
});

test('rejects ZIP archives renamed as DOCX when DOCX structure is missing', () => {
  const renamedZip = createZip([
    { name: 'readme.txt', data: Buffer.from('not a docx') },
    { name: 'images/logo.png', data: Buffer.from([0xde, 0xad, 0xbe, 0xef]) },
  ]);

  const result = validateFile(
    renamedZip,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  );

  assert.equal(result.valid, false);
  assert.match(result.error ?? '', /missing required file\(s\)/i);
  assert.match(result.error ?? '', /word\/document\.xml/i);
});

test('rejects malformed DOCX archives with broken ZIP structure', () => {
  const malformedArchive = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00]);

  const result = validateFile(
    malformedArchive,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  );

  assert.equal(result.valid, false);
  assert.match(result.error ?? '', /invalid docx archive/i);
});
