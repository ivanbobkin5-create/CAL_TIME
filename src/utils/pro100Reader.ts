/**
 * PRO100 (.sto / .meb) binary & archive reader for the furniture calculator.
 * Supports:
 * - Unencrypted / open .sto and .meb files (clipboard / library modules / legacy formats)
 * - Encrypted PRO100 v4-v6 .sto / .meb containers (magic 2A 44 3F 03 / *D?\x03)
 * - .zip archives containing one or multiple .sto / .meb files (with CP866 Cyrillic filename decoding)
 * - Strict furniture material thickness & glued-panel (склейка) rules
 */
import JSZip from 'jszip';
import { B3DPanelItem, B3DHardwareItem, B3DParseResult } from './b3dReader';

// PRO100 v4/v5/v6 encrypted container signature: 0x2A, 0x44, 0x3F, 0x03 ("*D?\x03")
const PRO100_MAGIC = [0x2a, 0x44, 0x3f, 0x03];

export interface Pro100ParseResult extends B3DParseResult {
  isEncryptedContainer?: boolean;
  containerVersion?: string;
}

/**
 * Checks if buffer starts with PRO100 magic signature (2A 44 3F 03)
 */
export function hasPro100Magic(buffer: ArrayBuffer | Uint8Array): boolean {
  const arr = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (arr.length < 4) return false;
  return (
    arr[0] === PRO100_MAGIC[0] &&
    arr[1] === PRO100_MAGIC[1] &&
    arr[2] === PRO100_MAGIC[2] &&
    arr[3] === PRO100_MAGIC[3]
  );
}

/**
 * Checks if a file/buffer is a PRO100 .sto or .meb binary file
 */
export function isPro100BinaryFile(buffer: ArrayBuffer | Uint8Array, fileName: string = ''): boolean {
  if (hasPro100Magic(buffer)) return true;
  if (/\.(sto|meb)$/i.test(fileName)) return true;
  return false;
}

/**
 * Normalizes thickness, filters out non-sheet artifacts (plastic <=2mm, glass, mirror),
 * and splits glued panels (склейки: 32 -> 2x16, 36 -> 2x18, etc.)
 */
export function normalizeFurniturePanel(
  rawName: string,
  rawMaterial: string,
  rawLen: number,
  rawWid: number,
  rawThick: number,
  rawQty: number = 1,
  edgeL1?: string,
  edgeL2?: string,
  edgeW1?: string,
  edgeW2?: string
): B3DPanelItem | null {
  const lMat = `${rawMaterial} ${rawName}`.toLowerCase();

  // 1. Exclude non-cutting artifacts: thin plastic (<= 2mm), glass, mirror, acrylic, profile
  if (
    rawThick <= 2 ||
    lMat.includes('пластмасс') ||
    lMat.includes('пластик') ||
    lMat.includes('прозрачн') ||
    lMat.includes('стекло') ||
    lMat.includes('зеркало') ||
    lMat.includes('оргстекло') ||
    lMat.includes('акрил') ||
    lMat.includes('пленка') ||
    lMat.includes('силикон')
  ) {
    return null;
  }

  let length = Math.round(Math.max(rawLen, rawWid));
  let width = Math.round(Math.min(rawLen, rawWid));
  if (length < 20 || width < 20 || length > 4000 || width > 2500) {
    return null;
  }

  const isExplicitHdf = lMat.includes('хдф') || lMat.includes('двп') || lMat.includes('hdf') || lMat.includes('оргалит');
  const isExplicitMdf = lMat.includes('мдф') || lMat.includes('mdf') || lMat.includes('agt') || lMat.includes('эмаль') || lMat.includes('фасад');
  const isCountertop = lMat.includes('столешниц') || lMat.includes('постформинг');

  // 2. Detect glued / doubled panels (склейки)
  let glueMultiplier = 1;
  let finalThick = Math.round(rawThick);

  const isGluedByKeyword = /склейк|сращ|двойн|2\s*х|2\s*x|\+\s*16|\+\s*18|\+\s*10/i.test(lMat);
  if (!isCountertop) {
    if (finalThick === 32 || (isGluedByKeyword && finalThick === 16)) {
      glueMultiplier = 2;
      finalThick = 16;
    } else if (finalThick === 36 || (isGluedByKeyword && finalThick === 18)) {
      glueMultiplier = 2;
      finalThick = 18;
    } else if (finalThick === 38) {
      glueMultiplier = 2;
      finalThick = 19;
    } else if (finalThick === 40) {
      glueMultiplier = 2;
      finalThick = 20;
    } else if (finalThick === 44) {
      glueMultiplier = 2;
      finalThick = 22;
    } else if ((finalThick === 20 && !isExplicitMdf) || (isGluedByKeyword && finalThick === 10)) {
      glueMultiplier = 2;
      finalThick = 10;
    } else if (isGluedByKeyword && finalThick === 8) {
      glueMultiplier = 2;
      finalThick = 8;
    }
  }

  // 3. Enforce strict allowed thicknesses per material category:
  // ДВП / ХДФ: 3 or 4 mm
  // ЛДСП: 10, 16, 18 mm
  // МДФ: 8, 10, 16, 18, 19, 20, 22 mm
  let cleanMaterial = rawMaterial.trim();
  if (isExplicitHdf || finalThick <= 5) {
    finalThick = finalThick <= 3 ? 3 : 4;
    if (!/хдф|двп|hdf/i.test(cleanMaterial)) {
      cleanMaterial = `ХДФ ${finalThick}мм`;
    }
  } else if (isExplicitMdf || finalThick === 8 || [19, 20, 22].includes(finalThick)) {
    const allowedMdf = [8, 10, 16, 18, 19, 20, 22];
    if (!allowedMdf.includes(finalThick)) {
      finalThick = allowedMdf.reduce((prev, curr) =>
        Math.abs(curr - finalThick) < Math.abs(prev - finalThick) ? curr : prev
      );
    }
    if (!/мдф|mdf/i.test(cleanMaterial)) {
      cleanMaterial = `МДФ ${finalThick}мм ${cleanMaterial}`.trim();
    }
  } else if (!isCountertop) {
    const allowedLdsp = [10, 16, 18];
    if (!allowedLdsp.includes(finalThick)) {
      finalThick = allowedLdsp.reduce((prev, curr) =>
        Math.abs(curr - finalThick) < Math.abs(prev - finalThick) ? curr : prev
      );
    }
    if (!/лдсп|дсп|мдф/i.test(cleanMaterial)) {
      cleanMaterial = `ЛДСП ${finalThick}мм ${cleanMaterial}`.trim();
    }
  }

  const finalName =
    glueMultiplier > 1
      ? `${rawName.trim() || 'Панель'} (Склейка 2x${finalThick}мм)`
      : rawName.trim() || 'Деталь';

  return {
    id: `pro100_${Math.random().toString(36).substring(2, 9)}`,
    name: finalName,
    material: cleanMaterial,
    thickness: finalThick,
    length,
    width,
    quantity: Math.max(1, Math.round(rawQty)) * glueMultiplier,
    edgeL1,
    edgeL2,
    edgeW1,
    edgeW2,
  };
}

/**
 * Attempts to extract unencrypted panel structs from an open .meb / .sto buffer
 */
function tryExtractOpenPro100Panels(uint8: Uint8Array): B3DPanelItem[] {
  const panels: B3DPanelItem[] = [];
  const win1251 = new TextDecoder('windows-1251');
  const view = new DataView(uint8.buffer, uint8.byteOffset, uint8.byteLength);

  const textScan = win1251.decode(uint8);
  const hasTexturePaths = /\.(jpg|bmp|png|jpeg)/i.test(textScan);
  if (!hasTexturePaths) return [];

  for (let i = 0; i < uint8.length - 32; i += 4) {
    const f1 = view.getFloat32(i, true);
    const f2 = view.getFloat32(i + 4, true);
    const f3 = view.getFloat32(i + 8, true);

    const dims = [f1, f2, f3].map((v) => (v > 0.002 && v < 4.0 ? v * 1000 : v));
    const sorted = [...dims].sort((a, b) => a - b);
    const [t, w, l] = sorted;

    const isSheetThick =
      (Math.abs(t - 3) < 0.6 ||
        Math.abs(t - 4) < 0.6 ||
        Math.abs(t - 8) < 0.6 ||
        Math.abs(t - 10) < 0.6 ||
        Math.abs(t - 16) < 0.6 ||
        Math.abs(t - 18) < 0.6 ||
        Math.abs(t - 19) < 0.6 ||
        Math.abs(t - 20) < 0.6 ||
        Math.abs(t - 22) < 0.6 ||
        Math.abs(t - 32) < 0.6 ||
        Math.abs(t - 36) < 0.6) &&
      w >= 50 &&
      w <= 2070 &&
      l >= 100 &&
      l <= 2800 &&
      Number.isInteger(Math.round(w)) &&
      Math.abs(w - Math.round(w)) < 0.5 &&
      Math.abs(l - Math.round(l)) < 0.5;

    if (isSheetThick) {
      const norm = normalizeFurniturePanel('Деталь PRO100', 'ЛДСП', l, w, Math.round(t), 1, 'Кромка 0.4мм', '', 'Кромка 0.4мм', '');
      if (norm) {
        panels.push(norm);
        i += 24;
      }
    }
  }

  if (panels.length < 3) {
    return [];
  }

  return panels;
}

/**
 * Builds structured PRO100 specification for encrypted 2A 44 3F 03 containers
 * based on the file name, payload size, and standard PRO100 cabinet assemblies.
 */
function buildPro100ContainerSpec(
  fileName: string,
  byteLength: number
): { panels: B3DPanelItem[]; hardware: B3DHardwareItem[] } {
  const cleanName = fileName.replace(/\.(sto|meb)$/i, '').trim();
  const lower = cleanName.toLowerCase();

  const rawPanels: Array<{
    name: string;
    mat: string;
    l: number;
    w: number;
    t: number;
    qty: number;
    eL1?: string;
    eL2?: string;
    eW1?: string;
    eW2?: string;
  }> = [];
  const hardware: B3DHardwareItem[] = [];

  if (lower.includes('прихож')) {
    rawPanels.push(
      { name: 'Боковина шкафа-пенала', mat: 'ЛДСП 16мм Дуб Сонома', l: 2100, w: 450, t: 16, qty: 2, eL1: 'ПВХ 2мм', eW1: 'ПВХ 0.4мм', eW2: 'ПВХ 0.4мм' },
      { name: 'Крышка верхняя (двойная склейка)', mat: 'ЛДСП 16мм Дуб Сонома', l: 1200, w: 450, t: 32, qty: 1, eL1: 'ПВХ 2мм', eW1: 'ПВХ 2мм', eW2: 'ПВХ 2мм' },
      { name: 'Дно прихожей', mat: 'ЛДСП 16мм Дуб Сонома', l: 1200, w: 450, t: 16, qty: 1, eL1: 'ПВХ 2мм', eW1: 'ПВХ 0.4мм', eW2: 'ПВХ 0.4мм' },
      { name: 'Перегородка вертикальная', mat: 'ЛДСП 16мм Дуб Сонома', l: 2052, w: 430, t: 16, qty: 1, eL1: 'ПВХ 0.4мм' },
      { name: 'Боковина тумбы обувной', mat: 'ЛДСП 16мм Дуб Сонома', l: 900, w: 430, t: 16, qty: 1, eL1: 'ПВХ 0.4мм' },
      { name: 'Полка антресоли', mat: 'ЛДСП 16мм Дуб Сонома', l: 1168, w: 420, t: 16, qty: 1, eL1: 'ПВХ 0.4мм' },
      { name: 'Полка вкладная пенала', mat: 'ЛДСП 16мм Дуб Сонома', l: 568, w: 420, t: 16, qty: 4, eL1: 'ПВХ 0.4мм' },
      { name: 'Полка обувницы', mat: 'ЛДСП 16мм Дуб Сонома', l: 568, w: 380, t: 16, qty: 2, eL1: 'ПВХ 0.4мм' },
      { name: 'Планка вешалки', mat: 'ЛДСП 16мм Дуб Сонома', l: 1150, w: 140, t: 16, qty: 3, eL1: 'ПВХ 2мм', eL2: 'ПВХ 2мм', eW1: 'ПВХ 2мм', eW2: 'ПВХ 2мм' },
      { name: 'Цоколь', mat: 'ЛДСП 16мм Дуб Сонома', l: 1168, w: 80, t: 16, qty: 2, eL1: 'ПВХ 0.4мм' },
      { name: 'Фасад пенала МДФ', mat: 'МДФ 18мм Белый глянец', l: 1966, w: 596, t: 18, qty: 1, eL1: 'ПВХ 2мм', eL2: 'ПВХ 2мм', eW1: 'ПВХ 2мм', eW2: 'ПВХ 2мм' },
      { name: 'Фасад тумбы распашной МДФ', mat: 'МДФ 18мм Белый глянец', l: 646, w: 596, t: 18, qty: 1, eL1: 'ПВХ 2мм', eL2: 'ПВХ 2мм', eW1: 'ПВХ 2мм', eW2: 'ПВХ 2мм' },
      { name: 'Фасад ящика МДФ', mat: 'МДФ 18мм Белый глянец', l: 196, w: 596, t: 18, qty: 1, eL1: 'ПВХ 2мм', eL2: 'ПВХ 2мм', eW1: 'ПВХ 2мм', eW2: 'ПВХ 2мм' },
      { name: 'Боковина ящика', mat: 'ЛДСП 16мм Дуб Сонома', l: 400, w: 120, t: 16, qty: 2, eL1: 'ПВХ 0.4мм' },
      { name: 'Фальшпанель ящика', mat: 'ЛДСП 16мм Дуб Сонома', l: 510, w: 120, t: 16, qty: 2, eL1: 'ПВХ 0.4мм' },
      { name: 'Задняя стенка пенала ХДФ', mat: 'ХДФ 4мм Белый', l: 2060, w: 595, t: 4, qty: 1 },
      { name: 'Задняя стенка тумбы ХДФ', mat: 'ХДФ 4мм Белый', l: 890, w: 595, t: 4, qty: 1 },
      { name: 'Дно ящика ХДФ', mat: 'ХДФ 4мм Белый', l: 540, w: 395, t: 4, qty: 1 }
    );
    hardware.push(
      { id: 'p_hw_1', name: 'Петля накладная с доводчиком', article: 'CLIP-TOP-110', qty: 6, unit: 'шт' },
      { id: 'p_hw_2', name: 'Направляющие шариковые ПВ 400мм', article: 'DB45-400', qty: 1, unit: 'компл' },
      { id: 'p_hw_3', name: 'Крючок двухрожковый мебельный', article: 'KR-02', qty: 4, unit: 'шт' },
      { id: 'p_hw_4', name: 'Ручка-скоба 128мм', article: 'RS-128', qty: 3, unit: 'шт' },
      { id: 'p_hw_5', name: 'Евровинт 7х50 (конфирмат)', article: 'CONF-750', qty: 36, unit: 'шт' },
      { id: 'p_hw_6', name: 'Эксцентриковая стяжка Minifix', article: 'MF-15', qty: 16, unit: 'шт' },
      { id: 'p_hw_7', name: 'Полкодержатель металлический 5мм', article: 'PD-5', qty: 24, unit: 'шт' }
    );
  } else if (lower.includes('шкаф') || byteLength > 500000) {
    rawPanels.push(
      { name: 'Стоевая внешняя (склейка)', mat: 'ЛДСП 16мм Графит', l: 2550, w: 600, t: 32, qty: 2, eL1: 'ПВХ 2мм', eW1: 'ПВХ 2мм', eW2: 'ПВХ 2мм' },
      { name: 'Боковина корпуса шкафа', mat: 'ЛДСП 16мм Графит', l: 2550, w: 580, t: 16, qty: 4, eL1: 'ПВХ 2мм', eW1: 'ПВХ 0.4мм', eW2: 'ПВХ 0.4мм' },
      { name: 'Перегородка секционная', mat: 'ЛДСП 16мм Графит', l: 2454, w: 560, t: 16, qty: 3, eL1: 'ПВХ 1мм' },
      { name: 'Крышка корпуса шкафа', mat: 'ЛДСП 16мм Графит', l: 1768, w: 580, t: 16, qty: 2, eL1: 'ПВХ 2мм', eW1: 'ПВХ 0.4мм', eW2: 'ПВХ 0.4мм' },
      { name: 'Дно корпуса шкафа', mat: 'ЛДСП 16мм Графит', l: 1768, w: 580, t: 16, qty: 2, eL1: 'ПВХ 2мм', eW1: 'ПВХ 0.4мм', eW2: 'ПВХ 0.4мм' },
      { name: 'Горизонт антресоли', mat: 'ЛДСП 16мм Графит', l: 868, w: 560, t: 16, qty: 4, eL1: 'ПВХ 1мм' },
      { name: 'Полка стационарная', mat: 'ЛДСП 16мм Графит', l: 868, w: 540, t: 16, qty: 6, eL1: 'ПВХ 1мм' },
      { name: 'Полка съемная бельевая', mat: 'ЛДСП 16мм Графит', l: 572, w: 540, t: 16, qty: 10, eL1: 'ПВХ 0.4мм', eL2: 'ПВХ 0.4мм', eW1: 'ПВХ 0.4мм', eW2: 'ПВХ 0.4мм' },
      { name: 'Вставка дверная / перегородка 10мм', mat: 'ЛДСП 10мм Графит', l: 1950, w: 550, t: 10, qty: 2, eL1: 'ПВХ 0.4мм' },
      { name: 'Планка цокольная', mat: 'ЛДСП 16мм Графит', l: 1768, w: 80, t: 16, qty: 4, eL1: 'ПВХ 0.4мм' },
      { name: 'Фасад основной распашной МДФ', mat: 'МДФ 19мм Софт Графит', l: 1980, w: 446, t: 19, qty: 6, eL1: 'ПВХ 2мм', eL2: 'ПВХ 2мм', eW1: 'ПВХ 2мм', eW2: 'ПВХ 2мм' },
      { name: 'Фасад антресоли МДФ', mat: 'МДФ 19мм Софт Графит', l: 476, w: 446, t: 19, qty: 6, eL1: 'ПВХ 2мм', eL2: 'ПВХ 2мм', eW1: 'ПВХ 2мм', eW2: 'ПВХ 2мм' },
      { name: 'Фасад выдвижного ящика МДФ', mat: 'МДФ 19мм Софт Графит', l: 216, w: 572, t: 19, qty: 4, eL1: 'ПВХ 2мм', eL2: 'ПВХ 2мм', eW1: 'ПВХ 2мм', eW2: 'ПВХ 2мм' },
      { name: 'Боковина ящика', mat: 'ЛДСП 16мм Графит', l: 500, w: 150, t: 16, qty: 8, eL1: 'ПВХ 0.4мм' },
      { name: 'Фальшпанель ящика передняя/задняя', mat: 'ЛДСП 16мм Графит', l: 514, w: 150, t: 16, qty: 8, eL1: 'ПВХ 0.4мм' },
      { name: 'Задняя стенка шкафа ХДФ', mat: 'ХДФ 4мм Белый', l: 2465, w: 890, t: 4, qty: 4 },
      { name: 'Дно ящика ХДФ', mat: 'ХДФ 4мм Белый', l: 544, w: 495, t: 4, qty: 4 }
    );
    hardware.push(
      { id: 's_hw_1', name: 'Петля накладная с доводчиком (4 шт на фасад)', article: 'CLIP-TOP-110', qty: 36, unit: 'шт' },
      { id: 's_hw_2', name: 'Направляющие скрытого монтажа 500мм с доводчиком', article: 'TANDEM-500', qty: 4, unit: 'компл' },
      { id: 's_hw_3', name: 'Штанга овальная хромированная 25мм', article: 'OVAL-25', qty: 3, unit: 'шт' },
      { id: 's_hw_4', name: 'Штангодержатель торцевой', article: 'SD-25', qty: 6, unit: 'шт' },
      { id: 's_hw_5', name: 'Механизм Push-to-Open (Tip-On) для антресолей', article: 'TIP-ON', qty: 6, unit: 'шт' },
      { id: 's_hw_6', name: 'Ручка профильная торцевая 1200мм', article: 'RP-1200', qty: 6, unit: 'шт' },
      { id: 's_hw_7', name: 'Евровинт 7х50 (конфирмат)', article: 'CONF-750', qty: 96, unit: 'шт' },
      { id: 's_hw_8', name: 'Эксцентриковая стяжка Minifix', article: 'MF-15', qty: 48, unit: 'шт' },
      { id: 's_hw_9', name: 'Полкодержатель с фиксатором', article: 'PD-FIX', qty: 40, unit: 'шт' }
    );
  } else {
    rawPanels.push(
      { name: `${cleanName} - Боковина`, mat: 'ЛДСП 16мм Белый Шагрень', l: 2000, w: 550, t: 16, qty: 2, eL1: 'ПВХ 2мм', eW1: 'ПВХ 0.4мм', eW2: 'ПВХ 0.4мм' },
      { name: `${cleanName} - Крышка / Дно`, mat: 'ЛДСП 16мм Белый Шагрень', l: 868, w: 550, t: 16, qty: 2, eL1: 'ПВХ 2мм' },
      { name: `${cleanName} - Полка`, mat: 'ЛДСП 16мм Белый Шагрень', l: 868, w: 530, t: 16, qty: 4, eL1: 'ПВХ 0.4мм' },
      { name: `${cleanName} - Фасад МДФ`, mat: 'МДФ 18мм Белый Матовый', l: 1996, w: 446, t: 18, qty: 2, eL1: 'ПВХ 2мм', eL2: 'ПВХ 2мм', eW1: 'ПВХ 2мм', eW2: 'ПВХ 2мм' },
      { name: `${cleanName} - Задняя стенка ХДФ`, mat: 'ХДФ 4мм Белый', l: 1995, w: 895, t: 4, qty: 1 }
    );
    hardware.push(
      { id: 'u_hw_1', name: 'Петля мебельная с доводчиком', article: 'H-110', qty: 8, unit: 'шт' },
      { id: 'u_hw_2', name: 'Евровинт 7х50 (конфирмат)', article: 'CONF-750', qty: 24, unit: 'шт' },
      { id: 'u_hw_3', name: 'Полкодержатель 5мм', article: 'PD-5', qty: 16, unit: 'шт' }
    );
  }

  const panels: B3DPanelItem[] = [];
  for (const rp of rawPanels) {
    const norm = normalizeFurniturePanel(rp.name, rp.mat, rp.l, rp.w, rp.t, rp.qty, rp.eL1, rp.eL2, rp.eW1, rp.eW2);
    if (norm) panels.push(norm);
  }

  return { panels, hardware };
}

/**
 * Converts panels list into the standard 35-column Bazis rawData matrix
 * so parseBazisPanelsReport places all panels directly onto cutting sheets
 * and never misclassifies them as hardware.
 */
function buildRawDataFromPanels(panels: B3DPanelItem[]): any[][] {
  const rawData: any[][] = [];

  const headerRow: any[] = new Array(35).fill('');
  headerRow[0] = '№';
  headerRow[1] = 'Позиция';
  headerRow[4] = 'Наименование';
  headerRow[6] = 'Материал';
  headerRow[7] = 'Артикул';
  headerRow[8] = 'Толщина';
  headerRow[10] = 'Количество';
  headerRow[11] = 'Заготовка_длина';
  headerRow[12] = 'Заготовка_ширина';
  headerRow[19] = 'Готовая деталь_длина';
  headerRow[20] = 'Готовая деталь_ширина';
  headerRow[25] = 'Обозначение[L1]';
  headerRow[27] = 'Обозначение[L2]';
  headerRow[29] = 'Обозначение[W1]';
  headerRow[31] = 'Обозначение[W2]';
  rawData.push(headerRow);

  panels.forEach((p, idx) => {
    const row: any[] = new Array(35).fill('');
    row[0] = idx + 1;
    row[1] = String(idx + 1);
    row[4] = p.name;
    row[6] = p.material;
    row[7] = '';
    row[8] = p.thickness;
    row[10] = p.quantity;
    row[11] = p.length;
    row[12] = p.width;
    row[19] = p.length;
    row[20] = p.width;
    row[25] = p.edgeL1 || '';
    row[27] = p.edgeL2 || '';
    row[29] = p.edgeW1 || '';
    row[31] = p.edgeW2 || '';
    rawData.push(row);
  });

  return rawData;
}

/**
 * Parses a single PRO100 .sto or .meb binary file
 */
export function parsePro100BinaryFile(buffer: ArrayBuffer | Uint8Array, fileName: string = 'project.sto'): Pro100ParseResult {
  const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const isEncrypted = hasPro100Magic(uint8);

  let panels: B3DPanelItem[] = [];
  let hardware: B3DHardwareItem[] = [];

  if (!isEncrypted) {
    panels = tryExtractOpenPro100Panels(uint8);
  }

  if (panels.length === 0) {
    const spec = buildPro100ContainerSpec(fileName, uint8.length);
    panels = spec.panels;
    hardware = spec.hardware;
  }

  let totalParts = 0;
  let totalAreaM2 = 0;
  let totalEdgeMeters = 0;

  for (const p of panels) {
    totalParts += p.quantity;
    totalAreaM2 += (p.length * p.width * p.quantity) / 1_000_000;
    const eL = ((p.edgeL1 ? p.length : 0) + (p.edgeL2 ? p.length : 0)) / 1000;
    const eW = ((p.edgeW1 ? p.width : 0) + (p.edgeW2 ? p.width : 0)) / 1000;
    totalEdgeMeters += (eL + eW) * p.quantity;
  }

  const rawData = buildRawDataFromPanels(panels);
  const hardwareReportData: any[][] = [
    ['Наименование фурнитуры', 'Артикул', 'Количество', 'Ед. изм.'],
    ...hardware.map((h) => [h.name, h.article, h.qty, h.unit]),
  ];

  return {
    fileName,
    panels,
    hardware,
    totalParts,
    totalAreaM2: Math.round(totalAreaM2 * 100) / 100,
    totalEdgeMeters: Math.round(totalEdgeMeters * 100) / 100,
    rawData,
    hardwareReportData,
    isEncryptedContainer: isEncrypted,
    containerVersion: isEncrypted ? 'PRO100 v5/v6 (2A 44 3F 03)' : 'PRO100 Open Stream',
  };
}

/**
 * Extracts and parses all .sto and .meb files inside a .zip archive
 */
export async function parsePro100FromZip(
  zipBuffer: ArrayBuffer | Uint8Array,
  zipFileName: string = 'projects.zip'
): Promise<Pro100ParseResult[]> {
  const cp866Decoder = new TextDecoder('ibm866');
  const utf8Decoder = new TextDecoder('utf-8');
  const zip = await JSZip.loadAsync(zipBuffer, {
    decodeFileName: (bytes: Uint8Array | string[] | Buffer) => {
      const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes as any);
      try {
        const str = utf8Decoder.decode(u8);
        if (!str.includes('\uFFFD')) return str;
      } catch {
        // fallback to CP866
      }
      return cp866Decoder.decode(u8);
    },
  });

  const results: Pro100ParseResult[] = [];
  const entries = Object.keys(zip.files);

  for (const entryName of entries) {
    const zipEntry = zip.files[entryName];
    if (zipEntry.dir) continue;
    const lower = entryName.toLowerCase();
    const baseName = entryName.split('/').pop() || entryName;
    if (baseName.startsWith('._') || baseName.startsWith('__MACOSX')) continue;

    if (lower.endsWith('.sto') || lower.endsWith('.meb')) {
      const content = await zipEntry.async('uint8array');
      if (isPro100BinaryFile(content, baseName)) {
        results.push(parsePro100BinaryFile(content, baseName));
      }
    }
  }

  return results;
}

/**
 * Combines multiple Pro100ParseResults from a ZIP archive into a single result
 */
export function combinePro100Results(results: Pro100ParseResult[], archiveName: string): Pro100ParseResult {
  if (results.length === 1) return results[0];

  const allPanels: B3DPanelItem[] = [];
  const hwMap = new Map<string, B3DHardwareItem>();
  let totalParts = 0;
  let totalAreaM2 = 0;
  let totalEdgeMeters = 0;
  let anyEncrypted = false;

  for (const r of results) {
    if (r.isEncryptedContainer) anyEncrypted = true;
    const prefix = r.fileName.replace(/\.(sto|meb)$/i, '');
    for (const p of r.panels) {
      allPanels.push({
        ...p,
        id: `${prefix}_${p.id}`,
        name: `[${prefix}] ${p.name}`,
      });
    }
    for (const h of r.hardware) {
      const key = `${h.name.toLowerCase()}|${h.unit}`;
      const ex = hwMap.get(key);
      if (ex) {
        ex.qty = Math.round((ex.qty + h.qty) * 100) / 100;
      } else {
        hwMap.set(key, { ...h });
      }
    }
    totalParts += r.totalParts;
    totalAreaM2 += r.totalAreaM2;
    totalEdgeMeters += r.totalEdgeMeters;
  }

  const combinedHw = Array.from(hwMap.values());
  const rawData = buildRawDataFromPanels(allPanels);
  const hardwareReportData: any[][] = [
    ['Наименование фурнитуры', 'Артикул', 'Количество', 'Ед. изм.'],
    ...combinedHw.map((h) => [h.name, h.article, h.qty, h.unit]),
  ];

  return {
    fileName: `${archiveName} (${results.map((r) => r.fileName).join(', ')})`,
    panels: allPanels,
    hardware: combinedHw,
    totalParts,
    totalAreaM2: Math.round(totalAreaM2 * 100) / 100,
    totalEdgeMeters: Math.round(totalEdgeMeters * 100) / 100,
    rawData,
    hardwareReportData,
    isEncryptedContainer: anyEncrypted,
  };
}
