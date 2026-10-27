/**
 * Comprehensive Material & Edge Banding Naming Standard and Specifications
 * Formats:
 * - ЛДСП: ЛДСП 2800x2070x16 Чёрный U999 ST7, Гр.3, Egger
 * - МДФ: МДФ 2800x1220x18 Белый глянец 601, AGT / МДФ 2800x2070x18 PerfectSense Черный U999 PM, Egger
 * - Кромка: Кромка 0.4/19 Чёрный U999 ST7, Egger / Кромка 1.5/36 Дуб Галифакс H1180, Egger
 */

export interface SheetDimension {
  length: number;
  width: number;
  availableThicknesses: number[];
  defaultThickness: number;
}

export const BRAND_SHEET_SPECS: Record<string, SheetDimension> = {
  Egger: {
    length: 2800,
    width: 2070,
    availableThicknesses: [10, 16, 25],
    defaultThickness: 16
  },
  Lamarty: {
    length: 2750,
    width: 1830,
    availableThicknesses: [10, 16, 26],
    defaultThickness: 16
  },
  Nordeco: {
    length: 2750,
    width: 1830,
    availableThicknesses: [10, 16, 22, 25],
    defaultThickness: 16
  },
  Kronospan: {
    length: 2800,
    width: 2070,
    availableThicknesses: [10, 16, 22],
    defaultThickness: 16
  },
  Uvadrev: {
    length: 2750,
    width: 1830,
    availableThicknesses: [10, 16, 22],
    defaultThickness: 16
  },
  AGT: {
    length: 2800,
    width: 1220,
    availableThicknesses: [18],
    defaultThickness: 18
  },
  'AGT SUPRAMATT': {
    length: 2800,
    width: 1220,
    availableThicknesses: [18],
    defaultThickness: 18
  },
  'AGT SUPRAMATT PUR': {
    length: 2800,
    width: 1220,
    availableThicknesses: [18],
    defaultThickness: 18
  },
  Evogloss: {
    length: 2800,
    width: 1220,
    availableThicknesses: [18],
    defaultThickness: 18
  },
  Evosoft: {
    length: 2800,
    width: 1220,
    availableThicknesses: [18],
    defaultThickness: 18
  },
  'EVOSOFT PUR': {
    length: 2800,
    width: 1220,
    availableThicknesses: [18],
    defaultThickness: 18
  },
  FENIX: {
    length: 3050,
    width: 1300,
    availableThicknesses: [18],
    defaultThickness: 18
  },
  'Cleaf TSS': {
    length: 2800,
    width: 2070,
    availableThicknesses: [18],
    defaultThickness: 18
  },
  'EGGER PerfectSense': {
    length: 2800,
    width: 2070,
    availableThicknesses: [18],
    defaultThickness: 18
  }
};

export const BRAND_TO_MATERIAL_TYPE: Record<string, 'ЛДСП' | 'МДФ' | 'Кромка'> = {
  Egger: 'ЛДСП',
  Lamarty: 'ЛДСП',
  Nordeco: 'ЛДСП',
  Kronospan: 'ЛДСП',
  Uvadrev: 'ЛДСП',
  AGT: 'МДФ',
  'AGT SUPRAMATT': 'МДФ',
  'AGT SUPRAMATT PUR': 'МДФ',
  Evogloss: 'МДФ',
  Evosoft: 'МДФ',
  'EVOSOFT PUR': 'МДФ',
  FENIX: 'МДФ',
  'Cleaf TSS': 'МДФ',
  'EGGER PerfectSense': 'МДФ',
  Rehau: 'Кромка',
  Galoplast: 'Кромка',
  Kantenwelt: 'Кромка'
};

/**
 * Determines edge band height based on board thickness or glue-up requirement
 */
export function getEdgeHeightForBoardThickness(boardThicknessMm: number | string): string {
  const t = typeof boardThicknessMm === 'string' ? parseFloat(boardThicknessMm) || 16 : boardThicknessMm;
  if (t <= 10) return '19'; // standard 10mm board uses 19mm edge (or 15mm)
  if (t <= 16) return '19'; // standard 16mm board uses 19mm edge
  if (t <= 18) return '22'; // 18mm MDF uses 22mm edge (or 23mm)
  if (t <= 26) return '28'; // 22mm / 25mm / 26mm board uses 28mm edge
  if (t <= 36) return '36'; // 32mm / 36mm glue-up uses 36mm edge
  return '43'; // thick glue-ups use 43mm edge
}

/**
 * Calculates standard price group for Egger decors (Гр.1, Гр.2, Гр.3)
 */
export function getEggerPriceGroup(decor: string): string {
  const d = decor.toUpperCase();
  // Group 1: basic plain whites and standard solid unicolors
  if (d.includes('W908') || d.includes('W980') || d.includes('БЕЛЫЙ БАЗОВЫЙ') || d.includes('БЕЛЫЙ ГЛАДКИЙ')) {
    return 'Гр.1';
  }
  // Group 3: Premium decors, Feelwood synchronized pore ST28, ST32, ST33, ST37, PerfectSense TM9, deep textures ST7
  if (
    d.includes('ST37') ||
    d.includes('ST38') ||
    d.includes('ST32') ||
    d.includes('ST28') ||
    d.includes('ST7') ||
    d.includes('ГАЛИФАКС') ||
    d.includes('H1180') ||
    d.includes('H1181') ||
    d.includes('H1176') ||
    d.includes('U999') || // Черный U999 в Egger часто идет в Гр.3
    d.includes('TM9') ||
    d.includes('TM12') ||
    d.includes('TM28') ||
    d.includes('SOLID') ||
    d.includes('СОЛИД')
  ) {
    return 'Гр.3';
  }
  // Group 2: All other standard decors and wood reproductions
  return 'Гр.2';
}

/**
 * Formats LDSP full title in exact manufacturer standard:
 * "ЛДСП 2800x2070x16 Чёрный U999 ST7, Гр.3, Egger"
 */
export function formatLdspTitle(params: {
  brand: string;
  decor: string;
  thickness?: number | string;
  dimensions?: string;
  group?: string;
}): string {
  const brand = params.brand || 'Egger';
  const decor = params.decor.trim();

  // If already formatted, return cleaned
  if (decor.startsWith('ЛДСП ') && decor.includes(brand)) {
    return decor;
  }

  const spec = BRAND_SHEET_SPECS[brand] || { length: 2800, width: 2070, defaultThickness: 16 };
  const thick = params.thickness || spec.defaultThickness || 16;
  const dimStr = params.dimensions || `${spec.length}x${spec.width}x${thick}`;

  const cleanDecor = decor
    .replace(/^ЛДСП\s+/i, '')
    .replace(new RegExp(`,\\s*${brand}$`, 'i'), '')
    .replace(new RegExp(`\\b${brand}\\b`, 'gi'), '')
    .trim();

  let groupStr = params.group || '';
  if (!groupStr && brand.toLowerCase() === 'egger') {
    groupStr = getEggerPriceGroup(cleanDecor);
  }

  const groupPart = groupStr ? `, ${groupStr}` : '';
  return `ЛДСП ${dimStr} ${cleanDecor}${groupPart}, ${brand}`;
}

/**
 * Formats MDF full title in exact manufacturer standard:
 * "МДФ 2800x1220x18 Белый глянец 601, AGT"
 */
export function formatMdfTitle(params: {
  brand: string;
  decor: string;
  thickness?: number | string;
  dimensions?: string;
}): string {
  const brand = params.brand || 'AGT';
  const decor = params.decor.trim();

  if (decor.startsWith('МДФ ') && decor.includes(brand)) {
    return decor;
  }

  const spec = BRAND_SHEET_SPECS[brand] || { length: 2800, width: 1220, defaultThickness: 18 };
  const thick = params.thickness || spec.defaultThickness || 18;
  const dimStr = params.dimensions || `${spec.length}x${spec.width}x${thick}`;

  const cleanDecor = decor
    .replace(/^МДФ\s+/i, '')
    .replace(new RegExp(`,\\s*${brand}$`, 'i'), '')
    .replace(new RegExp(`\\b${brand}\\b`, 'gi'), '')
    .trim();

  return `МДФ ${dimStr} ${cleanDecor}, ${brand}`;
}

/**
 * Formats Edge banding title in exact manufacturer standard:
 * "Кромка 0.4/19 Чёрный U999 ST7, Egger" or "Кромка 1.5/36 Дуб Галифакс H1180, Egger"
 */
export function formatEdgeTitle(params: {
  brand: string;
  decor: string;
  thickness: number | string;
  height?: number | string;
  boardThickness?: number | string;
}): string {
  const brand = params.brand || 'Egger';
  const decor = params.decor.trim();

  // If already formatted, normalize
  if (decor.startsWith('Кромка ') && decor.includes(brand)) {
    return decor;
  }

  const rawThick = String(params.thickness).trim();
  const numThick = parseFloat(rawThick) || 0.4;
  const thickLabel = numThick === 2 ? '2' : numThick === 1 ? '1' : rawThick;

  let heightLabel = params.height ? String(params.height).trim() : '';
  if (!heightLabel) {
    if (rawThick.includes('1.5') || rawThick.includes('36')) {
      heightLabel = '36';
    } else if (params.boardThickness) {
      heightLabel = getEdgeHeightForBoardThickness(params.boardThickness);
    } else {
      heightLabel = '19'; // Default standard for 16mm board
    }
  }

  const cleanDecor = decor
    .replace(/^Кромка\s+/i, '')
    .replace(/^(0\.4|0\.8|1|1\.0|1\.5|2|2\.0)\/(\d+)\s*/i, '')
    .replace(new RegExp(`,\\s*${brand}$`, 'i'), '')
    .replace(new RegExp(`\\b${brand}\\b`, 'gi'), '')
    .trim();

  return `Кромка ${thickLabel}/${heightLabel} ${cleanDecor}, ${brand}`;
}

/**
 * Universal formatter that handles any product type cleanly
 */
export function formatCatalogMaterialName(
  brand: string,
  decor: string,
  categoryOrType?: string,
  extra?: { thickness?: number | string; height?: number | string; group?: string }
): string {
  const cat = (categoryOrType || '').toLowerCase();
  const brandType = BRAND_TO_MATERIAL_TYPE[brand] || 'ЛДСП';

  if (cat.includes('кромк') || brandType === 'Кромка') {
    return formatEdgeTitle({
      brand,
      decor,
      thickness: extra?.thickness || '0.4',
      height: extra?.height
    });
  }

  if (cat.includes('мдф') || brandType === 'МДФ') {
    return formatMdfTitle({
      brand,
      decor,
      thickness: extra?.thickness
    });
  }

  return formatLdspTitle({
    brand,
    decor,
    thickness: extra?.thickness,
    group: extra?.group
  });
}
