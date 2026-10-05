import JSZip from 'jszip';
import * as pako from 'pako';
import * as XLSX from 'xlsx';
import { smartDecodeFile } from '../../../utils/fileEncodingDetector';

// Interface for a single Birka / Label item
export interface BirkaDetail {
  id: string;
  labelNumber: string;         // № детали / Позиция (без знака #)
  orderNumber?: string;        // Номер заказа
  name: string;                // Название детали (Боковина, Полка, Фасад)
  length: number;              // Длина (мм)
  width: number;               // Ширина (мм)
  thickness: number;           // Толщина (мм)
  material: string;            // Материал (ЛДСП 16мм, МДФ 18мм и т.д.)
  quantity: number;            // Количество (шт)
  
  // Edges by sides
  edgeL1?: string;             // Кромка Длина 1 (например, "ПВХ 2.0x19")
  edgeL2?: string;             // Кромка Длина 2
  edgeW1?: string;             // Кромка Ширина 1
  edgeW2?: string;             // Кромка Ширина 2
  
  texture?: string;            // Текстура (Вдоль / Поперек / Нет)
  notes?: string;              // Примечание (Присадка, Паз, ЧПУ)
  barcode?: string;            // Штрихкод
  holesEnd?: number;           // Количество отверстий в торец
  holesFace?: number;          // Количество отверстий в пласть
  holesCount?: number;         // Общее количество отверстий
}

export interface BirkaMaterialGroup {
  materialName: string;
  details: BirkaDetail[];
  totalQuantity: number;
  totalAreaM2: number;
  estimatedSheets?: number;    // Расчет количества листов (стандарт 2800x2070 / 2440x1830 с учетом коэффициента раскроя 0.82)
  edgesSummary: Record<string, number>; // Name of edge -> meters required
}

export interface BirkaParseResult {
  fileName: string;
  fileSize: number;
  fileHash: string;
  lastModified: string;
  encodingUsed: string;
  formatDetected: string;
  
  details: BirkaDetail[];
  materialGroups: BirkaMaterialGroup[];
  allEdges: { name: string; totalMeters: number; count: number }[];
  totalAreaM2: number;
  totalEdgeMeters: number;
  totalPartsCount: number;
  
  rawTextPreview: string;
  isDemoFile?: boolean;
}

// Compute simple fast hash for file identification
export const computeSimpleHash = (uint8: Uint8Array): string => {
  let h = 0x811c9dc5;
  const len = Math.min(uint8.length, 10000);
  for (let i = 0; i < len; i++) {
    h ^= uint8[i];
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
};

// Default recognized aliases for each Birka parameter
export const DEFAULT_BIRKA_COLUMN_MAPPING: Record<string, string[]> = {
  pos: [
    'позиция', 'поз.', 'поз', 'позиц',
    'номер детали', '№ детали', 'код детали', 'деталь №', 'деталь номер',
    'обозначение', 'номер дет', '№ дет', 'код дет',
    '№ бирк', 'бирка', 'бирк',
    'part_no', 'part no', 'partno', 'item_no', 'item no', 'label',
    'индекс', 'код', 'номер', 'pos', 'id'
  ],
  name: ['наименов', 'название', 'наим', 'деталь', 'part', 'name', 'элемент', 'изделие'],
  orderNumber: ['зак', 'order', 'проект', 'сделка', 'номер заказа', 'заказ №', 'заказ', 'договор', 'номер проекта', 'код заказа', 'order_no', 'order_id', '№ заказа', 'заказ:', 'номер_заказа', '№зак', 'код_заказа'],
  length: ['длин', 'длина', 'length', 'l', 'размер х', 'размер x', 'габарит х', 'габарит x', 'x', 'l, мм', 'длина, мм'],
  width: ['шир', 'ширина', 'width', 'w', 'размер y', 'габарит y', 'y', 'w, мм', 'ширина, мм'],
  thickness: ['толщ', 'толщина', 'thick', 't', 'z', 'глубин', 'h', 'толщина, мм'],
  material: ['матер', 'материал', 'mat', 'плита', 'лдсп', 'мдф', 'хдф'],
  quantity: ['кол', 'количество', 'qty', 'count', 'шт', 'кол-во', 'к-во'],
  edgeL1: ['кромка л1', 'кромка1', 'длина 1', 'l1', 'кромка д1', 'край 1', 'edge1', 'кромка l1'],
  edgeL2: ['кромка л2', 'кромка2', 'длина 2', 'l2', 'кромка д2', 'край 2', 'edge2', 'кромка l2'],
  edgeW1: ['кромка ш1', 'кромка3', 'ширина 1', 'w1', 'кромка w1', 'край 3', 'edge3'],
  edgeW2: ['кромка ш2', 'кромка4', 'ширина 2', 'w2', 'кромка w2', 'край 4', 'edge4'],
  notes: ['примеч', 'паз', 'присад', 'note', 'коммент', 'инфо', 'обработка', 'чпу'],
  barcode: ['штрих', 'barcode', 'qr', 'штрихкод', 'qr-код', 'qrcode', 'шк', 'qr_code', 'код qr', 'qr код', 'код детали qr', 'штрих-код']
};

/**
 * Normalizes and cleans a part position/label number:
 * - Strips leading words and hashes: "Поз.", "Деталь №", "#", "№"
 * - Normalizes commas between digits to dots: "01,02" -> "01.02"
 * - Normalizes Excel-truncated decimals like "1.02" or "9.03" to "01.02" or "09.03"
 * - Strips sticker duplicate copy markers like " #1", " (1)", " [1]", " коп.1"
 * - Preserves intact hyphenated / underscored codes like "01-02", "09_03"
 */
export function cleanPartLabelNumber(raw: string): string {
  if (!raw) return '';
  let str = String(raw).trim();
  // Remove non-printable control chars & hidden UTF chars & scanner AIM code
  str = str.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\uFEFF]/g, '')
           .replace(/^\][a-zA-Z0-9]{2,3}/, '')
           .trim();
  
  // Strip leading words and hashes
  str = str.replace(/^[#№\s]+/, '');
  str = str.replace(/^(поз\.?|дет\.?|позиция|деталь|номер|item|pos|part)\s*[:#№\-_\s]*/i, '');
  
  // Normalize decimal comma to dot between digits: "01,02" -> "01.02"
  str = str.replace(/(\d+)[,;](\d+)/g, '$1.$2');

  // Strip sticker repetition/copy markers ONLY: e.g. " #1", " №1", " (1)", " [1]", " коп.1"
  str = str.replace(/(\s+[#№]\s*\d+|\s*\(\d+\)|\s*\[\d+\]|\s+коп\.?\s*\d+)$/i, '');

  // If Excel dropped leading zero from "01.02" or "09.03" making it "1.02" or "9.03":
  if (/^\d\.\d{2}$/.test(str)) {
    str = '0' + str;
  }

  return str.trim();
}

/**
 * Intelligently finds the best column index for a given field based on:
 * 1. User's custom mapping keywords (highest priority)
 * 2. Default recognized aliases
 * 3. Exact matching first, then word/prefix matching, then substring matching
 * 4. Exclusions (e.g. sequence number columns "№ п/п" are strictly excluded from "pos")
 */
export function findFieldColumnIndex(
  field: string,
  headers: string[],
  userKeywords?: string[],
  defaultKeywords: string[] = [],
  excludeKeywords: string[] = [],
  rowsData?: string[][]
): number {
  const normHeaders = headers.map(h => (h || '').trim().toLowerCase().replace(/^["']|["']$/g, ''));
  
  // Combine user keywords (first priority) with default keywords (fallback)
  const userList = (userKeywords || []).map(k => k.trim().toLowerCase()).filter(Boolean);
  const defaultList = (defaultKeywords || []).map(k => k.trim().toLowerCase()).filter(Boolean);
  const allKeywords = Array.from(new Set([...userList, ...defaultList]));
  const excludes = excludeKeywords.map(k => k.trim().toLowerCase()).filter(Boolean);

  const isExcluded = (header: string): boolean => {
    return excludes.some(ek => header.includes(ek));
  };

  // Phase 1: Exact matches against user-specified keywords first, then defaults
  for (const kw of allKeywords) {
    for (let c = 0; c < normHeaders.length; c++) {
      const h = normHeaders[c];
      if (h === kw && !isExcluded(h)) {
        return c;
      }
    }
  }

  // Phase 2: Whole word / prefix match (keyword at start or separated by spaces/punct)
  for (const kw of allKeywords) {
    for (let c = 0; c < normHeaders.length; c++) {
      const h = normHeaders[c];
      if (isExcluded(h)) continue;
      const regex = new RegExp(`(^|[\\s_\\-.,/:])${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[\\s_\\-.,/:])`, 'i');
      if (regex.test(h)) {
        return c;
      }
    }
  }

  // Phase 3: Substring match (for longer/more specific keywords, min length 3)
  for (const kw of allKeywords) {
    if (kw.length < 3) continue;
    for (let c = 0; c < normHeaders.length; c++) {
      const h = normHeaders[c];
      if (isExcluded(h)) continue;
      if (h.includes(kw)) {
        return c;
      }
    }
  }

  // Phase 4: Fallback to short keywords substring if nothing else matched
  for (const kw of allKeywords) {
    for (let c = 0; c < normHeaders.length; c++) {
      const h = normHeaders[c];
      if (isExcluded(h)) continue;
      if (h.includes(kw)) {
        return c;
      }
    }
  }

  return -1;
}

/**
 * Verifies or detects the part number / position column from data rows.
 * If candidate column contains row sequential numbers (1, 2, 3...) or is -1,
 * inspects all columns in the data rows to find the one containing genuine
 * part numbers formatted like "01.02", "09.03", "20.02", "01-02", etc.
 */
function detectPartNumberColumn(
  headers: string[],
  rowsData: string[][],
  headerRowIndex: number,
  candidatePosIdx: number,
  orderIdx: number
): number {
  if (!rowsData || rowsData.length <= headerRowIndex + 1) {
    return candidatePosIdx;
  }

  const sampleRows = rowsData.slice(headerRowIndex + 1, Math.min(rowsData.length, headerRowIndex + 25));
  if (sampleRows.length === 0) return candidatePosIdx;

  const numCols = Math.max(...sampleRows.map(r => r.length), headers.length);

  // Helper to check if a string looks like a part number (e.g. "01.02", "09.03", "20.02", "01-02")
  const isFormattedPartNumber = (val: string): boolean => {
    const clean = cleanPartLabelNumber(val);
    if (!clean) return false;
    // Format 01.02, 09.03, 20.02, 01-02, 01.01.01
    return /^\d{1,3}[\.\-_/]\d{1,3}(\.[\d]{1,3})?$/.test(clean) ||
           /^[A-Za-zА-Яа-я0-9]+[\.\-_/][A-Za-zА-Яа-я0-9]+$/.test(clean);
  };

  // Helper to check if a column looks strictly like a 1, 2, 3... row sequence counter
  const isSequenceCounterColumn = (colIdx: number): boolean => {
    let matchCount = 0;
    for (let i = 0; i < sampleRows.length; i++) {
      const val = sampleRows[i][colIdx]?.trim();
      if (!val) continue;
      const num = parseInt(val, 10);
      if (num === (i + 1) && !isFormattedPartNumber(val)) {
        matchCount++;
      }
    }
    return matchCount >= Math.min(3, sampleRows.length - 1);
  };

  // Check if current candidate column is actually a sequence counter (1, 2, 3...)
  const candidateIsSeq = candidatePosIdx !== -1 && isSequenceCounterColumn(candidatePosIdx);

  // Look for any column that contains formatted part numbers (e.g. "01.02", "09.03")
  let bestPartNumCol = -1;
  let maxPartNumCount = 0;

  for (let c = 0; c < numCols; c++) {
    if (c === orderIdx) continue;
    const header = (headers[c] || '').toLowerCase();
    if (header.includes('зак') || header.includes('order') || header.includes('проект')) continue;
    if (header.includes('длин') || header.includes('шир') || header.includes('толщ') || header.includes('матер')) continue;

    let partNumCount = 0;
    for (const row of sampleRows) {
      const val = row[c]?.trim();
      if (val && isFormattedPartNumber(val)) {
        partNumCount++;
      }
    }

    if (partNumCount > maxPartNumCount) {
      maxPartNumCount = partNumCount;
      bestPartNumCol = c;
    }
  }

  // If candidate was -1 or was a sequence counter, and we found a column with 01.02 / 09.03 part numbers:
  if ((candidatePosIdx === -1 || candidateIsSeq) && bestPartNumCol !== -1 && maxPartNumCount >= 1) {
    return bestPartNumCol;
  }

  // If candidate already has formatted part numbers or is valid, keep candidate
  if (candidatePosIdx !== -1 && !candidateIsSeq) {
    return candidatePosIdx;
  }

  return candidatePosIdx !== -1 ? candidatePosIdx : (bestPartNumCol !== -1 ? bestPartNumCol : -1);
}

/**
 * Splits delimited text (CSV, TSV, semicolon-separated) into 2D string rows,
 * with quote handling and smart delimiter auto-detection.
 */
export function parseDelimitedTextToRows(text: string): { rows: string[][]; delimiter: string } {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { rows: [], delimiter: ',' };

  // Detect delimiter by checking the first 20 lines
  const sampleLines = lines.slice(0, 20);
  let tabCount = 0;
  let semiCount = 0;
  let commaCount = 0;

  for (const line of sampleLines) {
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"' || c === "'") inQuotes = !inQuotes;
      else if (!inQuotes) {
        if (c === '\t') tabCount++;
        else if (c === ';') semiCount++;
        else if (c === ',') commaCount++;
      }
    }
  }

  let delimiter = ',';
  if (tabCount > 0 && tabCount >= semiCount && tabCount >= commaCount) {
    delimiter = '\t';
  } else if (semiCount > 0 && semiCount >= commaCount) {
    delimiter = ';';
  }

  const rows: string[][] = [];

  for (const line of lines) {
    const cols: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        if (inQuotes && line[i + 1] === char) {
          current += char;
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        cols.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    cols.push(current.trim().replace(/^["']|["']$/g, ''));
    rows.push(cols);
  }

  return { rows, delimiter };
}

/**
 * Direct 2D rows parser for Birka tables (from Excel sheets, CSV, TSV).
 */
export function parseBirkaRows(
  rows: string[][], 
  customMapping?: Record<string, string[]>
): BirkaDetail[] {
  if (!rows || rows.length === 0) return [];
  const mapping = { ...DEFAULT_BIRKA_COLUMN_MAPPING, ...(customMapping || {}) };

  // Find header line index (within first 15 rows)
  let headerRowIndex = -1;
  const commonHeaderKeywords = [
    'наим', 'детал', 'длин', 'шир', 'толщ', 'матер', 'поз', 'позиц', 
    'размер', 'габарит', 'кромк', 'кол-во', 'кол', 'qty', 'part', 'length', 'width'
  ];

  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const row = rows[r];
    if (!row || row.length < 2) continue;
    
    // Count how many cells in this row look like header titles
    const matchCount = row.filter(cell => {
      const lower = cell.toLowerCase().trim();
      if (!lower) return false;
      return commonHeaderKeywords.some(kw => lower.includes(kw)) ||
        Object.values(mapping).some(aliases => aliases.some(a => lower === a.toLowerCase() || lower.includes(a.toLowerCase())));
    }).length;

    if (matchCount >= 2) {
      headerRowIndex = r;
      break;
    }
  }

  // If no clear 2-match header row found, test row 0
  if (headerRowIndex === -1 && rows.length > 1) {
    const row0 = rows[0];
    const match0 = row0.some(c => commonHeaderKeywords.some(kw => c.toLowerCase().includes(kw)));
    if (match0) {
      headerRowIndex = 0;
    }
  }

  if (headerRowIndex === -1) {
    return [];
  }

  const rawHeaders = rows[headerRowIndex];
  const headers = rawHeaders.map(h => (h || '').trim());

  // Exclusion lists - strictly exclude row counters from position
  const EXCLUDE_FOR_POS = [
    'п/п', 'пп', 'по порядку', 'порядк', 'строк', 'строка', 'row', 'line', 
    'зак', 'order', 'проект', 'договор', 'сделк', 'издел', 'наим', 'назв', 
    'имя', 'длин', 'шир', 'толщ', 'кол', 'кромк', 'матер', 'плит'
  ];

  // Column index finders
  const orderIdx = findFieldColumnIndex(
    'orderNumber', 
    headers, 
    mapping.orderNumber, 
    DEFAULT_BIRKA_COLUMN_MAPPING.orderNumber,
    ['дет', 'поз', 'наим', 'длин', 'шир', 'толщ']
  );

  let initialPosIdx = findFieldColumnIndex(
    'pos', 
    headers, 
    mapping.pos, 
    DEFAULT_BIRKA_COLUMN_MAPPING.pos, 
    EXCLUDE_FOR_POS,
    rows
  );

  // Prevent overlap with order column
  if (initialPosIdx !== -1 && initialPosIdx === orderIdx) {
    initialPosIdx = -1;
  }

  // Smart position column detection (verify row values for 01.02 / 09.03 vs sequence counter)
  const posIdx = detectPartNumberColumn(headers, rows, headerRowIndex, initialPosIdx, orderIdx);

  const nameIdx = findFieldColumnIndex(
    'name', 
    headers, 
    mapping.name, 
    DEFAULT_BIRKA_COLUMN_MAPPING.name,
    ['№', 'номер', 'поз', 'код', 'id', 'матер', 'кромк']
  );

  const lenIdx = findFieldColumnIndex('length', headers, mapping.length, DEFAULT_BIRKA_COLUMN_MAPPING.length, ['шир', 'толщ']);
  const widIdx = findFieldColumnIndex('width', headers, mapping.width, DEFAULT_BIRKA_COLUMN_MAPPING.width, ['длин', 'толщ']);
  const thkIdx = findFieldColumnIndex('thickness', headers, mapping.thickness, DEFAULT_BIRKA_COLUMN_MAPPING.thickness, ['длин', 'шир']);
  const matIdx = findFieldColumnIndex('material', headers, mapping.material, DEFAULT_BIRKA_COLUMN_MAPPING.material, ['кромк']);
  const qtyIdx = findFieldColumnIndex('quantity', headers, mapping.quantity, DEFAULT_BIRKA_COLUMN_MAPPING.quantity, ['зак', 'order', 'проект', 'номер', 'поз']);

  // Edges
  const edgeL1Idx = findFieldColumnIndex('edgeL1', headers, mapping.edgeL1, DEFAULT_BIRKA_COLUMN_MAPPING.edgeL1);
  const edgeL2Idx = findFieldColumnIndex('edgeL2', headers, mapping.edgeL2, DEFAULT_BIRKA_COLUMN_MAPPING.edgeL2);
  const edgeW1Idx = findFieldColumnIndex('edgeW1', headers, mapping.edgeW1, DEFAULT_BIRKA_COLUMN_MAPPING.edgeW1);
  const edgeW2Idx = findFieldColumnIndex('edgeW2', headers, mapping.edgeW2, DEFAULT_BIRKA_COLUMN_MAPPING.edgeW2);
  const generalEdgeIdx = findFieldColumnIndex('generalEdge', headers, ['кромк', 'облиц', 'edge'], [], ['л1', 'л2', 'ш1', 'ш2', 'l1', 'l2', 'w1', 'w2']);

  const noteIdx = findFieldColumnIndex('notes', headers, mapping.notes, DEFAULT_BIRKA_COLUMN_MAPPING.notes);
  const barcodeIdx = findFieldColumnIndex('barcode', headers, mapping.barcode, DEFAULT_BIRKA_COLUMN_MAPPING.barcode);

  // Holes indices
  const holesEndIdx = findFieldColumnIndex('holesEnd', headers, ['отв_тор', 'отв. торец', 'отверстий в торец', 'торец отв', 'торец_отв', 'holes_end', 'end_holes', 'торец']);
  const holesFaceIdx = findFieldColumnIndex('holesFace', headers, ['отв_пласт', 'отв. пласть', 'отверстий в пласть', 'пласть отв', 'пласть_отв', 'holes_face', 'face_holes', 'пласть']);
  const holesCountIdx = findFieldColumnIndex('holesCount', headers, ['всего отв', 'кол-во отв', 'отверстий', 'сверлен', 'присадк', 'holes', 'drills', 'кол отв']);

  const details: BirkaDetail[] = [];

  const parseDim = (val: string | undefined): number => {
    if (!val) return 0;
    const cleaned = String(val).replace(/\s+/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const cols = rows[i];
    if (!cols || cols.length < 2) continue;

    // Check if entire row is empty
    if (cols.every(c => !c || String(c).trim() === '')) continue;

    const rowNum = i - headerRowIndex;
    const name = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx].trim() : `Деталь ${rowNum}`;
    const length = lenIdx !== -1 ? parseDim(cols[lenIdx]) : 0;
    const width = widIdx !== -1 ? parseDim(cols[widIdx]) : 0;
    const thickness = thkIdx !== -1 ? parseDim(cols[thkIdx]) : 16;
    const material = matIdx !== -1 && cols[matIdx] ? cols[matIdx].trim() : 'ЛДСП 16 мм';
    const quantity = qtyIdx !== -1 && cols[qtyIdx] ? parseInt(String(cols[qtyIdx]).replace(/\D+/g, ''), 10) || 1 : 1;

    const rawPos = (posIdx !== -1 && cols[posIdx] !== undefined && String(cols[posIdx]).trim() !== '')
      ? String(cols[posIdx]).trim()
      : String(rowNum);

    const labelNumber = cleanPartLabelNumber(rawPos) || String(rowNum);

    const edgeL1 = edgeL1Idx !== -1 ? cols[edgeL1Idx] : (generalEdgeIdx !== -1 ? cols[generalEdgeIdx] : undefined);
    const edgeL2 = edgeL2Idx !== -1 ? cols[edgeL2Idx] : undefined;
    const edgeW1 = edgeW1Idx !== -1 ? cols[edgeW1Idx] : undefined;
    const edgeW2 = edgeW2Idx !== -1 ? cols[edgeW2Idx] : undefined;

    const notes = noteIdx !== -1 ? cols[noteIdx] : undefined;
    const orderNumber = orderIdx !== -1 ? cols[orderIdx] : undefined;
    const barcode = barcodeIdx !== -1 ? cols[barcodeIdx] : undefined;

    const holesEnd = holesEndIdx !== -1 && cols[holesEndIdx] ? parseInt(String(cols[holesEndIdx]), 10) : undefined;
    const holesFace = holesFaceIdx !== -1 && cols[holesFaceIdx] ? parseInt(String(cols[holesFaceIdx]), 10) : undefined;
    const holesCount = holesCountIdx !== -1 && cols[holesCountIdx] ? parseInt(String(cols[holesCountIdx]), 10) : undefined;

    if (name || length > 0 || width > 0) {
      details.push({
        id: `det_${i}_${Math.random().toString(36).substring(2, 7)}`,
        labelNumber,
        orderNumber,
        name,
        length: length || 700,
        width: width || 500,
        thickness: thickness || 16,
        material: material || 'ЛДСП 16 мм',
        quantity: quantity || 1,
        edgeL1: edgeL1 && edgeL1 !== '-' && edgeL1 !== '—' && edgeL1 !== '0' ? edgeL1.trim() : undefined,
        edgeL2: edgeL2 && edgeL2 !== '-' && edgeL2 !== '—' && edgeL2 !== '0' ? edgeL2.trim() : undefined,
        edgeW1: edgeW1 && edgeW1 !== '-' && edgeW1 !== '—' && edgeW1 !== '0' ? edgeW1.trim() : undefined,
        edgeW2: edgeW2 && edgeW2 !== '-' && edgeW2 !== '—' && edgeW2 !== '0' ? edgeW2.trim() : undefined,
        notes: notes ? notes.trim() : undefined,
        barcode: barcode ? barcode.trim() : undefined,
        holesEnd: !isNaN(holesEnd as number) ? holesEnd : undefined,
        holesFace: !isNaN(holesFace as number) ? holesFace : undefined,
        holesCount: !isNaN(holesCount as number) ? holesCount : undefined,
      });
    }
  }

  return consolidateDetails(details);
}

// Parse text content from .bir / .brx / .txt / .csv / .tsv file
export function parseBirFileText(text: string, customMapping?: Record<string, string[]>): BirkaDetail[] {
  if (!text || !text.trim()) return [];

  // Strategy 1: Table parsing with auto-delimiter and column mapping
  const { rows } = parseDelimitedTextToRows(text);
  const tableDetails = parseBirkaRows(rows, customMapping);
  if (tableDetails.length > 0) {
    return tableDetails;
  }

  // Strategy 2: INI-style or Key-Value records `[Birka]` or `[Item]`
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let currentItem: Partial<BirkaDetail> | null = null;
  let itemIdx = 1;
  const iniDetails: BirkaDetail[] = [];

  for (const line of lines) {
    if (line.startsWith('[') && line.endsWith(']')) {
      if (currentItem && (currentItem.name || currentItem.length)) {
        iniDetails.push({
          id: `det_ini_${itemIdx}_${Math.random().toString(36).substring(2, 7)}`,
          labelNumber: cleanPartLabelNumber(currentItem.labelNumber || String(itemIdx)) || String(itemIdx),
          name: currentItem.name || `Деталь ${itemIdx}`,
          length: currentItem.length || 700,
          width: currentItem.width || 500,
          thickness: currentItem.thickness || 16,
          material: currentItem.material || 'ЛДСП 16 мм',
          quantity: currentItem.quantity || 1,
          edgeL1: currentItem.edgeL1,
          edgeL2: currentItem.edgeL2,
          edgeW1: currentItem.edgeW1,
          edgeW2: currentItem.edgeW2,
          notes: currentItem.notes,
          orderNumber: currentItem.orderNumber
        });
        itemIdx++;
      }
      currentItem = {};
      continue;
    }

    if (line.includes('=')) {
      if (!currentItem) currentItem = {};
      const [kRaw, ...vParts] = line.split('=');
      const k = kRaw.trim().toLowerCase();
      const v = vParts.join('=').trim();

      if (k.includes('наим') || k === 'name' || k === 'detal') currentItem.name = v;
      if (k.includes('длин') || k === 'length' || k === 'l' || k === 'sizex') currentItem.length = parseFloat(v.replace(',', '.'));
      if (k.includes('шир') || k === 'width' || k === 'w' || k === 'sizey') currentItem.width = parseFloat(v.replace(',', '.'));
      if (k.includes('толщ') || k === 'thick' || k === 't' || k === 'sizez') currentItem.thickness = parseFloat(v.replace(',', '.'));
      if (k.includes('матер') || k === 'material' || k === 'mat') currentItem.material = v;
      if (k.includes('кол') || k === 'qty' || k === 'count') currentItem.quantity = parseInt(v, 10);
      if ((k.includes('поз') || k.includes('дет') || k === 'pos' || k === 'num' || k === 'id') && !k.includes('зак') && !k.includes('order')) {
        currentItem.labelNumber = cleanPartLabelNumber(v);
      }
      if (k.includes('зак') || k === 'order') currentItem.orderNumber = v;
      if (k.includes('кромка1') || k === 'edgel1' || k === 'l1') currentItem.edgeL1 = v;
      if (k.includes('кромка2') || k === 'edgel2' || k === 'l2') currentItem.edgeL2 = v;
      if (k.includes('кромка3') || k === 'edgew1' || k === 'w1') currentItem.edgeW1 = v;
      if (k.includes('кромка4') || k === 'edgew2' || k === 'w2') currentItem.edgeW2 = v;
      if (k.includes('примеч') || k === 'note' || k === 'remark') currentItem.notes = v;
      if (k.includes('торец') || k === 'holes_end' || k === 'end_holes') currentItem.holesEnd = parseInt(v, 10);
      if (k.includes('пласть') || k === 'holes_face' || k === 'face_holes') currentItem.holesFace = parseInt(v, 10);
      if (k.includes('отверст') || k === 'holes' || k === 'drills') currentItem.holesCount = parseInt(v, 10);
    }
  }

  if (currentItem && (currentItem.name || currentItem.length)) {
    iniDetails.push({
      id: `det_ini_${itemIdx}_${Math.random().toString(36).substring(2, 7)}`,
      labelNumber: cleanPartLabelNumber(currentItem.labelNumber || String(itemIdx)) || String(itemIdx),
      name: currentItem.name || `Деталь ${itemIdx}`,
      length: currentItem.length || 700,
      width: currentItem.width || 500,
      thickness: currentItem.thickness || 16,
      material: currentItem.material || 'ЛДСП 16 мм',
      quantity: currentItem.quantity || 1,
      edgeL1: currentItem.edgeL1,
      edgeL2: currentItem.edgeL2,
      edgeW1: currentItem.edgeW1,
      edgeW2: currentItem.edgeW2,
      notes: currentItem.notes,
      orderNumber: currentItem.orderNumber,
      holesEnd: !isNaN(currentItem.holesEnd as number) ? currentItem.holesEnd : undefined,
      holesFace: !isNaN(currentItem.holesFace as number) ? currentItem.holesFace : undefined,
      holesCount: !isNaN(currentItem.holesCount as number) ? currentItem.holesCount : undefined,
    });
  }

  if (iniDetails.length > 0) {
    return consolidateDetails(iniDetails);
  }

  // Strategy 3: Heuristic Regex line parser
  const regexDetails: BirkaDetail[] = [];
  const dimRegex = /(\d{2,4})\s*[\*xх×]\s*(\d{2,4})(?:\s*[\*xх×]\s*(\d{1,3}))?/i;
  lines.forEach((line, idx) => {
    const match = line.match(dimRegex);
    if (match) {
      const length = parseInt(match[1], 10);
      const width = parseInt(match[2], 10);
      const thickness = match[3] ? parseInt(match[3], 10) : 16;
      
      let mat = 'ЛДСП 16 мм';
      if (line.toLowerCase().includes('мдф')) mat = 'МДФ 18 мм';
      if (line.toLowerCase().includes('хдф') || line.toLowerCase().includes('двп')) mat = 'ХДФ 3 мм';

      regexDetails.push({
        id: `det_regex_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        labelNumber: String(idx + 1),
        name: line.split(/[\t;,]/)[0] || `Деталь ${idx + 1}`,
        length,
        width,
        thickness,
        material: mat,
        quantity: 1,
        notes: line
      });
    }
  });

  if (regexDetails.length > 0) {
    return consolidateDetails(regexDetails);
  }

  return [];
}

// Consolidate duplicate rows with identical labelNumber, material, name and dimensions
export function consolidateDetails(details: BirkaDetail[]): BirkaDetail[] {
  if (!details || details.length === 0) return [];

  const map = new Map<string, BirkaDetail[]>();

  for (const d of details) {
    const rawLabel = (d.labelNumber || '').trim();
    const cleanLabel = cleanPartLabelNumber(rawLabel) || rawLabel;

    const normLabel = cleanLabel.toLowerCase();
    const normMat = (d.material || '').toLowerCase().trim();
    
    // Clean name from suffix e.g. "Боковина (1)" -> "Боковина"
    const normName = (d.name || '')
      .replace(/\s*\(\d+\)$/, '')
      .toLowerCase()
      .trim();
    
    // Grouping key: if position / label number is present (e.g. "01.02"), group by position + material + dimensions
    // Otherwise group by name + material + dimensions
    const key = normLabel 
      ? `pos_${normLabel}|${normMat}|${d.length}|${d.width}|${d.thickness}`
      : `name_${normName}|${normMat}|${d.length}|${d.width}|${d.thickness}`;

    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(d);
  }

  const consolidated: BirkaDetail[] = [];

  for (const items of map.values()) {
    const first = items[0];
    const rawLabel = (first.labelNumber || '').trim();
    const cleanLabel = cleanPartLabelNumber(rawLabel) || rawLabel;

    const cleanName = (first.name || '')
      .replace(/\s*\(\d+\)$/, '')
      .trim() || first.name;

    if (items.length === 1) {
      consolidated.push({
        ...first,
        labelNumber: cleanLabel,
        name: cleanName,
      });
    } else {
      const qtys = items.map(it => it.quantity || 1);
      
      let finalQuantity: number;
      const allEqual = qtys.every(q => q === qtys[0]);

      if (allEqual) {
        if (qtys[0] === 1) {
          finalQuantity = items.length;
        } else {
          finalQuantity = Math.max(qtys[0], items.length);
        }
      } else {
        finalQuantity = Math.max(
          qtys.reduce((acc, q) => acc + q, 0),
          ...qtys,
          items.length
        );
      }

      consolidated.push({
        ...first,
        labelNumber: cleanLabel,
        name: cleanName,
        quantity: finalQuantity,
        edgeL1: first.edgeL1 || items.find(i => i.edgeL1)?.edgeL1,
        edgeL2: first.edgeL2 || items.find(i => i.edgeL2)?.edgeL2,
        edgeW1: first.edgeW1 || items.find(i => i.edgeW1)?.edgeW1,
        edgeW2: first.edgeW2 || items.find(i => i.edgeW2)?.edgeW2,
        notes: first.notes || items.find(i => i.notes)?.notes,
        barcode: first.barcode || items.find(i => i.barcode)?.barcode,
        holesEnd: first.holesEnd ?? items.find(i => i.holesEnd !== undefined)?.holesEnd,
        holesFace: first.holesFace ?? items.find(i => i.holesFace !== undefined)?.holesFace,
        holesCount: first.holesCount ?? items.find(i => i.holesCount !== undefined)?.holesCount,
      });
    }
  }

  return consolidated;
}

// Group details by material type and compute totals
export function buildMaterialGroups(details: BirkaDetail[]): { 
  groups: BirkaMaterialGroup[]; 
  allEdges: { name: string; totalMeters: number; count: number }[];
  totalAreaM2: number;
  totalEdgeMeters: number;
} {
  const groupMap = new Map<string, BirkaDetail[]>();
  const globalEdgeMeters = new Map<string, { meters: number; count: number }>();

  let grandTotalAreaM2 = 0;

  details.forEach(d => {
    const mat = d.material || 'Без указания материала';
    if (!groupMap.has(mat)) {
      groupMap.set(mat, []);
    }
    groupMap.get(mat)!.push(d);

    const addEdge = (edgeName: string | undefined, sideMeters: number) => {
      if (!edgeName || edgeName === '-' || edgeName === '—' || edgeName === '0') return;
      const cleanName = edgeName.trim();
      const existing = globalEdgeMeters.get(cleanName) || { meters: 0, count: 0 };
      existing.meters += sideMeters;
      existing.count += 1;
      globalEdgeMeters.set(cleanName, existing);
    };

    const lenMeters = (d.length / 1000) * d.quantity;
    const widMeters = (d.width / 1000) * d.quantity;

    addEdge(d.edgeL1, lenMeters);
    addEdge(d.edgeL2, lenMeters);
    addEdge(d.edgeW1, widMeters);
    addEdge(d.edgeW2, widMeters);
  });

  const groups: BirkaMaterialGroup[] = [];

  groupMap.forEach((groupDetails, matName) => {
    let totalQty = 0;
    let totalAreaM2 = 0;
    const edgesSummary: Record<string, number> = {};

    groupDetails.forEach(d => {
      const qty = d.quantity || 1;
      totalQty += qty;
      const area = (d.length / 1000) * (d.width / 1000) * qty;
      totalAreaM2 += area;

      const lenM = (d.length / 1000) * qty;
      const widM = (d.width / 1000) * qty;

      [
        { e: d.edgeL1, m: lenM },
        { e: d.edgeL2, m: lenM },
        { e: d.edgeW1, m: widM },
        { e: d.edgeW2, m: widM },
      ].forEach(({ e, m }) => {
        if (e && e !== '-' && e !== '—') {
          edgesSummary[e] = (edgesSummary[e] || 0) + m;
        }
      });
    });

    // Estimate sheet count based on material brand & size database:
    // EGGER / Egger / Kronospan: 2800 x 2070 mm = 5.796 m2
    // Nordeco / Lamarty: 2750 x 1830 mm = 5.0325 m2
    // Uvadrev: 2440 x 1830 mm = 4.465 m2
    // Evosoft / AGT / Evogloss / Arkopa: 2800 x 1220 mm = 3.416 m2
    // Tabletop / Столешница: 3050 x 600 mm = 1.83 m2
    // HDF / ХДФ / ДВП / 3мм: 2800 x 2070 mm = 5.796 m2 or 2440 x 1830 mm = 4.465 m2
    const lowerMat = matName.toLowerCase();
    let sheetAreaM2 = 5.80; // Standard fallback (2800 x 2070)

    if (lowerMat.includes('evosoft') || lowerMat.includes('эвософт') || lowerMat.includes('agt') || lowerMat.includes('evogloss') || lowerMat.includes('arkopa') || lowerMat.includes('1220')) {
      sheetAreaM2 = 3.416; // 2800 x 1220
    } else if (lowerMat.includes('nordeco') || lowerMat.includes('нордеко') || lowerMat.includes('lamarty') || lowerMat.includes('ламарти') || lowerMat.includes('белый фон') || lowerMat.includes('2750')) {
      sheetAreaM2 = 5.0325; // 2750 x 1830
    } else if (lowerMat.includes('uvadrev') || lowerMat.includes('увадрев') || lowerMat.includes('2440')) {
      sheetAreaM2 = 4.465; // 2440 x 1830
    } else if (lowerMat.includes('столешниц') || lowerMat.includes('скинали') || lowerMat.includes('стеновая')) {
      sheetAreaM2 = 1.83; // 3050 x 600
    } else if (lowerMat.includes('хдф') || lowerMat.includes('двп') || lowerMat.includes('оргалит') || lowerMat.includes('3мм')) {
      sheetAreaM2 = 4.465;
    } else if (lowerMat.includes('egger') || lowerMat.includes('эггер') || lowerMat.includes('гикори') || lowerMat.includes('галифакс') || lowerMat.includes('kronospan') || lowerMat.includes('кроношпан')) {
      sheetAreaM2 = 5.796; // 2800 x 2070
    }

    const usableSheetArea = sheetAreaM2 * 0.82; // 0.82 usable nesting efficiency
    const estimatedSheets = Math.ceil(totalAreaM2 / usableSheetArea) || 1;

    grandTotalAreaM2 += totalAreaM2;

    groups.push({
      materialName: matName,
      details: groupDetails,
      totalQuantity: totalQty,
      totalAreaM2: Math.round(totalAreaM2 * 100) / 100,
      estimatedSheets,
      edgesSummary
    });
  });

  let grandTotalEdgeMeters = 0;
  const allEdges = Array.from(globalEdgeMeters.entries()).map(([name, val]) => {
    const metersWithMargin = Math.round(val.meters * 1.05 * 10) / 10;
    grandTotalEdgeMeters += metersWithMargin;
    return {
      name,
      totalMeters: metersWithMargin,
      count: val.count
    };
  });

  return { 
    groups, 
    allEdges, 
    totalAreaM2: Math.round(grandTotalAreaM2 * 100) / 100,
    totalEdgeMeters: Math.round(grandTotalEdgeMeters * 10) / 10
  };
}

// Master Async Birka File Parser
export async function parseBirkaFile(
  file: File, 
  customMapping?: Record<string, string[]>,
  encodingPreference?: string
): Promise<BirkaParseResult> {
  const arrayBuf = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuf);
  const fileHash = computeSimpleHash(uint8);

  let rawText = '';
  let encodingUsed = 'UTF-8';
  let formatDetected = 'Спецификация деталей';
  let parsedDetails: BirkaDetail[] | null = null;

  const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
  if (isExcel) {
    try {
      const workbook = XLSX.read(uint8, { type: 'array' });
      // Find best sheet: prefer sheets named with "детал", "спецификац", "бирк", "панел", "раскрой"
      let targetSheetName = workbook.SheetNames[0];
      const preferredSheet = workbook.SheetNames.find(sn => {
        const lower = sn.toLowerCase();
        return lower.includes('детал') || lower.includes('спецификац') || lower.includes('бирк') || lower.includes('панел') || lower.includes('раскрой') || lower.includes('список');
      });
      if (preferredSheet) {
        targetSheetName = preferredSheet;
      }
      const worksheet = workbook.Sheets[targetSheetName];
      // sheet_to_json with raw: false keeps the formatted cell strings (e.g. "01.02", "09.03")!
      const sheetRows: (string | number)[][] = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, 
        raw: false, 
        defval: '' 
      });
      
      const stringRows: string[][] = sheetRows
        .filter(r => Array.isArray(r) && r.some(c => c !== null && c !== undefined && String(c).trim() !== ''))
        .map(row => (Array.isArray(row) ? row : []).map(cell => String(cell ?? '').trim()));

      if (stringRows.length > 0) {
        const detailsFromRows = parseBirkaRows(stringRows, customMapping);
        if (detailsFromRows.length > 0) {
          parsedDetails = detailsFromRows;
        }
        rawText = stringRows.slice(0, 50).map(r => r.join('\t')).join('\n');
      }
      encodingUsed = 'Excel (XLSX/XLS)';
      formatDetected = `Таблица Excel (.xlsx / .xls) [Лист: ${targetSheetName}]`;
    } catch (e: any) {
      console.error('XLSX read error for birka:', e);
    }
  }

  // Check if explicit encoding preference provided
  if (!parsedDetails && encodingPreference && encodingPreference !== 'auto') {
    try {
      const decoder = new TextDecoder(encodingPreference);
      rawText = decoder.decode(uint8);
      encodingUsed = encodingPreference.toUpperCase();
    } catch {
      // Fallback to smart detection
    }
  }

  // Check if ZIP archive
  if (!parsedDetails && !rawText && (file.name.toLowerCase().endsWith('.zip') || (uint8[0] === 0x50 && uint8[1] === 0x4b))) {
    try {
      const zip = await JSZip.loadAsync(file);
      formatDetected = 'Архив (.zip с бирками)';
      
      const birkaFiles = Object.keys(zip.files).filter(fn => {
        const lower = fn.toLowerCase();
        return !zip.files[fn].dir && (
          lower.endsWith('.bir') || lower.endsWith('.brx') || 
          lower.endsWith('.txt') || lower.endsWith('.csv') || lower.endsWith('.tsv')
        );
      });

      if (birkaFiles.length > 0) {
        const contentUint8 = await zip.files[birkaFiles[0]].async('uint8array');
        const decoded = await smartDecodeFile(contentUint8);
        rawText = decoded.text;
        encodingUsed = `ZIP -> ${decoded.encoding}`;
      }
    } catch (e) {
      console.warn('ZIP extraction failed, fallback to direct text:', e);
    }
  }

  if (!parsedDetails && !rawText) {
    const decoded = await smartDecodeFile(uint8);
    rawText = decoded.text;
    encodingUsed = decoded.encoding;
    if (file.name.toLowerCase().endsWith('.bir')) formatDetected = 'Базис-Бирка (.bir)';
  }

  const details = parsedDetails || parseBirFileText(rawText, customMapping);
  const { groups, allEdges, totalAreaM2, totalEdgeMeters } = buildMaterialGroups(details);

  return {
    fileName: file.name,
    fileSize: file.size,
    fileHash,
    lastModified: new Date(file.lastModified).toLocaleString('ru-RU'),
    encodingUsed,
    formatDetected,
    details,
    materialGroups: groups,
    allEdges,
    totalAreaM2,
    totalEdgeMeters,
    totalPartsCount: details.reduce((acc, d) => acc + (d.quantity || 1), 0),
    rawTextPreview: rawText.slice(0, 3000)
  };
}
