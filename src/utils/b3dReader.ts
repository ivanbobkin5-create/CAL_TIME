/**
 * BAZIS-Mebelshchik B3D binary model reader / BOM extractor
 * Extracts cutting panels (dimensions, materials, thickness, edges)
 * and hardware/fasteners without requiring 3D rendering or proprietary DLLs.
 */
import * as pako from 'pako';
import JSZip from 'jszip';

const MAGIC = [0x01, 0x00, 0x00, 0xff];

export interface B3DPanelItem {
  id: string;
  name: string;
  material: string;
  thickness: number;
  length: number;
  width: number;
  quantity: number;
  edgeL1?: string;
  edgeL2?: string;
  edgeW1?: string;
  edgeW2?: string;
}

export interface B3DHardwareItem {
  id: string;
  name: string;
  article: string;
  qty: number;
  unit: string;
}

export interface B3DParseResult {
  fileName: string;
  panels: B3DPanelItem[];
  hardware: B3DHardwareItem[];
  totalParts: number;
  totalAreaM2: number;
  totalEdgeMeters: number;
  rawData: any[][];
  hardwareReportData: any[][];
}

class BinaryReader {
  private view: DataView;
  private uint8: Uint8Array;
  public pos: number = 0;

  constructor(buffer: ArrayBuffer | Uint8Array, offset: number = 0) {
    if (buffer instanceof Uint8Array) {
      this.uint8 = buffer;
      this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    } else {
      this.uint8 = new Uint8Array(buffer);
      this.view = new DataView(buffer);
    }
    this.pos = offset;
  }

  get length(): number {
    return this.uint8.length;
  }

  take(n: number): Uint8Array {
    if (this.pos + n > this.length) {
      throw new Error(`Truncated input at ${this.pos}, need ${n} bytes (total ${this.length})`);
    }
    const slice = this.uint8.subarray(this.pos, this.pos + n);
    this.pos += n;
    return slice;
  }

  uint8Val(): number {
    if (this.pos + 1 > this.length) throw new Error('Truncated uint8');
    const v = this.view.getUint8(this.pos);
    this.pos += 1;
    return v;
  }

  int32Val(): number {
    if (this.pos + 4 > this.length) throw new Error('Truncated int32');
    const v = this.view.getInt32(this.pos, true);
    this.pos += 4;
    return v;
  }

  uint32Val(): number {
    if (this.pos + 4 > this.length) throw new Error('Truncated uint32');
    const v = this.view.getUint32(this.pos, true);
    this.pos += 4;
    return v;
  }

  float64Val(): number {
    if (this.pos + 8 > this.length) throw new Error('Truncated float64');
    const v = this.view.getFloat64(this.pos, true);
    this.pos += 8;
    return v;
  }
}

export interface B3DNode {
  nameId: number;
  name: string;
  tag: number;
  value: any;
  children: B3DNode[];
}

function parseContourBounds(data: Uint8Array): { width: number; length: number } | null {
  if (!data || data.length < 4) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const count = view.getUint32(0, true);
  if (count <= 0 || count > 10000) return null;

  let off = 4;
  const points: { x: number; y: number }[] = [];

  const sizes: Record<number, number> = { 0x10: 32, 0x11: 24, 0x14: 24, 0x12: 49 };

  for (let i = 0; i < count; i++) {
    if (off >= data.length) break;
    const tag = data[off];
    off += 1;
    const elemSize = sizes[tag];
    if (!elemSize || off + elemSize > data.length) break;

    if (tag === 0x10) {
      // 4 doubles: x1, y1, x2, y2
      const x1 = view.getFloat64(off, true);
      const y1 = view.getFloat64(off + 8, true);
      const x2 = view.getFloat64(off + 16, true);
      const y2 = view.getFloat64(off + 24, true);
      if (Number.isFinite(x1) && Number.isFinite(y1)) points.push({ x: x1, y: y1 });
      if (Number.isFinite(x2) && Number.isFinite(y2)) points.push({ x: x2, y: y2 });
    } else if (tag === 0x11 || tag === 0x14) {
      const cx = view.getFloat64(off, true);
      const cy = view.getFloat64(off + 8, true);
      const r = view.getFloat64(off + 16, true);
      if (Number.isFinite(cx) && Number.isFinite(cy) && Number.isFinite(r)) {
        points.push({ x: cx - r, y: cy - r });
        points.push({ x: cx + r, y: cy + r });
      }
    } else if (tag === 0x12) {
      const cx = view.getFloat64(off, true);
      const cy = view.getFloat64(off + 8, true);
      const sx = view.getFloat64(off + 16, true);
      const sy = view.getFloat64(off + 24, true);
      const ex = view.getFloat64(off + 32, true);
      const ey = view.getFloat64(off + 40, true);
      points.push({ x: sx, y: sy });
      points.push({ x: ex, y: ey });
      const r = Math.hypot(sx - cx, sy - cy);
      if (Number.isFinite(r)) {
        points.push({ x: cx - r, y: cy - r });
        points.push({ x: cx + r, y: cy + r });
      }
    }
    off += elemSize;
  }

  if (points.length < 2) return null;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const d1 = Math.round(Math.abs(maxX - minX) * 10) / 10;
  const d2 = Math.round(Math.abs(maxY - minY) * 10) / 10;
  return {
    width: Math.min(d1, d2),
    length: Math.max(d1, d2),
  };
}

class TreeReader {
  private r: BinaryReader;
  public names: string[] = [];

  constructor(data: Uint8Array, offset: number = 0) {
    this.r = new BinaryReader(data, offset);
    const n = this.r.uint32Val();
    if (n > 100000) {
      throw new Error(`Invalid dictionary count ${n}`);
    }
    const decoder = new TextDecoder('utf-8');
    for (let i = 0; i < n; i++) {
      const size = this.r.uint32Val();
      const raw = this.r.take(size);
      this.names.push(decoder.decode(raw));
    }
  }

  get pos(): number {
    return this.r.pos;
  }

  readNode(depth: number = 0): B3DNode {
    if (depth > 120) {
      throw new Error('Nesting depth limit exceeded');
    }
    const index = this.r.int32Val();
    const count = this.r.uint32Val();
    const tag = this.r.uint8Val();

    const name = index >= 0 && index < this.names.length ? this.names[index] : '<item>';
    let value: any = null;

    if (tag === 0) {
      value = null;
    } else if (tag === 1) {
      value = false;
    } else if (tag === 2) {
      value = true;
    } else if (tag === 3) {
      value = this.r.uint8Val();
    } else if (tag === 4) {
      value = this.r.int32Val();
    } else if (tag === 5 || tag === 9) {
      value = this.r.float64Val();
    } else if (tag === 6) {
      const charCount = this.r.uint32Val();
      const byteCount = charCount * 2;
      const raw = this.r.take(byteCount);
      // Check if starts with MAGIC
      if (raw.length >= 4 && raw[0] === MAGIC[0] && raw[1] === MAGIC[1] && raw[2] === MAGIC[2] && raw[3] === MAGIC[3]) {
        value = raw;
      } else {
        try {
          value = new TextDecoder('utf-16le').decode(raw);
        } catch {
          value = raw;
        }
      }
    } else if (tag === 7) {
      const byteLen = this.r.uint32Val();
      value = this.r.take(byteLen);
    } else if (tag === 8) {
      value = null;
    } else {
      value = null;
    }

    const children: B3DNode[] = [];
    for (let i = 0; i < count; i++) {
      children.push(this.readNode(depth + 1));
    }

    return { nameId: index, name, tag, value, children };
  }
}

function expandStream(data: Uint8Array): { raw: Uint8Array; consumed: number } {
  if (data.length < 5 || data[0] !== MAGIC[0] || data[1] !== MAGIC[1] || data[2] !== MAGIC[2] || data[3] !== MAGIC[3]) {
    throw new Error('Unsupported stream prefix in B3D body');
  }
  const mode = data[4];
  if (mode === 0) {
    return { raw: data.subarray(5), consumed: data.length };
  }
  if (mode !== 1) {
    throw new Error(`Unsupported stream encoding: ${mode}`);
  }

  // Decompress zlib stream using pako
  const compressed = data.subarray(5);
  const decompressed = pako.inflate(compressed);
  return { raw: decompressed, consumed: data.length };
}

function getNodeValue(node: B3DNode, childName: string, defaultValue: any = null): any {
  const child = node.children.find((c) => c.name === childName);
  return child !== undefined ? child.value : defaultValue;
}

function getNodeChild(node: B3DNode, childName: string): B3DNode | null {
  return node.children.find((c) => c.name === childName) || null;
}

/**
 * Check if the given buffer starts with Bazis B3D magic signature
 */
export function isB3DFile(buffer: ArrayBuffer | Uint8Array): boolean {
  const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (u8.length < 9) return false;
  // BZ85 + MAGIC + \x00
  if (u8[0] === 0x42 && u8[1] === 0x5a && u8[2] === 0x38 && u8[3] === 0x35) {
    if (u8[4] === MAGIC[0] && u8[5] === MAGIC[1] && u8[6] === MAGIC[2] && u8[7] === MAGIC[3]) {
      return true;
    }
  }
  return false;
}

/**
 * Parse binary .B3D file into structured panels & hardware
 */
export function parseB3DFile(buffer: ArrayBuffer | Uint8Array, fileName: string = 'model.b3d'): B3DParseResult {
  const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  if (!isB3DFile(u8)) {
    throw new Error('Файл не является корректным проектом Базис-Мебельщик (.b3d)');
  }

  // 1. Read Header
  const headerReader = new TreeReader(u8, 9);
  headerReader.readNode();
  const bodyOffset = headerReader.pos;

  // 2. Expand body
  const { raw: bodyRaw } = expandStream(u8.subarray(bodyOffset));

  // 3. Read body node tree
  const bodyReader = new TreeReader(bodyRaw);
  const bodyRoot = bodyReader.readNode();

  // 4. Extract library fastener templates
  const furnListNode = getNodeChild(bodyRoot, 'FurnList');
  const templateNames: Record<number, string> = {};
  if (furnListNode) {
    for (const fChild of furnListNode.children) {
      const fid = getNodeValue(fChild, 'FastID');
      const fname = getNodeValue(fChild, 'Name') || fChild.name;
      if (fid !== null && fname) {
        templateNames[Number(fid)] = String(fname).replace(/[\r\n]+/g, ' ').trim();
      }
    }
  }

  // 5. Walk Model objects
  const rawPanels: Array<{
    name: string;
    mat: string;
    thick: number;
    w: number;
    l: number;
    edges: { L1?: string; L2?: string; W1?: string; W2?: string };
  }> = [];

  const rawFasteners: Array<{ name: string; article?: string }> = [];

  function walkModel(node: B3DNode) {
    if (node.name === 'Obj') {
      const name = String(getNodeValue(node, 'Name', '')).replace(/[\r\n]+/g, ' ').trim();
      const mat = String(getNodeValue(node, 'Mat', '')).replace(/[\r\n]+/g, ' ').trim();
      const thick = Number(getNodeValue(node, 'Thick', 0));
      const contourVal = getNodeValue(node, 'Contour');
      const buttsNode = getNodeChild(node, 'Butts');
      const fastId = getNodeValue(node, 'FastID');

      if (contourVal instanceof Uint8Array && thick > 0) {
        // Panel detected
        const bounds = parseContourBounds(contourVal);
        let w = bounds ? bounds.width : 0;
        let l = bounds ? bounds.length : 0;

        // Extract edge banding from Butts
        const edges: { L1?: string; L2?: string; W1?: string; W2?: string } = {};
        if (buttsNode && buttsNode.children) {
          for (const butt of buttsNode.children) {
            const edgeMat = String(getNodeValue(butt, 'Mat') || getNodeValue(butt, 'Sign') || '').replace(/[\r\n]+/g, ' ').trim();
            const elem = getNodeValue(butt, 'Elem');
            if (edgeMat && elem !== null) {
              const elNum = Number(elem);
              if (elNum === 0) edges.L1 = edgeMat;
              else if (elNum === 1) edges.L2 = edgeMat;
              else if (elNum === 2) edges.W1 = edgeMat;
              else if (elNum === 3) edges.W2 = edgeMat;
              else {
                if (!edges.L1) edges.L1 = edgeMat;
                else if (!edges.W1) edges.W1 = edgeMat;
              }
            }
          }
        }

        rawPanels.push({
          name: name || 'Деталь',
          mat: mat || 'ЛДСП 16мм',
          thick: thick,
          w: w,
          l: l,
          edges,
        });
      } else if (fastId !== null || name.toLowerCase().includes('петл') || name.toLowerCase().includes('стяжк') || name.toLowerCase().includes('конфирмат') || name.toLowerCase().includes('опор') || name.toLowerCase().includes('ручк') || name.toLowerCase().includes('шкант')) {
        let fName = name;
        if (!fName && fastId !== null && templateNames[Number(fastId)]) {
          fName = templateNames[Number(fastId)];
        }
        if (fName && !fName.toLowerCase().includes('рамка') && !fName.toLowerCase().includes('габарит')) {
          rawFasteners.push({ name: fName });
        }
      }
    }

    for (const child of node.children) {
      if (child.name === 'Obj' || child.name === 'Objs' || child.name === 'Model') {
        walkModel(child);
      }
    }
  }

  const modelNode = getNodeChild(bodyRoot, 'Model');
  if (modelNode) {
    walkModel(modelNode);
  } else {
    walkModel(bodyRoot);
  }

  // 6. Aggregate panels (group by name + material + dimensions + edges)
  const panelGroups: Record<string, B3DPanelItem> = {};
  for (const p of rawPanels) {
    const key = `${p.name}_${p.mat}_${p.thick}_${p.l}_${p.w}_${p.edges.L1 || ''}_${p.edges.L2 || ''}_${p.edges.W1 || ''}_${p.edges.W2 || ''}`;
    if (!panelGroups[key]) {
      panelGroups[key] = {
        id: `b3d_${Object.keys(panelGroups).length + 1}`,
        name: p.name,
        material: p.mat,
        thickness: p.thick,
        length: p.l,
        width: p.w,
        quantity: 1,
        edgeL1: p.edges.L1,
        edgeL2: p.edges.L2,
        edgeW1: p.edges.W1,
        edgeW2: p.edges.W2,
      };
    } else {
      panelGroups[key].quantity += 1;
    }
  }
  const panels = Object.values(panelGroups);

  // 7. Aggregate hardware / fasteners
  const fastenerGroups: Record<string, B3DHardwareItem> = {};
  for (const f of rawFasteners) {
    const cleanName = f.name.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!fastenerGroups[cleanName]) {
      fastenerGroups[cleanName] = {
        id: `b3d_hw_${Object.keys(fastenerGroups).length + 1}`,
        name: cleanName,
        article: f.article || '',
        qty: 1,
        unit: 'шт',
      };
    } else {
      fastenerGroups[cleanName].qty += 1;
    }
  }
  const hardware = Object.values(fastenerGroups);

  // Totals
  let totalParts = 0;
  let totalAreaM2 = 0;
  let totalEdgeMeters = 0;

  for (const p of panels) {
    totalParts += p.quantity;
    totalAreaM2 += (p.length * p.width * p.quantity) / 1000000;
    const lMeters = (p.length / 1000) * p.quantity;
    const wMeters = (p.width / 1000) * p.quantity;
    if (p.edgeL1) totalEdgeMeters += lMeters;
    if (p.edgeL2) totalEdgeMeters += lMeters;
    if (p.edgeW1) totalEdgeMeters += wMeters;
    if (p.edgeW2) totalEdgeMeters += wMeters;
  }

  // 8. Format into Bazis standard rawData matrix (so existing calculator pipeline parses it flawlessly)
  // Columns:
  // 0: №, 1: Позиция, 4: Наименование, 6: Материал, 7: Артикул, 8: Толщина, 10: Кол-во,
  // 11: Заготовка_длина, 12: Заготовка_ширина, 19: Готовая деталь_длина, 20: Готовая деталь_ширина,
  // 25: Обозначение[L1], 27: Обозначение[L2], 29: Обозначение[W1], 31: Обозначение[W2]
  const rawData: any[][] = [];

  // Header row
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

  // Hardware report format
  const hardwareReportData: any[][] = [
    ['№', 'Наименование', 'Артикул', 'Количество', 'Ед. изм.', 'Тип'],
  ];
  hardware.forEach((h, idx) => {
    hardwareReportData.push([idx + 1, h.name, h.article, h.qty, h.unit, 'Фурнитура']);
  });

  return {
    fileName,
    panels,
    hardware,
    totalParts,
    totalAreaM2: Math.round(totalAreaM2 * 100) / 100,
    totalEdgeMeters: Math.round(totalEdgeMeters * 10) / 10,
    rawData,
    hardwareReportData,
  };
}

/**
 * Extract and parse all .B3D files from a ZIP archive
 */
export async function parseB3DFromZip(
  buffer: ArrayBuffer | Uint8Array,
  zipFileName: string = 'archive.zip'
): Promise<B3DParseResult[]> {
  const zip = await JSZip.loadAsync(buffer);
  const results: B3DParseResult[] = [];

  for (const relativePath of Object.keys(zip.files)) {
    const entry = zip.files[relativePath];
    if (entry.dir) continue;
    if (relativePath.toLowerCase().endsWith('.b3d')) {
      const u8 = await entry.async('uint8array');
      if (isB3DFile(u8)) {
        try {
          const parsed = parseB3DFile(u8, relativePath.split('/').pop() || relativePath);
          results.push(parsed);
        } catch (e) {
          console.warn(`Error parsing B3D file ${relativePath} inside ZIP:`, e);
        }
      }
    }
  }

  return results;
}

/**
 * Combine multiple B3DParseResult objects into one unified project result
 */
export function combineB3DResults(results: B3DParseResult[], combinedName: string): B3DParseResult {
  if (results.length === 0) {
    throw new Error('Нет распознанных моделей .B3D в архиве');
  }
  if (results.length === 1) return results[0];

  // Group panels
  const panelGroups: Record<string, B3DPanelItem> = {};
  for (const r of results) {
    for (const p of r.panels) {
      const key = `${p.name}_${p.material}_${p.thickness}_${p.length}_${p.width}_${p.edgeL1 || ''}_${p.edgeL2 || ''}_${p.edgeW1 || ''}_${p.edgeW2 || ''}`;
      if (!panelGroups[key]) {
        panelGroups[key] = {
          ...p,
          id: `b3d_comb_${Object.keys(panelGroups).length + 1}`,
        };
      } else {
        panelGroups[key].quantity += p.quantity;
      }
    }
  }
  const panels = Object.values(panelGroups);

  // Group hardware
  const hwGroups: Record<string, B3DHardwareItem> = {};
  for (const r of results) {
    for (const h of r.hardware) {
      const key = `${h.name}_${h.article}`;
      if (!hwGroups[key]) {
        hwGroups[key] = {
          ...h,
          id: `b3d_hw_comb_${Object.keys(hwGroups).length + 1}`,
        };
      } else {
        hwGroups[key].qty += h.qty;
      }
    }
  }
  const hardware = Object.values(hwGroups);

  let totalParts = 0;
  let totalAreaM2 = 0;
  let totalEdgeMeters = 0;

  for (const p of panels) {
    totalParts += p.quantity;
    totalAreaM2 += (p.length * p.width * p.quantity) / 1000000;
    const lMeters = (p.length / 1000) * p.quantity;
    const wMeters = (p.width / 1000) * p.quantity;
    if (p.edgeL1) totalEdgeMeters += lMeters;
    if (p.edgeL2) totalEdgeMeters += lMeters;
    if (p.edgeW1) totalEdgeMeters += wMeters;
    if (p.edgeW2) totalEdgeMeters += wMeters;
  }

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

  const hardwareReportData: any[][] = [
    ['№', 'Наименование', 'Артикул', 'Количество', 'Ед. изм.', 'Тип'],
  ];
  hardware.forEach((h, idx) => {
    hardwareReportData.push([idx + 1, h.name, h.article, h.qty, h.unit, 'Фурнитура']);
  });

  return {
    fileName: combinedName,
    panels,
    hardware,
    totalParts,
    totalAreaM2: Math.round(totalAreaM2 * 100) / 100,
    totalEdgeMeters: Math.round(totalEdgeMeters * 10) / 10,
    rawData,
    hardwareReportData,
  };
}

