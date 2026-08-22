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

/**
 * Evaluates the template for a given detail.
 * Supports both standard English placeholders (e.g., {orderNumber}, {pos})
 * and actual Russian column names (e.g., {Заказ}, {№ детали}, {Длина}, {Ширина}, {Материал}, {Количество})
 */
export function evaluateBirkaQrTemplate(template: string, detail: any, orderNumber: string): string {
  const t = template || '{orderNumber}-{pos}';
  
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
        return String(detail.labelNumber || '');
        
      case 'name':
      case 'title':
      case 'part':
      case 'наименование':
      case 'название':
      case 'имя':
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
  return t.replace(/\{([^{}]+)\}/g, (match, p1) => {
    return getFieldVal(p1);
  });
}

/**
 * Checks if a scanned code matches a given detail using standard rules and custom QR template.
 */
export function matchDetailToScannedCode(
  scannedCode: string, 
  detail: any, 
  template: string | undefined, 
  orderNumber: string,
  matchingMode?: 'template' | 'smart_contains'
): boolean {
  const cleanScan = scannedCode.trim().toLowerCase();
  if (!cleanScan) return false;
  
  const enCode = normalizeBarcodeScan(scannedCode).toLowerCase();

  // Helper for various detail values
  const dLabel = (detail.labelNumber || '').toLowerCase().trim();
  const dId = (detail.id || '').toLowerCase().trim();
  const dBarcode = (detail.barcode || '').toLowerCase().trim();
  const dName = (detail.name || '').toLowerCase().trim();

  // 1. Exact matches on basic fields
  if (dLabel === cleanScan || dLabel === enCode) return true;
  if (dId === cleanScan || dId === enCode) return true;
  if (dBarcode && (dBarcode === cleanScan || dBarcode === enCode)) return true;
  if (dName && (dName === cleanScan || dName === enCode)) return true;

  // 2. Alphanumeric only exact matches (removes dots, dashes, slashes, etc.)
  // e.g., if labelNumber is "02.01" -> "0201", and scan is "02/01" -> "0201" or "02.01" -> "0201"
  const makeAlphaNumeric = (str: string) => str.replace(/[^a-zA-Z0-9а-яА-Я]/g, '');
  const dLabelAlpha = makeAlphaNumeric(dLabel);
  const cleanScanAlpha = makeAlphaNumeric(cleanScan);
  const enCodeAlpha = makeAlphaNumeric(enCode);

  if (dLabelAlpha && (dLabelAlpha === cleanScanAlpha || dLabelAlpha === enCodeAlpha)) {
    return true;
  }

  // 3. Template-based evaluation
  const activeTemplate = template || '{orderNumber}-{pos}';
  const evaluated = evaluateBirkaQrTemplate(activeTemplate, detail, orderNumber).trim().toLowerCase();
  const evaluatedEn = normalizeBarcodeScan(evaluated).toLowerCase();

  // Exact template match
  if (evaluated === cleanScan || evaluated === enCode || evaluatedEn === cleanScan || evaluatedEn === enCode) {
    return true;
  }

  // Alphanumeric template match
  const evaluatedAlpha = makeAlphaNumeric(evaluated);
  const evaluatedEnAlpha = makeAlphaNumeric(evaluatedEn);

  if (evaluatedAlpha === cleanScanAlpha || evaluatedEnAlpha === enCodeAlpha) {
    return true;
  }

  // If strict template matching mode is requested, stop here!
  if (matchingMode === 'template') {
    return false;
  }

  // 4. "Smart contains" mode (default or explicitly selected) - Option 3:
  // Substring containment:
  // If the scanned code has multiple parameters (e.g. "1042-02.01;LDSP;16mm"),
  // then the scanned code (cleanScan or enCode) should CONTAIN the evaluated template!
  // Or, in alphanumeric space, cleanScanAlpha contains evaluatedAlpha!
  if (evaluated.length >= 4 && (cleanScan.includes(evaluated) || enCode.includes(evaluatedEn))) {
    return true;
  }
  if (evaluatedAlpha.length >= 4 && (cleanScanAlpha.includes(evaluatedAlpha) || enCodeAlpha.includes(evaluatedEnAlpha))) {
    return true;
  }

  // Also vice-versa (e.g. if the user typed/scanned a subset of the template, e.g. "02.01" but template evaluates to "1042-02.01")
  // But only if the scanned code is reasonably long/specific to avoid false positives (e.g. at least 3 chars)
  if (cleanScan.length >= 3 && evaluated.includes(cleanScan)) {
    return true;
  }
  if (enCode.length >= 3 && evaluatedEn.includes(enCode)) {
    return true;
  }
  if (cleanScanAlpha.length >= 3 && evaluatedAlpha.includes(cleanScanAlpha)) {
    return true;
  }
  if (enCodeAlpha.length >= 3 && evaluatedEnAlpha.includes(enCodeAlpha)) {
    return true;
  }

  // 5. Special check for orderNumber and labelNumber separately inside scanned code:
  // If the scanned QR code contains both the order number and the detail's label number as separate words or substrings,
  // it is extremely likely to be our detail!
  // e.g., if orderNumber is "1042" and labelNumber is "02.01", and QR code is "1042-02.01-LDSP" or "1042_02.01_BOCOVINA" or even "1042 02.01".
  const cleanOrder = orderNumber.trim().toLowerCase();
  if (cleanOrder && dLabel) {
    const orderAlpha = makeAlphaNumeric(cleanOrder);
    const labelAlpha = makeAlphaNumeric(dLabel);
    
    // Check if both order number and label number are present in the scanned code
    if (orderAlpha.length >= 2 && labelAlpha.length >= 2) {
      if (cleanScanAlpha.includes(orderAlpha) && cleanScanAlpha.includes(labelAlpha)) {
        return true;
      }
      if (enCodeAlpha.includes(orderAlpha) && enCodeAlpha.includes(labelAlpha)) {
        return true;
      }
    }
  }

  return false;
}
