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

// Parse Table Data (Array of Rows) into OrderHardwareItem[]
export function parseTableRowsToHardware(
  rows: (string | number)[][],
  customMapping?: Record<string, string[]>,
  excludeKeywords: string[] = DEFAULT_EXCLUDE_KEYWORDS
): OrderHardwareItem[] {
  if (!rows || rows.length < 2) return [];

  const mapping = { ...DEFAULT_HARDWARE_COLUMN_MAPPING, ...(customMapping || {}) };

  // Find header row (first row that has "наименование", "название", "фурнитура", "кол-во", etc.)
  let headerIndex = -1;
  let nameCol = -1;
  let qtyCol = -1;
  let artCol = -1;
  let unitCol = -1;
  let catCol = -1;
  let noteCol = -1;

  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const stringRow = rows[r].map(c => (c !== null && c !== undefined ? String(c).trim() : ''));
    const matchedName = matchColumnIndex(stringRow, mapping.name);
    const matchedQty = matchColumnIndex(stringRow, mapping.quantity);

    if (matchedName !== -1 && (matchedQty !== -1 || stringRow.some(s => /кол|qty|шт/i.test(s)))) {
      headerIndex = r;
      nameCol = matchedName;
      qtyCol = matchedQty !== -1 ? matchedQty : matchColumnIndex(stringRow, mapping.quantity);
      artCol = matchColumnIndex(stringRow, mapping.article);
      unitCol = matchColumnIndex(stringRow, mapping.unit);
      catCol = matchColumnIndex(stringRow, mapping.category);
      noteCol = matchColumnIndex(stringRow, mapping.notes);
      break;
    }
  }

  // Fallback: If no explicit header row found, assume Col 0 or Col 1 is Name, Col 2 or 3 is Qty
  if (headerIndex === -1) {
    nameCol = 0;
    qtyCol = 1;
    headerIndex = 0;
  }

  const itemsMap = new Map<string, OrderHardwareItem>();
  let currentGroupCategory = '';

  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    // Check if this row is a section/group header (e.g. single column with text like "Петли Blum:")
    const nonEmptyCells = row.map(c => (c !== null && c !== undefined ? String(c).trim() : '')).filter(Boolean);
    if (nonEmptyCells.length === 1 && !/\d+/.test(nonEmptyCells[0])) {
      currentGroupCategory = nonEmptyCells[0].replace(/[:;]$/, '').trim();
      continue;
    }

    const rawName = row[nameCol] !== undefined && row[nameCol] !== null ? String(row[nameCol]).trim() : '';
    if (!rawName || rawName.length < 2) continue;

    // Skip technical/summary rows
    if (/^(итого|всего|страница|page|подпись|составил|проверил|лист)/i.test(rawName)) {
      continue;
    }

    const rawArt = artCol !== -1 && row[artCol] !== undefined && row[artCol] !== null ? String(row[artCol]).trim() : '';
    const rawCategory = catCol !== -1 && row[catCol] !== undefined && row[catCol] !== null ? String(row[catCol]).trim() : currentGroupCategory;

    // Check excluded keywords (sheet materials, edge, etc.)
    const checkString = `${rawName} ${rawArt} ${rawCategory}`.toLowerCase();
    const isExcluded = excludeKeywords.some(kw => kw.trim().length > 0 && checkString.includes(kw.trim().toLowerCase()));
    if (isExcluded) {
      continue; // Skip sheet material / edge item
    }

    // Parse Quantity
    let rawQtyVal = qtyCol !== -1 && row[qtyCol] !== undefined && row[qtyCol] !== null ? String(row[qtyCol]) : '1';
    rawQtyVal = rawQtyVal.replace(/,/g, '.').replace(/[^\d.]/g, '');
    const quantity = parseFloat(rawQtyVal) || 1;

    const rawUnit = unitCol !== -1 && row[unitCol] !== undefined && row[unitCol] !== null ? String(row[unitCol]).trim() : 'шт';
    const rawNotes = noteCol !== -1 && row[noteCol] !== undefined && row[noteCol] !== null ? String(row[noteCol]).trim() : '';

    const category = detectHardwareCategory(rawName, rawArt, rawCategory);

    // Grouping / Deduplication key
    const dedupKey = `${rawName.toLowerCase()}|||${rawArt.toLowerCase()}`;

    if (itemsMap.has(dedupKey)) {
      const existing = itemsMap.get(dedupKey)!;
      existing.quantity += quantity;
      if (!existing.notes && rawNotes) existing.notes = rawNotes;
      if (!existing.article && rawArt) existing.article = rawArt;
    } else {
      const item: OrderHardwareItem = {
        id: `hw-${Date.now()}-${itemsMap.size + 1}-${Math.random().toString(36).substring(2, 6)}`,
        name: rawName,
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
