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
 * Universal Decomposer & Matcher for Composite Barcodes and Part Numbers.
 * Supports:
 * - Scanned composite QR codes from Bazis: e.g. "11-0626-11_20.02", "00-0000-00_00.00", "0000-0000_00.00.00", "24-0512-01_01.02", "00-0000-00-00.00", "00-0000-00/00.00", "00-0000-00|00.00"
 * - Direct input of part number: e.g. "20.02", "20.2", "20,02", "20_02", "00.00", "00.00.00", "01.02", "1.2", "1"
 * - Layout conversion (Russian / English QWERTY keyboard)
 * - Custom templates configured in settings
 */
export function matchDetailToScannedCode(
  scannedCode: string, 
  detail: any, 
  template: string | undefined, 
  orderNumber: string,
  matchingMode?: 'template' | 'smart_contains'
): boolean {
  if (!scannedCode || !detail) return false;

  const rawScan = String(scannedCode).trim();
  if (!rawScan) return false;

  // 1. Prepare normalized strings and keyboard layouts
  const cleanScan = cleanRawScannedString(rawScan);
  const lowerScan = cleanScan.toLowerCase();
  const enScan = cleanRawScannedString(convertRuToEnLayout(rawScan)).toLowerCase();

  // Detail's own fields (safely check all aliases)
  const rawLabel = String(
    detail.labelNumber ?? 
    detail.pos ?? 
    detail.position ?? 
    detail.partNo ?? 
    detail.itemNo ?? 
    detail.label ?? 
    detail.code ?? 
    ''
  ).trim();
  
  const cleanLabel = cleanRawScannedString(rawLabel);
  const lowerLabel = cleanLabel.toLowerCase();
  const enLabel = cleanRawScannedString(convertRuToEnLayout(rawLabel)).toLowerCase();

  const dId = String(detail.id || '').trim().toLowerCase();
  const dBarcode = cleanRawScannedString(String(detail.barcode || '')).toLowerCase();
  const dName = String(detail.name || '').trim().toLowerCase();
  const dNotes = String(detail.notes || '').trim().toLowerCase();

  const cleanOrder = cleanRawScannedString(String(orderNumber || detail.orderNumber || ''));
  const lowerOrder = cleanOrder.toLowerCase();
  const enOrder = cleanRawScannedString(convertRuToEnLayout(cleanOrder)).toLowerCase();

  // Helper for alphanumeric-only comparison (stripping all punctuation)
  const makeAlphaNum = (s: string) => s.replace(/[^a-z0-9а-яё]/gi, '').toLowerCase();
  const alphaScan = makeAlphaNum(lowerScan);
  const alphaEnScan = makeAlphaNum(enScan);
  const alphaLabel = makeAlphaNum(lowerLabel);

  // ----------------------------------------------------
  // LEVEL 1: Direct Exact Matches on Part Number, Barcode, or ID
  // ----------------------------------------------------
  if (lowerLabel && (
    lowerLabel === lowerScan || 
    lowerLabel === enScan || 
    enLabel === lowerScan || 
    enLabel === enScan ||
    cleanLabel === cleanScan
  )) {
    return true;
  }

  if (dBarcode && (
    dBarcode === lowerScan || 
    dBarcode === enScan || 
    cleanRawScannedString(dBarcode) === cleanScan
  )) {
    return true;
  }

  if (dId && (dId === lowerScan || dId === enScan)) {
    return true;
  }

  if (dName && (dName === lowerScan || dName === enScan)) {
    return true;
  }

  // ----------------------------------------------------
  // LEVEL 2: Segment & Alphanumeric Equality for Part Numbers
  // e.g. "20.02" vs "20.2", "20,02" vs "20.02", "00.00" vs "0.0", "01.02" vs "1.2", "00.00.00" vs "0.0.0"
  // ----------------------------------------------------
  if (alphaLabel && alphaLabel.length > 0) {
    if (alphaLabel === alphaScan || alphaLabel === alphaEnScan) {
      return true;
    }
  }

  const labelSegs = getPartNumberSegments(lowerLabel);
  const scanSegs = getPartNumberSegments(lowerScan);
  if (labelSegs && scanSegs && labelSegs.length === scanSegs.length && labelSegs.length > 0) {
    if (labelSegs.every((val, i) => val === scanSegs[i])) {
      return true;
    }
  }

  // ----------------------------------------------------
  // LEVEL 3: Standard Composite Formats (OrderNumber + Separator + PartNumber)
  // e.g. `${order}_${pos}`, `${order}-${pos}`, `${order}/${pos}`, `${order}|${pos}`, `${order} ${pos}`
  // ----------------------------------------------------
  if (cleanOrder && lowerLabel) {
    const compositeVariants = [
      `${lowerOrder}_${lowerLabel}`,
      `${lowerOrder}-${lowerLabel}`,
      `${lowerOrder}/${lowerLabel}`,
      `${lowerOrder}|${lowerLabel}`,
      `${lowerOrder} ${lowerLabel}`,
      `${lowerOrder}.${lowerLabel}`,
      `${enOrder}_${enLabel}`,
      `${enOrder}-${enLabel}`,
      `${enOrder}/${enLabel}`,
      `${enOrder}|${enLabel}`,
      `${enOrder} ${enLabel}`,
      `${enOrder}.${enLabel}`,
    ];

    for (const variant of compositeVariants) {
      const cleanVar = cleanRawScannedString(variant).toLowerCase();
      if (cleanVar === lowerScan || cleanVar === enScan || variant === lowerScan || variant === enScan) {
        return true;
      }
      if (makeAlphaNum(variant) === alphaScan || makeAlphaNum(variant) === alphaEnScan) {
        return true;
      }
    }
  }

  // ----------------------------------------------------
  // LEVEL 4: Custom Template Evaluation from Settings
  // ----------------------------------------------------
  const activeTemplate = template || '{orderNumber}_{pos}';
  const evaluated = cleanRawScannedString(evaluateBirkaQrTemplate(activeTemplate, detail, cleanOrder)).toLowerCase();
  const evaluatedEn = cleanRawScannedString(convertRuToEnLayout(evaluated)).toLowerCase();

  if (evaluated && (
    evaluated === lowerScan || 
    evaluated === enScan || 
    evaluatedEn === lowerScan || 
    evaluatedEn === enScan
  )) {
    return true;
  }
  const evaluatedAlpha = makeAlphaNum(evaluated);
  if (evaluatedAlpha && evaluatedAlpha.length > 0 && (evaluatedAlpha === alphaScan || evaluatedAlpha === alphaEnScan)) {
    return true;
  }

  // ----------------------------------------------------
  // LEVEL 5: Intelligent Token & Delimiter Decomposition
  // Splits scanned composite string by _, |, /, \, ;, :, space, etc.
  // e.g. "11-0626-11_20.02" -> tokens: ["11-0626-11", "20.02", "20", "02"]
  // ----------------------------------------------------
  const splitTokens = (str: string) => {
    const directTokens = str.split(/[_|/\\;:,\t\n\s]+/).map(t => t.trim()).filter(Boolean);
    // Also include trailing token after last underscore or dash or slash
    const lastPart = str.split(/[_|/\\:;\s]+/).pop()?.trim();
    if (lastPart && !directTokens.includes(lastPart)) {
      directTokens.push(lastPart);
    }
    return directTokens;
  };

  const allTokens = [
    ...splitTokens(lowerScan), 
    ...splitTokens(enScan),
    ...splitTokens(rawScan.toLowerCase())
  ];

  // If order number is present as a prefix, strip it and test the remaining token
  if (cleanOrder) {
    const escapedOrder = cleanOrder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const orderPrefixRegex = new RegExp(`^${escapedOrder}[_\\-\\/\\\\|;:\\s]+`, 'i');
    if (orderPrefixRegex.test(lowerScan)) {
      const remainder = lowerScan.replace(orderPrefixRegex, '').trim();
      if (remainder) allTokens.push(remainder);
    }
    if (orderPrefixRegex.test(enScan)) {
      const remainder = enScan.replace(orderPrefixRegex, '').trim();
      if (remainder) allTokens.push(remainder);
    }
  }

  // Extract regex suffix match for pattern like "_20.02", "-20.02", "_00.00", "_00.00.00"
  const regexSuffixMatch = lowerScan.match(/[_|/\\:\-\s]+(\d+(?:[\.,_]\d+)+)$/);
  if (regexSuffixMatch && regexSuffixMatch[1]) {
    allTokens.push(regexSuffixMatch[1]);
  }

  for (const token of allTokens) {
    const cleanToken = cleanRawScannedString(token);
    if (!cleanToken) continue;

    // Check token against label
    if (cleanToken === lowerLabel || cleanToken === enLabel || cleanToken.toLowerCase() === lowerLabel) {
      return true;
    }

    // Check alphanumeric token
    const tokenAlpha = makeAlphaNum(cleanToken);
    if (alphaLabel && tokenAlpha && tokenAlpha === alphaLabel) {
      return true;
    }

    // Check numeric segments (e.g. 20.02 vs 20.2 or 20,02)
    const tokenSegs = getPartNumberSegments(cleanToken);
    if (labelSegs && tokenSegs && labelSegs.length === tokenSegs.length && labelSegs.length > 0) {
      if (labelSegs.every((v, idx) => v === tokenSegs[idx])) {
        return true;
      }
    }
  }

  // ----------------------------------------------------
  // LEVEL 6: Name & Notes Substring Matching
  // e.g. Part name is "Боковина (20.02)" or "20.02 Полка" and scan is "20.02" or "11-0626-11_20.02"
  // ----------------------------------------------------
  if (dName && lowerLabel && (dName.includes(lowerLabel) || dName.includes(` ${lowerLabel}`) || dName.includes(`(${lowerLabel})`))) {
    for (const token of allTokens) {
      const cToken = cleanRawScannedString(token);
      if (cToken && (dName.includes(cToken) || dName.includes(` ${cToken}`))) {
        return true;
      }
    }
  }

  // Check if detail name starts with or equals the scanned code or token
  for (const token of allTokens) {
    const cToken = cleanRawScannedString(token);
    if (cToken && cToken.length >= 2) {
      if (dName.startsWith(cToken) || dNotes.includes(cToken)) {
        return true;
      }
    }
  }

  // ----------------------------------------------------
  // LEVEL 7: Smart Multi-Parameter Containment
  // ----------------------------------------------------
  if (alphaLabel && alphaLabel.length >= 2) {
    // If order is in scan and label is in scan
    if (cleanOrder) {
      const orderAlpha = makeAlphaNum(lowerOrder);
      if (orderAlpha.length >= 2) {
        if ((alphaScan.includes(orderAlpha) || alphaEnScan.includes(orderAlpha)) &&
            (alphaScan.includes(alphaLabel) || alphaEnScan.includes(alphaLabel))) {
          return true;
        }
      }
    }
    // If label is at the end of the scanned code (e.g. "..._2002" or "...2002")
    if (alphaScan.endsWith(alphaLabel) || alphaEnScan.endsWith(alphaLabel)) {
      return true;
    }
  }

  if (evaluated.length >= 4 && (lowerScan.includes(evaluated) || enScan.includes(evaluatedEn))) {
    return true;
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
