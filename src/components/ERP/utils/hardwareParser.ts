import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { smartDecodeFile } from '../../../utils/fileEncodingDetector';
import { OrderHardwareItem } from '../types';

export interface HardwareParseResult {
  fileName: string;
  fileSize: number;
  fileHash: string;
  items: OrderHardwareItem[];
  totalItemsCount: number;
  totalQuantity: number;
  categoriesSummary: Array<{ category: string; count: number; totalQuantity: number }>;
  rawTextPreview?: string;
}

// Default recognized column aliases for Hardware Specification files
export const DEFAULT_HARDWARE_COLUMN_MAPPING: Record<string, string[]> = {
  name: [
    'наименование', 'название', 'номенклатура', 'товар', 'фурнитура', 
    'изделие', 'комплектующее', 'элемент', 'name', 'item', 'description', 
    'материал', 'покупное изделие'
  ],
  article: [
    'артикул', 'код', 'обозначение', 'код товара', 'номер по каталогу', 
    'art', 'code', 'part_number', 'sku', 'партномер', 'артикул поставщика'
  ],
  quantity: [
    'количество', 'кол-во', 'кол', 'к-во', 'qty', 'count', 'всего', 
    'потребность', 'заказ', 'требуется', 'расход', 'шт'
  ],
  unit: [
    'ед. изм.', 'ед.изм', 'ед изм', 'единица', 'ед', 'изм', 'unit', 'uom', 'ед.измерения'
  ],
  category: [
    'группа', 'категория', 'тип', 'раздел', 'вид', 'классификатор', 'папка', 'group', 'category'
  ],
  notes: [
    'примечание', 'комментарий', 'назначение', 'направление', 'модуль', 'секция', 'note', 'comment', 'где используется'
  ]
};

// Automatic categorization keywords
export function detectHardwareCategory(name: string, article?: string, rawCategory?: string): string {
  if (rawCategory && rawCategory.trim().length > 1) {
    const rawClean = rawCategory.trim();
    if (!/^(прочее|разное|товары|фурнитура|материалы)$/i.test(rawClean)) {
      return rawClean;
    }
  }

  const text = `${name} ${article || ''}`.toLowerCase();

  if (/петл|clip[\s-]?top|blumotion|sensys|tiomos|slide[\s-]?on|шарнир|демпфер|tip[\s-]?on|отталкивател|толкател/i.test(text)) {
    return 'Петли и доводчики';
  }
  if (/направляющ|tandem|legrabox|metabox|antaro|quadro|шариков|скрытого монтажа|tandembox|firmax|b[\s-]?box|movento|боковина ящика/i.test(text)) {
    return 'Направляющие и ящики';
  }
  if (/aventos|hk[\s-]?s|hk[\s-]?xs|hl|hs|hf|газлифт|подъемник|free fold|klok|кронштейн|секретерн/i.test(text)) {
    return 'Подъемные механизмы';
  }
  if (/конфирмат|евровинт|эксцентрик|шкант|саморез|уголок|стяжка|minifix|rafix|дюбель|футорка|винт|болт|гайка|заглушка|полкодержател|межсекцион|шайба/i.test(text)) {
    return 'Крепеж и метизы';
  }
  if (/ручка|кнопка|профиль[\s-]?ручка|gola|гола|крючок|скоба|рейлинг|врезная ручка/i.test(text)) {
    return 'Ручки и лицевые профили';
  }
  if (/опора|ножка|нога|цоколь|клипса|подпятник|регулируем.*опор|база цоколя/i.test(text)) {
    return 'Опоры и цоколь';
  }
  if (/бутылочниц|корзина|волшебный уголок|сушка|сушилка|карго|лоток|штанга|держатель штанги|вешалка|брючниц/i.test(text)) {
    return 'Наполнение и корзины';
  }
  if (/лента|led|светодиод|профиль светодиодный|блок питания|трансформатор|выключатель|сенсор|провод|рассеиватель/i.test(text)) {
    return 'Подсветка и электрика';
  }
  if (/стекло|зеркало|уплотнитель|клей|герметик|скотч|лента соединительн/i.test(text)) {
    return 'Стекло и материалы';
  }

  return 'Комплектующие и фурнитура';
}

// Compute simple fast hash for file identification
export const computeFileHash = (uint8: Uint8Array): string => {
  let h = 0x811c9dc5;
  const len = Math.min(uint8.length, 10000);
  for (let i = 0; i < len; i++) {
    h ^= uint8[i];
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
};

function matchColumnIndex(headerCells: string[], aliases: string[]): number {
  for (let i = 0; i < headerCells.length; i++) {
    const cell = (headerCells[i] || '').toString().toLowerCase().trim();
    if (!cell) continue;
    for (const alias of aliases) {
      if (cell === alias || cell.includes(alias)) {
        return i;
      }
    }
  }
  return -1;
}

// Default excluded sheet and edge keywords
export const DEFAULT_EXCLUDE_KEYWORDS = ["ЛДСП", "ДСП", "МДФ", "ХДФ", "Кромка", "ПВХ", "Столешница", "Стеновая", "ДВП"];

// Helper to find header row and column mapping with strict scoring
function findHardwareHeaderRow(
  rows: (string | number)[][],
  mapping: Record<string, string[]>
): {
  headerIndex: number;
  nameCol: number;
  artCol: number;
  qtyCol: number;
  unitCol: number;
  catCol: number;
  noteCol: number;
} {
  let bestHeaderIndex = -1;
  let bestScore = -1;
  let bestCols = { nameCol: -1, artCol: -1, qtyCol: -1, unitCol: -1, catCol: -1, noteCol: -1 };

  for (let r = 0; r < Math.min(rows.length, 60); r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row) || row.length === 0) continue;

    const stringRow = row.map(c => (c !== null && c !== undefined ? String(c).trim().toLowerCase() : ''));
    const fullRowText = stringRow.join(' ');

    // Skip title rows or document headers that aren't table columns
    if (/^(ведомость|спецификация|заказ|проект|отчет|приложение|утверждаю)\b/i.test(fullRowText) &&
        !fullRowText.includes('наименование') && !fullRowText.includes('кол-во') && !fullRowText.includes('количество')) {
      continue;
    }

    let nameCol = -1;
    let artCol = -1;
    let qtyCol = -1;
    let unitCol = -1;
    let catCol = -1;
    let noteCol = -1;

    stringRow.forEach((cell, idx) => {
      if (!cell) return;

      // Match name
      if (nameCol === -1) {
        if (/^(?:наименование|название|номенклатура|товар|позиция|элемент|комплектующие|деталь|покупные)\b/i.test(cell) ||
            (mapping.name || []).some(alias => cell === alias || (alias.length > 5 && cell.includes(alias) && !cell.includes('ведомость')))) {
          nameCol = idx;
        }
      }

      // Match article / code
      if (artCol === -1) {
        if (/^(?:№\s*)?артикул\b/i.test(cell) || cell === 'артикул' || cell === 'код' || cell === 'обозначение' || cell === 'арт' ||
            (mapping.article || []).some(alias => cell === alias || (alias.length > 3 && cell.includes(alias)))) {
          artCol = idx;
        }
      }

      // Match quantity
      if (qtyCol === -1) {
        if (/^(?:кол-во|количество|кол|к-во|потребность|расход|всего|требуется|заказ|qty|count)\b/i.test(cell) ||
            (mapping.quantity || []).some(alias => cell === alias || (alias.length > 3 && cell.includes(alias)))) {
          qtyCol = idx;
        }
      }

      // Match unit
      if (unitCol === -1) {
        if (/^(?:ед\.?\s*изм\.?|ед|единица|unit)\b/i.test(cell) ||
            (mapping.unit || []).some(alias => cell === alias)) {
          unitCol = idx;
        }
      }

      // Match category
      if (catCol === -1) {
        if (/^(?:категория|группа|тип|раздел|папка|вид)\b/i.test(cell) ||
            (mapping.category || []).some(alias => cell === alias)) {
          catCol = idx;
        }
      }

      // Match notes
      if (noteCol === -1) {
        if (/^(?:примечание|комментарий|модуль|производитель|бренд)\b/i.test(cell) ||
            (mapping.notes || []).some(alias => cell === alias)) {
          noteCol = idx;
        }
      }
    });

    let score = 0;
    if (nameCol !== -1) score += 10;
    if (qtyCol !== -1) score += 10;
    if (artCol !== -1) score += 8;
    if (unitCol !== -1) score += 4;
    if (catCol !== -1) score += 4;
    if (noteCol !== -1) score += 2;

    // A valid header row should have at least TWO distinct identified columns
    if (score >= 16 && (nameCol !== -1 || artCol !== -1) && (qtyCol !== -1 || artCol !== -1)) {
      if (score > bestScore) {
        bestScore = score;
        bestHeaderIndex = r;
        bestCols = { nameCol, artCol, qtyCol, unitCol, catCol, noteCol };
      }
    }
  }

  // Fallback if no header row matched with high score
  if (bestHeaderIndex === -1) {
    for (let r = 0; r < Math.min(rows.length, 30); r++) {
      const stringRow = rows[r].map(c => String(c ?? '').trim().toLowerCase());
      const nIdx = stringRow.findIndex(c => c.includes('наименов') || c.includes('номенклатур'));
      const aIdx = stringRow.findIndex(c => c.includes('артикул') || c.includes('обозначение') || c === 'код' || c === 'арт');
      const qIdx = stringRow.findIndex(c => c.includes('кол') || c.includes('qty') || c.includes('потреб') || c === 'шт');

      if (nIdx !== -1 || aIdx !== -1) {
        bestHeaderIndex = r;
        bestCols = {
          nameCol: nIdx !== -1 ? nIdx : (aIdx !== -1 ? aIdx + 1 : 1),
          artCol: aIdx,
          qtyCol: qIdx !== -1 ? qIdx : (nIdx !== -1 ? nIdx + 1 : 2),
          unitCol: stringRow.findIndex(c => c.includes('ед')),
          catCol: stringRow.findIndex(c => c.includes('категор') || c.includes('групп')),
          noteCol: stringRow.findIndex(c => c.includes('примеч'))
        };
        break;
      }
    }
  }

  // Absolute fallback
  if (bestHeaderIndex === -1) {
    bestHeaderIndex = 0;
    bestCols = { nameCol: 1, artCol: 0, qtyCol: 2, unitCol: 3, catCol: -1, noteCol: -1 };
  }

  return {
    headerIndex: bestHeaderIndex,
    ...bestCols
  };
}

// Parse Table Data (Array of Rows) into OrderHardwareItem[]
export function parseTableRowsToHardware(
  rows: (string | number)[][],
  customMapping?: Record<string, string[]>,
  excludeKeywords: string[] = DEFAULT_EXCLUDE_KEYWORDS
): OrderHardwareItem[] {
  if (!rows || rows.length < 2) return [];

  const mapping = { ...DEFAULT_HARDWARE_COLUMN_MAPPING, ...(customMapping || {}) };
  const { headerIndex, nameCol, artCol, qtyCol, unitCol, catCol, noteCol } = findHardwareHeaderRow(rows, mapping);

  const itemsMap = new Map<string, OrderHardwareItem>();
  let currentGroupCategory = '';

  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row) || row.length === 0) continue;

    // Check if this row is a section/group header (e.g. single column with text like "Петли Blum:")
    const nonEmptyCells = row.map(c => (c !== null && c !== undefined ? String(c).trim() : '')).filter(Boolean);
    if (nonEmptyCells.length === 1 && !/\d+/.test(nonEmptyCells[0])) {
      currentGroupCategory = nonEmptyCells[0].replace(/[:;]$/, '').trim();
      continue;
    }

    const rawName = nameCol !== -1 && row[nameCol] !== undefined && row[nameCol] !== null ? String(row[nameCol]).trim() : '';
    const rawArt = artCol !== -1 && row[artCol] !== undefined && row[artCol] !== null ? String(row[artCol]).trim() : '';

    if (!rawName && !rawArt) continue;

    // Skip header repetitions and technical/summary rows
    if (/^(итого|всего|страница|page|подпись|составил|проверил|лист|заказчик|руководитель)\b/i.test(rawName || rawArt) ||
        /^(наименование|артикул|номенклатура)\b/i.test(rawName) && /^(артикул|код|количество)\b/i.test(rawArt)) {
      continue;
    }

    const displayName = rawName || rawArt;
    if (displayName.length < 2) continue;

    const rawCategory = catCol !== -1 && row[catCol] !== undefined && row[catCol] !== null ? String(row[catCol]).trim() : currentGroupCategory;

    // Check excluded keywords (sheet materials, edge, etc.)
    const checkString = `${displayName} ${rawArt} ${rawCategory}`.toLowerCase();
    const isExcluded = excludeKeywords.some(kw => kw.trim().length > 0 && checkString.includes(kw.trim().toLowerCase()));
    if (isExcluded) {
      continue; // Skip sheet material / edge item
    }

    // Parse Quantity
    let quantity = 1;
    if (qtyCol !== -1 && row[qtyCol] !== undefined && row[qtyCol] !== null) {
      const qStr = String(row[qtyCol]).replace(',', '.').replace(/[^\d.]/g, '');
      const parsedQ = parseFloat(qStr);
      if (!isNaN(parsedQ) && parsedQ > 0) {
        quantity = Math.round(parsedQ * 100) / 100;
      }
    } else {
      // Look for embedded quantity in displayName e.g. "Петля Blum (12 шт)"
      const qtyMatch = displayName.match(/[\(\[\{]\s*(\d+(?:[.,]\d+)?)\s*(?:шт|компл|уп|п\.м\.?)\s*[\)\]\}]/i);
      if (qtyMatch) {
        const parsed = parseFloat(qtyMatch[1].replace(',', '.'));
        if (!isNaN(parsed) && parsed > 0) {
          quantity = parsed;
        }
      }
    }

    const rawUnit = unitCol !== -1 && row[unitCol] !== undefined && row[unitCol] !== null ? String(row[unitCol]).trim() : 'шт';
    const rawNotes = noteCol !== -1 && row[noteCol] !== undefined && row[noteCol] !== null ? String(row[noteCol]).trim() : '';

    const category = detectHardwareCategory(displayName, rawArt, rawCategory);

    // Grouping / Deduplication key
    const dedupKey = `${displayName.toLowerCase()}|||${rawArt.toLowerCase()}`;

    if (itemsMap.has(dedupKey)) {
      const existing = itemsMap.get(dedupKey)!;
      existing.quantity += quantity;
      if (!existing.notes && rawNotes) existing.notes = rawNotes;
      if (!existing.article && rawArt) existing.article = rawArt;
    } else {
      const item: OrderHardwareItem = {
        id: `hw-${Date.now()}-${itemsMap.size + 1}-${Math.random().toString(36).substring(2, 6)}`,
        name: displayName,
        article: rawArt || undefined,
        quantity: Math.max(1, quantity),
        unit: rawUnit || 'шт',
        category: category,
        packedQuantity: 0,
        notes: rawNotes || undefined
      };
      itemsMap.set(dedupKey, item);
    }
  }

  return Array.from(itemsMap.values());
}

// Main parser function for Files
export async function parseHardwareFile(
  file: File,
  customMapping?: Record<string, string[]>
): Promise<HardwareParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  const fileHash = computeFileHash(uint8);
  const fileName = file.name.toLowerCase();

  let items: OrderHardwareItem[] = [];
  let rawTextPreview = '';

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    // Excel Workbook Parsing
    const workbook = XLSX.read(uint8, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rows: (string | number)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    items = parseTableRowsToHardware(rows, customMapping);
    rawTextPreview = rows.slice(0, 8).map(r => r.join(' | ')).join('\n');
  } else {
    // Text / CSV / TSV / XML Decoding
    const decoded = await smartDecodeFile(uint8);
    rawTextPreview = decoded.text.substring(0, 1000);

    if (fileName.endsWith('.xml') || decoded.text.trim().startsWith('<?xml') || decoded.text.trim().startsWith('<')) {
      // Basic XML item extraction
      const rows: string[][] = [];
      const tagRegex = /<(?:item|part|element|row|позиция|деталь|фурнитура)[\s>]([\s\S]*?)<\/(?:item|part|element|row|позиция|деталь|фурнитура)>/gi;
      let match;
      while ((match = tagRegex.exec(decoded.text)) !== null) {
        const block = match[1];
        const nameMatch = block.match(/<(?:name|наименование|название)>([^<]+)<\//i);
        const qtyMatch = block.match(/<(?:count|quantity|кол-во|количество)>([^<]+)<\//i);
        const artMatch = block.match(/<(?:code|article|арт|артикул)>([^<]+)<\//i);
        const unitMatch = block.match(/<(?:unit|ед)>([^<]+)<\//i);
        const catMatch = block.match(/<(?:category|group|группа)>([^<]+)<\//i);

        if (nameMatch) {
          rows.push([
            nameMatch[1].trim(),
            qtyMatch ? qtyMatch[1].trim() : '1',
            artMatch ? artMatch[1].trim() : '',
            unitMatch ? unitMatch[1].trim() : 'шт',
            catMatch ? catMatch[1].trim() : ''
          ]);
        }
      }
      if (rows.length > 0) {
        items = parseTableRowsToHardware([
          ['Наименование', 'Количество', 'Артикул', 'Ед. изм.', 'Категория'],
          ...rows
        ], customMapping);
      }
    }

    if (items.length === 0) {
      // Parse with PapaParse
      const parsed = Papa.parse<(string | number)[]>(decoded.text, {
        skipEmptyLines: true
      });
      if (parsed.data && parsed.data.length > 0) {
        items = parseTableRowsToHardware(parsed.data, customMapping);
      }
    }
  }

  // Calculate stats
  const totalItemsCount = items.length;
  const totalQuantity = items.reduce((sum, it) => sum + it.quantity, 0);

  // Group by category
  const catMap = new Map<string, { count: number; totalQuantity: number }>();
  items.forEach(it => {
    const cat = it.category || 'Прочее';
    const curr = catMap.get(cat) || { count: 0, totalQuantity: 0 };
    curr.count += 1;
    curr.totalQuantity += it.quantity;
    catMap.set(cat, curr);
  });

  const categoriesSummary = Array.from(catMap.entries()).map(([category, stats]) => ({
    category,
    count: stats.count,
    totalQuantity: stats.totalQuantity
  }));

  return {
    fileName: file.name,
    fileSize: file.size,
    fileHash,
    items,
    totalItemsCount,
    totalQuantity,
    categoriesSummary,
    rawTextPreview
  };
}
