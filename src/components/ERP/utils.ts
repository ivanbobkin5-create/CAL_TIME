import { ProductionOrder, ProductionStageId } from './types';

export function getDetailPositionDisplay(
  rawLabelNumber: string | number | undefined | null,
  orderNumber?: string,
  fallbackIndex?: number
): string {
  if (rawLabelNumber === undefined || rawLabelNumber === null || rawLabelNumber === '') {
    return fallbackIndex !== undefined ? String(fallbackIndex) : '—';
  }

  let str = String(rawLabelNumber).trim()
    .replace(/^[#№\s]+/, '')
    .replace(/^(поз\.?|дет\.?|позиция|деталь|номер|item|pos)\s*/i, '')
    .trim();

  if (!str) {
    return fallbackIndex !== undefined ? String(fallbackIndex) : '—';
  }

  if (orderNumber) {
    const rawOrd = String(orderNumber).trim();
    const cleanOrd = rawOrd
      .replace(/^[#№\s]+/, '')
      .replace(/^(зак|order|проект|№|номер)\s*/i, '')
      .trim();

    const candidates = Array.from(new Set([rawOrd, cleanOrd].filter(Boolean)));

    for (const cand of candidates) {
      const lowerCand = cand.toLowerCase();
      const lowerStr = str.toLowerCase();

      if (lowerStr === lowerCand) {
        return fallbackIndex !== undefined ? String(fallbackIndex) : '1';
      }

      for (const sep of ['_', '-', '/', '.', ' ']) {
        const prefix = lowerCand + sep;
        if (lowerStr.startsWith(prefix)) {
          str = str.substring(prefix.length).trim();
          break;
        }
      }
    }
  }

  return str || (fallbackIndex !== undefined ? String(fallbackIndex) : '—');
}

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
  const defaultSequence: ProductionStageId[] = ['queue', 'cutting', 'edging', 'cnc', 'facades', 'assembly', 'kitting', 'qc', 'packing', 'shipping', 'ready'];
  
  // Build active sequence maintaining custom user order if configured
  const activeSequence: ProductionStageId[] = (enabledStages && enabledStages.length > 0)
    ? ['queue', ...enabledStages.filter(s => s !== 'queue' && s !== 'ready'), 'ready']
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

export function getStageNameRussian(stageId?: string | null): string {
  if (!stageId) return 'Завершение';
  const stageMap: Record<string, string> = {
    queue: 'Очередь / Запуск',
    cutting: 'Распил',
    edging: 'Кромкооблицовка',
    cnc: 'Присадка ЧПУ',
    facades: 'Фасады',
    assembly: 'Сборка',
    kitting: 'Комплектовка',
    qc: 'Контроль ОТК',
    packing: 'Упаковка',
    ready: 'Готово к отгрузке',
    shipping: 'Отгрузка'
  };
  return stageMap[stageId] || stageId;
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

// English QWERTY to Russian ЙЦУКЕН key mapping dictionary
const EN_TO_RU_MAP: Record<string, string> = {
  'q': 'й', 'w': 'ц', 'e': 'у', 'r': 'к', 't': 'е', 'y': 'н', 'u': 'г', 'i': 'ш', 'o': 'щ', 'p': 'з', '[': 'х', ']': 'ъ',
  'a': 'ф', 's': 'ы', 'd': 'в', 'f': 'а', 'g': 'п', 'h': 'р', 'j': 'о', 'k': 'л', 'l': 'д', ';': 'ж', "'": 'э',
  'z': 'я', 'x': 'ч', 'c': 'с', 'v': 'м', 'b': 'и', 'n': 'т', 'm': 'ь', ',': 'б', '.': 'ю', '`': 'ё',
  'Q': 'Й', 'W': 'Ц', 'E': 'У', 'R': 'К', 'T': 'Е', 'Y': 'Н', 'U': 'Г', 'I': 'Ш', 'O': 'Щ', 'P': 'З', '{': 'Х', '}': 'Ъ',
  'A': 'Ф', 'S': 'Ы', 'D': 'В', 'F': 'А', 'G': 'П', 'H': 'Р', 'J': 'О', 'K': 'Л', 'L': 'Д', ':': 'Ж', '"': 'Э',
  'Z': 'Я', 'X': 'Ч', 'C': 'С', 'V': 'М', 'B': 'И', 'N': 'Т', 'M': 'Ь', '<': 'Б', '>': 'Ю', '~': 'Ё',
  '#': '№'
};

/**
 * Converts a single character or key from Russian keyboard layout to English QWERTY.
 */
export function convertRuCharToEn(char: string): string {
  if (!char) return '';
  return RU_TO_EN_MAP[char] || char;
}

/**
 * Converts an entire string from English QWERTY layout to Russian ЙЦУКЕН.
 */
export function convertEnToRuLayout(text: string): string {
  if (!text) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    result += EN_TO_RU_MAP[ch] || ch;
  }
  return result;
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
 * Normalizes scanned barcodes or QR text from cameras or hardware scanners.
 * Extracts payload from passport URLs (e.g. https://domain.com/p/PKG-123),
 * handles URL decoding, strips scanner control characters, and cleans the code.
 */
export function normalizeBarcodeScan(code: string): string {
  if (!code) return '';
  let clean = String(code).trim();
  if (!clean) return '';

  // Extract path payload if it's a passport URL (e.g. http://.../p/PKG-123 or https://.../p/PKG-%D0%97...)
  if (clean.includes('/p/')) {
    const afterP = clean.split('/p/')[1] || '';
    clean = afterP.split('?')[0].split('#')[0] || clean;
  } else if (clean.includes('/passport/')) {
    const afterPass = clean.split('/passport/')[1] || '';
    clean = afterPass.split('?')[0].split('#')[0] || clean;
  } else if (clean.includes('http://') || clean.includes('https://')) {
    const lastPart = clean.split('/').pop() || '';
    clean = lastPart.split('?')[0].split('#')[0] || clean;
  }

  // Handle URL-encoded characters (e.g. %D0%97%D0%B0%D0%BA%D0%B0%D0%B7)
  try {
    if (clean.includes('%')) {
      clean = decodeURIComponent(clean);
    }
  } catch (e) {
    // ignore
  }

  clean = cleanRawScannedString(clean);

  return clean;
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
 * Audio synthesizer for scan and action sound effects (beeps)
 */
export function playSoundEffect(type: 'success' | 'alert' | 'error' = 'success') {
  if (isVoiceMuted()) return;
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'alert') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    // ignore audio context restrictions
  }
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
    // Replace commas and semicolons between digits with dot (e.g. 20,02 -> 20.02)
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
 * Compares two position numbers/labels hierarchically.
 * Priority 1: First numeric segment (e.g. "01" vs "02")
 * Priority 2: Second numeric segment (e.g. "01" vs "02")
 * Priority 3: Third numeric segment if exists
 * Handles dotted numbers like "01.01", "01.02", "02.01", "02.02", "1.1", "1.2", "01.09", "01.10", "20.01".
 * If segments are equal, falls back to string locale comparison.
 */
export function comparePositionNumbers(aStr: string | undefined | null, bStr: string | undefined | null): number {
  const rawA = String(aStr || '').trim();
  const rawB = String(bStr || '').trim();

  if (!rawA && !rawB) return 0;
  if (!rawA) return 1;
  if (!rawB) return -1;
  if (rawA === rawB) return 0;

  const cleanA = cleanRawScannedString(rawA);
  const cleanB = cleanRawScannedString(rawB);

  // Split into segments by standard delimiters: dot, hyphen, underscore, slash, colon, comma, space
  const segsA = cleanA.split(/[\.\-_/\\:,;\s]+/).filter(Boolean);
  const segsB = cleanB.split(/[\.\-_/\\:,;\s]+/).filter(Boolean);

  const minLen = Math.min(segsA.length, segsB.length);

  for (let i = 0; i < minLen; i++) {
    const sA = segsA[i];
    const sB = segsB[i];

    const isNumA = /^\d+$/.test(sA);
    const isNumB = /^\d+$/.test(sB);

    if (isNumA && isNumB) {
      const numA = parseInt(sA, 10);
      const numB = parseInt(sB, 10);
      if (numA !== numB) {
        return numA - numB;
      }
      // Same numeric value (e.g. "01" vs "1"), sort shorter/padded string first
      if (sA.length !== sB.length) {
        return sA.length - sB.length;
      }
    } else {
      const cmp = sA.localeCompare(sB, undefined, { numeric: true, sensitivity: 'base' });
      if (cmp !== 0) return cmp;
    }
  }

  if (segsA.length !== segsB.length) {
    return segsA.length - segsB.length;
  }

  return cleanA.localeCompare(cleanB, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Simple, Bulletproof Barcode & QR Code Matcher.
 * Matches:
 * 1. `{orderNumber}_{pos}` (e.g. "11-0626-11_20.02")
 * 2. `{pos}` (e.g. "20.02" or "20,02")
 * 3. Any code ending in `_{pos}` or `-{pos}` or `/{pos}` (e.g. "ANY_ORDER_PREFIX_20.02")
 * 4. Substring token search: if the scanned string contains `20.02` preceded/followed by separator or boundary
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

  // Direct barcode match from birka file column
  if (detail.barcode) {
    const dBarcode = cleanRawScannedString(String(detail.barcode)).toLowerCase();
    const dBarcodeEn = cleanRawScannedString(convertRuToEnLayout(String(detail.barcode))).toLowerCase();
    if (dBarcode && (dBarcode === lowerScan || dBarcode === enScan || dBarcodeEn === lowerScan || dBarcodeEn === enScan)) {
      return true;
    }
  }

  // Direct ID matches
  if (detail.id) {
    const dId = String(detail.id).trim().toLowerCase();
    if (dId && (dId === lowerScan || dId === enScan)) {
      return true;
    }
  }

  if (!lowerPos) return false;

  // 1. Direct match with position number (e.g. scan "20.02", pos "20.02")
  if (lowerScan === lowerPos || enScan === lowerPos || lowerScan === enPos || enScan === enPos) {
    return true;
  }

  // Direct match ignoring leading zeroes in segments (e.g. "20.02" vs "20.2" or "20,02")
  const posSegs = getPartNumberSegments(lowerPos);
  const scanSegs = getPartNumberSegments(lowerScan);
  if (posSegs && scanSegs && posSegs.length === scanSegs.length && posSegs.length > 0) {
    if (posSegs.every((v, i) => v === scanSegs[i])) {
      return true;
    }
  }

  // 2. Order Numbers: check BOTH detail.orderNumber (from Birka file!) AND orderNumber (from ERP order)
  const orderCandidates = [
    detail.orderNumber,
    orderNumber
  ].filter(Boolean).map(o => cleanRawScannedString(String(o)).trim().toLowerCase());

  for (const ord of orderCandidates) {
    if (!ord) continue;
    const enOrd = cleanRawScannedString(convertRuToEnLayout(ord)).toLowerCase();

    const expectedComposites = [
      `${ord}_${lowerPos}`,
      `${enOrd}_${enPos}`,
      `${ord}-${lowerPos}`,
      `${enOrd}-${enPos}`,
      `${ord}/${lowerPos}`,
      `${enOrd}/${enPos}`
    ];

    if (expectedComposites.some(exp => lowerScan === exp || enScan === exp)) {
      return true;
    }
  }

  // 3. Scan ends with "_{pos}" or "-{pos}" or "/{pos}" (e.g. "11-0626-11_20.02" ends with "_20.02")
  if (
    lowerScan.endsWith(`_${lowerPos}`) || 
    enScan.endsWith(`_${lowerPos}`) || 
    lowerScan.endsWith(`_${enPos}`) ||
    lowerScan.endsWith(`-${lowerPos}`) || 
    enScan.endsWith(`-${lowerPos}`) ||
    lowerScan.endsWith(`/${lowerPos}`) || 
    enScan.endsWith(`/${lowerPos}`)
  ) {
    return true;
  }

  // 4. Token breakdown: scan string separated by _, -, /, \, |, space
  const scanTokens = lowerScan.split(/[_|/\\;:,\-\s]+/).map(t => t.trim()).filter(Boolean);
  const enTokens = enScan.split(/[_|/\\;:,\-\s]+/).map(t => t.trim()).filter(Boolean);
  
  if (scanTokens.includes(lowerPos) || scanTokens.includes(enPos) || enTokens.includes(lowerPos) || enTokens.includes(enPos)) {
    return true;
  }

  // Token numeric segments comparison (e.g. token "20.2" matches "20.02")
  if (posSegs && posSegs.length > 0) {
    for (const t of [...scanTokens, ...enTokens]) {
      const tSegs = getPartNumberSegments(t);
      if (tSegs && tSegs.length === posSegs.length && tSegs.every((v, i) => v === posSegs[i])) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Robust Package QR/Barcode & Manual ID Matcher.
 * Matches packages on Shipping/Dispatch and Packaging stages against:
 * - Scanned URLs (e.g. https://domain.com/p/PKG-%D0%97%D0%B0%D0%BA%D0%B0%D0%B71-1 or http://.../p/PKG-101-1)
 * - Direct package codes (e.g. PKG-Заказ1-1, ERP-Заказ1-M1, PKG-101-1)
 * - Package IDs (e.g. pkg-172583910-1)
 * - Package numbers (e.g. "1", "M1", "М1", "Место 1", "Место №1")
 * - Layout-swapped input (e.g. EN <-> RU keyboard layout)
 */
export function matchPackageToScannedCode(
  scannedCode: string,
  pkg: any,
  order?: any
): boolean {
  if (!scannedCode || !pkg) return false;

  let raw = String(scannedCode).trim();
  if (!raw) return false;

  // Extract path from URL if a full URL was scanned by QR code camera
  if (raw.includes('/p/')) {
    const afterP = raw.split('/p/')[1] || '';
    raw = afterP.split('?')[0].split('#')[0] || raw;
  } else if (raw.includes('http://') || raw.includes('https://')) {
    const lastPart = raw.split('/').pop() || '';
    raw = lastPart.split('?')[0].split('#')[0] || raw;
  }

  // URL decode if URL encoded (e.g. %D0%97%D0%B0...)
  try {
    raw = decodeURIComponent(raw);
  } catch (e) {
    // ignore
  }

  const clean = cleanRawScannedString(raw);
  if (!clean) return false;

  const lowerRaw = clean.toLowerCase();
  const ruConverted = convertEnToRuLayout(clean).toLowerCase();
  const enConverted = convertRuToEnLayout(clean).toLowerCase();

  // Possible candidate strings representing the scan input
  const candidates = Array.from(new Set([
    lowerRaw,
    ruConverted,
    enConverted
  ])).filter(Boolean);

  // Targets to match against for this package
  const pkgCode = (pkg.code || '').toLowerCase();
  const pkgId = (pkg.id || '').toLowerCase();
  const pkgNum = String(pkg.packageNumber || '').toLowerCase();
  const pkgName = (pkg.name || '').toLowerCase();

  const orderNum = (order?.orderNumber || '').toLowerCase();

  const targets = Array.from(new Set([
    pkgCode,
    pkgId,
    pkgNum,
    pkgName,
    `m${pkgNum}`,
    `м${pkgNum}`,
    `место ${pkgNum}`,
    `место №${pkgNum}`,
    `место№${pkgNum}`,
    orderNum ? `pkg-${orderNum}-${pkgNum}` : '',
    orderNum ? `erp-${orderNum}-m${pkgNum}` : ''
  ])).filter(Boolean);

  for (const cand of candidates) {
    for (const tgt of targets) {
      if (!tgt || !cand) continue;
      if (cand === tgt) return true;
      if (cand.length >= 3 && tgt.length >= 3) {
        if (cand.includes(tgt) || tgt.includes(cand)) return true;
      }
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

export interface QRCommandResult {
  isCommand: boolean;
  commandKey?: string;
  message?: string;
}

export function processQRCommand(
  rawCode: string,
  callbacks?: {
    onFinishPackage?: () => void;
    onStartShift?: () => void;
    onEndShift?: () => void;
    onReportDefect?: () => void;
    onNextStage?: () => void;
    onPrintAct?: () => void;
    onClearScan?: () => void;
    onPauseWork?: () => void;
    onPrintLabels?: () => void;
    onForceFinish?: () => void;
  }
): QRCommandResult {
  if (!rawCode) return { isCommand: false };

  const rawClean = cleanRawScannedString(rawCode).toUpperCase();
  const clean = rawClean.replace(/[\s\-_.:/\\#]/g, '');
  const enLayout = convertRuToEnLayout(rawCode).toUpperCase().replace(/[\s\-_.:/\\#]/g, '');
  const ruLayout = convertEnToRuLayout(rawCode).toUpperCase().replace(/[\s\-_.:/\\#]/g, '');

  if (!clean && !enLayout && !ruLayout) return { isCommand: false };

  const matches = (keywords: string[]) => {
    return keywords.some(kw => {
      const cleanKw = kw.toUpperCase().replace(/[\s\-_.:/\\#]/g, '');
      const enKw = convertRuToEnLayout(kw).toUpperCase().replace(/[\s\-_.:/\\#]/g, '');
      const ruKw = convertEnToRuLayout(kw).toUpperCase().replace(/[\s\-_.:/\\#]/g, '');

      return clean.includes(cleanKw) || 
             enLayout.includes(cleanKw) || 
             ruLayout.includes(cleanKw) ||
             (enKw && clean.includes(enKw)) ||
             (enKw && enLayout.includes(enKw)) ||
             (ruKw && ruLayout.includes(ruKw));
    });
  };

  // 1. Finish package / Close box ("Закрыть коробку / место / упаковку")
  if (
    matches([
      'CMD_FINISH_PACKAGE',
      'CMDFINISHPACKAGE',
      'CMD_CLOSE_BOX',
      'CMDCLOSEBOX',
      'CMD_FINISH_BOX',
      'CMDFINISHBOX',
      'CMD_CLOSE_PLACE',
      'CMDCLOSEPLACE',
      'FINISH_PACKAGE',
      'CLOSE_PACKAGE',
      'CLOSE_BOX',
      'FINISH_BOX',
      'CLOSE_PLACE',
      'FINISH_PLACE',
      'ЗАКРЫТЬКОРОБКУ',
      'ЗАКРЫТЬ_КОРОБКУ',
      'ЗАКРЫТЬМЕСТО',
      'ЗАКРЫТЬ_МЕСТО',
      'ЗАКРЫТЬУПАКОВКУ',
      'ЗАКРЫТЬ_УПАКОВКУ',
      'ЗАКРЫТЬКОРОБКУМЕСТО',
      'ЗАВЕРШИТЬКОРОБКУ',
      'ЗАВЕРШИТЬ_КОРОБКУ',
      'ЗАВЕРШИТЬМЕСТО',
      'ЗАВЕРШИТЬ_МЕСТО',
      'ЗАВЕРШИТЬУПАКОВКУ',
      'ЗАПЕЧАТАТЬКОРОБКУ',
      'ЗАПЕЧАТАТЬМЕСТО',
      'ЗАПЕЧАТАТЬУПАКОВКУ',
      'ЗАПЕЧАТАТЬ',
      'КОРОБКАЗАКРЫТЬ',
      'МЕСТОЗАКРЫТЬ',
      'УПАКОВКАЗАКРЫТЬ',
      'СЛЕДУЮЩАЯКОРОБКА',
      'СЛЕДУЮЩЕЕМЕСТО'
    ])
  ) {
    if (callbacks?.onFinishPackage) {
      callbacks.onFinishPackage();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('erp_cmd_close_box'));
    }
    return { isCommand: true, commandKey: 'CMD_FINISH_PACKAGE', message: 'Команда: Закрыть коробку / место' };
  }

  // 2. Start shift ("Начать смену")
  if (
    matches([
      'CMD_START_SHIFT',
      'CMDSTARTSHIFT',
      'START_SHIFT',
      'STARTSHIFT',
      'START_WORK',
      'STARTWORK',
      'НАЧАТЬСМЕНУ',
      'НАЧАТЬ_СМЕНУ',
      'ОТКРЫТЬСМЕНУ',
      'ОТКРЫТЬ_СМЕНУ',
      'НАЧАТЬРАБОЧУЮСМЕНУ',
      'НАЧАТЬРАБОТУ',
      'СТАРТСМЕНЫ',
      'СМЕНАНАЧАТЬ',
      'НАЧАТЬ',
      'ОТКРЫТЬ'
    ])
  ) {
    if (callbacks?.onStartShift) {
      callbacks.onStartShift();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('erp_cmd_start_shift'));
    }
    speakText('Смена начата');
    return { isCommand: true, commandKey: 'CMD_START_SHIFT', message: 'Команда: Смена успешно начата' };
  }

  // 3. End shift ("Закрыть смену / Завершить смену с отчетом")
  if (
    matches([
      'CMD_END_SHIFT',
      'CMDENDSHIFT',
      'CMD_FINISH_SHIFT',
      'CMDFINISHSHIFT',
      'END_SHIFT',
      'FINISH_SHIFT',
      'ENDSHIFT',
      'FINISHSHIFT',
      'ЗАВЕРШИТЬСМЕНУ',
      'ЗАВЕРШИТЬ_СМЕНУ',
      'ЗАКРЫТЬСМЕНУ',
      'ЗАКРЫТЬ_СМЕНУ',
      'ИТОГИСМЕНЫ',
      'ОТЧЕТСМЕНЫ',
      'СМЕНАЗАКРЫТЬ'
    ])
  ) {
    if (callbacks?.onEndShift) {
      callbacks.onEndShift();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('erp_cmd_end_shift'));
    }
    speakText('Итоги смены');
    return { isCommand: true, commandKey: 'CMD_END_SHIFT', message: 'Команда: Итоги смены' };
  }

  // 4. Report defect
  if (
    matches([
      'CMD_REPORT_DEFECT',
      'CMDREPORTDEFECT',
      'REPORT_DEFECT',
      'ФИКСАЦИЯБРАКА',
      'БРАК'
    ])
  ) {
    if (callbacks?.onReportDefect) {
      callbacks.onReportDefect();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('erp_cmd_report_defect'));
    }
    speakText('Фиксация брака');
    return { isCommand: true, commandKey: 'CMD_REPORT_DEFECT', message: 'Команда: Фиксация брака' };
  }

  // 5. Next stage / Complete stage ("Завершить этап", "Завершить", "Следующий участок")
  if (
    matches([
      'CMD_NEXT_STAGE',
      'CMDNEXTSTAGE',
      'CMD_FINISH_STAGE',
      'CMDFINISHSTAGE',
      'NEXT_STAGE',
      'FINISH_STAGE',
      'NEXT_STEP',
      'FINISH_STEP',
      'СЛЕДУЮЩИЙУЧАСТОК',
      'СЛЕДУЮЩИЙ_УЧАСТОК',
      'СЛЕДУЮЩИЙЭТАП',
      'СЛЕДУЮЩИЙ_ЭТАП',
      'ЗАВЕРШИТЬЭТАП',
      'ЗАВЕРШИТЬ_ЭТАП',
      'ЗАВЕРШИТЬУЧАСТОК',
      'ЗАВЕРШИТЬ_УЧАСТОК',
      'ЗАВЕРШИТЬРАБОТУ',
      'ЗАВЕРШИТЬ',
      'ЗАКРЫТЬЭТАП',
      'ЗАКРЫТЬУЧАСТОК',
      'ЭТАПЗАВЕРШЕН'
    ])
  ) {
    if (callbacks?.onNextStage) {
      callbacks.onNextStage();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('erp_cmd_next_stage'));
    }
    speakText('Этап завершен');
    return { isCommand: true, commandKey: 'CMD_NEXT_STAGE', message: 'Команда: Завершение этапа' };
  }

  // 6. Print act
  if (
    matches([
      'CMD_PRINT_ACT',
      'CMDPRINTACT',
      'PRINT_ACT',
      'ПЕЧАТЬАКТА'
    ])
  ) {
    if (callbacks?.onPrintAct) {
      callbacks.onPrintAct();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('erp_cmd_print_act'));
    }
    speakText('Печать акта');
    return { isCommand: true, commandKey: 'CMD_PRINT_ACT', message: 'Команда: Открыта печать акта' };
  }

  // 7. Clear scan
  if (
    matches([
      'CMD_CLEAR_SCAN',
      'CMDCLEARSCAN',
      'CMD_CLEAR',
      'CMDCLEAR',
      'CLEAR_SCAN',
      'CLEARSCAN',
      'СБРОСИТЬСКАН',
      'СБРОСИТЬ_СКАН',
      'ОЧИСТИТЬСКАН',
      'ОЧИСТИТЬ_СКАН',
      'СБРОС'
    ])
  ) {
    if (callbacks?.onClearScan) {
      callbacks.onClearScan();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('erp_cmd_clear_scan'));
    }
    speakText('Сброс сканирования');
    return { isCommand: true, commandKey: 'CMD_CLEAR_SCAN', message: 'Команда: Сброс отметок деталей' };
  }

  // 8. Pause work
  if (
    matches([
      'CMD_PAUSE_WORK',
      'CMDPAUSEWORK',
      'CMD_PAUSE',
      'CMDPAUSE',
      'PAUSE_WORK',
      'PAUSE',
      'ПАУЗА',
      'ПАУЗАРАБОТЫ',
      'ПАУЗА_РАБОТЫ',
      'ПЕРЕРЫВ'
    ])
  ) {
    if (callbacks?.onPauseWork) {
      callbacks.onPauseWork();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('erp_cmd_pause_work'));
    }
    speakText('Пауза в работе');
    return { isCommand: true, commandKey: 'CMD_PAUSE_WORK', message: 'Команда: Перерыв / Пауза смены' };
  }

  // 9. Print labels
  if (
    matches([
      'CMD_PRINT_LABELS',
      'CMDPRINTLABELS',
      'PRINT_LABELS',
      'ПЕЧАТЬЭТИКЕТОК',
      'ПЕЧАТЬ_ЭТИКЕТОК',
      'ЭТИКЕТКИ'
    ])
  ) {
    if (callbacks?.onPrintLabels) {
      callbacks.onPrintLabels();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('erp_cmd_print_labels'));
    }
    speakText('Печать этикеток');
    return { isCommand: true, commandKey: 'CMD_PRINT_LABELS', message: 'Команда: Печать этикеток' };
  }

  // 10. Force finish stage
  if (
    matches([
      'CMD_FORCE_FINISH',
      'CMDFORCEFINISH',
      'FORCE_FINISH',
      'ПРИНУДИТЕЛЬНО',
      'ВЕСЬЭТАП'
    ])
  ) {
    if (callbacks?.onForceFinish) {
      callbacks.onForceFinish();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('erp_cmd_force_finish'));
    }
    speakText('Принудительное завершение');
    return { isCommand: true, commandKey: 'CMD_FORCE_FINISH', message: 'Команда: Принудительное завершение этапа' };
  }

  if (clean.startsWith('CMD') || enLayout.startsWith('CMD') || ruLayout.startsWith('CMD')) {
    return { isCommand: true, commandKey: clean || enLayout || ruLayout, message: `Выполнена команда ${clean || enLayout || ruLayout}` };
  }

  return { isCommand: false };
}

export function formatDateTimeSafe(dateVal?: any, fallback: string = '—'): string {
  if (!dateVal) return fallback;
  if (typeof dateVal === 'string') {
    const s = dateVal.trim();
    if (!s || s === 'Invalid Date' || s === 'undefined' || s === 'null') return fallback;

    // Check if already in ru-RU format: "DD.MM.YYYY, HH:MM" or "DD.MM.YYYY"
    const ruMatch = s.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (ruMatch) {
      const day = ruMatch[1];
      const month = ruMatch[2];
      const year = ruMatch[3];
      const time = ruMatch[4] ? `${ruMatch[4].padStart(2, '0')}:${ruMatch[5]}` : '';
      return time ? `${day}.${month}.${year}, ${time}` : `${day}.${month}.${year}`;
    }

    // Number as string
    if (/^\d{10,13}$/.test(s)) {
      const num = parseInt(s, 10);
      const d = new Date(num < 1e11 ? num * 1000 : num);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }

    // Try parsing ISO or other string
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (_) {}

    return s;
  }

  if (typeof dateVal === 'number') {
    const d = new Date(dateVal < 1e11 ? dateVal * 1000 : dateVal);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    return dateVal.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return fallback;
}

export function formatDateSafe(dateVal?: any, fallback: string = '—'): string {
  const full = formatDateTimeSafe(dateVal, fallback);
  if (full === fallback) return fallback;
  return full.split(',')[0].trim();
}

/**
 * Очищает номер заказа от технических префиксов (b24_, №, #), сохраняя чистый номер или номер сделки
 */
export function cleanOrderNumber(rawNumber?: string, fallbackId?: string): string {
  let num = (rawNumber || '').trim();
  if (!num && fallbackId) {
    num = fallbackId.trim();
  }

  if (num.toLowerCase().startsWith('b24_')) {
    num = num.slice(4).trim();
  }

  // Remove leading №, #, Сделка #, Заказ #
  num = num.replace(/^(?:сделка|заказ|счет|проект|deal|order)[\s№#:]*/i, '').trim();
  num = num.replace(/^[№#\s]+/, '').trim();

  // If starts with order number followed by space and client, extract order number
  const matchWithClient = num.match(/^([A-Za-zА-Яа-я0-9\-_./]+)\s+(.+)$/);
  if (matchWithClient && matchWithClient[1].length >= 2 && !/^(сделка|заказ)$/i.test(matchWithClient[1])) {
    num = matchWithClient[1];
  }

  return num || (fallbackId ? fallbackId.replace(/^b24_/i, '') : '—');
}

/**
 * Интеллектуально извлекает понятное имя клиента и название проекта
 * устраняя артефакты "Заказчик", дублирование ID Битрикс и тавтологии
 */
export function getSmartOrderDisplay(order: {
  orderNumber?: string;
  clientName?: string;
  projectName?: string;
  birkaData?: any;
  salonName?: string;
  comments?: string;
  bitrixDealId?: string;
  id?: string;
}): { orderNumber: string; clientName: string; projectName: string } {
  const cleanNum = cleanOrderNumber(order.orderNumber, order.id);
  let rawClient = (order.clientName || '').trim();
  let rawProject = (order.projectName || '').trim();

  const dealId = (order.bitrixDealId || '').toLowerCase().trim();
  const idClean = (order.id || '').replace(/^b24_/i, '').toLowerCase().trim();
  const numClean = cleanNum.toLowerCase().trim();

  const isGenericClient = (val: string) => {
    const v = val.toLowerCase().trim();
    if (!v) return true;
    if (
      v === 'заказчик' || 
      v === 'клиент' || 
      v === 'без названия' || 
      v === 'клиент #—' ||
      v === 'частный заказчик'
    ) return true;

    // Check generic patterns like "Сделка #12345", "Заказ №12345", "Клиент 12345", "12345", "b24_12345"
    if (/^(?:сделка|заказ|клиент|проект|deal|order)[\s№#:]*\d+$/i.test(v)) return true;
    if (/^b24_\d+$/i.test(v)) return true;
    if (/^\d+$/.test(v)) return true;

    if (numClean && (v === numClean || v === `№${numClean}` || v === `заказ №${numClean}` || v === `сделка №${numClean}` || v === `заказ ${numClean}` || v === `сделка ${numClean}`)) return true;
    if (dealId && (v === dealId || v === `клиент #${dealId}` || v === `сделка #${dealId}` || v === `заказ №${dealId}` || v === `b24_${dealId}`)) return true;
    if (idClean && (v === idClean || v === `клиент #${idClean}` || v === `сделка #${idClean}` || v === `заказ №${idClean}` || v === `b24_${idClean}`)) return true;

    return false;
  };

  const isGenericProject = (val: string) => {
    const v = val.toLowerCase().trim();
    if (!v) return true;
    if (
      v === 'заказ' || 
      v === 'мебельный проект' || 
      v === 'мебельный заказ' || 
      v === 'проект' ||
      v === 'без названия'
    ) return true;

    if (/^(?:заказ|сделка|проект|deal|order)[\s№#:]*\d+$/i.test(v)) return true;
    if (/^b24_\d+$/i.test(v)) return true;
    if (/^\d+$/.test(v)) return true;

    if (numClean && (v === numClean || v === `№${numClean}` || v === `заказ №${numClean}` || v === `сделка №${numClean}`)) return true;
    if (dealId && (v === dealId || v === `b24_${dealId}`)) return true;
    if (idClean && (v === idClean || v === `b24_${idClean}`)) return true;

    return false;
  };

  // 1. Check if rawClient contains compound info like "Кухня - Иванов" or "Иванов / Шкаф"
  if (!isGenericClient(rawClient) && (rawClient.includes(' - ') || rawClient.includes(' / ') || rawClient.includes(' — ') || rawClient.includes(' | '))) {
    const parts = rawClient.split(/\s*[-/—|]\s*/);
    if (parts.length >= 2) {
      if (isGenericProject(rawProject)) {
        rawProject = parts[0];
        rawClient = parts.slice(1).join(' ');
      }
    }
  }

  // 2. Try recovering client name if it's generic
  if (isGenericClient(rawClient)) {
    if (!isGenericProject(rawProject)) {
      rawClient = rawProject;
    } else if (order.birkaData?.fileName) {
      const cleanFileName = order.birkaData.fileName.replace(/\.(bir|csv|xlsx|xls|txt)$/i, '');
      const parts = cleanFileName.split(/[_\-–—]/).filter(Boolean);
      if (parts.length > 0) {
        rawClient = parts[0].trim();
        if (parts.length > 1 && isGenericProject(rawProject)) {
          rawProject = parts.slice(1).join(' ').trim();
        }
      }
    } else if (order.salonName) {
      rawClient = order.salonName;
    } else if (order.comments && order.comments.length > 2 && order.comments.length < 50 && !/^(https?:\/\/|b24_)/i.test(order.comments)) {
      rawClient = order.comments;
    } else {
      rawClient = '';
    }
  }

  // 3. Try recovering project name if it's generic
  if (isGenericProject(rawProject)) {
    if (order.birkaData?.fileName) {
      const cleanFileName = order.birkaData.fileName.replace(/\.(bir|csv|xlsx|xls|txt)$/i, '');
      rawProject = cleanFileName;
    } else if (order.salonName && rawClient !== order.salonName) {
      rawProject = order.salonName;
    } else {
      rawProject = '';
    }
  }

  // Final cleanup of redundant prefixes
  if (cleanNum) {
    const escaped = cleanNum.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`^[№#\\s]*${escaped}[\\s:·\\-_–—/]*`, 'i');
    rawClient = rawClient.replace(regex, '').trim();
    rawProject = rawProject.replace(regex, '').trim();
  }
  if (dealId) {
    const escaped = dealId.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`^[№#\\s]*${escaped}[\\s:·\\-_–—/]*`, 'i');
    rawClient = rawClient.replace(regex, '').trim();
    rawProject = rawProject.replace(regex, '').trim();
  }

  if (isGenericClient(rawClient)) rawClient = '';
  if (isGenericProject(rawProject)) rawProject = '';

  return {
    orderNumber: cleanNum,
    clientName: rawClient,
    projectName: rawProject
  };
}

/**
 * Извлекает числовой ID сделки в Битрикс24 из объекта заказа
 */
export function extractBitrixDealId(order?: { bitrixDealId?: string; bitrixUrl?: string; orderNumber?: string; id?: string }): string | null {
  if (!order) return null;

  if (order.bitrixDealId) {
    const clean = String(order.bitrixDealId).replace(/^b24_/i, '').trim();
    if (clean) return clean;
  }

  if (order.bitrixUrl) {
    const match = order.bitrixUrl.match(/deal\/details\/(\d+)/i);
    if (match) return match[1];
  }

  const idToCheck = order.id || '';
  if (idToCheck.toLowerCase().startsWith('b24_')) {
    const clean = idToCheck.slice(4).trim();
    if (/^\d+$/.test(clean)) return clean;
  }

  const numToCheck = order.orderNumber || '';
  if (numToCheck.toLowerCase().startsWith('b24_')) {
    const clean = numToCheck.slice(4).trim();
    if (/^\d+$/.test(clean)) return clean;
  }

  return null;
}

/**
 * Формирует ссылку на сделку в Битрикс24 с учетом настроенного вебхука / домена
 */
export function getBitrixDealUrl(
  order: { bitrixDealId?: string; bitrixUrl?: string; orderNumber?: string; id?: string },
  settings?: any
): string {
  if (order.bitrixUrl && order.bitrixUrl.startsWith('http')) {
    return order.bitrixUrl;
  }

  const dealId = extractBitrixDealId(order);
  if (!dealId) return '#';

  const webhookUrl = settings?.bitrix24WebhookUrl || settings?.bitrixWebhookUrl || '';
  if (webhookUrl && webhookUrl.includes('/rest/')) {
    const domain = webhookUrl.split('/rest/')[0];
    return `${domain}/crm/deal/details/${dealId}/`;
  }

  return `https://b24.ru/crm/deal/details/${dealId}/`;
}

/**
 * Проверяет, начато ли уже выполнение задачи по заказу на данном производственном участке
 */
export function isStageTaskStarted(order: ProductionOrder, stageId: ProductionStageId): boolean {
  if (!order) return false;

  // 1. Logs on this stage
  if (order.workLogs && order.workLogs.some(l => l.stageId === stageId)) {
    return true;
  }

  // 2. Scanned parts in stageScanningProgress for this stage
  if (order.stageScanningProgress && order.stageScanningProgress[stageId]) {
    const stageMats = order.stageScanningProgress[stageId];
    const hasScanned = Object.values(stageMats).some(mat => (mat.scannedPartIds?.length || 0) > 0 || mat.isCompleted);
    if (hasScanned) return true;
  }

  // 3. Stage force-completed
  if (order.forcedStageCompletions && order.forcedStageCompletions[stageId]) {
    return true;
  }

  // 4. Packages created on kitting/packing/shipping
  if (order.packages && order.packages.length > 0) {
    if (stageId === 'kitting' && order.packages.some(p => p.type === 'kitting')) return true;
    if (stageId === 'packing' && order.packages.some(p => p.type === 'details' || p.type === 'custom')) return true;
    if (stageId === 'shipping' && order.packages.some(p => (p as any).isShipped || (p as any).status === 'shipped')) return true;
  }

  return false;
}
