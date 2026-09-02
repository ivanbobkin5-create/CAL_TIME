import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { smartDecodeFile } from '../../../utils/fileEncodingDetector';
import { OrderHardwareItem } from '../types';

export interface HardwareParseResult {
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  items: OrderHardwareItem[];
  totalItemsCount: number;
  totalQuantity: number;
  categoriesSummary: Array<{ category: string; count: number; totalQuantity: number }>;
  rawTextPreview?: string;
}

// Default recognized aliases for Hardware columns in Excel / CSV / TSV
export const DEFAULT_HARDWARE_COLUMN_MAPPING: Record<string, string[]> = {
  article: [
    'арт', 'артикул', 'код', 'код товара', 'номенклатурный номер', 'article', 'code', 'art_no', 'item_code', 'код номенклатуры'
  ],
  name: [
    'наименование', 'название', 'номенклатура', 'товар', 'фурнитура', 'позиция', 'элемент', 'комплектующие', 'name', 'item', 'description', 'материал/фурнитура'
  ],
  quantity: [
    'кол', 'количество', 'кол-во', 'к-во', 'qty', 'count', 'число', 'потребность', 'кол-во в заказе', 'кол-во факт', 'кол-во шт'
  ],
  unit: [
    'ед', 'ед. изм.', 'ед.изм', 'ед.изм.', 'ед_изм', 'ед изм', 'unit', 'единица', 'базовая единица'
  ],
  category: [
    'группа', 'категория', 'тип', 'раздел', 'вид', 'category', 'group', 'группа номенклатуры', 'вид фурнитуры'
  ],
  notes: [
    'примеч', 'примечание', 'коммент', 'комментарий', 'производитель', 'бренд', 'note', 'brand', 'поставщик', 'папка', 'узел'
  ]
};

// Automatic categorization keywords when category is not explicitly provided in the file
export const HARDWARE_CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Петли и доводчики': [
    'петл', 'петля', 'доводчик', 'clip-top', 'clip top', 'blumotion', 'sensys', 'intermat', 'интермат', 'петли', 'ответная планка', 'планка под петлю'
  ],
  'Направляющие и ящики': [
    'направляющ', 'тандем', 'tandem', 'legrabox', 'antaro', 'merivobox', 'квадро', 'quadro', 'шариков', 'роликов', 'метабокс', 'боярд', 'ящик', 'боковина ящика', 'царга', 'направляющие', 'тандембокс'
  ],
  'Подъемные механизмы': [
    'aventos', 'авентос', 'подъемник', 'газлифт', 'газовый лифт', 'лифт фасада', 'механизм подъема', 'hf', 'hk', 'hl', 'hs', 'top'
  ],
  'Крепеж и метизы': [
    'конфирмат', 'евровинт', 'стяжк', 'эксцентрик', 'шкант', 'саморез', 'винт', 'болт', 'гайка', 'шайба', 'уголок', 'дюбель', 'минификс', 'рафикс', 'шуруп', 'шканты', 'стяжка'
  ],
  'Лицевая фурнитура': [
    'ручк', 'ручка', 'кнопк', 'скоб', 'рейлинг', 'профиль-ручка', 'gola', 'гола', 'крючок', 'замок', 'ручки', 'кнопка'
  ],
  'Опоры и цоколи': [
    'опор', 'опора', 'ножк', 'ножка', 'подпятник', 'цокол', 'цоколь', 'клипс', 'подпят', 'нога', 'опоры'
  ],
  'Раздвижные системы': [
    'купе', 'раздвижн', 'ролик верх', 'ролик нижн', 'направляющ верх', 'направляющ нижн', 'шлегель', 'стопор', 'доводчик купе', 'система купе'
  ],
  'Наполнение и аксессуары': [
    'сушк', 'сушка', 'бутылочниц', 'карго', 'корзин', 'лоток', 'ведро', 'мусорн', 'брючниц', 'пантограф', 'штанга', 'держатель штанги', 'посудосушитель'
  ],
  'Подсветка и электрика': [
    'лент', 'led', 'блок питан', 'трансформатор', 'выключател', 'датчик', 'профиль led', 'рассеивател', 'провод', 'кабель', 'светильник', 'подсветка'
  ],
  'Заглушки и уплотнители': [
    'заглушк', 'заглушка', 'наклейк', 'уплотнитель', 'демпфер', 'амортизатор', 'отбойник', 'бампер'
  ]
};

// Patterns to detect sheet board materials, edging, facades, countertops
const SHEET_AND_FACADE_PATTERNS = [
  /кромк/i,
  /лдсп/i,
  /дсп/i,
  /хдф/i,
  /двп/i,
  /мдф/i,
  /фасад/i,
  /фанера/i,
  /столешниц/i,
  /стеновая/i,
  /плита/i,
  /стекло/i,
  /зеркало/i,
  /профиль.*ал/i,
  /аллюминий|алюминий/i
];

export interface HardwareParseResult {
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  items: OrderHardwareItem[];
  detectedMaterials: OrderHardwareItem[]; // Найденные листовые материалы, фасады и кромка для выбора пользователем
  totalItemsCount: number;
  totalQuantity: number;
  categoriesSummary: Array<{ category: string; count: number; totalQuantity: number }>;
  rawTextPreview?: string;
}

export function detectCategoryByName(name: string, fallbackCategory: string = 'Разное / Крепеж'): string {
  const lower = name.toLowerCase();
  if (/фасад/i.test(lower)) {
    return 'Фасады и двери';
  }
  if (/кромк/i.test(lower)) {
    return 'Кромка и облицовка';
  }
  if (/лдсп|дсп|хдф|двп|мдф|фанера|столешниц|стеновая/i.test(lower)) {
    return 'Материалы и плиты';
  }
  for (const [catName, keywords] of Object.entries(HARDWARE_CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return catName;
      }
    }
  }
  return fallbackCategory;
}

export function isMaterialOrFacadeItem(name: string): boolean {
  const lower = name.toLowerCase();
  if (lower.includes('стяжк') || lower.includes('петл') || lower.includes('крепеж') || lower.includes('уголок') || lower.includes('ручк')) {
    return false;
  }
  return SHEET_AND_FACADE_PATTERNS.some(pat => pat.test(lower));
}

export function isExcludedSheetMaterial(name: string): boolean {
  return isMaterialOrFacadeItem(name);
}

/**
 * Main parser for Hardware / Kitting manifest file
 */
export async function parseHardwareFile(
  file: File,
  customMapping?: Record<string, string[]>
): Promise<HardwareParseResult> {
  const mapping = { ...DEFAULT_HARDWARE_COLUMN_MAPPING, ...(customMapping || {}) };
  const fileName = file.name;
  const fileSize = file.size;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  const buffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(buffer);

  let rawItems: Array<{
    article?: string;
    name: string;
    quantity: number;
    unit?: string;
    category?: string;
    notes?: string;
  }> = [];

  let rawTextPreview = '';

  // 1. Process Excel files (.xlsx, .xls, .xlsm, .xlsb)
  if (['xlsx', 'xls', 'xlsm', 'xlsb'].includes(ext)) {
    try {
      const workbook = XLSX.read(uint8, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      rawTextPreview = rows.slice(0, 15).map(r => r.join('\t')).join('\n');
      rawItems = parseTableRows(rows, mapping);
    } catch (e) {
      console.warn('Excel parse failed, trying text decoder fallback', e);
    }
  }

  // 2. Process CSV, TSV, TXT, or DBF files
  if (rawItems.length === 0) {
    const decoded = await smartDecodeFile(uint8);
    rawTextPreview = decoded.text.slice(0, 1000);

    // Try CSV / TSV with PapaParse
    const parsedCsv = Papa.parse<string[]>(decoded.text, {
      skipEmptyLines: true
    });

    if (parsedCsv.data && parsedCsv.data.length > 0) {
      rawItems = parseTableRows(parsedCsv.data, mapping);
    }

    // If table headers were not found, try text line-by-line regex parser (e.g. "Петля Blum 110 - 12 шт")
    if (rawItems.length === 0) {
      rawItems = parseTextLineByLine(decoded.text);
    }
  }

  // Deduplicate and aggregate identical hardware items (same name & article)
  const aggregatedHardwareMap = new Map<string, {
    article?: string;
    name: string;
    quantity: number;
    unit: string;
    category: string;
    notes?: string;
  }>();

  const aggregatedMaterialsMap = new Map<string, {
    article?: string;
    name: string;
    quantity: number;
    unit: string;
    category: string;
    notes?: string;
  }>();

  for (const item of rawItems) {
    const cleanName = item.name.trim();
    if (!cleanName || cleanName.length < 2) continue;

    const isMaterial = isMaterialOrFacadeItem(cleanName);
    const cleanArticle = (item.article || '').trim();
    const key = `${cleanArticle}:::${cleanName.toLowerCase()}`;
    const qty = Math.max(1, Number(item.quantity) || 1);
    const unit = (item.unit || 'шт').trim() || 'шт';
    const category = item.category?.trim() || detectCategoryByName(cleanName);
    const notes = item.notes?.trim();

    const targetMap = isMaterial ? aggregatedMaterialsMap : aggregatedHardwareMap;

    if (targetMap.has(key)) {
      const existing = targetMap.get(key)!;
      existing.quantity += qty;
      if (!existing.notes && notes) existing.notes = notes;
    } else {
      targetMap.set(key, {
        article: cleanArticle || undefined,
        name: cleanName,
        quantity: qty,
        unit,
        category,
        notes: notes || undefined
      });
    }
  }

  // Transform into final OrderHardwareItem arrays
  const items: OrderHardwareItem[] = Array.from(aggregatedHardwareMap.values()).map((val, idx) => ({
    id: `hw-${Date.now()}-${idx + 1}`,
    article: val.article,
    name: val.name,
    quantity: val.quantity,
    unit: val.unit,
    category: val.category,
    packedQuantity: 0,
    notes: val.notes
  }));

  const detectedMaterials: OrderHardwareItem[] = Array.from(aggregatedMaterialsMap.values()).map((val, idx) => ({
    id: `mat-${Date.now()}-${idx + 1}`,
    article: val.article,
    name: val.name,
    quantity: val.quantity,
    unit: val.unit,
    category: val.category,
    packedQuantity: 0,
    notes: val.notes
  }));

  // Categories summary
  const catSummaryMap = new Map<string, { count: number; totalQuantity: number }>();
  let totalQuantity = 0;

  for (const item of items) {
    totalQuantity += item.quantity;
    const cat = item.category || 'Разное / Крепеж';
    if (!catSummaryMap.has(cat)) {
      catSummaryMap.set(cat, { count: 0, totalQuantity: 0 });
    }
    const catData = catSummaryMap.get(cat)!;
    catData.count += 1;
    catData.totalQuantity += item.quantity;
  }

  const categoriesSummary = Array.from(catSummaryMap.entries()).map(([category, stats]) => ({
    category,
    count: stats.count,
    totalQuantity: stats.totalQuantity
  })).sort((a, b) => b.totalQuantity - a.totalQuantity);

  return {
    fileName,
    fileSize,
    uploadedAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('ru-RU'),
    items,
    detectedMaterials,
    totalItemsCount: items.length,
    totalQuantity,
    categoriesSummary,
    rawTextPreview
  };
}

/**
 * Parses rows (from Excel or CSV) matching column headers using aliases
 * Prioritizes locating column A with 'Артикул' as the table start and ignoring any noise above it.
 */
function parseTableRows(
  rows: any[][],
  mapping: Record<string, string[]>
): Array<{ article?: string; name: string; quantity: number; unit?: string; category?: string; notes?: string }> {
  if (!rows || rows.length === 0) return [];

  let headerRowIndex = -1;
  let colIndices: Record<string, number> = {};

  // 1. PRIMARY STRATEGY:
  // Ищем строку, где в столбце A (индекс 0 или 1 при наличии пустого отступа слева)
  // расположен заголовок "Артикул". Все строки ВЫШЕ этой строки безоговорочно отметаются.
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row)) continue;

    const col0 = String(row[0] ?? '').toLowerCase().trim();
    const col1 = String(row[1] ?? '').toLowerCase().trim();

    const isCol0Article = /^(?:№\s*)?артикул\b/i.test(col0) || col0 === 'артикул' || col0 === 'арт.' || col0 === 'арт' || col0 === 'код' || col0 === 'article';
    const isCol1Article = !isCol0Article && (/^(?:№\s*)?артикул\b/i.test(col1) || col1 === 'артикул' || col1 === 'арт.' || col1 === 'арт' || col1 === 'код' || col1 === 'article');

    if (isCol0Article || isCol1Article) {
      headerRowIndex = i;
      const stringRow = row.map(c => String(c ?? '').toLowerCase().trim());

      for (const [paramKey, aliases] of Object.entries(mapping)) {
        const foundIdx = stringRow.findIndex(cell => 
          aliases.some(alias => cell === alias || cell.includes(alias))
        );
        if (foundIdx !== -1) {
          colIndices[paramKey] = foundIdx;
        }
      }

      if (colIndices.article === undefined) {
        colIndices.article = isCol0Article ? 0 : 1;
      }

      // Если наименование не найдено алиасами, берем соседнюю колонку после артикула
      if (colIndices.name === undefined) {
        const nextCol = (colIndices.article ?? 0) + 1;
        if (nextCol < row.length) {
          colIndices.name = nextCol;
        }
      }

      // Если количество не найдено алиасами, ищем колонку с 'кол'/'qty'/'потребность'/'расход'
      if (colIndices.quantity === undefined) {
        const qtyIdx = stringRow.findIndex((c, idx) => 
          idx !== colIndices.article && 
          idx !== colIndices.name && 
          (/кол/i.test(c) || /qty/i.test(c) || /потреб/i.test(c) || /расход/i.test(c) || /к-во/i.test(c))
        );
        if (qtyIdx !== -1) colIndices.quantity = qtyIdx;
      }

      break;
    }
  }

  // 2. SECONDARY STRATEGY (Fallback, если в файле нет колонки "Артикул" в столбце A)
  if (headerRowIndex === -1) {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row)) continue;

      const stringRow = row.map(c => String(c ?? '').toLowerCase().trim());
      const tempIndices: Record<string, number> = {};

      for (const [paramKey, aliases] of Object.entries(mapping)) {
        const foundIdx = stringRow.findIndex(cell => 
          aliases.some(alias => cell === alias || cell.includes(alias))
        );
        if (foundIdx !== -1) {
          tempIndices[paramKey] = foundIdx;
        }
      }

      if ((tempIndices.name !== undefined || tempIndices.article !== undefined) && 
          (tempIndices.quantity !== undefined || tempIndices.name !== undefined)) {
        headerRowIndex = i;
        colIndices = tempIndices;
        break;
      }
    }
  }

  const results: Array<{ article?: string; name: string; quantity: number; unit?: string; category?: string; notes?: string }> = [];

  // If header found, extract tabular rows strictly below it
  if (headerRowIndex !== -1) {
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const rawName = colIndices.name !== undefined ? String(row[colIndices.name] ?? '').trim() : '';
      const rawArticle = colIndices.article !== undefined ? String(row[colIndices.article] ?? '').trim() : '';

      if (!rawName && !rawArticle) continue;

      // Filter out footer rows, repeated headers, or signoff lines
      if (/^(?:итого|всего|total|подпись|сдал|принял|руководитель)\b/i.test(rawName) || 
          /^(?:итого|всего|total)\b/i.test(rawArticle)) {
        continue;
      }
      if (/^артикул\b/i.test(rawArticle) && (/^наименование\b/i.test(rawName) || colIndices.name === undefined)) {
        continue;
      }

      let name = rawName || rawArticle;
      let article = rawArticle;

      // Extract Quantity
      let quantity = 1;
      if (colIndices.quantity !== undefined && row[colIndices.quantity] !== undefined) {
        const qStr = String(row[colIndices.quantity]).replace(',', '.').replace(/[^\d.]/g, '');
        const qNum = parseFloat(qStr);
        if (!isNaN(qNum) && qNum > 0) {
          quantity = Math.round(qNum * 100) / 100;
        }
      }

      // Unit
      let unit = 'шт';
      if (colIndices.unit !== undefined && row[colIndices.unit]) {
        unit = String(row[colIndices.unit]).trim() || 'шт';
      }

      // Category
      let category = '';
      if (colIndices.category !== undefined && row[colIndices.category]) {
        category = String(row[colIndices.category]).trim();
      }

      // Notes
      let notes = '';
      if (colIndices.notes !== undefined && row[colIndices.notes]) {
        notes = String(row[colIndices.notes]).trim();
      }

      // If quantity is embedded in name like "Петля Blum (12 шт)"
      if (quantity === 1) {
        const qtyMatch = name.match(/[\(\[\{]\s*(\d+(?:[.,]\d+)?)\s*(?:шт|компл|уп|п\.м\.?)\s*[\)\]\}]/i);
        if (qtyMatch) {
          const parsed = parseFloat(qtyMatch[1].replace(',', '.'));
          if (!isNaN(parsed) && parsed > 0) {
            quantity = parsed;
          }
        }
      }

      results.push({
        article: article || undefined,
        name,
        quantity,
        unit,
        category: category || undefined,
        notes: notes || undefined
      });
    }
  }

  return results;
}

/**
 * Fallback line-by-line parser for plain text specification (e.g. copy-pasted or Bazis text export)
 */
function parseTextLineByLine(
  text: string
): Array<{ article?: string; name: string; quantity: number; unit?: string; category?: string; notes?: string }> {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items: Array<{ article?: string; name: string; quantity: number; unit?: string; category?: string; notes?: string }> = [];

  for (const line of lines) {
    // Skip separators and headers
    if (line.startsWith('---') || line.startsWith('===') || line.startsWith('***')) continue;
    if (/^(наименование|ведомость|спецификация|заказ|фурнитура)/i.test(line) && line.length < 50) continue;

    // Pattern 1: "1. Петля Clip-top 110 Blum - 16 шт." or "Петля 110 ... 16 шт"
    const matchWithUnit = line.match(/^(?:(?:\d+[\.\)]\s*)?(?:\[([^\]]+)\]\s*)?)(.+?)(?:[\s—–:-]+|\t+)(\d+(?:[.,]\d+)?)\s*(шт|компл|п\.м|уп|комплекта?|штук[аи]?)?(?:\s*\((.*?)\))?$/i);
    if (matchWithUnit) {
      const article = matchWithUnit[1]?.trim();
      const name = matchWithUnit[2].trim();
      const qty = parseFloat(matchWithUnit[3].replace(',', '.'));
      const unit = matchWithUnit[4] || 'шт';
      const notes = matchWithUnit[5]?.trim();

      if (name && !isNaN(qty) && qty > 0) {
        items.push({
          article: article || undefined,
          name,
          quantity: qty,
          unit,
          notes: notes || undefined
        });
        continue;
      }
    }

    // Pattern 2: Tab-separated or multi-space line with number at end
    const tabParts = line.split(/\t+|\s{2,}/).map(p => p.trim()).filter(Boolean);
    if (tabParts.length >= 2) {
      const lastPart = tabParts[tabParts.length - 1];
      const qtyNum = parseFloat(lastPart.replace(',', '.'));
      if (!isNaN(qtyNum) && qtyNum > 0) {
        const name = tabParts.slice(0, tabParts.length - 1).join(' ');
        items.push({
          name,
          quantity: qtyNum,
          unit: 'шт'
        });
      }
    }
  }

  return items;
}
