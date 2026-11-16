import * as pako from 'pako';

export interface ConstructorPanelItem {
  id: string;
  pos: string;
  name: string;
  materialName: string;
  thickness: number;
  width: number;  // mm
  height: number; // mm
  count: number;
  edgeL1?: string; // e.g. 'Кромка ПВХ 19х2.0 мм' or 'Кромка ПВХ 19х0.4 мм'
  edgeL2?: string;
  edgeW1?: string;
  edgeW2?: string;
  groove?: string;
  notes?: string;
  moduleId?: string;
  moduleName?: string;
  isFacade?: boolean;
  isBackHDF?: boolean;
  isWorktop?: boolean;
  isBacksplash?: boolean;
  // Optional 3D coordinates (mm) for Bazis-Script / 3D placement
  x?: number;
  y?: number;
  z?: number;
  orientation?: 'vert_x' | 'horiz' | 'front';
}

export interface ConstructorHardwareItem {
  id: string;
  name: string;
  category?: string;
  count: number;
  unit: string;
  price?: number;
  catalogProductId?: string;
  sku?: string;
}

const MAGIC = [0x01, 0x00, 0x00, 0xff];

class BinaryBuilder {
  private chunks: number[] = [];

  writeByte(b: number) {
    this.chunks.push(b & 0xff);
  }

  writeBytes(arr: Uint8Array | number[]) {
    for (let i = 0; i < arr.length; i++) {
      this.chunks.push(arr[i] & 0xff);
    }
  }

  writeUint16LE(val: number) {
    const buf = new ArrayBuffer(2);
    new DataView(buf).setUint16(0, val, true);
    this.writeBytes(new Uint8Array(buf));
  }

  writeInt32LE(val: number) {
    const buf = new ArrayBuffer(4);
    new DataView(buf).setInt32(0, val, true);
    this.writeBytes(new Uint8Array(buf));
  }

  writeUint32LE(val: number) {
    const buf = new ArrayBuffer(4);
    new DataView(buf).setUint32(0, val >>> 0, true);
    this.writeBytes(new Uint8Array(buf));
  }

  writeFloat64LE(val: number) {
    const buf = new ArrayBuffer(8);
    new DataView(buf).setFloat64(0, val, true);
    this.writeBytes(new Uint8Array(buf));
  }

  writeUtf8WithLen(str: string) {
    const encoded = new TextEncoder().encode(str);
    this.writeUint32LE(encoded.length);
    this.writeBytes(encoded);
  }

  writeUtf16String(str: string) {
    const len = str.length;
    this.writeUint32LE(len);
    for (let i = 0; i < len; i++) {
      this.writeUint16LE(str.charCodeAt(i));
    }
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.chunks);
  }
}

interface XBSNodeInput {
  name: string;
  tag: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  value?: any;
  children?: XBSNodeInput[];
}

/**
 * Serializes an XBS node tree with its UTF-8 tag dictionary,
 * matching Bazis-Mebelshik TXBSStream and TreeReader in src/utils/b3dReader.ts
 */
function serializeXBSTree(root: XBSNodeInput, fixedDictionary?: string[]): Uint8Array {
  const names: string[] = fixedDictionary ? [...fixedDictionary] : [];
  const nameToIndex = new Map<string, number>();
  names.forEach((n, idx) => nameToIndex.set(n, idx));

  function collectNames(node: XBSNodeInput) {
    if (node.name && !nameToIndex.has(node.name)) {
      nameToIndex.set(node.name, names.length);
      names.push(node.name);
    }
    if (node.children) {
      for (const ch of node.children) {
        collectNames(ch);
      }
    }
  }
  collectNames(root);

  const b = new BinaryBuilder();
  // 1. Dictionary count + UTF-8 strings
  b.writeUint32LE(names.length);
  for (const name of names) {
    b.writeUtf8WithLen(name);
  }

  // 2. Recursive Node serialization
  function writeNode(node: XBSNodeInput) {
    const idx = nameToIndex.has(node.name) ? nameToIndex.get(node.name)! : -1;
    const children = node.children || [];
    b.writeInt32LE(idx);
    b.writeUint32LE(children.length);
    b.writeByte(node.tag);

    if (node.tag === 3) {
      b.writeByte(Number(node.value) || 0);
    } else if (node.tag === 4) {
      b.writeInt32LE(Number(node.value) || 0);
    } else if (node.tag === 5) {
      b.writeFloat64LE(Number(node.value) || 0);
    } else if (node.tag === 6) {
      b.writeUtf16String(String(node.value ?? ''));
    } else if (node.tag === 7) {
      const bytes: Uint8Array =
        node.value instanceof Uint8Array ? node.value : new Uint8Array(node.value || []);
      b.writeUint32LE(bytes.length);
      b.writeBytes(bytes);
    }

    for (const ch of children) {
      writeNode(ch);
    }
  }

  writeNode(root);
  return b.toUint8Array();
}

/**
 * Builds a 4-line-segment closed 2D rectangular contour (136 bytes)
 * matching Bazis-Mebelshik T2DContour (tag 0x10 = line segment: x1, y1, x2, y2 as Float64LE)
 */
function makeRectContourBytes(lengthMm: number, widthMm: number): Uint8Array {
  const L = Math.max(10, Number(lengthMm) || 100);
  const W = Math.max(10, Number(widthMm) || 100);
  const b = new BinaryBuilder();
  b.writeUint32LE(4); // 4 line segments

  // Segment 1: (0, 0) -> (L, 0)
  b.writeByte(0x10);
  b.writeFloat64LE(0);
  b.writeFloat64LE(0);
  b.writeFloat64LE(L);
  b.writeFloat64LE(0);

  // Segment 2: (L, 0) -> (L, W)
  b.writeByte(0x10);
  b.writeFloat64LE(L);
  b.writeFloat64LE(0);
  b.writeFloat64LE(L);
  b.writeFloat64LE(W);

  // Segment 3: (L, W) -> (0, W)
  b.writeByte(0x10);
  b.writeFloat64LE(L);
  b.writeFloat64LE(W);
  b.writeFloat64LE(0);
  b.writeFloat64LE(W);

  // Segment 4: (0, W) -> (0, 0)
  b.writeByte(0x10);
  b.writeFloat64LE(0);
  b.writeFloat64LE(W);
  b.writeFloat64LE(0);
  b.writeFloat64LE(0);

  return b.toUint8Array();
}

function parseEdgeThickness(edgeLabel: string): number {
  if (/2[.,]0|2мм|2 мм/i.test(edgeLabel)) return 2.0;
  if (/1[.,]0|1мм|1 мм/i.test(edgeLabel)) return 1.0;
  return 0.4;
}

/**
 * Generates a binary .b3d file with a valid XBS header (0xFF000001)
 * matching sample_bazis.b3d and src/utils/b3dReader.ts
 */
export function generateB3DBinary(
  panels: ConstructorPanelItem[],
  hardware: ConstructorHardwareItem[],
  _projectName = 'Проект Мебель План 3D'
): Uint8Array {
  const STANDARD_DICT = [
    'Doc',
    'AppVersion',
    'VersionMajor',
    'VersionMinor',
    'Model',
    'FurnList',
    'Objs',
    'Obj',
    'Name',
    'Mat',
    'Thick',
    'Contour',
    'Butts',
    'Butt',
    'Elem',
    'Sign',
    'Width',
    'FastID',
    'ID',
  ];

  // 1. Header XBS Tree (uncompressed)
  const headerRoot: XBSNodeInput = {
    name: 'Doc',
    tag: 0,
    children: [
      { name: 'AppVersion', tag: 4, value: 2024 },
      { name: 'VersionMajor', tag: 4, value: 11 },
      { name: 'VersionMinor', tag: 4, value: 0 },
    ],
  };
  const headerTreeBytes = serializeXBSTree(headerRoot, STANDARD_DICT);

  // 2. Body XBS Tree (zlib compressed)
  const objNodes: XBSNodeInput[] = [];

  panels.forEach((panel, idx) => {
    const count = Math.max(1, Math.round(panel.count || 1));
    const lengthMm = Math.round(Math.max(panel.height || 100, panel.width || 100));
    const widthMm = Math.round(Math.min(panel.height || 100, panel.width || 100));
    const thickMm = Number(panel.thickness) || 16;
    const matFull = panel.materialName.includes('мм')
      ? panel.materialName
      : `${panel.materialName} (${thickMm} мм)`;

    for (let c = 0; c < count; c++) {
      const buttNodes: XBSNodeInput[] = [];
      const edgeSlots: Array<{ label?: string; elemIdx: number }> = [
        { label: panel.edgeL1, elemIdx: 0 },
        { label: panel.edgeL2, elemIdx: 1 },
        { label: panel.edgeW1, elemIdx: 2 },
        { label: panel.edgeW2, elemIdx: 3 },
      ];

      for (const slot of edgeSlots) {
        if (slot.label && slot.label.trim()) {
          const eLabel = slot.label.trim();
          const eThick = parseEdgeThickness(eLabel);
          buttNodes.push({
            name: 'Butt',
            tag: 0,
            children: [
              { name: 'Mat', tag: 6, value: eLabel },
              { name: 'Thick', tag: 5, value: eThick },
              { name: 'Width', tag: 5, value: 19 },
              { name: 'Elem', tag: 3, value: slot.elemIdx },
              { name: 'Sign', tag: 6, value: eLabel },
            ],
          });
        }
      }

      const panelChildren: XBSNodeInput[] = [
        { name: 'Name', tag: 6, value: panel.name || `Деталь ${idx + 1}` },
        { name: 'Mat', tag: 6, value: matFull },
        { name: 'Thick', tag: 5, value: thickMm },
        { name: 'Contour', tag: 7, value: makeRectContourBytes(lengthMm, widthMm) },
      ];

      if (buttNodes.length > 0) {
        panelChildren.push({
          name: 'Butts',
          tag: 0,
          children: buttNodes,
        });
      }

      objNodes.push({
        name: 'Obj',
        tag: 0,
        children: panelChildren,
      });
    }
  });

  // Fasteners / Hardware in FurnList + instances in Objs
  const furnListChildren: XBSNodeInput[] = [];
  hardware.forEach((hw, idx) => {
    const fastId = 101 + idx;
    const hwName = (hw.name || `Фурнитура ${idx + 1}`).trim();
    furnListChildren.push({
      name: 'Obj',
      tag: 0,
      children: [
        { name: 'Name', tag: 6, value: hwName },
        { name: 'FastID', tag: 4, value: fastId },
      ],
    });

    const total = Math.max(1, Math.round(hw.count || 1));
    for (let i = 0; i < total; i++) {
      objNodes.push({
        name: 'Obj',
        tag: 0,
        children: [
          { name: 'Name', tag: 6, value: hwName },
          { name: 'FastID', tag: 4, value: fastId },
        ],
      });
    }
  });

  const bodyRoot: XBSNodeInput = {
    name: 'Doc',
    tag: 0,
    children: [
      {
        name: 'Model',
        tag: 0,
        children: [
          {
            name: 'Objs',
            tag: 0,
            children: objNodes,
          },
        ],
      },
      {
        name: 'FurnList',
        tag: 0,
        children: furnListChildren,
      },
    ],
  };

  const bodyTreeBytes = serializeXBSTree(bodyRoot, STANDARD_DICT);
  const compressedBody = pako.deflate(bodyTreeBytes);

  // Assemble full B3D file:
  // "BZ85" + MAGIC (01 00 00 ff) + 0x00 + HeaderTree + MAGIC (01 00 00 ff) + 0x01 + zlib(BodyTree)
  const finalBuilder = new BinaryBuilder();
  // 'BZ85'
  finalBuilder.writeBytes([0x42, 0x5a, 0x38, 0x35]);
  // Header XBS Stream prefix: MAGIC + 0x00 (uncompressed)
  finalBuilder.writeBytes(MAGIC);
  finalBuilder.writeByte(0x00);
  finalBuilder.writeBytes(headerTreeBytes);

  // Body XBS Stream prefix: MAGIC + 0x01 (zlib compressed)
  finalBuilder.writeBytes(MAGIC);
  finalBuilder.writeByte(0x01);
  finalBuilder.writeBytes(compressedBody);

  return finalBuilder.toUint8Array();
}

/**
 * Triggers a browser download of the generated .b3d file
 */
export function downloadB3DFile(
  panels: ConstructorPanelItem[],
  hardware: ConstructorHardwareItem[],
  projectName = 'Проект_3D'
) {
  const bytes = generateB3DBinary(panels, hardware, projectName);
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = projectName.replace(/[^\wа-яА-ЯёЁ0-9_-]+/g, '_');
  a.href = url;
  a.download = `${safeName || 'project'}.b3d`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Generates and downloads a native Bazis-Mebelshik 3D Script (.js)
 * that builds all panels & furniture blocks directly inside desktop Bazis-Mebelshik
 */
export function downloadBazisScriptFile(
  panels: ConstructorPanelItem[],
  hardware: ConstructorHardwareItem[],
  projectName = 'Проект_3D'
) {
  const lines: string[] = [
    `// Скрипт Базис-Мебельщик для построения 3D-модели: ${projectName}`,
    `// В Базис-Мебельщик: Скрипты -> Запустить скрипт -> Выберите этот файл (.js)`,
    `Model.UnSelectAll();`,
    `Undo.Changing(Model);`,
    `var cursorX = 0;`,
    ``,
  ];

  // Group panels by moduleName
  const byModule = new Map<string, ConstructorPanelItem[]>();
  for (const p of panels) {
    const key = p.moduleName || 'Корпус';
    if (!byModule.has(key)) byModule.set(key, []);
    byModule.get(key)!.push(p);
  }

  let modIdx = 0;
  byModule.forEach((modPanels, modName) => {
    const safeModName = modName.replace(/"/g, '\\"');
    lines.push(`// === Блок: ${safeModName} ===`);
    lines.push(`var block_${modIdx} = BeginBlock("${safeModName}");`);
    let localY = 0;

    modPanels.forEach((p, pIdx) => {
      const safeName = (p.name || `Деталь ${pIdx + 1}`).replace(/"/g, '\\"');
      const safeMat = (
        p.materialName.includes('мм')
          ? p.materialName
          : `${p.materialName}\r${p.thickness || 16}`
      ).replace(/"/g, '\\"');
      const h = Math.round(p.height || 720);
      const w = Math.round(p.width || 510);
      const count = Math.max(1, Math.round(p.count || 1));

      for (let c = 0; c < count; c++) {
        lines.push(`ActiveMaterial.Make("${safeMat}", ${p.thickness || 16});`);
        const isVert = /боковин|перегородк|стойк|царг/i.test(p.name);
        const isFront = /фасад|задняя|стенк|двер|цокол/i.test(p.name);
        if (isVert) {
          lines.push(
            `var p = AddVertPanel(0, 0, ${w}, ${h}, cursorX + ${c * 20});`
          );
        } else if (isFront) {
          lines.push(
            `var p = AddFrontPanel(cursorX, 0, cursorX + ${w}, ${h}, ${c * 20});`
          );
        } else {
          lines.push(
            `var p = AddHorizPanel(cursorX, 0, cursorX + ${h}, ${w}, ${localY});`
          );
          localY += 150;
        }
        lines.push(`p.Name = "${safeName}";`);
        if (p.pos) lines.push(`p.ArtPos = "${String(p.pos).replace(/"/g, '\\"')}";`);
        lines.push(`p.Build();`);
      }
    });

    lines.push(`EndBlock();`);
    lines.push(`cursorX += 650;`);
    lines.push(``);
    modIdx++;
  });

  if (hardware.length > 0) {
    lines.push(`// Спецификация фурнитуры:`);
    hardware.forEach((hw) => {
      lines.push(`// - ${hw.name}: ${hw.count} ${hw.unit || 'шт.'}`);
    });
  }

  lines.push(`ViewAll();`);

  const blob = new Blob([lines.join('\r\n')], { type: 'text/javascript;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = projectName.replace(/[^\wа-яА-ЯёЁ0-9_-]+/g, '_');
  a.href = url;
  a.download = `${safeName || 'project'}_bazis_script.js`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Builds the exact 35-column 2D rawData matrix expected by parseBazisPanelsReport in src/App.tsx
 * Columns:
 * 0: №, 1: Позиция, 4: Наименование, 6: Материал, 7: Артикул, 8: Толщина, 10: Количество,
 * 11: Заготовка_длина, 12: Заготовка_ширина, 19: Готовая деталь_длина, 20: Готовая деталь_ширина,
 * 25: Обозначение[L1], 27: Обозначение[L2], 29: Обозначение[W1], 31: Обозначение[W2]
 */
export function buildBazisRawDataFromPanels(
  panels: ConstructorPanelItem[],
  hardware: ConstructorHardwareItem[]
): any[][] {
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

  let rowNum = 1;

  for (const p of panels) {
    // Worktops (>18mm) are passed via hardware/worktopCutting so they go to "Раскрой столешниц" instead of sheet LDSP cutting
    if (p.isWorktop && (p.thickness || 38) > 18) {
      continue;
    }
    const row: any[] = new Array(35).fill('');
    const lengthMm = Math.round(Math.max(p.height || 100, p.width || 100));
    const widthMm = Math.round(Math.min(p.height || 100, p.width || 100));
    const thickMm = Number(p.thickness) || 16;
    const matLabel = p.materialName.includes('мм')
      ? p.materialName
      : `${p.materialName} ${thickMm} мм`;

    row[0] = rowNum;
    row[1] = p.pos || String(rowNum);
    row[4] = p.name;
    row[6] = matLabel;
    row[7] = '';
    row[8] = thickMm;
    row[10] = Math.max(1, Math.round(p.count || 1));
    row[11] = lengthMm;
    row[12] = widthMm;
    row[19] = lengthMm;
    row[20] = widthMm;
    row[25] = p.edgeL1 || '';
    row[27] = p.edgeL2 || '';
    row[29] = p.edgeW1 || '';
    row[31] = p.edgeW2 || '';
    rawData.push(row);
    rowNum++;
  }

  for (const h of hardware) {
    const row: any[] = new Array(35).fill('');
    row[0] = rowNum;
    row[1] = `Ф${rowNum}`;
    row[4] = h.name;
    row[6] = h.category || 'Фурнитура и комплектующие';
    row[7] = h.sku || '';
    row[8] = 0;
    row[10] = Math.max(1, Math.round(h.count || 1));
    rawData.push(row);
    rowNum++;
  }

  return rawData;
}

