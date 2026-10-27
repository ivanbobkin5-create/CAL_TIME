import JSZip from 'jszip';

export interface DecodedFileResult {
  text: string;
  encoding: string;
}

/**
 * Helper to decode Uint8Array safely with a given encoding
 */
function safeDecode(buffer: Uint8Array, encoding: string, fatal: boolean = false): string | null {
  try {
    const decoder = new TextDecoder(encoding, { fatal });
    return decoder.decode(buffer);
  } catch (e) {
    return null;
  }
}

/**
 * Parses dBase DBF file binary contents into tab-separated TSV text.
 */
export function parseDbfToText(uint8: Uint8Array): DecodedFileResult | null {
  if (uint8.length < 32) return null;
  const magic = uint8[0];
  // DBF signatures (0x02, 0x03, 0x04, 0x05, 0x30, 0x43, 0x7b, 0x83, 0x8b, 0xcb, 0xe5, 0xf5)
  if (![0x02, 0x03, 0x04, 0x05, 0x30, 0x43, 0x7b, 0x83, 0x8b, 0xcb, 0xe5, 0xf5].includes(magic)) {
    return null;
  }

  const numRecords = uint8[4] | (uint8[5] << 8) | (uint8[6] << 16) | (uint8[7] << 24);
  const headerSize = uint8[8] | (uint8[9] << 8);
  const recordSize = uint8[10] | (uint8[11] << 8);

  if (numRecords <= 0 || headerSize < 32 || headerSize >= uint8.length || recordSize <= 0) {
    return null;
  }

  // Parse field descriptors (32 bytes per field)
  const fields: { name: string; type: string; length: number; offset: number }[] = [];
  let fieldOffset = 1; // skip deletion flag byte in record
  for (let pos = 32; pos < headerSize - 1; pos += 32) {
    if (uint8[pos] === 0x0d) break; // End of header
    if (pos + 32 > uint8.length) break;

    let fName = '';
    for (let i = 0; i < 11; i++) {
      const charCode = uint8[pos + i];
      if (charCode === 0) break;
      fName += String.fromCharCode(charCode);
    }
    fName = fName.trim();
    const fType = String.fromCharCode(uint8[pos + 11]);
    const fLen = uint8[pos + 16];

    if (fName && fLen > 0) {
      fields.push({ name: fName, type: fType, length: fLen, offset: fieldOffset });
      fieldOffset += fLen;
    }
  }

  if (fields.length === 0) return null;

  let dbfEncoding = 'ibm866'; // default for Russian DOS DBF
  const languageDriver = uint8[29];
  if (languageDriver === 0x26 || languageDriver === 0xc8) dbfEncoding = 'windows-1251';

  const decodeBytes = (bytes: Uint8Array): string => {
    // Attempt CP866 / CP1251 decode
    const cp866Text = safeDecode(bytes, 'ibm866') || safeDecode(bytes, 'cp866');
    const cp1251Text = safeDecode(bytes, 'windows-1251');
    const utf8Text = safeDecode(bytes, 'utf-8', true);

    if (utf8Text !== null && /[а-яА-ЯЁё]/.test(utf8Text)) return utf8Text.trim();
    if (dbfEncoding === 'windows-1251' && cp1251Text) return cp1251Text.trim();
    if (cp866Text && /[а-яА-ЯЁё]/.test(cp866Text)) return cp866Text.trim();
    if (cp1251Text) return cp1251Text.trim();
    return (cp866Text || '').trim();
  };

  const rows: string[] = [];
  rows.push(fields.map(f => f.name).join('\t'));

  let offset = headerSize;
  for (let r = 0; r < Math.min(numRecords, 5000); r++) {
    if (offset + recordSize > uint8.length) break;
    const isDeleted = uint8[offset] === 0x2A; // '*'
    if (!isDeleted) {
      const recordCols: string[] = [];
      for (const field of fields) {
        const fieldBytes = uint8.subarray(offset + field.offset, offset + field.offset + field.length);
        recordCols.push(decodeBytes(fieldBytes));
      }
      rows.push(recordCols.join('\t'));
    }
    offset += recordSize;
  }

  return {
    text: rows.join('\n'),
    encoding: `Таблица DBF (${dbfEncoding})`
  };
}

/**
 * Attempts to unpack a ZIP archive and find specification files inside.
 */
export async function parseZipToText(uint8: Uint8Array): Promise<DecodedFileResult | null> {
  if (uint8.length < 4 || uint8[0] !== 0x50 || uint8[1] !== 0x4B || uint8[2] !== 0x03 || uint8[3] !== 0x04) {
    return null;
  }

  try {
    const zip = await JSZip.loadAsync(uint8);
    let bestText = '';
    let bestEncoding = '';

    for (const relativePath of Object.keys(zip.files)) {
      const entry = zip.files[relativePath];
      if (entry.dir) continue;

      const lowerName = relativePath.toLowerCase();
      if (
        lowerName.endsWith('.txt') ||
        lowerName.endsWith('.csv') ||
        lowerName.endsWith('.tsv') ||
        lowerName.endsWith('.bir') ||
        lowerName.endsWith('.brx') ||
        lowerName.endsWith('.xml') ||
        lowerName.endsWith('.dbf') ||
        lowerName.endsWith('.b3d')
      ) {
        const fileUint8 = await entry.async('uint8array');

        // Check if DBF inside zip
        const dbfRes = parseDbfToText(fileUint8);
        if (dbfRes) {
          return { text: dbfRes.text, encoding: `ZIP > ${relativePath} (${dbfRes.encoding})` };
        }

        const decoded = detectAndDecodeText(fileUint8);
        if (decoded.text.length > bestText.length) {
          bestText = decoded.text;
          bestEncoding = `ZIP > ${relativePath} (${decoded.encoding})`;
        }
      }
    }

    if (bestText) {
      return { text: bestText, encoding: bestEncoding };
    }
  } catch (e) {
    console.warn('ZIP extraction error:', e);
  }

  return null;
}

/**
 * Main Smart Encoding Detector
 * Detects UTF-8, Windows-1251, CP866, UTF-16LE, DBF, ZIP automatically.
 */
export function detectAndDecodeText(buffer: ArrayBuffer | Uint8Array): DecodedFileResult {
  const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (uint8.length === 0) return { text: '', encoding: 'empty' };

  // 1. Check BOMs
  if (uint8.length >= 3 && uint8[0] === 0xEF && uint8[1] === 0xBB && uint8[2] === 0xBF) {
    const text = safeDecode(uint8.subarray(3), 'utf-8');
    if (text !== null) return { text, encoding: 'UTF-8 (BOM)' };
  }
  if (uint8.length >= 2 && uint8[0] === 0xFF && uint8[1] === 0xFE) {
    const text = safeDecode(uint8.subarray(2), 'utf-16le');
    if (text !== null) return { text, encoding: 'UTF-16LE (BOM)' };
  }
  if (uint8.length >= 2 && uint8[0] === 0xFE && uint8[1] === 0xFF) {
    const text = safeDecode(uint8.subarray(2), 'utf-16be');
    if (text !== null) return { text, encoding: 'UTF-16BE (BOM)' };
  }

  // 2. Check DBF binary format directly
  const dbfRes = parseDbfToText(uint8);
  if (dbfRes) {
    return dbfRes;
  }

  // 3. Collect candidates
  const candidates: { encoding: string; text: string }[] = [];

  // A. Fatal UTF-8
  const utf8Fatal = safeDecode(uint8, 'utf-8', true);
  if (utf8Fatal !== null) {
    candidates.push({ encoding: 'UTF-8', text: utf8Fatal });
  }

  // B. Windows-1251 (CP1251)
  const cp1251 = safeDecode(uint8, 'windows-1251');
  if (cp1251 !== null) {
    candidates.push({ encoding: 'Windows-1251 (CP1251)', text: cp1251 });
  }

  // C. CP866 / IBM866 (DOS Russian)
  const cp866 = safeDecode(uint8, 'ibm866') || safeDecode(uint8, 'cp866');
  if (cp866 !== null) {
    candidates.push({ encoding: 'DOS (CP866)', text: cp866 });
  }

  // D. UTF-8 non-fatal (if fatal failed)
  if (utf8Fatal === null) {
    const utf8Lossy = safeDecode(uint8, 'utf-8', false);
    if (utf8Lossy !== null) {
      candidates.push({ encoding: 'UTF-8 (Lossy)', text: utf8Lossy });
    }
  }

  // E. UTF-16LE heuristic (if null bytes are frequent)
  let nullByteCount = 0;
  for (let i = 0; i < Math.min(uint8.length, 1000); i++) {
    if (uint8[i] === 0) nullByteCount++;
  }
  if (nullByteCount > 30) {
    const utf16le = safeDecode(uint8, 'utf-16le');
    if (utf16le !== null) {
      candidates.push({ encoding: 'UTF-16LE', text: utf16le });
    }
  }

  if (candidates.length === 0) {
    return { text: safeDecode(uint8, 'windows-1251') || '', encoding: 'Windows-1251 (Fallback)' };
  }

  // Keywords that often appear in Russian furniture / CAD specification reports
  const keywords = [
    'наименование', 'название', 'деталь', 'длина', 'ширина', 'толщина', 'высота',
    'материал', 'количество', 'кол-во', 'кромка', 'позиция', 'поз', 'заказ', 'проект',
    'габарит', 'размер', 'корпус', 'фасад', 'полка', 'боковина', 'стенка', 'задняя',
    'лдсп', 'мдф', 'хдф', 'пвх', 'egger', 'эмаль', 'присадка', 'паз', 'цвет', 'код', 'размер х'
  ];

  const scoreCandidate = (cand: { encoding: string; text: string }): number => {
    const str = cand.text;
    let score = 0;

    // 1. Russian Cyrillic characters count (а-я, А-Я, ё, Ё)
    const cyrillicMatch = str.match(/[а-яА-ЯЁё]/g);
    const cyrillicCount = cyrillicMatch ? cyrillicMatch.length : 0;
    score += cyrillicCount * 3;

    // 2. Keyword matches
    const lower = str.toLowerCase();
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        score += 60;
      }
    }

    // 3. Penalty for replacement character U+FFFD or пїЅ
    const replacementCount = (str.match(/\uFFFD|пїЅ/g) || []).length;
    score -= replacementCount * 25;

    // 4. Penalty for non-printable control characters
    const controlCharCount = (str.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length;
    score -= controlCharCount * 15;

    // 5. Penalty for UTF-8 misdecoded into Latin-1 accents (ÐÐµÑÐ°Ð»Ñ)
    const latinAccentsCount = (str.match(/[ÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßâãäåæçèéêëìíîïðñòóôõö]/g) || []).length;
    if (latinAccentsCount > 10 && cyrillicCount === 0) {
      score -= latinAccentsCount * 8;
    }

    // 6. Prefer UTF-8 if valid and has Cyrillic
    if (cand.encoding === 'UTF-8' && cyrillicCount > 0) {
      score += 40;
    }

    return score;
  };

  let bestCandidate = candidates[0];
  let maxScore = -Infinity;

  for (const cand of candidates) {
    const s = scoreCandidate(cand);
    if (s > maxScore) {
      maxScore = s;
      bestCandidate = cand;
    }
  }

  return { text: bestCandidate.text, encoding: bestCandidate.encoding };
}

/**
 * Async entry point that handles ZIP, DBF, and all text encodings automatically.
 */
export async function smartDecodeFile(file: File | ArrayBuffer | Uint8Array): Promise<DecodedFileResult> {
  let uint8: Uint8Array;

  if (file instanceof File) {
    const ab = await file.arrayBuffer();
    uint8 = new Uint8Array(ab);
  } else if (file instanceof ArrayBuffer) {
    uint8 = new Uint8Array(file);
  } else {
    uint8 = file;
  }

  // 1. Try ZIP first
  const zipResult = await parseZipToText(uint8);
  if (zipResult) {
    return zipResult;
  }

  // 2. Try DBF or Text Auto-Detection
  return detectAndDecodeText(uint8);
}
