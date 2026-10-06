// CNC G-Code / MPR / CIX File Parser & Pattern Generator for Furniture Drilling
// Converts G-Code and CNC CAM files into structured 3D drill patterns with edging sides

export interface CNCDrillHole {
  id: string;
  x: number; // mm from bottom-left corner
  y: number; // mm from bottom-left corner
  z: number; // depth mm
  diameter: number; // mm
  face: 'A' | 'B' | 'top' | 'bottom' | 'left' | 'right'; // Plast A (Top), Plast B (Bottom), or Edges
  toolId?: string;
  description?: string;
}

export interface CNCGroove {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  depth: number;
  face: 'A' | 'B';
}

export interface CNCEdgeSide {
  side: 'L1' | 'L2' | 'W1' | 'W2';
  name: string; // e.g. "Кромка ПВХ 1.0мм Дуб Вотан"
  thickness: number; // mm
  color: string;
  hasEdge: boolean;
}

export interface CNCDrillPattern {
  fileName?: string;
  length: number; // mm (L - height/length)
  width: number; // mm (W - width)
  thickness: number; // mm (T - thickness e.g. 16, 18, 22)
  edges: Record<'L1' | 'L2' | 'W1' | 'W2', CNCEdgeSide>;
  holes: CNCDrillHole[];
  grooves: CNCGroove[];
  toolsUsed: Array<{ toolId: string; diameter: number; description?: string }>;
  rawCode?: string;
}

// Default Tool Mapping if no explicit diameter specified in G-code comments
export const DEFAULT_CNC_TOOL_MAPPING: Record<string, number> = {
  'T1': 5,    // Confirmat / Shelf pin
  'T2': 8,    // Dowel (шкант)
  'T3': 15,   // Minifix / Eccentric
  'T4': 35,   // Hinge cup (петля)
  'T5': 20,   // Rafix / Cam
  'T6': 10,   // Handle / Sleeve
  'T101': 8,  // Edge drilling Left
  'T102': 8,  // Edge drilling Right
  'T103': 8,  // Edge drilling Top
  'T104': 8,  // Edge drilling Bottom
  'T20': 8,   // Groove Router
};

/**
 * Main parser for CNC G-code / MPR / CIX files
 */
export function parseCNCFile(
  fileText: string,
  fileName: string = 'cnc_file.nc',
  customToolMapping?: Record<string, number>
): CNCDrillPattern {
  const toolMap = { ...DEFAULT_CNC_TOOL_MAPPING, ...(customToolMapping || {}) };
  const lines = fileText.split(/\r?\n/);

  let length = 800;
  let width = 400;
  let thickness = 16;

  const holes: CNCDrillHole[] = [];
  const grooves: CNCGroove[] = [];
  const toolsUsedSet = new Map<string, number>();

  let currentTool = 'T1';
  let currentFace: 'A' | 'B' | 'top' | 'bottom' | 'left' | 'right' = 'A';
  let lastX = 0;
  let lastY = 0;

  // 1. Extract Dimensions from header comments or MPR/CIX variables
  for (const line of lines.slice(0, 50)) {
    const l = line.trim();

    // Match DIM X=800 Y=400 Z=16 or LENGTH=800 WIDTH=400 THICKNESS=16
    const dimMatch = l.match(/(?:DIM|DIMENSION|SIZE|PARTS|PANEL)[\s:=]+X[=:\s]*(\d+(?:\.\d+)?)[,\s]+Y[=:\s]*(\d+(?:\.\d+)?)(?:[,\s]+Z[=:\s]*(\d+(?:\.\d+)?))?/i) ||
                     l.match(/(?:L|LENGTH)[=:\s]+(\d+(?:\.\d+)?)[,\s]+(?:W|WIDTH)[=:\s]+(\d+(?:\.\d+)?)(?:[,\s]+(?:T|THICKNESS|HEIGHT)[=:\s]+(\d+(?:\.\d+)?))?/i);
    if (dimMatch) {
      if (dimMatch[1]) length = parseFloat(dimMatch[1]);
      if (dimMatch[2]) width = parseFloat(dimMatch[2]);
      if (dimMatch[3]) thickness = parseFloat(dimMatch[3]);
      continue;
    }

    // Match MPR / CIX [DIMENSION] L=800 W=400 T=16
    const lMatch = l.match(/^L\s*=\s*(\d+(?:\.\d+)?)/i);
    const wMatch = l.match(/^W\s*=\s*(\d+(?:\.\d+)?)/i);
    const tMatch = l.match(/^T\s*=\s*(\d+(?:\.\d+)?)/i);
    if (lMatch) length = parseFloat(lMatch[1]);
    if (wMatch) width = parseFloat(wMatch[1]);
    if (tMatch) thickness = parseFloat(tMatch[1]);

    // Extract tool definitions from comments e.g. (TOOL 1 = DRILL D5.0)
    const toolDefMatch = l.match(/\(TOOL\s*(\d+)\s*=\s*(?:DRILL|MILL)?\s*D?(\d+(?:\.\d+)?)/i);
    if (toolDefMatch) {
      const tKey = `T${toolDefMatch[1]}`;
      const dVal = parseFloat(toolDefMatch[2]);
      if (!isNaN(dVal) && dVal > 0) {
        toolMap[tKey] = dVal;
      }
    }
  }

  // 2. Parse G-Code & Drilling Commands
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l || l.startsWith(';') || l.startsWith('%')) continue;

    // Detect Tool Change e.g. T1 M6 or T101
    const tMatch = l.match(/\bT(\d+)\b/i);
    if (tMatch) {
      currentTool = `T${tMatch[1]}`;
    }

    // Detect Face Selection e.g. FACE=A, SIDE=TOP, G17 (Plast A), G18/G19 (Edges)
    if (/FACE\s*=\s*B|SIDE\s*=\_?B|PLAST\_B/i.test(l)) {
      currentFace = 'B';
    } else if (/FACE\s*=\s*A|SIDE\s*=\_?A|PLAST\_A/i.test(l)) {
      currentFace = 'A';
    } else if (/SIDE\s*=\s*TOP|EDGE\_TOP/i.test(l)) {
      currentFace = 'top';
    } else if (/SIDE\s*=\s*BOTTOM|EDGE\_BOTTOM/i.test(l)) {
      currentFace = 'bottom';
    } else if (/SIDE\s*=\s*LEFT|EDGE\_LEFT/i.test(l)) {
      currentFace = 'left';
    } else if (/SIDE\s*=\s*RIGHT|EDGE\_RIGHT/i.test(l)) {
      currentFace = 'right';
    }

    // Parse Drilling Cycles G81 / G82 / G83 / DRILL
    // e.g. G81 X100 Y50 Z-13 R2 F100 or DRILL X=100 Y=50 Z=13 D=8
    const isDrillCmd = /\bG8[123]\b/i.test(l) || /\bDRILL\b/i.test(l) || /\bHOLE\b/i.test(l) || /\bBS\b/i.test(l);
    if (isDrillCmd) {
      const xMatch = l.match(/\bX[=:\s]*(-?\d+(?:\.\d+)?)/i);
      const yMatch = l.match(/\bY[=:\s]*(-?\d+(?:\.\d+)?)/i);
      const zMatch = l.match(/\bZ[=:\s]*(-?\d+(?:\.\d+)?)/i);
      const dMatch = l.match(/\bD[=:\s]*(\d+(?:\.\d+)?)/i);

      if (xMatch) lastX = parseFloat(xMatch[1]);
      if (yMatch) lastY = parseFloat(yMatch[1]);

      let depth = 13;
      if (zMatch) {
        depth = Math.abs(parseFloat(zMatch[1]));
      }

      let diameter = toolMap[currentTool] || 8;
      if (dMatch) {
        diameter = parseFloat(dMatch[1]);
      }

      toolsUsedSet.set(currentTool, diameter);

      holes.push({
        id: `hole-${i}-${Math.random().toString(36).substring(2, 6)}`,
        x: Math.abs(lastX),
        y: Math.abs(lastY),
        z: depth || 13,
        diameter: diameter || 8,
        face: currentFace,
        toolId: currentTool,
        description: `Отверстие ⌀${diameter}мм, глубина ${depth}мм`
      });
      continue;
    }

    // Parse G0 / G1 Linear movements with Z depth for drilling or routing
    if (/\bG0?[01]\b/i.test(l) && /\bZ-/i.test(l)) {
      const xMatch = l.match(/\bX[=:\s]*(-?\d+(?:\.\d+)?)/i);
      const yMatch = l.match(/\bY[=:\s]*(-?\d+(?:\.\d+)?)/i);
      const zMatch = l.match(/\bZ[=:\s]*(-?\d+(?:\.\d+)?)/i);

      if (xMatch) lastX = parseFloat(xMatch[1]);
      if (yMatch) lastY = parseFloat(yMatch[1]);

      if (zMatch && (xMatch || yMatch)) {
        const depth = Math.abs(parseFloat(zMatch[1]));
        const diameter = toolMap[currentTool] || 5;
        toolsUsedSet.set(currentTool, diameter);

        holes.push({
          id: `hole-${i}-${Math.random().toString(36).substring(2, 6)}`,
          x: Math.abs(lastX),
          y: Math.abs(lastY),
          z: depth || 12,
          diameter: diameter || 5,
          face: currentFace,
          toolId: currentTool
        });
      }
    }
  }

  // Fallback default edging sides
  const edges: Record<'L1' | 'L2' | 'W1' | 'W2', CNCEdgeSide> = {
    L1: { side: 'L1', name: 'Кромка L1', thickness: 1.0, color: '#10b981', hasEdge: true },
    L2: { side: 'L2', name: 'Кромка L2', thickness: 1.0, color: '#10b981', hasEdge: true },
    W1: { side: 'W1', name: 'Кромка W1', thickness: 0.4, color: '#3b82f6', hasEdge: true },
    W2: { side: 'W2', name: 'Кромка W2', thickness: 0.4, color: '#3b82f6', hasEdge: false }
  };

  const toolsUsed = Array.from(toolsUsedSet.entries()).map(([toolId, diameter]) => ({
    toolId,
    diameter,
    description: `Инструмент ${toolId} (⌀${diameter}мм)`
  }));

  return {
    fileName,
    length,
    width,
    thickness,
    edges,
    holes,
    grooves,
    toolsUsed,
    rawCode: fileText
  };
}

/**
 * Synthesizes a realistic drill pattern for a detail if no CNC file was uploaded yet
 */
export function generatePatternForDetail(detail: any): CNCDrillPattern {
  const length = Math.max(100, Number(detail.height || detail.length || 800));
  const width = Math.max(100, Number(detail.width || 400));
  const thickness = Math.max(10, Number(detail.thickness || 16));
  const name = String(detail.name || '').toLowerCase();

  const holes: CNCDrillHole[] = [];
  const grooves: CNCGroove[] = [];

  // Parse Edging Sides from detail.edgeSides or detail edge strings
  const edgeSides = detail.edgeSides || {};
  const edges: Record<'L1' | 'L2' | 'W1' | 'W2', CNCEdgeSide> = {
    L1: { side: 'L1', name: 'Длина 1 (L1)', thickness: 1.0, color: '#10b981', hasEdge: !!edgeSides.left || !!edgeSides.L1 },
    L2: { side: 'L2', name: 'Длина 2 (L2)', thickness: 1.0, color: '#10b981', hasEdge: !!edgeSides.right || !!edgeSides.L2 },
    W1: { side: 'W1', name: 'Ширина 1 (W1)', thickness: 0.4, color: '#3b82f6', hasEdge: !!edgeSides.top || !!edgeSides.W1 },
    W2: { side: 'W2', name: 'Ширина 2 (W2)', thickness: 0.4, color: '#3b82f6', hasEdge: !!edgeSides.bottom || !!edgeSides.W2 }
  };

  // Synthesize realistic drilling based on furniture component type:
  if (name.includes('фасад') || name.includes('дверь') || name.includes('дверка')) {
    // Hinge cup holes (⌀35mm) + 2x ⌀2mm pilot holes for screws
    const offsetEnd = Math.min(120, length * 0.15);
    const xPositions = [offsetEnd, length - offsetEnd];
    if (length > 1200) xPositions.push(length / 2);

    xPositions.forEach((x, idx) => {
      // Main 35mm hinge cup
      holes.push({
        id: `hinge-cup-${idx}`,
        x,
        y: 22.5,
        z: 12.5,
        diameter: 35,
        face: 'B',
        toolId: 'T4',
        description: 'Отверстие под чашку петли ⌀35мм'
      });
      // Screw pilot holes
      holes.push({
        id: `hinge-screw-1-${idx}`,
        x: x - 22.5,
        y: 32,
        z: 10,
        diameter: 2,
        face: 'B',
        toolId: 'T1'
      });
      holes.push({
        id: `hinge-screw-2-${idx}`,
        x: x + 22.5,
        y: 32,
        z: 10,
        diameter: 2,
        face: 'B',
        toolId: 'T1'
      });
    });
  } else if (name.includes('бок') || name.includes('боковина') || name.includes('стойка')) {
    // Carcass Side Panel: Confirmat holes + Shelf pin holes + Back groove
    // Shelf pin holes ⌀5mm at 32mm grid
    const startY = 60;
    const endY = width - 60;
    for (let y of [startY, endY]) {
      for (let x = 120; x <= length - 120; x += 128) {
        holes.push({
          id: `shelf-pin-${x}-${y}`,
          x,
          y,
          z: 12,
          diameter: 5,
          face: 'A',
          toolId: 'T1',
          description: 'Отверстие под полкодержатель ⌀5мм'
        });
      }
    }
    // Confirmat / Minifix corner holes
    const corners = [
      { x: 37, y: 32 }, { x: 37, y: width - 32 },
      { x: length - 37, y: 32 }, { x: length - 37, y: width - 32 }
    ];
    corners.forEach((c, idx) => {
      holes.push({
        id: `confirmat-${idx}`,
        x: c.x,
        y: c.y,
        z: 16,
        diameter: 8,
        face: 'A',
        toolId: 'T2',
        description: 'Шкант / Эксцентрик ⌀8мм'
      });
      holes.push({
        id: `minifix-${idx}`,
        x: c.x + 32,
        y: c.y,
        z: 13,
        diameter: 15,
        face: 'A',
        toolId: 'T3',
        description: 'Муфта эксцентрика ⌀15мм'
      });
    });
    // Groove for HDF back panel
    grooves.push({
      id: 'hdf-groove-1',
      x1: 0,
      y1: 15,
      x2: length,
      y2: 15,
      width: 4,
      depth: 8,
      face: 'A'
    });
  } else if (name.includes('полк') || name.includes('горизонт') || name.includes('дно') || name.includes('крыша')) {
    // Shelf / Horizontal panel: Edge dowel holes ⌀8mm + Confirmat ⌀5mm
    const edgesList = [
      { x: 32, y: 0, face: 'bottom' as const },
      { x: length - 32, y: 0, face: 'bottom' as const },
      { x: 32, y: width, face: 'top' as const },
      { x: length - 32, y: width, face: 'top' as const }
    ];
    edgesList.forEach((e, idx) => {
      holes.push({
        id: `edge-dowel-${idx}`,
        x: e.x,
        y: e.y,
        z: 30,
        diameter: 8,
        face: e.face,
        toolId: 'T101',
        description: 'Торцевой шкант ⌀8мм'
      });
    });
    // Plast holes
    holes.push({ id: 'plast-1', x: 32, y: 32, z: 16, diameter: 5, face: 'A', toolId: 'T1' });
    holes.push({ id: 'plast-2', x: length - 32, y: 32, z: 16, diameter: 5, face: 'A', toolId: 'T1' });
  } else {
    // General detail fallback: Standard 4 corner holes + 2 center holes
    const marginX = Math.min(50, length * 0.1);
    const marginY = Math.min(50, width * 0.1);
    holes.push({ id: 'gen-1', x: marginX, y: marginY, z: 12, diameter: 5, face: 'A', toolId: 'T1' });
    holes.push({ id: 'gen-2', x: length - marginX, y: marginY, z: 12, diameter: 5, face: 'A', toolId: 'T1' });
    holes.push({ id: 'gen-3', x: marginX, y: width - marginY, z: 12, diameter: 8, face: 'A', toolId: 'T2' });
    holes.push({ id: 'gen-4', x: length - marginX, y: width - marginY, z: 12, diameter: 8, face: 'A', toolId: 'T2' });
  }

  const toolsUsed = [
    { toolId: 'T1', diameter: 5, description: 'Сверло ⌀5мм (Конфирмат/Полкодержатель)' },
    { toolId: 'T2', diameter: 8, description: 'Сверло ⌀8мм (Шкант/Дюбель)' },
    { toolId: 'T3', diameter: 15, description: 'Фреза ⌀15мм (Минификс)' },
    { toolId: 'T4', diameter: 35, description: 'Фреза ⌀35мм (Петля)' },
  ];

  return {
    length,
    width,
    thickness,
    edges,
    holes,
    grooves,
    toolsUsed
  };
}
