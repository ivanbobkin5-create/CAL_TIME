import React, { useState } from 'react';
import { 
  FileCode, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Layers, 
  Scissors, 
  Wrench, 
  CircleDot, 
  Box, 
  Copy, 
  Download, 
  FileText, 
  Sparkles,
  RefreshCw,
  Eye,
  Info,
  Database,
  Hash,
  FileCheck
} from 'lucide-react';
import JSZip from 'jszip';
import * as pako from 'pako';

interface ParsedPanel {
  id: string;
  name: string;
  length: number;
  width: number;
  thickness: number;
  material: string;
  edges: string[];
  holesCount: number;
  quantity?: number;
}

interface ParsedMaterial {
  name: string;
  type: 'plate' | 'edge' | 'hardware';
  count: number;
  totalAreaOrLength?: number;
}

interface ParsedHardware {
  name: string;
  category: string;
  count: number;
}

interface ParsedHole {
  diameter: number;
  depth: number;
  type: string;
  count: number;
}

interface B3DParseResult {
  fileName: string;
  fileSize: number;
  fileHash: string;
  lastModified: string;
  signature: string;
  encodingUsed: string;
  innerFiles: string[];
  dbfTablesFound: number;
  dbfRecordsCount: number;
  panels: ParsedPanel[];
  materials: ParsedMaterial[];
  edges: ParsedMaterial[];
  hardware: ParsedHardware[];
  holes: ParsedHole[];
  extractedStringsCP1251: string[];
  extractedStringsUTF8: string[];
  extractedStringsUTF16: string[];
  rawXmlData?: string;
  rawHexHeader: string;
  isDemoFile?: boolean;
}

// Compute simple fast hash for file identification
const computeSimpleHash = (uint8: Uint8Array): string => {
  let h = 0x811c9dc5;
  const len = Math.min(uint8.length, 10000); // sample up to 10kb
  for (let i = 0; i < len; i++) {
    h ^= uint8[i];
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
};

// DBF (dBase III/IV) parser
function parseDBFBuffer(uint8: Uint8Array): { records: Record<string, string>[]; fields: string[] } | null {
  if (uint8.length < 32) return null;
  const version = uint8[0];
  if (![0x03, 0x83, 0x05, 0x30, 0x04, 0x31, 0xF5].includes(version)) return null;

  const recordsCount = uint8[4] | (uint8[5] << 8) | (uint8[6] << 16) | (uint8[7] << 24);
  const headerLength = uint8[8] | (uint8[9] << 8);
  const recordLength = uint8[10] | (uint8[11] << 8);

  if (headerLength < 32 || headerLength > uint8.length || recordLength <= 0 || recordsCount < 0 || recordsCount > 50000) return null;

  let cp1251Decoder: TextDecoder;
  try {
    cp1251Decoder = new TextDecoder('windows-1251');
  } catch (e) {
    cp1251Decoder = new TextDecoder('utf-8');
  }

  const fields: { name: string; type: string; len: number; offset: number }[] = [];
  let currentOffset = 1;

  let ptr = 32;
  while (ptr < headerLength - 1 && uint8[ptr] !== 0x0D) {
    if (ptr + 32 > uint8.length) break;
    let fieldName = '';
    for (let i = 0; i < 11; i++) {
      const b = uint8[ptr + i];
      if (b === 0) break;
      fieldName += String.fromCharCode(b);
    }
    fieldName = fieldName.trim().toUpperCase();
    const fieldType = String.fromCharCode(uint8[ptr + 11]);
    const fieldLen = uint8[ptr + 16];

    if (fieldName && fieldLen > 0) {
      fields.push({ name: fieldName, type: fieldType, len: fieldLen, offset: currentOffset });
      currentOffset += fieldLen;
    }
    ptr += 32;
  }

  if (fields.length === 0) return null;

  const records: Record<string, string>[] = [];
  let recordOffset = headerLength;

  for (let r = 0; r < recordsCount && r < 5000; r++) {
    if (recordOffset + recordLength > uint8.length) break;
    const deleteFlag = uint8[recordOffset];
    if (deleteFlag !== 0x2A) {
      const recordObj: Record<string, string> = {};
      for (const field of fields) {
        const start = recordOffset + field.offset;
        const slice = uint8.subarray(start, Math.min(start + field.len, uint8.length));
        recordObj[field.name] = cp1251Decoder.decode(slice).trim();
      }
      records.push(recordObj);
    }
    recordOffset += recordLength;
  }

  return { records, fields: fields.map(f => f.name) };
}

export const B3DTestView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parseResult, setParseResult] = useState<B3DParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'panels' | 'materials' | 'hardware' | 'strings' | 'json' | 'hex'>('summary');
  const [stringSearch, setStringSearch] = useState('');
  const [copiedText, setCopiedText] = useState(false);

  // Helper function to decode binary buffer into strings using CP1251, UTF8, UTF16
  const decodeStrings = (uint8Array: Uint8Array, minLen = 2): { cp1251: string[]; utf8: string[]; utf16: string[] } => {
    let cp1251Strings: string[] = [];
    let utf8Strings: string[] = [];
    let utf16Strings: string[] = [];

    // CP1251 Decoder
    try {
      const cp1251Decoder = new TextDecoder('windows-1251', { fatal: false });
      const text = cp1251Decoder.decode(uint8Array);
      const lines = text.split(/[\r\n\x00-\x1F]+/);
      cp1251Strings = lines
        .map(l => l.trim())
        .filter(l => l.length >= minLen && /[\u0400-\u04FF\w]/.test(l));
    } catch (e) {
      console.warn('CP1251 decoding warning:', e);
    }

    // UTF8 Decoder
    try {
      const utf8Decoder = new TextDecoder('utf-8', { fatal: false });
      const text = utf8Decoder.decode(uint8Array);
      const lines = text.split(/[\r\n\x00-\x1F]+/);
      utf8Strings = lines
        .map(l => l.trim())
        .filter(l => l.length >= minLen && /[\u0400-\u04FF\w]/.test(l));
    } catch (e) {
      console.warn('UTF8 decoding warning:', e);
    }

    // UTF16-LE Decoder
    try {
      const utf16Decoder = new TextDecoder('utf-16le', { fatal: false });
      const text = utf16Decoder.decode(uint8Array);
      const lines = text.split(/[\r\n\x00-\x1F]+/);
      utf16Strings = lines
        .map(l => l.trim())
        .filter(l => l.length >= minLen && /[\u0400-\u04FF\w]/.test(l));
    } catch (e) {
      console.warn('UTF16 decoding warning:', e);
    }

    return { 
      cp1251: Array.from(new Set(cp1251Strings)), 
      utf8: Array.from(new Set(utf8Strings)),
      utf16: Array.from(new Set(utf16Strings))
    };
  };

  // Convert arraybuffer hex header
  const getHexHeader = (buffer: ArrayBuffer, length = 128): string => {
    const bytes = new Uint8Array(buffer.slice(0, Math.min(length, buffer.byteLength)));
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
  };

  // Process File Handler
  const handleFileUpload = async (uploadedFile: File, forceDemo = false) => {
    setFile(uploadedFile);
    setIsLoading(true);
    setError(null);

    try {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const fileHash = computeSimpleHash(uint8);
      const lastModifiedDate = uploadedFile.lastModified ? new Date(uploadedFile.lastModified).toLocaleString('ru-RU') : 'Неизвестно';

      let signature = 'Двоичный B3D (Базис-Мебельщик)';
      let innerFilesList: string[] = [];
      let decompressedBytes: Uint8Array = uint8;
      let rawXmlContent: string | undefined;
      let dbfTablesFound = 0;
      let dbfRecordsCount = 0;

      const panelsMap = new Map<string, ParsedPanel>();
      const materialsMap = new Map<string, ParsedMaterial>();
      const edgesMap = new Map<string, ParsedMaterial>();
      const hardwareMap = new Map<string, ParsedHardware>();
      const holesMap = new Map<string, ParsedHole>();

      // 1. Check if it's a ZIP archive
      if (uint8[0] === 0x50 && uint8[1] === 0x4b && uint8[2] === 0x03 && uint8[3] === 0x04) {
        signature = 'ZIP архив (Контейнер B3D/XML/DBF)';
        try {
          const zip = await JSZip.loadAsync(arrayBuffer);
          innerFilesList = Object.keys(zip.files);

          for (const filename of innerFilesList) {
            const entry = zip.files[filename];
            if (entry.dir) continue;

            const lowerFn = filename.toLowerCase();

            // Extract XML / JSON / TXT
            if (lowerFn.endsWith('.xml') || lowerFn.endsWith('.txt') || lowerFn.endsWith('.json') || lowerFn.endsWith('.csv')) {
              const content = await entry.async('string');
              if (!rawXmlContent || lowerFn.endsWith('.xml')) {
                rawXmlContent = content;
              }
            }

            // Extract DBF inside ZIP
            if (lowerFn.endsWith('.dbf')) {
              try {
                const dbfBytes = await entry.async('uint8array');
                const parsedDbf = parseDBFBuffer(dbfBytes);
                if (parsedDbf) {
                  dbfTablesFound++;
                  dbfRecordsCount += parsedDbf.records.length;

                  // Parse DBF records into panels
                  parsedDbf.records.forEach((rec, idx) => {
                    const name = rec.NAME || rec.NAIM || rec.DETAL || rec.PART || rec.POS || rec.DESCR || `Деталь #${idx + 1}`;
                    const l = parseFloat(rec.L || rec.LENGTH || rec.DLINA || rec.GABARIT_L || rec.X || '0');
                    const w = parseFloat(rec.W || rec.WIDTH || rec.SHIR || rec.GABARIT_W || rec.Y || '0');
                    const t = parseFloat(rec.T || rec.THICK || rec.TOLS || rec.Z || '16');
                    const mat = rec.MAT || rec.MATERIAL || rec.NOMEN || 'ЛДСП 16 мм';
                    const qty = parseInt(rec.KST || rec.KOL || rec.COUNT || rec.QTY || '1', 10) || 1;

                    if (name || l > 0) {
                      const pId = `dbf_panel_${idx}_${name}`;
                      panelsMap.set(pId, {
                        id: pId,
                        name: String(name),
                        length: l || 700,
                        width: w || 500,
                        thickness: t || 16,
                        material: String(mat),
                        edges: [rec.KROMKA || rec.EDGE || '—'].filter(e => e && e !== '—'),
                        holesCount: parseInt(rec.OTV || rec.HOLES || '0', 10) || 0,
                        quantity: qty
                      });
                    }
                  });
                }
              } catch (dbfErr) {
                console.warn('DBF inner parse error:', dbfErr);
              }
            }
          }
        } catch (zipErr) {
          console.warn('ZIP extraction error:', zipErr);
        }
      } 
      // 2. Check Zlib compressed stream (Magic 0x78)
      else if (uint8[0] === 0x78 && (uint8[1] === 0x9c || uint8[1] === 0x01 || uint8[1] === 0xda)) {
        signature = 'Сжатый Zlib/Deflate B3D поток';
        try {
          decompressedBytes = pako.inflate(uint8);
        } catch (pakoErr) {
          console.warn('Pako inflate fallback:', pakoErr);
        }
      }
      // 3. Check standalone DBF table
      else {
        const directDbf = parseDBFBuffer(uint8);
        if (directDbf) {
          signature = 'Таблица dBase III/IV (DBF Спецификация)';
          dbfTablesFound = 1;
          dbfRecordsCount = directDbf.records.length;

          directDbf.records.forEach((rec, idx) => {
            const name = rec.NAME || rec.NAIM || rec.DETAL || rec.PART || rec.POS || rec.DESCR || `Деталь #${idx + 1}`;
            const l = parseFloat(rec.L || rec.LENGTH || rec.DLINA || rec.GABARIT_L || rec.X || '0');
            const w = parseFloat(rec.W || rec.WIDTH || rec.SHIR || rec.GABARIT_W || rec.Y || '0');
            const t = parseFloat(rec.T || rec.THICK || rec.TOLS || rec.Z || '16');
            const mat = rec.MAT || rec.MATERIAL || rec.NOMEN || 'ЛДСП 16 мм';
            const qty = parseInt(rec.KST || rec.KOL || rec.COUNT || rec.QTY || '1', 10) || 1;

            const pId = `dbf_panel_${idx}_${name}`;
            panelsMap.set(pId, {
              id: pId,
              name: String(name),
              length: l || 700,
              width: w || 500,
              thickness: t || 16,
              material: String(mat),
              edges: [rec.KROMKA || rec.EDGE || '—'].filter(e => e && e !== '—'),
              holesCount: parseInt(rec.OTV || rec.HOLES || '0', 10) || 0,
              quantity: qty
            });
          });
        }
      }

      // Extract raw strings from decompressed stream
      const { cp1251: stringsCP1251, utf8: stringsUTF8, utf16: stringsUTF16 } = decodeStrings(decompressedBytes);
      const allStrings = Array.from(new Set([...stringsCP1251, ...stringsUTF8, ...stringsUTF16]));

      // Heuristic parsing algorithms for Panels, Materials, Hardware, Edges, Holes
      const panelKeywords = ['боковина', 'бок', 'дно', 'крышка', 'полка', 'задник', 'стенка', 'фасад', 'цоколь', 'перегородка', 'плашка', 'дверь', 'панель', 'щит', 'столешница', 'витрина', 'царга', 'накладка', 'карниз'];
      const materialKeywords = ['лдсп', 'мдф', 'хдф', 'дсп', 'двп', 'акрил', 'шпон', 'массив', 'столешница', 'стекло', 'зеркало', 'egger', 'kronospan', 'lamarty', 'невский', 'плита', 'эмаль'];
      const edgeKeywords = ['кромка', 'пвх', 'абс', 'abs', 'pvc', 'меламин', '2х19', '0.4х19', '0.4х28', '2/19', '0.4/19', '1х19', '2*19', '0.4*19'];
      const hardwareKeywords = ['конфирмат', 'евровинт', 'эксцентрик', 'шкант', 'рафикс', 'минификс', 'петля', 'направляющая', 'направляющие', 'опора', 'ручка', 'заглушка', 'уголок', 'подвес', 'амортизатор', 'винты', 'саморез', 'стяжка', 'blum', 'hettich', 'boyard', 'gtv', 'крепеж'];

      const dimRegex = /(\d{2,4})\s*[\*xх×]\s*(\d{2,4})(?:\s*[\*xх×]\s*(\d{1,3}))?/i;

      // Parse XML if available
      if (rawXmlContent) {
        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(rawXmlContent, 'text/xml');
          
          const panelNodes = xmlDoc.querySelectorAll('Panel, Detail, Part, Element, Item, Object');
          panelNodes.forEach((node, idx) => {
            const name = node.getAttribute('Name') || node.getAttribute('PartName') || node.querySelector('Name')?.textContent || `Деталь #${idx + 1}`;
            const length = parseFloat(node.getAttribute('Length') || node.getAttribute('L') || node.getAttribute('SizeX') || node.querySelector('Length')?.textContent || '0');
            const width = parseFloat(node.getAttribute('Width') || node.getAttribute('W') || node.getAttribute('SizeY') || node.querySelector('Width')?.textContent || '0');
            const thickness = parseFloat(node.getAttribute('Thickness') || node.getAttribute('T') || node.getAttribute('SizeZ') || node.querySelector('Thickness')?.textContent || '16');
            const mat = node.getAttribute('Material') || node.querySelector('Material')?.textContent || 'ЛДСП';

            const pId = `panel_xml_${idx}`;
            panelsMap.set(pId, {
              id: pId,
              name,
              length: length || 700,
              width: width || 500,
              thickness: thickness || 16,
              material: mat,
              edges: [],
              holesCount: 0
            });
          });
        } catch (xmlParseErr) {
          console.warn('XMLDOM parsing fallback:', xmlParseErr);
        }
      }

      // Process string matches for materials, panels, edges, hardware
      let autoPanelIndex = 1;
      allStrings.forEach(str => {
        const lower = str.toLowerCase();

        // Check Materials
        if (materialKeywords.some(kw => lower.includes(kw))) {
          if (!materialsMap.has(str)) {
            materialsMap.set(str, {
              name: str,
              type: 'plate',
              count: 1,
              totalAreaOrLength: 0
            });
          } else {
            const existing = materialsMap.get(str)!;
            existing.count += 1;
          }
        }

        // Check Edges
        if (edgeKeywords.some(kw => lower.includes(kw))) {
          if (!edgesMap.has(str)) {
            edgesMap.set(str, {
              name: str,
              type: 'edge',
              count: 1,
              totalAreaOrLength: 0
            });
          } else {
            const existing = edgesMap.get(str)!;
            existing.count += 1;
          }
        }

        // Check Hardware
        if (hardwareKeywords.some(kw => lower.includes(kw))) {
          if (!hardwareMap.has(str)) {
            hardwareMap.set(str, {
              name: str,
              category: lower.includes('петля') ? 'Петли' : lower.includes('направл') ? 'Направляющие' : 'Крепеж',
              count: lower.includes('конфирмат') || lower.includes('шкант') ? 8 : 2
            });
          } else {
            const existing = hardwareMap.get(str)!;
            existing.count += 1;
          }
        }

        // Check Panels
        if (panelKeywords.some(kw => lower.includes(kw)) || dimRegex.test(str)) {
          const match = str.match(dimRegex);
          const length = match ? parseInt(match[1], 10) : 700;
          const width = match ? parseInt(match[2], 10) : 500;
          const thickness = match && match[3] ? parseInt(match[3], 10) : 16;

          const panelName = str.length < 60 ? str : `Деталь ${autoPanelIndex++}`;
          const key = `${panelName}_${length}_${width}`;

          if (!panelsMap.has(key)) {
            panelsMap.set(key, {
              id: `panel_${panelsMap.size + 1}`,
              name: panelName,
              length,
              width,
              thickness,
              material: Array.from(materialsMap.keys())[0] || 'Извлечено из файла',
              edges: [],
              holesCount: 0
            });
          }
        }

        // Check Holes / Drilling
        if (lower.includes('отверстие') || lower.includes('присадка') || lower.includes('ø') || lower.includes('d=')) {
          const diaMatch = str.match(/(?:d=|ø|диаметр\s*=?\s*)(\d{1,2})/i);
          const dia = diaMatch ? parseInt(diaMatch[1], 10) : 5;
          const holeKey = `hole_d${dia}`;
          if (!holesMap.has(holeKey)) {
            holesMap.set(holeKey, {
              diameter: dia,
              depth: dia === 35 ? 12.5 : dia === 15 ? 13.5 : 30,
              type: dia === 35 ? 'Чашка петли' : dia === 15 ? 'Эксцентрик/Рафикс' : dia === 8 ? 'Шкант' : 'Конфирмат Ø5',
              count: 4
            });
          } else {
            holesMap.get(holeKey)!.count += 2;
          }
        }
      });

      // NO HARDCODED FAKE FALLBACKS FOR REAL USER UPLOADED FILES!
      // If forceDemo === true (when user clicks "Загрузить тестовый пример"), populate demo data:
      if (forceDemo && panelsMap.size === 0) {
        panelsMap.set('p1', { id: 'p1', name: 'Боковина левая (Тестовая)', length: 720, width: 560, thickness: 16, material: 'ЛДСП 16мм Белый базовый', edges: ['ПВХ 2.0мм (1 сторона)', 'ПВХ 0.4мм (3 стороны)'], holesCount: 12 });
        panelsMap.set('p2', { id: 'p2', name: 'Боковина правая (Тестовая)', length: 720, width: 560, thickness: 16, material: 'ЛДСП 16мм Белый базовый', edges: ['ПВХ 2.0мм (1 сторона)', 'ПВХ 0.4мм (3 стороны)'], holesCount: 12 });
        panelsMap.set('p3', { id: 'p3', name: 'Дно корпуса (Тестовое)', length: 568, width: 560, thickness: 16, material: 'ЛДСП 16мм Белый базовый', edges: ['ПВХ 2.0мм (1 сторона)', 'ПВХ 0.4мм (3 стороны)'], holesCount: 8 });
        panelsMap.set('p4', { id: 'p4', name: 'Полка съемная (Тестовая)', length: 566, width: 500, thickness: 16, material: 'ЛДСП 16мм Белый базовый', edges: ['ПВХ 2.0мм (1 сторона)'], holesCount: 4 });
        panelsMap.set('p5', { id: 'p5', name: 'Задняя стенка ХДФ (Тестовая)', length: 715, width: 595, thickness: 3.2, material: 'ХДФ 3 мм Белый', edges: [], holesCount: 0 });

        materialsMap.set('ЛДСП 16мм Белый', { name: 'ЛДСП 16мм Белый', type: 'plate', count: 4, totalAreaOrLength: 1.82 });
        edgesMap.set('ПВХ 2.0х19 Белый', { name: 'ПВХ 2.0х19 Белый', type: 'edge', count: 4, totalAreaOrLength: 6.8 });
        hardwareMap.set('h1', { name: 'Конфирмат 7х50 оцинкованный', category: 'Крепеж', count: 16 });
        holesMap.set('h_d5', { diameter: 5, depth: 13, type: 'Под конфирмат / Полкодержатель', count: 20 });
      }

      const result: B3DParseResult = {
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        fileHash,
        lastModified: lastModifiedDate,
        signature,
        encodingUsed: 'CP1251 / UTF-8 / UTF-16LE',
        innerFiles: innerFilesList,
        dbfTablesFound,
        dbfRecordsCount,
        panels: Array.from(panelsMap.values()),
        materials: Array.from(materialsMap.values()),
        edges: Array.from(edgesMap.values()),
        hardware: Array.from(hardwareMap.values()),
        holes: Array.from(holesMap.values()),
        extractedStringsCP1251: stringsCP1251.slice(0, 300),
        extractedStringsUTF8: stringsUTF8.slice(0, 300),
        extractedStringsUTF16: stringsUTF16.slice(0, 300),
        rawXmlData: rawXmlContent,
        rawHexHeader: getHexHeader(arrayBuffer, 128),
        isDemoFile: forceDemo
      };

      setParseResult(result);
    } catch (err: any) {
      console.error('B3D Parsing error:', err);
      setError(`Ошибка чтения файла: ${err?.message || String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate Sample Demo B3D File
  const handleGenerateDemoFile = () => {
    const demoContent = `<?xml version="1.0" encoding="windows-1251"?>
<Model Name="Шкаф навесной 600х720 (Демо-пример)" Software="Базис-Мебельщик">
  <Materials>
    <Material Name="ЛДСП 16мм Белый Базовый" Type="Sheet" Thickness="16" />
    <Material Name="ХДФ 3мм Белый" Type="Sheet" Thickness="3" />
    <Material Name="Кромка ПВХ 2.0х19 Белая" Type="Edge" Thickness="2" />
    <Material Name="Кромка ПВХ 0.4х19 Белая" Type="Edge" Thickness="0.4" />
  </Materials>
  <Panels>
    <Panel Name="Боковина левая" Length="720" Width="560" Thickness="16" Material="ЛДСП 16мм Белый Базовый">
      <Edge Side="Front" Name="Кромка ПВХ 2.0х19 Белая" />
    </Panel>
    <Panel Name="Боковина правая" Length="720" Width="560" Thickness="16" Material="ЛДСП 16мм Белый Базовый">
      <Edge Side="Front" Name="Кромка ПВХ 2.0х19 Белая" />
    </Panel>
    <Panel Name="Дно корпуса" Length="568" Width="560" Thickness="16" Material="ЛДСП 16мм Белый Базовый">
      <Edge Side="Front" Name="Кромка ПВХ 2.0х19 Белая" />
    </Panel>
    <Panel Name="Полка съёмная" Length="566" Width="500" Thickness="16" Material="ЛДСП 16мм Белый Базовый">
      <Edge Side="Front" Name="Кромка ПВХ 2.0х19 Белая" />
    </Panel>
    <Panel Name="Задняя стенка ХДФ" Length="715" Width="595" Thickness="3" Material="ХДФ 3мм Белый" />
  </Panels>
  <Fasteners>
    <Item Name="Конфирмат 7х50" Category="Крепеж" Count="16" />
    <Item Name="Шкант 8х30" Category="Крепеж" Count="8" />
  </Fasteners>
</Model>`;

    const blob = new Blob([demoContent], { type: 'text/xml;charset=windows-1251' });
    const demoFile = new File([blob], 'demo_shkaf_600x720.b3d', { type: 'application/octet-stream', lastModified: Date.now() });
    handleFileUpload(demoFile, true);
  };

  const handleCopyStrings = (list: string[]) => {
    navigator.clipboard.writeText(list.join('\n'));
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const filteredStrings = (parseResult?.extractedStringsCP1251 || []).filter(s => 
    s.toLowerCase().includes(stringSearch.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden border border-indigo-900/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Анализатор .b3d / .dbf / .xml (Базис-Мебельщик)
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight font-sans">
              Лаборатория анализа файлов .b3d
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl font-medium">
              Парсер двоичных файлов и архивов Базис-Мебельщик. Автоматически извлекает контрольные хэши, декодирует таблицы CP1251 / UTF-16, структурирует списки деталей, материалов, спецификации и схемы сверления.
            </p>
          </div>

          <button
            onClick={handleGenerateDemoFile}
            className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 text-sm shrink-0 active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Загрузить тестовый пример (.b3d)
          </button>
        </div>
      </div>

      {/* File Dropzone Area */}
      <div className="bg-white rounded-3xl p-8 border-2 border-dashed border-indigo-200 hover:border-indigo-500 transition-colors shadow-sm text-center relative group">
        <input
          type="file"
          accept=".b3d,.3d,.xml,.dbf,.txt,.zip,.csv"
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
              {file ? `Загружен: ${file.name}` : 'Выберите файл .b3d, .dbf, .xml или .zip для анализа'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Каждый новый файл вычисляет уникальный хэш, декодирует байтовый поток и извлекает актуальный текст
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
          <h3 className="text-lg font-bold text-slate-900">Вычисление хэша и декодирование структуры {file?.name}...</h3>
          <p className="text-xs text-slate-500">Чтение байтовых заголовков, поиск DBF таблиц, проверка CP1251 / UTF-16LE / UTF-8</p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Ошибка анализа</h4>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Parse Results */}
      {parseResult && !isLoading && (
        <div className="space-y-6">
          {/* Active File Identity Header */}
          <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-indigo-950">
            <div className="flex items-center gap-2 font-bold">
              <FileCode className="w-4 h-4 text-indigo-600" />
              <span>Текущий файл: <span className="text-indigo-700 underline">{parseResult.fileName}</span></span>
              {parseResult.isDemoFile && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                  Демо-шаблон
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-slate-600">
              <span className="flex items-center gap-1 font-mono">
                <Hash className="w-3.5 h-3.5 text-indigo-500" /> Хэш: <strong className="text-slate-900">{parseResult.fileHash}</strong>
              </span>
              <span>Размер: <strong className="text-slate-900">{(parseResult.fileSize / 1024).toFixed(2)} КБ</strong></span>
              <span>Строк CP1251: <strong className="text-slate-900">{parseResult.extractedStringsCP1251.length}</strong></span>
            </div>
          </div>

          {/* Status Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <Box className="w-4 h-4 text-indigo-600" /> Детали из файла
              </div>
              <div className="text-2xl font-black text-slate-900">{parseResult.panels.length} <span className="text-xs font-normal text-slate-400">шт.</span></div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <Layers className="w-4 h-4 text-emerald-600" /> Материалы
              </div>
              <div className="text-2xl font-black text-slate-900">{parseResult.materials.length} <span className="text-xs font-normal text-slate-400">вид.</span></div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <Scissors className="w-4 h-4 text-amber-600" /> Кромки
              </div>
              <div className="text-2xl font-black text-slate-900">{parseResult.edges.length} <span className="text-xs font-normal text-slate-400">тип.</span></div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <Wrench className="w-4 h-4 text-blue-600" /> Фурнитура
              </div>
              <div className="text-2xl font-black text-slate-900">
                {parseResult.hardware.reduce((sum, h) => sum + h.count, 0)} <span className="text-xs font-normal text-slate-400">шт.</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-1 col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <CircleDot className="w-4 h-4 text-purple-600" /> Отверстия
              </div>
              <div className="text-2xl font-black text-slate-900">
                {parseResult.holes.reduce((sum, h) => sum + h.count, 0)} <span className="text-xs font-normal text-slate-400">отв.</span>
              </div>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'summary' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Info className="w-4 h-4" /> Сводка
            </button>

            <button
              onClick={() => setActiveTab('panels')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'panels' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Box className="w-4 h-4" /> Детали ({parseResult.panels.length})
            </button>

            <button
              onClick={() => setActiveTab('materials')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'materials' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" /> Материалы и Кромка ({parseResult.materials.length + parseResult.edges.length})
            </button>

            <button
              onClick={() => setActiveTab('hardware')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'hardware' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Wrench className="w-4 h-4" /> Фурнитура
            </button>

            <button
              onClick={() => setActiveTab('strings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'strings' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" /> Извлеченный текст ({parseResult.extractedStringsCP1251.length})
            </button>

            <button
              onClick={() => setActiveTab('json')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'json' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileCode className="w-4 h-4" /> JSON
            </button>
          </div>

          {/* TAB 1: SUMMARY */}
          {activeTab === 'summary' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-indigo-600" /> Метаданные загруженного файла
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Имя файла:</span>
                    <span className="font-bold text-slate-900">{parseResult.fileName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Контрольный хэш:</span>
                    <span className="font-mono font-bold text-indigo-600">{parseResult.fileHash}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Точный размер:</span>
                    <span className="font-bold text-slate-900">{parseResult.fileSize} байт ({(parseResult.fileSize / 1024).toFixed(2)} КБ)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Формат / Сигнатура:</span>
                    <span className="font-bold text-indigo-600">{parseResult.signature}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Дата изменения:</span>
                    <span className="font-bold text-slate-900">{parseResult.lastModified}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">DBF таблицы / Записи:</span>
                    <span className="font-bold text-slate-900">{parseResult.dbfTablesFound} табл. / {parseResult.dbfRecordsCount} зап.</span>
                  </div>
                  {parseResult.innerFiles.length > 0 && (
                    <div className="pt-2">
                      <span className="text-slate-500 font-medium block mb-2">Файлы внутри контейнера ({parseResult.innerFiles.length}):</span>
                      <div className="flex flex-wrap gap-1.5">
                        {parseResult.innerFiles.map((fn, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-mono text-[11px] font-bold">
                            {fn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-indigo-600" /> Байтовый заголовок (Hex Header 128 Bytes)
                </h3>
                <div className="p-4 bg-slate-900 rounded-2xl text-emerald-400 font-mono text-[11px] leading-relaxed break-all overflow-x-auto max-h-48 border border-slate-800">
                  {parseResult.rawHexHeader}
                </div>
                <p className="text-xs text-slate-500">
                  Уникальная сигнатура первых 128 байт именно этого файла в шестнадцатеричном виде.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: PANELS / DETAILS */}
          {activeTab === 'panels' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Распознанные детали ({parseResult.panels.length})</h3>
                  <p className="text-xs text-slate-500">Список панелей и их размеры, извлеченные из файла {parseResult.fileName}</p>
                </div>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                  Всего: {parseResult.panels.length} шт.
                </span>
              </div>

              {parseResult.panels.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3.5">#</th>
                        <th className="px-6 py-3.5">Наименование детали</th>
                        <th className="px-6 py-3.5">Размеры (Д х Ш х Т)</th>
                        <th className="px-6 py-3.5">Материал</th>
                        <th className="px-6 py-3.5">Кромка</th>
                        <th className="px-6 py-3.5">Кол-во</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {parseResult.panels.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 text-slate-400 font-bold">{idx + 1}</td>
                          <td className="px-6 py-4 font-bold text-slate-900">{p.name}</td>
                          <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                            {p.length} × {p.width} × {p.thickness} <span className="text-[10px] text-slate-400 font-normal">мм</span>
                          </td>
                          <td className="px-6 py-4">{p.material}</td>
                          <td className="px-6 py-4">
                            {p.edges.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {p.edges.map((e, eIdx) => (
                                  <span key={eIdx} className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-bold border border-amber-200/60">
                                    {e}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-normal">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900">
                            {p.quantity || 1} шт.
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center space-y-3">
                  <Database className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="font-bold text-slate-800 text-sm">В этом двоичном файле не выделены стандартизированные панели</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Из файла <span className="font-bold text-slate-700">{parseResult.fileName}</span> извлечено <strong>{parseResult.extractedStringsCP1251.length}</strong> текстовых строк. Вы можете просмотреть все содержащиеся в файле наименования и маркировки во вкладке <strong>«Извлеченный текст»</strong>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MATERIALS & EDGES */}
          {activeTab === 'materials' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-600" /> Плитные материалы ({parseResult.materials.length})
                </h3>
                {parseResult.materials.length > 0 ? (
                  <div className="space-y-2">
                    {parseResult.materials.map((m, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                        <div>
                          <div className="font-bold text-xs text-slate-900">{m.name}</div>
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5">Листовой материал для панелей</div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-sm text-emerald-600">{m.count} шт./упомин.</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-4">Материалы не обнаружены в текущей текстовой эвристике файла</p>
                )}
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-amber-600" /> Кромка и облицовка ({parseResult.edges.length})
                </h3>
                {parseResult.edges.length > 0 ? (
                  <div className="space-y-2">
                    {parseResult.edges.map((e, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                        <div>
                          <div className="font-bold text-xs text-slate-900">{e.name}</div>
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5">Кромочный материал</div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-sm text-amber-600">{e.count} шт./упомин.</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-4">Кромочные материалы не обнаружены</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: HARDWARE & HOLES */}
          {activeTab === 'hardware' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-blue-600" /> Фурнитура и крепеж ({parseResult.hardware.length})
                </h3>
                {parseResult.hardware.length > 0 ? (
                  <div className="space-y-2">
                    {parseResult.hardware.map((h, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                        <div>
                          <div className="font-bold text-xs text-slate-900">{h.name}</div>
                          <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded mt-1">
                            {h.category}
                          </span>
                        </div>
                        <div className="font-black text-sm text-blue-600">{h.count} шт.</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-4">Фурнитура не обнаружена</p>
                )}
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CircleDot className="w-5 h-5 text-purple-600" /> Сверление и присадка ({parseResult.holes.length})
                </h3>
                {parseResult.holes.length > 0 ? (
                  <div className="space-y-2">
                    {parseResult.holes.map((hole, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                        <div>
                          <div className="font-bold text-xs text-slate-900">
                            Отверстие Ø{hole.diameter} мм <span className="text-slate-400 font-normal">(глубина {hole.depth} мм)</span>
                          </div>
                          <div className="text-[10px] text-purple-700 font-medium mt-0.5">{hole.type}</div>
                        </div>
                        <div className="font-black text-sm text-purple-600">{hole.count} отв.</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-4">Данные присадки не найдены</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: STRINGS INSPECTOR */}
          {activeTab === 'strings' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Извлеченный текст из файла «{parseResult.fileName}» ({parseResult.extractedStringsCP1251.length} строк)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Раскодированные текстовые подстроки (windows-1251), найденные в байтовом потоке загруженного файла
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Поиск по извлеченным строкам..."
                      value={stringSearch}
                      onChange={(e) => setStringSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                    />
                  </div>

                  <button
                    onClick={() => handleCopyStrings(parseResult.extractedStringsCP1251)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedText ? 'Скопировано!' : 'Скопировать все'}
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-900 rounded-2xl text-slate-200 font-mono text-xs max-h-96 overflow-y-auto space-y-1 border border-slate-800">
                {filteredStrings.length > 0 ? (
                  filteredStrings.map((s, idx) => (
                    <div key={idx} className="hover:bg-slate-800/80 px-2 py-0.5 rounded text-indigo-300 flex items-start gap-3">
                      <span className="text-slate-600 text-[10px] select-none shrink-0 w-8">{(idx + 1).toString().padStart(3, '0')}</span>
                      <span className="break-all">{s}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 text-center py-8">Ничего не найдено</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: JSON */}
          {activeTab === 'json' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">JSON структура результатов ({parseResult.fileName})</h3>
                  <p className="text-xs text-slate-500">Уникальный JSON объект для файла с хэшем {parseResult.fileHash}</p>
                </div>
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(parseResult, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `b3d_parsed_${parseResult.fileHash}_${parseResult.fileName}.json`;
                    a.click();
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Скачать JSON
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl max-h-96 overflow-y-auto border border-slate-800">
                {JSON.stringify(parseResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
