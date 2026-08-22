import JSZip from 'jszip';
import * as pako from 'pako';
import { smartDecodeFile } from '../../../utils/fileEncodingDetector';

// Interface for a single Birka / Label item
export interface BirkaDetail {
  id: string;
  labelNumber: string;         // № детали / Позиция (без знака #)
  orderNumber?: string;        // Номер заказа
  name: string;                // Название детали (Боковина, Полка, Фасад)
  length: number;              // Длина (мм)
  width: number;               // Ширина (мм)
  thickness: number;           // Толщина (мм)
  material: string;            // Материал (ЛДСП 16мм, МДФ 18мм и т.д.)
  quantity: number;            // Количество (шт)
  
  // Edges by sides
  edgeL1?: string;             // Кромка Длина 1 (например, "ПВХ 2.0x19")
  edgeL2?: string;             // Кромка Длина 2
  edgeW1?: string;             // Кромка Ширина 1
  edgeW2?: string;             // Кромка Ширина 2
  
  texture?: string;            // Текстура (Вдоль / Поперек / Нет)
  notes?: string;              // Примечание (Присадка, Паз, ЧПУ)
  barcode?: string;            // Штрихкод
  holesEnd?: number;           // Количество отверстий в торец
  holesFace?: number;          // Количество отверстий в пласть
  holesCount?: number;         // Общее количество отверстий
}

export interface BirkaMaterialGroup {
  materialName: string;
  details: BirkaDetail[];
  totalQuantity: number;
  totalAreaM2: number;
  estimatedSheets?: number;    // Расчет количества листов (стандарт 2800x2070 / 2440x1830 с учетом коэффициента раскроя 0.82)
  edgesSummary: Record<string, number>; // Name of edge -> meters required
}

export interface BirkaParseResult {
  fileName: string;
  fileSize: number;
  fileHash: string;
  lastModified: string;
  encodingUsed: string;
  formatDetected: string;
  
  details: BirkaDetail[];
  materialGroups: BirkaMaterialGroup[];
  allEdges: { name: string; totalMeters: number; count: number }[];
  totalAreaM2: number;
  totalEdgeMeters: number;
  totalPartsCount: number;
  
  rawTextPreview: string;
  isDemoFile?: boolean;
}

// Compute simple fast hash for file identification
export const computeSimpleHash = (uint8: Uint8Array): string => {
  let h = 0x811c9dc5;
  const len = Math.min(uint8.length, 10000);
  for (let i = 0; i < len; i++) {
    h ^= uint8[i];
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
};

// Default recognized aliases for each Birka parameter
export const DEFAULT_BIRKA_COLUMN_MAPPING: Record<string, string[]> = {
  pos: ['№ дет', 'номер дет', 'деталь №', 'деталь номер', 'поз', 'позиц', '№ бирк', 'бирк', '№ п/п', 'п/п', 'код дет', 'part_no', 'part no', 'item_no', 'label', 'позиция', 'индекс', 'обозначение', 'код детали', 'номер детали', 'номер', 'код', 'поз.', '№'],
  name: ['наименов', 'название', 'наим', 'деталь', 'part', 'name', 'элемент', 'изделие'],
  orderNumber: ['зак', 'order', 'проект', 'сделка', 'номер заказа', 'заказ №', 'заказ', 'договор', 'номер проекта', 'код заказа', 'order_no', 'order_id', '№ заказа', 'заказ:', 'номер_заказа', '№зак', 'код_заказа'],
  length: ['длин', 'длина', 'length', 'l', 'размер х', 'размер x', 'габарит х', 'габарит x', 'x', 'l, мм', 'длина, мм'],
  width: ['шир', 'ширина', 'width', 'w', 'размер y', 'габарит y', 'y', 'w, мм', 'ширина, мм'],
  thickness: ['толщ', 'толщина', 'thick', 't', 'z', 'глубин', 'h', 'толщина, мм'],
  material: ['матер', 'материал', 'mat', 'плита', 'лдсп', 'мдф', 'хдф'],
  quantity: ['кол', 'количество', 'qty', 'count', 'шт', 'кол-во', 'к-во'],
  edgeL1: ['кромка л1', 'кромка1', 'длина 1', 'l1', 'кромка д1', 'край 1', 'edge1', 'кромка l1'],
  edgeL2: ['кромка л2', 'кромка2', 'длина 2', 'l2', 'кромка д2', 'край 2', 'edge2', 'кромка l2'],
  edgeW1: ['кромка ш1', 'кромка3', 'ширина 1', 'w1', 'кромка w1', 'край 3', 'edge3'],
  edgeW2: ['кромка ш2', 'кромка4', 'ширина 2', 'w2', 'кромка w2', 'край 4', 'edge4'],
  notes: ['примеч', 'паз', 'присад', 'note', 'коммент', 'инфо', 'обработка', 'чпу'],
  barcode: ['штрих', 'barcode', 'qr', 'штрихкод', 'qr-код', 'qrcode', 'шк', 'qr_code', 'код qr', 'qr код', 'код детали qr', 'штрих-код']
};

// Parse text content from .bir / .brx / .txt / .csv / .tsv file
export function parseBirFileText(text: string, customMapping?: Record<string, string[]>): BirkaDetail[] {
  const mapping = { ...DEFAULT_BIRKA_COLUMN_MAPPING, ...(customMapping || {}) };
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const details: BirkaDetail[] = [];

  // Strategy 1: Tab-Separated (TSV) or Semicolon/Comma CSV
  const delimiter = text.includes('\t') ? '\t' : text.includes(';') ? ';' : ',';
  const headerLineIndex = lines.findIndex(l => {
    const lower = l.toLowerCase();
    return lower.includes('наим') || lower.includes('детал') || lower.includes('длин') || lower.includes('шир') || lower.includes('матер') || lower.includes('поз') || lower.includes('размер');
  });

  if (headerLineIndex !== -1) {
    const headers = lines[headerLineIndex].split(delimiter).map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
    
    // Column index finders with exclusion support
    const findIndex = (keywords: string[], excludeKeywords: string[] = []) => 
      headers.findIndex(h => 
        keywords.some(k => h.includes(k.toLowerCase())) && !excludeKeywords.some(ek => h.includes(ek.toLowerCase()))
      );

    // Order index first (Заказ / Order / Проект)
    const orderIdx = findIndex(mapping.orderNumber || ['зак', 'order', 'проект']);

    // Part number index (№ детали / Позиция) - prioritized
    let posIdx = findIndex(mapping.pos || ['№ дет', 'поз', 'позиц', '№ бирк', 'код дет', 'part_no', 'item_no', 'label']);
    if (posIdx === -1) {
      posIdx = findIndex(['№', 'номер', 'pos', 'id'], ['зак', 'order', 'проект', 'издел', 'наим', 'назв', 'имя', 'длин', 'шир', 'толщ', 'кол']);
    }
    // Prevent overlap if order column was matched
    if (posIdx !== -1 && posIdx === orderIdx) {
      posIdx = -1;
    }

    // Name index
    let nameIdx = findIndex(mapping.name || ['наименов', 'название', 'наим', 'деталь', 'part', 'name'], ['№', 'номер', 'поз', 'код', 'id']);
    if (nameIdx === -1) {
      nameIdx = findIndex(['деталь', 'part', 'name'], ['№', 'номер', 'поз', 'код', 'id', 'матер', 'кромк']);
    }

    const lenIdx = findIndex(mapping.length || ['длин', 'длина', 'length', 'l', 'размер х', 'размер x', 'габарит х', 'x']);
    const widIdx = findIndex(mapping.width || ['шир', 'ширина', 'width', 'w', 'размер y', 'габарит y', 'y']);
    const thkIdx = findIndex(mapping.thickness || ['толщ', 'толщина', 'thick', 't', 'z', 'глубин']);
    const matIdx = findIndex(mapping.material || ['матер', 'материал', 'mat'], ['кромк']);
    const qtyIdx = findIndex(mapping.quantity || ['кол', 'количество', 'qty', 'count', 'шт']);
    
    // Edges
    const edgeL1Idx = findIndex(mapping.edgeL1 || ['кромка л1', 'кромка1', 'длина 1', 'l1', 'кромка д1', 'край 1']);
    const edgeL2Idx = findIndex(mapping.edgeL2 || ['кромка л2', 'кромка2', 'длина 2', 'l2', 'кромка д2']);
    const edgeW1Idx = findIndex(mapping.edgeW1 || ['кромка ш1', 'кромка3', 'ширина 1', 'w1', 'кромка ш1']);
    const edgeW2Idx = findIndex(mapping.edgeW2 || ['кромка ш2', 'кромка4', 'ширина 2', 'w2', 'кромка ш2']);
    const generalEdgeIdx = findIndex(['кромк', 'облиц', 'edge'], ['л1', 'л2', 'ш1', 'ш2', 'l1', 'l2', 'w1', 'w2']);

    const noteIdx = findIndex(mapping.notes || ['примеч', 'паз', 'присад', 'note', 'коммент', 'инфо']);
    const barcodeIdx = findIndex(mapping.barcode || ['штрих', 'код', 'barcode', 'qr']);

    // Holes indices
    const holesEndIdx = findIndex(['отв_тор', 'отв. торец', 'отверстий в торец', 'торец отв', 'торец_отв', 'holes_end', 'end_holes', 'торец']);
    const holesFaceIdx = findIndex(['отв_пласт', 'отв. пласть', 'отверстий в пласть', 'пласть отв', 'пласть_отв', 'holes_face', 'face_holes', 'пласть']);
    const holesCountIdx = findIndex(['всего отв', 'кол-во отв', 'отверстий', 'сверлен', 'присадк', 'holes', 'drills', 'кол отв']);

    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length < 2) continue;

      const name = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx] : `Деталь ${i - headerLineIndex}`;
      const length = lenIdx !== -1 && cols[lenIdx] ? parseFloat(cols[lenIdx].replace(',', '.')) : 0;
      const width = widIdx !== -1 && cols[widIdx] ? parseFloat(cols[widIdx].replace(',', '.')) : 0;
      const thickness = thkIdx !== -1 && cols[thkIdx] ? parseFloat(cols[thkIdx].replace(',', '.')) : 16;
      const material = matIdx !== -1 && cols[matIdx] ? cols[matIdx] : 'ЛДСП 16 мм';
      const quantity = qtyIdx !== -1 && cols[qtyIdx] ? parseInt(cols[qtyIdx], 10) || 1 : 1;
      const rawPos = posIdx !== -1 && cols[posIdx] ? cols[posIdx] : String(i - headerLineIndex);
      // Clean label number (remove leading #, №, words like "Поз.", "Позиция", "Деталь" while preserving "00.00", "00.00.00", etc.)
      const labelNumber = rawPos
        .replace(/^[#№\s]+/, '')
        .replace(/^(поз\.?|дет\.?|позиция|деталь|номер|item|pos)\s*/i, '')
        .trim();

      const edgeL1 = edgeL1Idx !== -1 ? cols[edgeL1Idx] : (generalEdgeIdx !== -1 ? cols[generalEdgeIdx] : undefined);
      const edgeL2 = edgeL2Idx !== -1 ? cols[edgeL2Idx] : undefined;
      const edgeW1 = edgeW1Idx !== -1 ? cols[edgeW1Idx] : undefined;
      const edgeW2 = edgeW2Idx !== -1 ? cols[edgeW2Idx] : undefined;

      const notes = noteIdx !== -1 ? cols[noteIdx] : undefined;
      const orderNumber = orderIdx !== -1 ? cols[orderIdx] : undefined;
      const barcode = barcodeIdx !== -1 ? cols[barcodeIdx] : undefined;

      const holesEnd = holesEndIdx !== -1 && cols[holesEndIdx] ? parseInt(cols[holesEndIdx], 10) : undefined;
      const holesFace = holesFaceIdx !== -1 && cols[holesFaceIdx] ? parseInt(cols[holesFaceIdx], 10) : undefined;
      const holesCount = holesCountIdx !== -1 && cols[holesCountIdx] ? parseInt(cols[holesCountIdx], 10) : undefined;

      if (name || length > 0 || width > 0) {
        details.push({
          id: `det_${i}_${Math.random().toString(36).substring(2, 7)}`,
          labelNumber: labelNumber || String(i - headerLineIndex),
          orderNumber,
          name,
          length: length || 700,
          width: width || 500,
          thickness: thickness || 16,
          material: material || 'ЛДСП 16 мм',
          quantity: quantity || 1,
          edgeL1: edgeL1 && edgeL1 !== '-' && edgeL1 !== '—' && edgeL1 !== '0' ? edgeL1 : undefined,
          edgeL2: edgeL2 && edgeL2 !== '-' && edgeL2 !== '—' && edgeL2 !== '0' ? edgeL2 : undefined,
          edgeW1: edgeW1 && edgeW1 !== '-' && edgeW1 !== '—' && edgeW1 !== '0' ? edgeW1 : undefined,
          edgeW2: edgeW2 && edgeW2 !== '-' && edgeW2 !== '—' && edgeW2 !== '0' ? edgeW2 : undefined,
          notes,
          barcode,
          holesEnd: !isNaN(holesEnd as number) ? holesEnd : undefined,
          holesFace: !isNaN(holesFace as number) ? holesFace : undefined,
          holesCount: !isNaN(holesCount as number) ? holesCount : undefined,
        });
      }
    }
  }

  // Strategy 2: INI-style or Key-Value records `[Birka]` or `[Item]`
  if (details.length === 0) {
    let currentItem: Partial<BirkaDetail> | null = null;
    let itemIdx = 1;

    for (const line of lines) {
      if (line.startsWith('[') && line.endsWith(']')) {
        if (currentItem && (currentItem.name || currentItem.length)) {
          details.push({
            id: `det_ini_${itemIdx}_${Math.random().toString(36).substring(2, 7)}`,
            labelNumber: (currentItem.labelNumber || String(itemIdx))
              .replace(/^[#№\s]+/, '')
              .replace(/^(поз\.?|дет\.?|позиция|деталь|номер|item|pos)\s*/i, '')
              .trim(),
            name: currentItem.name || `Деталь ${itemIdx}`,
            length: currentItem.length || 700,
            width: currentItem.width || 500,
            thickness: currentItem.thickness || 16,
            material: currentItem.material || 'ЛДСП 16 мм',
            quantity: currentItem.quantity || 1,
            edgeL1: currentItem.edgeL1,
            edgeL2: currentItem.edgeL2,
            edgeW1: currentItem.edgeW1,
            edgeW2: currentItem.edgeW2,
            notes: currentItem.notes,
            orderNumber: currentItem.orderNumber
          });
          itemIdx++;
        }
        currentItem = {};
        continue;
      }

      if (line.includes('=')) {
        if (!currentItem) currentItem = {};
        const [kRaw, ...vParts] = line.split('=');
        const k = kRaw.trim().toLowerCase();
        const v = vParts.join('=').trim();

        if (k.includes('наим') || k === 'name' || k === 'detal') currentItem.name = v;
        if (k.includes('длин') || k === 'length' || k === 'l' || k === 'sizex') currentItem.length = parseFloat(v);
        if (k.includes('шир') || k === 'width' || k === 'w' || k === 'sizey') currentItem.width = parseFloat(v);
        if (k.includes('толщ') || k === 'thick' || k === 't' || k === 'sizez') currentItem.thickness = parseFloat(v);
        if (k.includes('матер') || k === 'material' || k === 'mat') currentItem.material = v;
        if (k.includes('кол') || k === 'qty' || k === 'count') currentItem.quantity = parseInt(v, 10);
        if ((k.includes('поз') || k.includes('дет') || k === 'pos' || k === 'num' || k === 'id') && !k.includes('зак') && !k.includes('order')) {
          currentItem.labelNumber = v
            .replace(/^[#№\s]+/, '')
            .replace(/^(поз\.?|дет\.?|позиция|деталь|номер|item|pos)\s*/i, '')
            .trim();
        }
        if (k.includes('зак') || k === 'order') currentItem.orderNumber = v;
        if (k.includes('кромка1') || k === 'edgel1' || k === 'l1') currentItem.edgeL1 = v;
        if (k.includes('кромка2') || k === 'edgel2' || k === 'l2') currentItem.edgeL2 = v;
        if (k.includes('кромка3') || k === 'edgew1' || k === 'w1') currentItem.edgeW1 = v;
        if (k.includes('кромка4') || k === 'edgew2' || k === 'w2') currentItem.edgeW2 = v;
        if (k.includes('примеч') || k === 'note' || k === 'remark') currentItem.notes = v;
        if (k.includes('торец') || k === 'holes_end' || k === 'end_holes') currentItem.holesEnd = parseInt(v, 10);
        if (k.includes('пласть') || k === 'holes_face' || k === 'face_holes') currentItem.holesFace = parseInt(v, 10);
        if (k.includes('отверст') || k === 'holes' || k === 'drills') currentItem.holesCount = parseInt(v, 10);
      }
    }

    if (currentItem && (currentItem.name || currentItem.length)) {
      details.push({
        id: `det_ini_${itemIdx}_${Math.random().toString(36).substring(2, 7)}`,
        labelNumber: (currentItem.labelNumber || String(itemIdx))
          .replace(/^[#№\s]+/, '')
          .replace(/^(поз\.?|дет\.?|позиция|деталь|номер|item|pos)\s*/i, '')
          .trim(),
        name: currentItem.name || `Деталь ${itemIdx}`,
        length: currentItem.length || 700,
        width: currentItem.width || 500,
        thickness: currentItem.thickness || 16,
        material: currentItem.material || 'ЛДСП 16 мм',
        quantity: currentItem.quantity || 1,
        edgeL1: currentItem.edgeL1,
        edgeL2: currentItem.edgeL2,
        edgeW1: currentItem.edgeW1,
        edgeW2: currentItem.edgeW2,
        notes: currentItem.notes,
        orderNumber: currentItem.orderNumber,
        holesEnd: !isNaN(currentItem.holesEnd as number) ? currentItem.holesEnd : undefined,
        holesFace: !isNaN(currentItem.holesFace as number) ? currentItem.holesFace : undefined,
        holesCount: !isNaN(currentItem.holesCount as number) ? currentItem.holesCount : undefined,
      });
    }
  }

  // Strategy 3: Heuristic Regex line parser
  if (details.length === 0) {
    const dimRegex = /(\d{2,4})\s*[\*xх×]\s*(\d{2,4})(?:\s*[\*xх×]\s*(\d{1,3}))?/i;
    lines.forEach((line, idx) => {
      const match = line.match(dimRegex);
      if (match) {
        const length = parseInt(match[1], 10);
        const width = parseInt(match[2], 10);
        const thickness = match[3] ? parseInt(match[3], 10) : 16;
        
        let mat = 'ЛДСП 16 мм';
        if (line.toLowerCase().includes('мдф')) mat = 'МДФ 18 мм';
        if (line.toLowerCase().includes('хдф') || line.toLowerCase().includes('двп')) mat = 'ХДФ 3 мм';

        details.push({
          id: `det_regex_${idx}_${Math.random().toString(36).substring(2, 7)}`,
          labelNumber: String(idx + 1),
          name: line.split(/[\t;,]/)[0] || `Деталь ${idx + 1}`,
          length,
          width,
          thickness,
          material: mat,
          quantity: 1,
          notes: line
        });
      }
    });
  }

  return details;
}

// Group details by material type and compute totals
export function buildMaterialGroups(details: BirkaDetail[]): { 
  groups: BirkaMaterialGroup[]; 
  allEdges: { name: string; totalMeters: number; count: number }[];
  totalAreaM2: number;
  totalEdgeMeters: number;
} {
  const groupMap = new Map<string, BirkaDetail[]>();
  const globalEdgeMeters = new Map<string, { meters: number; count: number }>();

  let grandTotalAreaM2 = 0;

  details.forEach(d => {
    const mat = d.material || 'Без указания материала';
    if (!groupMap.has(mat)) {
      groupMap.set(mat, []);
    }
    groupMap.get(mat)!.push(d);

    const addEdge = (edgeName: string | undefined, sideMeters: number) => {
      if (!edgeName || edgeName === '-' || edgeName === '—' || edgeName === '0') return;
      const cleanName = edgeName.trim();
      const existing = globalEdgeMeters.get(cleanName) || { meters: 0, count: 0 };
      existing.meters += sideMeters;
      existing.count += 1;
      globalEdgeMeters.set(cleanName, existing);
    };

    const lenMeters = (d.length / 1000) * d.quantity;
    const widMeters = (d.width / 1000) * d.quantity;

    addEdge(d.edgeL1, lenMeters);
    addEdge(d.edgeL2, lenMeters);
    addEdge(d.edgeW1, widMeters);
    addEdge(d.edgeW2, widMeters);
  });

  const groups: BirkaMaterialGroup[] = [];

  groupMap.forEach((groupDetails, matName) => {
    let totalQty = 0;
    let totalAreaM2 = 0;
    const edgesSummary: Record<string, number> = {};

    groupDetails.forEach(d => {
      const qty = d.quantity || 1;
      totalQty += qty;
      const area = (d.length / 1000) * (d.width / 1000) * qty;
      totalAreaM2 += area;

      const lenM = (d.length / 1000) * qty;
      const widM = (d.width / 1000) * qty;

      [
        { e: d.edgeL1, m: lenM },
        { e: d.edgeL2, m: lenM },
        { e: d.edgeW1, m: widM },
        { e: d.edgeW2, m: widM },
      ].forEach(({ e, m }) => {
        if (e && e !== '-' && e !== '—') {
          edgesSummary[e] = (edgesSummary[e] || 0) + m;
        }
      });
    });

    // Estimate sheet count based on material brand & size database:
    // EGGER / Egger / Kronospan: 2800 x 2070 mm = 5.796 m2
    // Nordeco / Lamarty: 2750 x 1830 mm = 5.0325 m2
    // Uvadrev: 2440 x 1830 mm = 4.465 m2
    // Evosoft / AGT / Evogloss / Arkopa: 2800 x 1220 mm = 3.416 m2
    // Tabletop / Столешница: 3050 x 600 mm = 1.83 m2
    // HDF / ХДФ / ДВП / 3мм: 2800 x 2070 mm = 5.796 m2 or 2440 x 1830 mm = 4.465 m2
    const lowerMat = matName.toLowerCase();
    let sheetAreaM2 = 5.80; // Standard fallback (2800 x 2070)

    if (lowerMat.includes('evosoft') || lowerMat.includes('эвософт') || lowerMat.includes('agt') || lowerMat.includes('evogloss') || lowerMat.includes('arkopa') || lowerMat.includes('1220')) {
      sheetAreaM2 = 3.416; // 2800 x 1220
    } else if (lowerMat.includes('nordeco') || lowerMat.includes('нордеко') || lowerMat.includes('lamarty') || lowerMat.includes('ламарти') || lowerMat.includes('белый фон') || lowerMat.includes('2750')) {
      sheetAreaM2 = 5.0325; // 2750 x 1830
    } else if (lowerMat.includes('uvadrev') || lowerMat.includes('увадрев') || lowerMat.includes('2440')) {
      sheetAreaM2 = 4.465; // 2440 x 1830
    } else if (lowerMat.includes('столешниц') || lowerMat.includes('скинали') || lowerMat.includes('стеновая')) {
      sheetAreaM2 = 1.83; // 3050 x 600
    } else if (lowerMat.includes('хдф') || lowerMat.includes('двп') || lowerMat.includes('оргалит') || lowerMat.includes('3мм')) {
      sheetAreaM2 = 4.465;
    } else if (lowerMat.includes('egger') || lowerMat.includes('эггер') || lowerMat.includes('гикори') || lowerMat.includes('галифакс') || lowerMat.includes('kronospan') || lowerMat.includes('кроношпан')) {
      sheetAreaM2 = 5.796; // 2800 x 2070
    }

    const usableSheetArea = sheetAreaM2 * 0.82; // 0.82 usable nesting efficiency
    const estimatedSheets = Math.ceil(totalAreaM2 / usableSheetArea) || 1;

    grandTotalAreaM2 += totalAreaM2;

    groups.push({
      materialName: matName,
      details: groupDetails,
      totalQuantity: totalQty,
      totalAreaM2: Math.round(totalAreaM2 * 100) / 100,
      estimatedSheets,
      edgesSummary
    });
  });

  let grandTotalEdgeMeters = 0;
  const allEdges = Array.from(globalEdgeMeters.entries()).map(([name, val]) => {
    const metersWithMargin = Math.round(val.meters * 1.05 * 10) / 10;
    grandTotalEdgeMeters += metersWithMargin;
    return {
      name,
      totalMeters: metersWithMargin,
      count: val.count
    };
  });

  return { 
    groups, 
    allEdges, 
    totalAreaM2: Math.round(grandTotalAreaM2 * 100) / 100,
    totalEdgeMeters: Math.round(grandTotalEdgeMeters * 10) / 10
  };
}

// Master Async Birka File Parser
export async function parseBirkaFile(
  file: File, 
  customMapping?: Record<string, string[]>,
  encodingPreference?: string
): Promise<BirkaParseResult> {
  const arrayBuf = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuf);
  const fileHash = computeSimpleHash(uint8);

  let rawText = '';
  let encodingUsed = 'UTF-8';
  let formatDetected = 'Спецификация деталей';

  // Check if explicit encoding preference provided
  if (encodingPreference && encodingPreference !== 'auto') {
    try {
      const decoder = new TextDecoder(encodingPreference);
      rawText = decoder.decode(uint8);
      encodingUsed = encodingPreference.toUpperCase();
    } catch {
      // Fallback to smart detection
    }
  }

  // Check if ZIP archive
  if (!rawText && (file.name.toLowerCase().endsWith('.zip') || (uint8[0] === 0x50 && uint8[1] === 0x4b))) {
    try {
      const zip = await JSZip.loadAsync(file);
      formatDetected = 'Архив (.zip с бирками)';
      
      const birkaFiles = Object.keys(zip.files).filter(fn => {
        const lower = fn.toLowerCase();
        return !zip.files[fn].dir && (
          lower.endsWith('.bir') || lower.endsWith('.brx') || 
          lower.endsWith('.txt') || lower.endsWith('.csv') || lower.endsWith('.tsv')
        );
      });

      if (birkaFiles.length > 0) {
        const contentUint8 = await zip.files[birkaFiles[0]].async('uint8array');
        const decoded = await smartDecodeFile(contentUint8);
        rawText = decoded.text;
        encodingUsed = `ZIP -> ${decoded.encoding}`;
      }
    } catch (e) {
      console.warn('ZIP extraction failed, fallback to direct text:', e);
    }
  }

  if (!rawText) {
    const decoded = await smartDecodeFile(uint8);
    rawText = decoded.text;
    encodingUsed = decoded.encoding;
    if (file.name.toLowerCase().endsWith('.bir')) formatDetected = 'Базис-Бирка (.bir)';
  }

  const details = parseBirFileText(rawText, customMapping);
  const { groups, allEdges, totalAreaM2, totalEdgeMeters } = buildMaterialGroups(details);

  return {
    fileName: file.name,
    fileSize: file.size,
    fileHash,
    lastModified: new Date(file.lastModified).toLocaleString('ru-RU'),
    encodingUsed,
    formatDetected,
    details,
    materialGroups: groups,
    allEdges,
    totalAreaM2,
    totalEdgeMeters,
    totalPartsCount: details.reduce((acc, d) => acc + (d.quantity || 1), 0),
    rawTextPreview: rawText.slice(0, 3000)
  };
}
