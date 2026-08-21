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

// Patterns to exclude sheet board materials if mixed specification is uploaded
const EXCLUDED_MATERIALS_PATTERNS = [
  /лдсп/i,
  /мдф/i,
  /хдф/i,
  /двп/i,
  /фанера/i,
  /столешниц/i,
  /кромка/i,
  /кромкооблицов/i,
  /плита\s+\d+/i,
  /\d+\s*[xх*]\s*\d+\s*[xх*]\s*\d+/i // Dimensions pattern like 2800x2070x16
];

export function detectCategoryByName(name: string, fallbackCategory: string = 'Разное / Крепеж'): string {
  const lower = name.toLowerCase();
  for (const [catName, keywords] of Object.entries(HARDWARE_CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return catName;
      }
    }
  }
  return fallbackCategory;
}

export function isExcludedSheetMaterial(name: string): boolean {
  const lower = name.toLowerCase();
  // If it clearly mentions hardware parts (e.g. "стяжка для столешниц"), keep it
  if (lower.includes('стяжк') || lower.includes('петл') || lower.includes('крепеж') || lower.includes('уголок')) {
    return false;
  }
  return EXCLUDED_MATERIALS_PATTERNS.some(pat => pat.test(lower));
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
    const decoded = smartDecodeFile(uint8, fileName);
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
  const aggregatedMap = new Map<string, {
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

    // Filter out sheet materials if accidentally included
    if (isExcludedSheetMaterial(cleanName)) continue;

    const cleanArticle = (item.article || '').trim();
    const key = `${cleanArticle}:::${cleanName.toLowerCase()}`;
    const qty = Math.max(1, Number(item.quantity) || 1);
    const unit = (item.unit || 'шт').trim() || 'шт';
    const category = item.category?.trim() || detectCategoryByName(cleanName);
    const notes = item.notes?.trim();

    if (aggregatedMap.has(key)) {
      const existing = aggregatedMap.get(key)!;
      existing.quantity += qty;
      if (!existing.notes && notes) existing.notes = notes;
    } else {
      aggregatedMap.set(key, {
        article: cleanArticle || undefined,
        name: cleanName,
        quantity: qty,
        unit,
        category,
        notes: notes || undefined
      });
    }
  }

  // Transform into final OrderHardwareItem array
  const items: OrderHardwareItem[] = Array.from(aggregatedMap.values()).map((val, idx) => ({
    id: `hw-${Date.now()}-${idx + 1}`,
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
    totalItemsCount: items.length,
    totalQuantity,
    categoriesSummary,
    rawTextPreview
  };
}

/**
 * Parses rows (from Excel or CSV) matching column headers using aliases
 */
function parseTableRows(
  rows: any[][],
  mapping: Record<string, string[]>
): Array<{ article?: string; name: string; quantity: number; unit?: string; category?: string; notes?: string }> {
  if (!rows || rows.length === 0) return [];

  // Find header row
  let headerRowIndex = -1;
  let colIndices: Record<string, number> = {};

  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row)) continue;

    const stringRow = row.map(c => String(c || '').toLowerCase().trim());
    const tempIndices: Record<string, number> = {};

    for (const [paramKey, aliases] of Object.entries(mapping)) {
      const foundIdx = stringRow.findIndex(cell => 
        aliases.some(alias => cell === alias || cell.includes(alias))
      );
      if (foundIdx !== -1) {
        tempIndices[paramKey] = foundIdx;
      }
    }

    // Header requires at least name or article & quantity
    if ((tempIndices.name !== undefined || tempIndices.article !== undefined) && (tempIndices.quantity !== undefined || tempIndices.name !== undefined)) {
      headerRowIndex = i;
      colIndices = tempIndices;
      break;
    }
  }

  const results: Array<{ article?: string; name: string; quantity: number; unit?: string; category?: string; notes?: string }> = [];

  // If header found, extract tabular rows
  if (headerRowIndex !== -1) {
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const rawName = colIndices.name !== undefined ? String(row[colIndices.name] || '').trim() : '';
      const rawArticle = colIndices.article !== undefined ? String(row[colIndices.article] || '').trim() : '';

      if (!rawName && !rawArticle) continue;

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
