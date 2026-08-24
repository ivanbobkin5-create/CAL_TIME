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
  }
): QRCommandResult {
  const rawClean = cleanRawScannedString(rawCode).toUpperCase();
  const clean = rawClean.replace(/[\s\-_.:/\\#]/g, '');
  const enLayout = convertRuToEnLayout(rawCode).toUpperCase().replace(/[\s\-_.:/\\#]/g, '');
  if (!clean && !enLayout) return { isCommand: false };

  const matches = (keywords: string[]) => {
    return keywords.some(kw => {
      const cleanKw = kw.toUpperCase().replace(/[\s\-_.:/\\#]/g, '');
      return clean.includes(cleanKw) || enLayout.includes(cleanKw);
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
      'ЗАКРЫТЬМЕСТО',
      'ЗАКРЫТЬМЕСТРО',
      'ЗАКРЫТЬУПАКОВКУ',
      'ЗАКРЫТЬКОРОБКУМЕСТО',
      'ЗАПЕЧАТАТЬКОРОБКУ',
      'ЗАПЕЧАТАТЬМЕСТО',
      'ЗАПЕЧАТАТЬУПАКОВКУ',
      'ЗАПЕЧАТАТЬ',
      'КОРОБКАЗАКРЫТЬ',
      'МЕСТОЗАКРЫТЬ',
      'УПАКОВКАЗАКРЫТЬ',
      'ЗАВЕРШИТЬКОРОБКУ',
      'ЗАВЕРШИТЬМЕСТО',
      'ЗАВЕРШИТЬУПАКОВКУ',
      'PFRHSNMKHJHARE', // закрыть коробку
      'PFRHSNBMTCNJ', // закрыть место
      'PFRHSNBMTCnhj', // закрыть местро
      'PFRHSNBENFRJBRE' // закрыть упаковку
    ])
  ) {
    if (callbacks?.onFinishPackage) {
      callbacks.onFinishPackage();
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
      'НАЧАТЬСМЕНУ',
      'ОТКРЫТЬСМЕНУ',
      'НАЧАТЬРАБОЧУЮСМЕНУ',
      'СТАРТСМЕНЫ',
      'СМЕНАНАЧАТЬ'
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
      'ЗАВЕРШИТЬСМЕНУ',
      'ЗАКРЫТЬСМЕНУ',
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

  // 5. Next stage
  if (
    matches([
      'CMD_NEXT_STAGE',
      'CMDNEXTSTAGE',
      'NEXT_STAGE',
      'СЛЕДУЮЩИЙУЧАСТОК'
    ])
  ) {
    if (callbacks?.onNextStage) {
      callbacks.onNextStage();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('erp_cmd_next_stage'));
    }
    speakText('Передано на следующий участок');
    return { isCommand: true, commandKey: 'CMD_NEXT_STAGE', message: 'Команда: Переход на следующий участок' };
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

  if (clean.startsWith('CMD') || enLayout.startsWith('CMD')) {
    return { isCommand: true, commandKey: clean || enLayout, message: `Выполнена команда ${clean || enLayout}` };
  }

  return { isCommand: false };
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

  // Remove leading №, #
  num = num.replace(/^[№#\s]+/, '').trim();

  // If starts with order number followed by space and client, extract order number
  const matchWithClient = num.match(/^([A-Za-z0-9\-_./]+)\s+(.+)$/);
  if (matchWithClient && matchWithClient[1].length >= 3) {
    num = matchWithClient[1];
  }

  return num || (fallbackId ? fallbackId.replace(/^b24_/i, '') : '—');
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

  // 4. Current active stage with in_progress status
  if (order.currentStage === stageId && order.status === 'in_progress') {
    return true;
  }

  // 5. Packages created on kitting/packing/shipping
  if (order.packages && order.packages.length > 0) {
    if (stageId === 'kitting' && order.packages.some(p => p.type === 'kitting')) return true;
    if (stageId === 'packing' && order.packages.some(p => p.type === 'details' || p.type === 'custom')) return true;
    if (stageId === 'shipping' && order.packages.some(p => (p as any).isShipped || (p as any).status === 'shipped')) return true;
  }

  return false;
}
