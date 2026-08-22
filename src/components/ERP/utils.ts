import { ProductionOrder, ProductionStageId } from './types';

export function formatDeadlineDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const cleanStr = String(dateStr).trim();
  
  // Format YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  const match = cleanStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = match[1];
    const monthIdx = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    if (months[monthIdx]) {
      return `${day} ${months[monthIdx]} ${year}`;
    }
  }

  // Try standard JS Date parsing
  try {
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const months = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
      ];
      return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
  } catch (e) {
    // ignore
  }

  return cleanStr;
}

export function orderRequiresEdging(order: ProductionOrder): boolean {
  if (order.totalEdgeM && order.totalEdgeM > 0) return true;
  if (order.birkaData?.allEdges && order.birkaData.allEdges.length > 0) return true;
  if (order.birkaData?.details) {
    return order.birkaData.details.some(d => !!(d.edgeL1 || d.edgeL2 || d.edgeW1 || d.edgeW2));
  }
  return false;
}

export function getNextRequiredStage(
  order: ProductionOrder, 
  currentStage: ProductionStageId,
  enabledStages?: ProductionStageId[]
): ProductionStageId | null {
  const hasEdge = orderRequiresEdging(order);
  const defaultSequence: ProductionStageId[] = ['queue', 'cutting', 'edging', 'cnc', 'facades', 'assembly', 'kitting', 'qc', 'packing', 'ready'];
  
  // Build active sequence maintaining custom user order if configured
  const activeSequence: ProductionStageId[] = (enabledStages && enabledStages.length > 0)
    ? ['queue', ...enabledStages.filter(s => s !== 'queue' && s !== 'ready' && s !== 'shipping'), 'ready']
    : defaultSequence;

  const currentIndex = activeSequence.indexOf(currentStage);
  if (currentIndex === -1) {
    return activeSequence.includes('cutting') ? 'cutting' : (activeSequence[1] || 'ready');
  }

  for (let i = currentIndex + 1; i < activeSequence.length; i++) {
    const nextSt = activeSequence[i];
    if (nextSt === 'edging' && !hasEdge) {
      // Skip edging stage because order has 0 edge meters!
      continue;
    }
    return nextSt;
  }
  return null;
}

// Russian ЙЦУКЕН to English QWERTY key mapping dictionary
const RU_TO_EN_MAP: Record<string, string> = {
  'й': 'q', 'ц': 'w', 'у': 'e', 'к': 'r', 'е': 't', 'н': 'y', 'г': 'u', 'ш': 'i', 'щ': 'o', 'з': 'p', 'х': '[', 'ъ': ']',
  'ф': 'a', 'ы': 's', 'в': 'd', 'а': 'f', 'п': 'g', 'р': 'h', 'о': 'j', 'л': 'k', 'д': 'l', 'ж': ';', 'э': "'",
  'я': 'z', 'ч': 'x', 'с': 'c', 'м': 'v', 'и': 'b', 'т': 'n', 'ь': 'm', 'б': ',', 'ю': '.', 'ё': '`',
  'Й': 'Q', 'Ц': 'W', 'У': 'E', 'К': 'R', 'Е': 'T', 'Н': 'Y', 'Г': 'U', 'Ш': 'I', 'Щ': 'O', 'З': 'P', 'Х': '{', 'Ъ': '}',
  'Ф': 'A', 'Ы': 'S', 'В': 'D', 'А': 'F', 'П': 'G', 'Р': 'H', 'О': 'J', 'Л': 'K', 'Д': 'L', 'Ж': ':', 'Э': '"',
  'Я': 'Z', 'Ч': 'X', 'С': 'C', 'М': 'V', 'И': 'B', 'Т': 'N', 'Ь': 'M', 'Б': '<', 'Ю': '>', 'Ё': '~',
  '№': '#'
};

/**
 * Converts a single character or key from Russian keyboard layout to English QWERTY.
 */
export function convertRuCharToEn(char: string): string {
  if (!char) return '';
  return RU_TO_EN_MAP[char] || char;
}

/**
 * Converts an entire string from Russian keyboard layout to English QWERTY.
 * Ensures that barcodes, badge QR codes (ERP_BADGE:..., PKG-..., etc.), and
 * order codes scanned via hardware barcode/2D scanners or entered manually
 * are always processed in English regardless of active OS input language.
 */
export function convertRuToEnLayout(text: string): string {
  if (!text) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    result += RU_TO_EN_MAP[ch] || ch;
  }
  return result;
}

/**
 * Normalizes scanned barcodes or QR text by trimming, cleaning and converting layout.
 */
export function normalizeBarcodeScan(code: string): string {
  if (!code) return '';
  const clean = code.trim();
  return convertRuToEnLayout(clean);
}

/**
 * Voice Assistant Mute controls
 */
export function isVoiceMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('erp_voice_disabled') === 'true';
}

export function setVoiceMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  if (muted) {
    localStorage.setItem('erp_voice_disabled', 'true');
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } else {
    localStorage.removeItem('erp_voice_disabled');
  }
  window.dispatchEvent(new Event('erp_voice_toggle'));
}

export function toggleVoiceMuted(): boolean {
  const newMuted = !isVoiceMuted();
  setVoiceMuted(newMuted);
  return newMuted;
}

/**
 * Text-To-Speech assistant voice synthesizer (Web Speech API)
 */
export function speakText(text: string) {
  if (isVoiceMuted()) return;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ru-RU';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }
}
export function evaluateBirkaQrTemplate(template: string, detail: any, orderNumber: string): string {
  const t = template || '{orderNumber}_{pos}';
  
  const getFieldVal = (placeholder: string): string => {
    const key = placeholder.trim().toLowerCase();
    switch (key) {
      case 'ordernumber':
      case 'order_number':
      case 'order':
      case 'заказ':
      case 'номер заказа':
      case 'сделка':
      case 'номер_заказа':
      case 'зак':
      case '№ заказа':
      case '№заказа':
        return String(detail.orderNumber || orderNumber || '');
        
      case 'pos':
      case 'position':
      case 'id':
      case 'labelnumber':
      case 'позиция':
      case 'поз':
      case '№ детали':
      case 'номер детали':
      case 'деталь №':
      case 'деталь':
      case '№':
      case '№детали':
      case 'номер_детали':
      case 'обозначение':
      case 'индекс':
      case 'код детали':
        return String(detail.labelNumber || '');
        
      case 'name':
      case 'title':
      case 'part':
      case 'наименование':
      case 'название':
      case 'имя':
      case 'элемент':
        return String(detail.name || '');
        
      case 'material':
      case 'mat':
      case 'материал':
      case 'плита':
      case 'лдсп':
      case 'мдф':
      case 'хдф':
      case 'мат':
        return String(detail.material || '');
        
      case 'length':
      case 'len':
      case 'l':
      case 'длина':
      case 'длин':
      case 'l_мм':
        return String(detail.length || '');
        
      case 'width':
      case 'wid':
      case 'w':
      case 'ширина':
      case 'шир':
      case 'w_мм':
        return String(detail.width || '');
        
      case 'thickness':
      case 'thick':
      case 't':
      case 'толщина':
      case 'толщ':
      case 't_мм':
        return String(detail.thickness || '');
        
      case 'quantity':
      case 'qty':
      case 'count':
      case 'количество':
      case 'кол':
      case 'шт':
      case 'кол-во':
      case 'к-во':
        return String(detail.quantity || '');
        
      case 'barcode':
      case 'штрихкод':
      case 'штрих':
      case 'код':
      case 'qr':
        return String(detail.barcode || '');
        
      default:
        // Try looking directly in detail keys
        if (detail[placeholder] !== undefined) {
          return String(detail[placeholder]);
        }
        // Try case-insensitive matching
        const foundKey = Object.keys(detail).find(k => k.toLowerCase() === key);
        if (foundKey) {
          return String(detail[foundKey]);
        }
        return '';
    }
  };

  // Replace {placeholder} with values
  return t.replace(/\{([^{}]+)\}/g, (_match, p1) => {
    return getFieldVal(p1);
  });
}

/**
 * Cleans raw scanned string from barcode / 2D scanner artifacts, control characters,
 * AIM code identifiers (like ]Q1, ]C1), hashes, and normalize decimal commas.
 */
export function cleanRawScannedString(str: string): string {
  if (!str) return '';
  return String(str)
    // Remove non-printable control chars & hidden UTF chars
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\uFEFF]/g, '')
    // Remove hardware scanner AIM code identifier prefix (e.g. ]Q1, ]d2, ]C1, ]e0)
    .replace(/^\][a-zA-Z0-9]{2,3}/, '')
    .trim()
    // Remove leading hashes, №, words like "Поз.", "Деталь", "Позиция", "Item", "Part"
    .replace(/^[#№\s]+/, '')
    .replace(/^(поз\.?|дет\.?|позиция|деталь|номер|item|pos|part|поз|дет)\s*[:#№\-_\s]*/i, '')
    // Replace commas, semicolons, and slashes between digits with dot (e.g. 20,02 -> 20.02, 20/02 -> 20.02)
    .replace(/(\d+)[,;](\d+)/g, '$1.$2')
    .trim();
}

/**
 * Normalizes a part number by stripping extraneous symbols, leading hashes, and word prefixes.
 */
export function normalizePartNumber(str: string): string {
  return cleanRawScannedString(str);
}

/**
 * Breaks a part number or composite token into numeric segments.
 * e.g. "00.00" -> [0, 0], "20.02" -> [20, 2], "20.2" -> [20, 2], "01.02.03" -> [1, 2, 3], "1.2" -> [1, 2]
 */
export function getPartNumberSegments(str: string): number[] | null {
  const clean = cleanRawScannedString(str);
  if (!clean) return null;
  const parts = clean.split(/[\.\-_/\\:,;]/).map(p => p.trim()).filter(Boolean);
  if (parts.length > 0 && parts.every(p => /^\d+$/.test(p))) {
    return parts.map(p => parseInt(p, 10));
  }
  return null;
}

/**
 * Simple, Bulletproof Barcode & QR Code Matcher.
 * Matches:
 * 1. `{orderNumber}_{pos}` (e.g. "11-0626-11_20.02")
 * 2. `{pos}` (e.g. "20.02")
 * 3. Any code ending in `_{pos}` (e.g. "ANY_ORDER_PREFIX_20.02")
 * Handles Russian/English keyboard layout conversion, whitespace/quotes/AIM removal.
 */
export function matchDetailToScannedCode(
  scannedCode: string, 
  detail: any, 
  template?: string, 
  orderNumber?: string,
  matchingMode?: string
): boolean {
  if (!scannedCode || !detail) return false;

  const rawScan = String(scannedCode).trim();
  if (!rawScan) return false;

  // Clean and prepare normalized variants
  const cleanScan = cleanRawScannedString(rawScan);
  const lowerScan = cleanScan.toLowerCase();
  const enScan = cleanRawScannedString(convertRuToEnLayout(rawScan)).toLowerCase();

  // Detail's position number from the birka file (e.g. "20.02")
  const rawPos = String(
    detail.labelNumber ?? 
    detail.pos ?? 
    detail.position ?? 
    detail.partNo ?? 
    detail.itemNo ?? 
    detail.label ?? 
    detail.code ?? 
    ''
  ).trim();

  const cleanPos = cleanRawScannedString(rawPos);
  const lowerPos = cleanPos.toLowerCase();
  const enPos = cleanRawScannedString(convertRuToEnLayout(rawPos)).toLowerCase();

  if (!lowerPos) return false;

  const cleanOrder = cleanRawScannedString(String(orderNumber || detail.orderNumber || '')).trim();
  const lowerOrder = cleanOrder.toLowerCase();
  const enOrder = cleanRawScannedString(convertRuToEnLayout(cleanOrder)).toLowerCase();

  // 1. Direct match with position number (e.g. scan "20.02", pos "20.02")
  if (lowerScan === lowerPos || enScan === lowerPos || lowerScan === enPos || enScan === enPos) {
    return true;
  }

  // 2. Standard format: "{orderNumber}_{pos}" (e.g. scan "11-0626-11_20.02")
  if (lowerOrder) {
    const expectedComposite = `${lowerOrder}_${lowerPos}`;
    const expectedEnComposite = `${enOrder}_${enPos}`;

    if (
      lowerScan === expectedComposite || 
      enScan === expectedComposite || 
      lowerScan === expectedEnComposite || 
      enScan === expectedEnComposite
    ) {
      return true;
    }

    // Also support dash separator "{orderNumber}-{pos}"
    const expectedDash = `${lowerOrder}-${lowerPos}`;
    if (lowerScan === expectedDash || enScan === expectedDash) {
      return true;
    }
  }

  // 3. Scan ends with "_{pos}" or "-{pos}" (e.g. "PREFIX_20.02" or "11-0626-11_20.02")
  if (
    lowerScan.endsWith(`_${lowerPos}`) || 
    enScan.endsWith(`_${lowerPos}`) || 
    lowerScan.endsWith(`_${enPos}`) ||
    lowerScan.endsWith(`-${lowerPos}`) ||
    enScan.endsWith(`-${lowerPos}`)
  ) {
    return true;
  }

  // 4. Also check numeric segments if formatting differs (e.g. 20.02 vs 20.2 or 20,02)
  const posSegs = getPartNumberSegments(lowerPos);
  const scanSegs = getPartNumberSegments(lowerScan);
  if (posSegs && scanSegs && posSegs.length === scanSegs.length && posSegs.length > 0) {
    if (posSegs.every((v, i) => v === scanSegs[i])) {
      return true;
    }
  }

  // 5. Direct barcode / ID matches if assigned
  if (detail.barcode) {
    const dBarcode = cleanRawScannedString(String(detail.barcode)).toLowerCase();
    if (dBarcode && (dBarcode === lowerScan || dBarcode === enScan)) {
      return true;
    }
  }

  if (detail.id) {
    const dId = String(detail.id).trim().toLowerCase();
    if (dId && (dId === lowerScan || dId === enScan)) {
      return true;
    }
  }

  return false;
}

/**
 * Diagnostics & Decomposition helper for testing barcode parsing in UI & Settings.
 */
export interface DecomposedBarcodeResult {
  rawCode: string;
  orderNumberDetected: string | null;
  partNumberDetected: string | null;
  tokens: string[];
  isMatch: boolean;
}

export function decomposeBarcodeForDiagnostics(
  rawCode: string, 
  orderNumber?: string,
  sampleDetail?: any,
  template?: string
): DecomposedBarcodeResult {
  const clean = String(rawCode || '').trim();
  if (!clean) {
    return {
      rawCode: '',
      orderNumberDetected: null,
      partNumberDetected: null,
      tokens: [],
      isMatch: false
    };
  }

  const tokens = clean.split(/[_|/\\;:,\t\n\s]+/).map(t => t.trim()).filter(Boolean);
  
  let orderDetected: string | null = null;
  let partDetected: string | null = null;

  if (tokens.length >= 2) {
    orderDetected = tokens[0];
    partDetected = tokens[1];
  } else if (tokens.length === 1) {
    partDetected = tokens[0];
  }

  const isMatch = sampleDetail 
    ? matchDetailToScannedCode(clean, sampleDetail, template, orderNumber || '')
    : false;

  return {
    rawCode: clean,
    orderNumberDetected: orderDetected,
    partNumberDetected: partDetected,
    tokens,
    isMatch
  };
}
