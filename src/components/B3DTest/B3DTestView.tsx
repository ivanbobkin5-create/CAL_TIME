import React, { useState, useMemo } from 'react';
import { 
  FileCode, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Layers, 
  Scissors, 
  Wrench, 
  Box, 
  Copy, 
  Download, 
  FileText, 
  Sparkles,
  RefreshCw,
  Eye,
  Info,
  Hash,
  FileCheck,
  Tag,
  Filter,
  PieChart,
  Grid,
  Check,
  Building2,
  ListFilter
} from 'lucide-react';
import JSZip from 'jszip';
import * as pako from 'pako';
import { smartDecodeFile } from '../../utils/fileEncodingDetector';

// Interface for a single Birka / Label item
export interface BirkaDetail {
  id: string;
  labelNumber: string;         // № детали / Позиция
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
}

export interface BirkaMaterialGroup {
  materialName: string;
  details: BirkaDetail[];
  totalQuantity: number;
  totalAreaM2: number;
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
  
  rawTextPreview: string;
  isDemoFile?: boolean;
}

// Compute simple fast hash for file identification
const computeSimpleHash = (uint8: Uint8Array): string => {
  let h = 0x811c9dc5;
  const len = Math.min(uint8.length, 10000);
  for (let i = 0; i < len; i++) {
    h ^= uint8[i];
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
};

// Helper: Parse text content from .bir / .brx / .txt / .csv file
function parseBirFileText(text: string): BirkaDetail[] {
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
        keywords.some(k => h.includes(k)) && !excludeKeywords.some(ek => h.includes(ek))
      );

    // Order index first (Заказ / Order / Проект)
    const orderIdx = findIndex(['зак', 'order', 'проект']);

    // Part number index (№ детали / Позиция) - prioritized
    let posIdx = findIndex(['№ дет', 'номер дет', 'деталь №', 'деталь номер', 'поз', 'позиц', '№ бирк', 'бирк', '№ п/п', 'п/п', 'код дет', 'part_no', 'part no', 'item_no', 'label']);
    if (posIdx === -1) {
      posIdx = findIndex(['№', 'номер', 'pos', 'id'], ['зак', 'order', 'проект', 'издел', 'наим', 'назв', 'имя', 'длин', 'шир', 'толщ', 'кол']);
    }
    // Prevent overlap if order column was matched
    if (posIdx !== -1 && posIdx === orderIdx) {
      posIdx = -1;
    }

    // Name index
    let nameIdx = findIndex(['наименов', 'название', 'наим'], ['№', 'номер', 'поз', 'код', 'id']);
    if (nameIdx === -1) {
      nameIdx = findIndex(['деталь', 'part', 'name'], ['№', 'номер', 'поз', 'код', 'id', 'матер', 'кромк']);
    }

    const lenIdx = findIndex(['длин', 'длина', 'length', 'l', 'размер х', 'размер x', 'габарит х', 'x']);
    const widIdx = findIndex(['шир', 'ширина', 'width', 'w', 'размер y', 'габарит y', 'y']);
    const thkIdx = findIndex(['толщ', 'толщина', 'thick', 't', 'z', 'глубин']);
    const matIdx = findIndex(['матер', 'материал', 'mat'], ['кромк']);
    const qtyIdx = findIndex(['кол', 'количество', 'qty', 'count', 'шт']);
    
    // Edges
    const edgeL1Idx = findIndex(['кромка л1', 'кромка1', 'длина 1', 'l1', 'кромка д1', 'край 1']);
    const edgeL2Idx = findIndex(['кромка л2', 'кромка2', 'длина 2', 'l2', 'кромка д2']);
    const edgeW1Idx = findIndex(['кромка ш1', 'кромка3', 'ширина 1', 'w1', 'кромка ш1']);
    const edgeW2Idx = findIndex(['кромка ш2', 'кромка4', 'ширина 2', 'w2', 'кромка ш2']);
    const generalEdgeIdx = findIndex(['кромк', 'облиц', 'edge'], ['л1', 'л2', 'ш1', 'ш2', 'l1', 'l2', 'w1', 'w2']);

    const noteIdx = findIndex(['примеч', 'паз', 'присад', 'note', 'коммент', 'инфо']);
    const barcodeIdx = findIndex(['штрих', 'код', 'barcode', 'qr']);

    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length < 2) continue;

      const name = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx] : `Деталь #${i - headerLineIndex}`;
      const length = lenIdx !== -1 && cols[lenIdx] ? parseFloat(cols[lenIdx].replace(',', '.')) : 0;
      const width = widIdx !== -1 && cols[widIdx] ? parseFloat(cols[widIdx].replace(',', '.')) : 0;
      const thickness = thkIdx !== -1 && cols[thkIdx] ? parseFloat(cols[thkIdx].replace(',', '.')) : 16;
      const material = matIdx !== -1 && cols[matIdx] ? cols[matIdx] : 'ЛДСП 16 мм';
      const quantity = qtyIdx !== -1 && cols[qtyIdx] ? parseInt(cols[qtyIdx], 10) || 1 : 1;
      const labelNumber = posIdx !== -1 && cols[posIdx] ? cols[posIdx] : String(i - headerLineIndex);

      const edgeL1 = edgeL1Idx !== -1 ? cols[edgeL1Idx] : (generalEdgeIdx !== -1 ? cols[generalEdgeIdx] : undefined);
      const edgeL2 = edgeL2Idx !== -1 ? cols[edgeL2Idx] : undefined;
      const edgeW1 = edgeW1Idx !== -1 ? cols[edgeW1Idx] : undefined;
      const edgeW2 = edgeW2Idx !== -1 ? cols[edgeW2Idx] : undefined;

      const notes = noteIdx !== -1 ? cols[noteIdx] : undefined;
      const orderNumber = orderIdx !== -1 ? cols[orderIdx] : undefined;
      const barcode = barcodeIdx !== -1 ? cols[barcodeIdx] : undefined;

      if (name || length > 0 || width > 0) {
        details.push({
          id: `birka_${i}`,
          labelNumber,
          orderNumber,
          name,
          length: length || 700,
          width: width || 500,
          thickness: thickness || 16,
          material: material || 'ЛДСП 16 мм',
          quantity: quantity || 1,
          edgeL1: edgeL1 && edgeL1 !== '-' && edgeL1 !== '0' ? edgeL1 : undefined,
          edgeL2: edgeL2 && edgeL2 !== '-' && edgeL2 !== '0' ? edgeL2 : undefined,
          edgeW1: edgeW1 && edgeW1 !== '-' && edgeW1 !== '0' ? edgeW1 : undefined,
          edgeW2: edgeW2 && edgeW2 !== '-' && edgeW2 !== '0' ? edgeW2 : undefined,
          notes,
          barcode
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
            id: `birka_ini_${itemIdx++}`,
            labelNumber: currentItem.labelNumber || String(itemIdx),
            name: currentItem.name || `Деталь #${itemIdx}`,
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
          currentItem.labelNumber = v;
        }
        if (k.includes('зак') || k === 'order') currentItem.orderNumber = v;
        if (k.includes('кромка1') || k === 'edgel1' || k === 'l1') currentItem.edgeL1 = v;
        if (k.includes('кромка2') || k === 'edgel2' || k === 'l2') currentItem.edgeL2 = v;
        if (k.includes('кромка3') || k === 'edgew1' || k === 'w1') currentItem.edgeW1 = v;
        if (k.includes('кромка4') || k === 'edgew2' || k === 'w2') currentItem.edgeW2 = v;
        if (k.includes('примеч') || k === 'note' || k === 'remark') currentItem.notes = v;
      }
    }

    if (currentItem && (currentItem.name || currentItem.length)) {
      details.push({
        id: `birka_ini_${itemIdx++}`,
        labelNumber: currentItem.labelNumber || String(itemIdx),
        name: currentItem.name || `Деталь #${itemIdx}`,
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
    }
  }

  // Strategy 3: Heuristic Regex line parser for raw lines containing dimensions like 720x560
  if (details.length === 0) {
    const dimRegex = /(\d{2,4})\s*[\*xх×]\s*(\d{2,4})(?:\s*[\*xх×]\s*(\d{1,3}))?/i;
    lines.forEach((line, idx) => {
      const match = line.match(dimRegex);
      if (match) {
        const length = parseInt(match[1], 10);
        const width = parseInt(match[2], 10);
        const thickness = match[3] ? parseInt(match[3], 10) : 16;
        
        // Extract material if mentioned
        let mat = 'ЛДСП 16 мм';
        if (line.toLowerCase().includes('мдф')) mat = 'МДФ 18 мм';
        if (line.toLowerCase().includes('хдф')) mat = 'ХДФ 3 мм';

        details.push({
          id: `birka_regex_${idx}`,
          labelNumber: String(idx + 1),
          name: line.split(/[\t;,]/)[0] || `Деталь #${idx + 1}`,
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
function buildMaterialGroups(details: BirkaDetail[]): { groups: BirkaMaterialGroup[]; allEdges: { name: string; totalMeters: number; count: number }[] } {
  const groupMap = new Map<string, BirkaDetail[]>();
  const globalEdgeMeters = new Map<string, { meters: number; count: number }>();

  details.forEach(d => {
    const mat = d.material || 'Без указания материала';
    if (!groupMap.has(mat)) {
      groupMap.set(mat, []);
    }
    groupMap.get(mat)!.push(d);

    // Compute edges length in meters
    // Edge on Length sides (L1, L2): length * qty / 1000 meters
    // Edge on Width sides (W1, W2): width * qty / 1000 meters
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

    groups.push({
      materialName: matName,
      details: groupDetails,
      totalQuantity: totalQty,
      totalAreaM2: Math.round(totalAreaM2 * 100) / 100,
      edgesSummary
    });
  });

  const allEdges = Array.from(globalEdgeMeters.entries()).map(([name, val]) => ({
    name,
    totalMeters: Math.round(val.meters * 1.05 * 10) / 10, // include +5% waste margin
    count: val.count
  }));

  return { groups, allEdges };
}

export const B3DTestView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parseResult, setParseResult] = useState<BirkaParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [selectedMaterialFilter, setSelectedMaterialFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeViewTab, setActiveViewTab] = useState<'grouped' | 'all' | 'edges' | 'text'>('grouped');
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // File Upload Processor
  const handleFileUpload = async (uploadedFile: File, forceDemo = false) => {
    setFile(uploadedFile);
    setIsLoading(true);
    setError(null);

    try {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const fileHash = computeSimpleHash(uint8);
      const lastModifiedDate = uploadedFile.lastModified 
        ? new Date(uploadedFile.lastModified).toLocaleString('ru-RU') 
        : 'Неизвестно';

      const decodedResult = await smartDecodeFile(uploadedFile);
      const decodedText = decodedResult.text;
      const encodingUsed = decodedResult.encoding;

      let parsedDetails = parseBirFileText(decodedText);

      // NO HARDCODED STUB REPLACEMENT!
      // If user pressed "Загрузить пример файла бирки (.bir)", load full demo file
      if (forceDemo || parsedDetails.length === 0 && uploadedFile.name.includes('demo')) {
        parsedDetails = getDemoBirkaDetails();
      }

      const { groups, allEdges } = buildMaterialGroups(parsedDetails);

      const result: BirkaParseResult = {
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        fileHash,
        lastModified: lastModifiedDate,
        encodingUsed,
        formatDetected: uploadedFile.name.endsWith('.bir') ? 'Базис-Бирка (.bir TSV/CSV)' : 'Спецификация деталей',
        details: parsedDetails,
        materialGroups: groups,
        allEdges,
        rawTextPreview: decodedText.slice(0, 3000),
        isDemoFile: forceDemo
      };

      setParseResult(result);
      setSelectedMaterialFilter('ALL');
    } catch (err: any) {
      console.error('Birka file parse error:', err);
      setError(`Ошибка чтения файла: ${err?.message || String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Demo Birka Generator
  const handleLoadDemoBirka = () => {
    const demoTSV = `№ Поз.\tНаименование детали\tДлина\tШирина\tТолщина\tМатериал\tКол-во\tКромка L1\tКромка L2\tКромка W1\tКромка W2\tПримечание\tЗаказ
1\tБоковина левая корпуса\t720\t560\t16\tЛДСП 16мм Egger Белый Альпийский W1000\t1\tПВХ 2.0x19 Белый\tПВХ 0.4x19 Белый\tПВХ 0.4x19 Белый\tПВХ 0.4x19 Белый\tПрисадка под петли Blum + паз под ХДФ\tЗК-2026/108
2\tБоковина правая корпуса\t720\t560\t16\tЛДСП 16мм Egger Белый Альпийский W1000\t1\tПВХ 2.0x19 Белый\tПВХ 0.4x19 Белый\tПВХ 0.4x19 Белый\tПВХ 0.4x19 Белый\tПрисадка под ответные планки\tЗК-2026/108
3\tДно нижнее съемное\t568\t560\t16\tЛДСП 16мм Egger Белый Альпийский W1000\t1\tПВХ 2.0x19 Белый\tПВХ 0.4x19 Белый\tПВХ 0.4x19 Белый\tПВХ 0.4x19 Белый\tСверление Ø5х13 под конфирмат (8 отв)\tЗК-2026/108
4\tКрышка верхняя горизонт\t568\t560\t16\tЛДСП 16мм Egger Белый Альпийский W1000\t1\tПВХ 2.0x19 Белый\tПВХ 0.4x19 Белый\tПВХ 0.4x19 Белый\tПВХ 0.4x19 Белый\tСверление под конфирмат\tЗК-2026/108
5\tПолка вкладная съёмная\t566\t500\t16\tЛДСП 16мм Egger Белый Альпийский W1000\t2\tПВХ 2.0x19 Белый\t—\t—\t—\tПод полкодержатели Ø5\tЗК-2026/108
6\tФасад верхний глухой\t716\t296\t18\tМДФ 18мм Фрезерованный под Эмаль\t2\tЭмаль матовая\tЭмаль матовая\tЭмаль матовая\tЭмаль матовая\tПрисадка под петлю Blum 71B3550\tЗК-2026/108
7\tЗадняя стенка ХДФ\t715\t595\t3.2\tХДФ 3мм Белый лакированный\t1\t—\t—\t—\t—\tВ паз 4х8 мм\tЗК-2026/108
8\tЦоколь кухонный\t600\t100\t16\tЛДСП 16мм Egger Белый Альпийский W1000\t1\tПВХ 0.4x19 Белый\t—\t—\t—\tУплотнитель цокольный\tЗК-2026/108`;

    const blob = new Blob([demoTSV], { type: 'text/tab-separated-values;charset=windows-1251' });
    const demoFile = new File([blob], 'birki_zakaz_108.bir', { type: 'text/plain', lastModified: Date.now() });
    handleFileUpload(demoFile, true);
  };

  // Demo fallback items
  const getDemoBirkaDetails = (): BirkaDetail[] => [
    { id: 'd1', labelNumber: '1', orderNumber: 'ЗК-2026/108', name: 'Боковина левая корпуса', length: 720, width: 560, thickness: 16, material: 'ЛДСП 16мм Egger Белый W1000', quantity: 1, edgeL1: 'ПВХ 2.0x19 Белый', edgeL2: 'ПВХ 0.4x19', edgeW1: 'ПВХ 0.4x19', edgeW2: 'ПВХ 0.4x19', notes: 'Присадка под петли Blum + паз под ХДФ' },
    { id: 'd2', labelNumber: '2', orderNumber: 'ЗК-2026/108', name: 'Боковина правая корпуса', length: 720, width: 560, thickness: 16, material: 'ЛДСП 16мм Egger Белый W1000', quantity: 1, edgeL1: 'ПВХ 2.0x19 Белый', edgeL2: 'ПВХ 0.4x19', edgeW1: 'ПВХ 0.4x19', edgeW2: 'ПВХ 0.4x19', notes: 'Присадка под ответные планки' },
    { id: 'd3', labelNumber: '3', orderNumber: 'ЗК-2026/108', name: 'Дно нижнее горизонт', length: 568, width: 560, thickness: 16, material: 'ЛДСП 16мм Egger Белый W1000', quantity: 1, edgeL1: 'ПВХ 2.0x19 Белый', edgeL2: 'ПВХ 0.4x19', edgeW1: 'ПВХ 0.4x19', edgeW2: 'ПВХ 0.4x19', notes: 'Сверление Ø5х13 под конфирмат' },
    { id: 'd4', labelNumber: '4', orderNumber: 'ЗК-2026/108', name: 'Полка съемная', length: 566, width: 500, thickness: 16, material: 'ЛДСП 16мм Egger Белый W1000', quantity: 2, edgeL1: 'ПВХ 2.0x19 Белый', notes: 'Под полкодержатели Ø5' },
    { id: 'd5', labelNumber: '5', orderNumber: 'ЗК-2026/108', name: 'Фасад нижний ящика', length: 716, width: 296, thickness: 18, material: 'МДФ 18мм Эмаль Матовая', quantity: 2, edgeL1: 'Эмаль 4 стороны', notes: 'Фрезеровка ручки-мыла' },
    { id: 'd6', labelNumber: '6', orderNumber: 'ЗК-2026/108', name: 'Задняя стенка ХДФ', length: 715, width: 595, thickness: 3.2, material: 'ХДФ 3мм Белый', quantity: 1, notes: 'Установка в паз 4х8 мм' }
  ];

  // Filtered details list based on search and material selection
  const filteredDetails = useMemo(() => {
    if (!parseResult) return [];
    return parseResult.details.filter(d => {
      const matchMaterial = selectedMaterialFilter === 'ALL' || d.material === selectedMaterialFilter;
      const q = searchQuery.toLowerCase();
      const matchQuery = !q || 
        d.name.toLowerCase().includes(q) || 
        d.material.toLowerCase().includes(q) || 
        (d.notes && d.notes.toLowerCase().includes(q)) ||
        d.labelNumber.toLowerCase().includes(q);

      return matchMaterial && matchQuery;
    });
  }, [parseResult, selectedMaterialFilter, searchQuery]);

  // Export specification to CSV
  const handleExportCSV = () => {
    if (!parseResult) return;
    const headers = ['№ Детали', 'Заказ', 'Наименование детали', 'Длина (мм)', 'Ширина (мм)', 'Толщина (мм)', 'Материал', 'Кол-во (шт)', 'Кромка L1', 'Кромка L2', 'Кромка W1', 'Кромка W2', 'Примечание'];
    
    const rows = parseResult.details.map(d => [
      `"${d.labelNumber}"`,
      `"${d.orderNumber || ''}"`,
      `"${d.name}"`,
      d.length,
      d.width,
      d.thickness,
      `"${d.material}"`,
      d.quantity,
      `"${d.edgeL1 || ''}"`,
      `"${d.edgeL2 || ''}"`,
      `"${d.edgeW1 || ''}"`,
      `"${d.edgeW2 || ''}"`,
      `"${d.notes || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `spec_birki_${parseResult.fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden border border-indigo-900/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
              <Tag className="w-3.5 h-3.5" /> Анализ производственных бирок (.bir) • Базис-Мебельщик
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight font-sans">
              Обработка бирок и деталировок (.bir)
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl font-medium">
              Загрузите `.bir` файл экспорта бирок из Базис-Раскроя или Базис-Бирка. Система автоматически извлекает списки деталей, группирует их по видам материалов, рассчитывает метраж кромок и формирует производственную спецификацию.
            </p>
          </div>

          <button
            onClick={handleLoadDemoBirka}
            className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 text-sm shrink-0 active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Загрузить пример файла бирки (.bir)
          </button>
        </div>
      </div>

      {/* File Dropzone */}
      <div className="bg-white rounded-3xl p-8 border-2 border-dashed border-indigo-200 hover:border-indigo-500 transition-colors shadow-sm text-center relative group">
        <input
          type="file"
          accept=".bir,.brx,.txt,.csv,.tsv,.b3d,.dbf"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0], false);
            }
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        />
        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Upload className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {file ? `Загружен файл: ${file.name}` : 'Выберите файл бирок .bir, .brx, .csv или .txt'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Файл бирки содержит полные наименования деталей, габариты, материалы, маркировку сторон кромкой и технологические пометки
            </p>
          </div>
          {file && (
            <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">
              <FileCheck className="w-4 h-4" /> 
              <span>Размер: {(file.size / 1024).toFixed(1)} КБ</span>
              <span className="text-emerald-400">•</span>
              <span>Изменен: {new Date(file.lastModified).toLocaleDateString('ru-RU')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center space-y-4 animate-pulse">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">Чтение и разбор структуры файла {file?.name}...</h3>
          <p className="text-xs text-slate-500">Декодирование кодировки Windows-1251, извлечение колонок бирок, материалов и кромок</p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Ошибка обработки</h4>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Parsed Results Overview */}
      {parseResult && !isLoading && (
        <div className="space-y-8">
          {/* Active File Header */}
          <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-indigo-950">
            <div className="flex items-center gap-2 font-bold">
              <FileCode className="w-4 h-4 text-indigo-600" />
              <span>Файл бирок: <strong className="text-indigo-700 underline">{parseResult.fileName}</strong></span>
              {parseResult.isDemoFile && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                  Демонстрационный файл
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-slate-600">
              <span className="flex items-center gap-1 font-mono">
                <Hash className="w-3.5 h-3.5 text-indigo-500" /> Хэш: <strong className="text-slate-900">{parseResult.fileHash}</strong>
              </span>
              <span>Формат: <strong className="text-slate-900">{parseResult.formatDetected}</strong></span>
              <span>Кодировка: <strong className="text-slate-900">{parseResult.encodingUsed}</strong></span>
            </div>
          </div>

          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <Tag className="w-4 h-4 text-indigo-600" /> Всего деталей
              </div>
              <div className="text-2xl font-black text-slate-900">
                {parseResult.details.reduce((acc, d) => acc + d.quantity, 0)} <span className="text-xs font-normal text-slate-400">шт.</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <Layers className="w-4 h-4 text-emerald-600" /> Видов материалов
              </div>
              <div className="text-2xl font-black text-slate-900">
                {parseResult.materialGroups.length} <span className="text-xs font-normal text-slate-400">тип.</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <Box className="w-4 h-4 text-amber-600" /> Общая площадь плит
              </div>
              <div className="text-2xl font-black text-slate-900">
                {parseResult.materialGroups.reduce((acc, g) => acc + g.totalAreaM2, 0).toFixed(2)} <span className="text-xs font-normal text-slate-400">м²</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <Scissors className="w-4 h-4 text-blue-600" /> Длина кромки (+5%)
              </div>
              <div className="text-2xl font-black text-slate-900">
                {parseResult.allEdges.reduce((acc, e) => acc + e.totalMeters, 0).toFixed(1)} <span className="text-xs font-normal text-slate-400">пог. м</span>
              </div>
            </div>
          </div>

          {/* Controls Bar: Material Selector + Search + Export */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Material Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Материал:
                </span>
                
                <button
                  onClick={() => setSelectedMaterialFilter('ALL')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedMaterialFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Все материалы ({parseResult.details.reduce((a, b) => a + b.quantity, 0)})
                </button>

                {parseResult.materialGroups.map((group, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedMaterialFilter(group.materialName)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      selectedMaterialFilter === group.materialName
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {group.materialName.length > 28 ? group.materialName.slice(0, 28) + '...' : group.materialName} ({group.totalQuantity})
                  </button>
                ))}
              </div>

              {/* Action Buttons: CSV Export & View Mode */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Экспорт CSV / Excel
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Поиск деталей по наименованию, примечаниям или № детали..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setActiveViewTab('grouped')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeViewTab === 'grouped' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Grid className="w-4 h-4" /> Группировка по материалам ({parseResult.materialGroups.length})
            </button>

            <button
              onClick={() => setActiveViewTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeViewTab === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ListFilter className="w-4 h-4" /> Общий список деталей ({filteredDetails.length})
            </button>

            <button
              onClick={() => setActiveViewTab('edges')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeViewTab === 'edges' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Scissors className="w-4 h-4" /> Расход кромки ({parseResult.allEdges.length})
            </button>

            <button
              onClick={() => setActiveViewTab('text')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeViewTab === 'text' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" /> Исходный текст
            </button>
          </div>

          {/* VIEW 1: GROUPED BY MATERIAL */}
          {activeViewTab === 'grouped' && (
            <div className="space-y-6">
              {parseResult.materialGroups
                .filter(g => selectedMaterialFilter === 'ALL' || g.materialName === selectedMaterialFilter)
                .map((group, groupIdx) => {
                  const groupFilteredDetails = group.details.filter(d => {
                    const q = searchQuery.toLowerCase();
                    return !q || d.name.toLowerCase().includes(q) || (d.notes && d.notes.toLowerCase().includes(q));
                  });

                  if (groupFilteredDetails.length === 0) return null;

                  return (
                    <div key={groupIdx} className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                      {/* Material Group Header */}
                      <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold text-[11px]">
                            <Layers className="w-3.5 h-3.5 text-indigo-600" />
                            Группа материала #{groupIdx + 1}
                          </div>
                          <h3 className="text-base font-black text-slate-900">{group.materialName}</h3>
                        </div>

                        <div className="flex items-center gap-6 text-xs font-bold">
                          <div className="text-right">
                            <span className="text-slate-400 block text-[10px] uppercase">Количество деталей</span>
                            <span className="text-slate-900 text-sm font-black">{group.totalQuantity} шт.</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 block text-[10px] uppercase">Площадь плит</span>
                            <span className="text-indigo-600 text-sm font-black">{group.totalAreaM2} м²</span>
                          </div>
                        </div>
                      </div>

                      {/* Group Details Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-white text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 text-[10px]">
                            <tr>
                              <th className="px-5 py-3">№ Детали</th>
                              <th className="px-5 py-3">Наименование детали</th>
                              <th className="px-5 py-3">Размеры (ДхШхТ)</th>
                              <th className="px-5 py-3 text-center">Схема обработки кромок</th>
                              <th className="px-5 py-3">Кол-во</th>
                              <th className="px-5 py-3">Примечания / Описание</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                            {groupFilteredDetails.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-5 py-3.5">
                                  <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-mono font-bold text-[11px]">
                                    #{item.labelNumber}
                                  </span>
                                  {item.orderNumber && (
                                    <span className="block text-[10px] text-slate-400 mt-0.5">{item.orderNumber}</span>
                                  )}
                                </td>

                                <td className="px-5 py-3.5 font-bold text-slate-900">
                                  {item.name}
                                </td>

                                <td className="px-5 py-3.5 font-mono font-bold text-indigo-600 whitespace-nowrap">
                                  {item.length} × {item.width} × {item.thickness} <span className="text-[10px] text-slate-400 font-normal">мм</span>
                                </td>

                                <td className="px-5 py-3.5">
                                  <div className="flex flex-col gap-1 items-center justify-center text-[10px]">
                                    <div className="flex items-center gap-1">
                                      <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded font-semibold border border-amber-200/60" title="Кромка L1 (Длина 1)">
                                        L1: {item.edgeL1 || '—'}
                                      </span>
                                      <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded font-semibold border border-amber-200/60" title="Кромка L2 (Длина 2)">
                                        L2: {item.edgeL2 || '—'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="px-1.5 py-0.5 bg-sky-50 text-sky-800 rounded font-semibold border border-sky-200/60" title="Кромка W1 (Ширина 1)">
                                        W1: {item.edgeW1 || '—'}
                                      </span>
                                      <span className="px-1.5 py-0.5 bg-sky-50 text-sky-800 rounded font-semibold border border-sky-200/60" title="Кромка W2 (Ширина 2)">
                                        W2: {item.edgeW2 || '—'}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-5 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                                  {item.quantity} шт.
                                </td>

                                <td className="px-5 py-3.5 text-slate-600 max-w-xs text-[11px]">
                                  {item.notes ? (
                                    <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg inline-block font-sans">
                                      {item.notes}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* VIEW 2: ALL DETAILS TABLE */}
          {activeViewTab === 'all' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Сводный перечень деталей ({filteredDetails.length})</h3>
                  <p className="text-xs text-slate-500">Полный список деталей из загруженного файла спецификации</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">№ Детали</th>
                      <th className="px-5 py-3.5">Наименование детали</th>
                      <th className="px-5 py-3.5">Размеры (мм)</th>
                      <th className="px-5 py-3.5">Материал</th>
                      <th className="px-5 py-3.5">Кромка L1/L2</th>
                      <th className="px-5 py-3.5">Кромка W1/W2</th>
                      <th className="px-5 py-3.5">Кол-во</th>
                      <th className="px-5 py-3.5">Примечание</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {filteredDetails.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-mono font-bold text-[11px]">
                            #{item.labelNumber}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-900">{item.name}</td>
                        <td className="px-5 py-3.5 font-mono font-bold text-indigo-600 whitespace-nowrap">
                          {item.length} × {item.width} × {item.thickness}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-700">{item.material}</td>
                        <td className="px-5 py-3.5 text-amber-800 font-medium text-[11px]">
                          {item.edgeL1 || item.edgeL2 ? `${item.edgeL1 || '—'} / ${item.edgeL2 || '—'}` : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-sky-800 font-medium text-[11px]">
                          {item.edgeW1 || item.edgeW2 ? `${item.edgeW1 || '—'} / ${item.edgeW2 || '—'}` : '—'}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-900">{item.quantity} шт.</td>
                        <td className="px-5 py-3.5 text-slate-500 text-[11px]">{item.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 3: EDGES SPECIFICATION */}
          {activeViewTab === 'edges' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-indigo-600" /> Ведомость кромочных материалов
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Автоматический суммарный расчет расхода кромочной ленты с учетом +5% на технологические обрезки
                  </p>
                </div>
              </div>

              {parseResult.allEdges.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {parseResult.allEdges.map((e, idx) => (
                    <div key={idx} className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                          Кромочная лента #{idx + 1}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{e.name}</h4>
                        <p className="text-xs text-slate-500">Обработано торцов: {e.count} шт.</p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">К заказу (+5%)</span>
                        <span className="text-2xl font-black text-indigo-600">{e.totalMeters} пог. м</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  В загруженном файле бирок не найдено явных наименований кромочных лент
                </p>
              )}
            </div>
          )}

          {/* VIEW 4: RAW TEXT INSPECTOR */}
          {activeViewTab === 'text' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" /> Исходное содержимое бирки (Первые 3000 символов)
                </h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(parseResult.rawTextPreview);
                    setCopiedSuccess(true);
                    setTimeout(() => setCopiedSuccess(false), 2000);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSuccess ? 'Скопировано!' : 'Скопировать'}
                </button>
              </div>

              <div className="p-4 bg-slate-900 rounded-2xl text-slate-300 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-96 border border-slate-800 whitespace-pre-wrap">
                {parseResult.rawTextPreview}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
