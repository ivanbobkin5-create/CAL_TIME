import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  X, 
  Printer, 
  Check, 
  ExternalLink, 
  Scan, 
  QrCode, 
  Scissors, 
  Layers, 
  Factory, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Volume2, 
  Tag, 
  Sparkles, 
  ChevronRight, 
  AlertCircle,
  Play,
  RotateCcw,
  Box
} from 'lucide-react';
import { ProductionOrder, ProductionStageId, ERPCompanySettings, ERPNoteRule } from '../types';
import { parseBirkaFile, BirkaParseResult, BirkaDetail } from '../utils/birkaParser';
import { formatDeadlineDate } from '../utils';

interface ERPOrderDetailsModalProps {
  order: ProductionOrder;
  settings?: ERPCompanySettings;
  onClose: () => void;
  onUpdateOrder: (updatedOrder: ProductionOrder) => void;
  onUpdateOrderStatus: (orderId: string, nextStage: ProductionStageId) => void;
}

// Audio beep feedback synthesizer
const playSoundEffect = (type: 'success' | 'alert' | 'error' = 'success') => {
  try {
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
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.2); // D6
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
    // ignore
  }
};

export const ERPOrderDetailsModal: React.FC<ERPOrderDetailsModalProps> = ({
  order,
  settings,
  onClose,
  onUpdateOrder,
  onUpdateOrderStatus
}) => {
  const [activeTab, setActiveTab] = useState<'card' | 'scanner'>('card');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Material & Scanning state
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [scanInput, setScanInput] = useState<string>('');
  const [searchPartsQuery, setSearchPartsQuery] = useState<string>('');
  const [operatorInstructionAlert, setOperatorInstructionAlert] = useState<{
    labelNumber: string;
    partName: string;
    instruction: string;
    color?: string;
  } | null>(null);

  const [scanErrorMsg, setScanErrorMsg] = useState<string | null>(null);
  const scannerInputRef = useRef<HTMLInputElement | null>(null);

  // Available Note Rules from settings
  const noteRules: ERPNoteRule[] = settings?.noteRules || [
    { id: '1', pattern: '4-8-36', instruction: 'Данной детали требуется паз, см. чертеж', color: 'amber' },
    { id: '2', pattern: 'паз', instruction: 'Требуется выборка паза под заднюю стенку / ХДФ', color: 'blue' },
    { id: '3', pattern: 'петл', instruction: 'Присадка под петли на сверлильно-присадочном станке', color: 'purple' }
  ];

  // Initialize selected material when opening scanner
  useEffect(() => {
    if (order.birkaData?.materialGroups && order.birkaData.materialGroups.length > 0) {
      if (!selectedMaterial) {
        setSelectedMaterial(order.birkaData.materialGroups[0].materialName);
      }
    }
  }, [order.birkaData, selectedMaterial]);

  // Auto-focus physical scanner input
  useEffect(() => {
    if (activeTab === 'scanner') {
      const timer = setTimeout(() => {
        scannerInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeTab, selectedMaterial]);

  // Helper to match part note against note rules
  const getMatchedNoteRule = (notes?: string, partName?: string): ERPNoteRule | null => {
    if (!notes && !partName) return null;
    const textToMatch = `${notes || ''} ${partName || ''}`.toLowerCase();
    for (const rule of noteRules) {
      if (rule.pattern && textToMatch.includes(rule.pattern.toLowerCase())) {
        return rule;
      }
    }
    return null;
  };

  // Upload Birka File Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const parseRes = await parseBirkaFile(file);
      if (parseRes.details.length === 0) {
        throw new Error('Файл не содержит распознанных деталей или пуст');
      }

      const updatedOrder: ProductionOrder = {
        ...order,
        totalAreaM2: parseRes.totalAreaM2,
        totalEdgeM: parseRes.totalEdgeMeters,
        partsCount: parseRes.totalPartsCount,
        birkaData: {
          fileName: parseRes.fileName,
          fileHash: parseRes.fileHash,
          uploadedAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('ru-RU'),
          details: parseRes.details,
          materialGroups: parseRes.materialGroups,
          allEdges: parseRes.allEdges
        }
      };

      onUpdateOrder(updatedOrder);
      playSoundEffect('success');
      if (parseRes.materialGroups.length > 0) {
        setSelectedMaterial(parseRes.materialGroups[0].materialName);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Ошибка чтения файла');
      playSoundEffect('error');
    } finally {
      setIsUploading(false);
    }
  };

  // Get scanning progress for current stage & material
  const currentStageId = order.currentStage;
  const stageScanning = order.stageScanningProgress?.[currentStageId] || {};
  const currentMaterialScanning = stageScanning[selectedMaterial] || { scannedPartIds: [], isCompleted: false };
  const scannedPartIds = currentMaterialScanning.scannedPartIds || [];

  // Parts for selected material
  const currentMaterialDetails = order.birkaData?.details.filter(d => 
    (d.material || 'Без указания материала') === selectedMaterial
  ) || [];

  // Check if part requires edge
  const partNeedsEdge = (p: BirkaDetail): boolean => {
    return !!(p.edgeL1 || p.edgeL2 || p.edgeW1 || p.edgeW2);
  };

  // Check if material is HDF/DVP
  const isHdfMaterial = (matName: string): boolean => {
    const lower = matName.toLowerCase();
    return lower.includes('хдф') || lower.includes('двп') || lower.includes('3мм') || lower.includes('3 мм');
  };

  // Check if material requires processing for current stage
  const materialRequiresStage = (matName: string, stageId: ProductionStageId, details: BirkaDetail[]): boolean => {
    if (stageId === 'cnc') {
      // HDF / DVP does NOT need CNC
      if (isHdfMaterial(matName)) return false;
    }
    if (stageId === 'edging') {
      // Check if ANY part in this material requires edging
      const anyEdge = details.some(d => partNeedsEdge(d));
      if (!anyEdge) return false;
    }
    return true;
  };

  // Auto-complete check for materials that don't need edging or CNC
  useEffect(() => {
    if (!order.birkaData?.materialGroups) return;

    let needsStateUpdate = false;
    const updatedStageScanning = { ...(order.stageScanningProgress || {}) };
    if (!updatedStageScanning[currentStageId]) {
      updatedStageScanning[currentStageId] = {};
    }

    order.birkaData.materialGroups.forEach(mg => {
      const matName = mg.materialName;
      const matDetails = order.birkaData?.details.filter(d => (d.material || 'Без указания материала') === matName) || [];
      const isReq = materialRequiresStage(matName, currentStageId, matDetails);

      const existingMatScan = updatedStageScanning[currentStageId][matName] || { scannedPartIds: [], isCompleted: false };

      if (!isReq && !existingMatScan.isCompleted) {
        // Auto-complete material for this stage
        const allPartIds = matDetails.map(d => d.id);
        updatedStageScanning[currentStageId][matName] = {
          scannedPartIds: allPartIds,
          isCompleted: true
        };
        needsStateUpdate = true;
      }
    });

    if (needsStateUpdate) {
      onUpdateOrder({
        ...order,
        stageScanningProgress: updatedStageScanning
      });
    }
  }, [currentStageId, order.birkaData]);

  // Handle Scanning a Part
  const handleScanCode = (codeToScan: string) => {
    setScanErrorMsg(null);
    const cleanCode = codeToScan.trim().replace(/^#/, '');
    if (!cleanCode) return;

    if (!selectedMaterial) {
      setScanErrorMsg('Выберите материал для сканирования');
      playSoundEffect('error');
      return;
    }

    // Find part matching labelNumber (№ детали) or id or barcode or name
    const foundPart = currentMaterialDetails.find(d => 
      d.labelNumber.toLowerCase() === cleanCode.toLowerCase() ||
      d.id === cleanCode ||
      (d.barcode && d.barcode.toLowerCase() === cleanCode.toLowerCase()) ||
      d.name.toLowerCase() === cleanCode.toLowerCase()
    );

    if (!foundPart) {
      // Check if code exists in another material
      const partInOtherMat = order.birkaData?.details.find(d => 
        d.labelNumber.toLowerCase() === cleanCode.toLowerCase() ||
        (d.barcode && d.barcode.toLowerCase() === cleanCode.toLowerCase())
      );

      if (partInOtherMat) {
        setScanErrorMsg(`Деталь №${cleanCode} относится к материалу: "${partInOtherMat.material}". Переключитесь на данный материал.`);
      } else {
        setScanErrorMsg(`Деталь с кодом/номером "${cleanCode}" не найдена в списке этого заказа`);
      }
      playSoundEffect('error');
      return;
    }

    // Check if already scanned
    if (scannedPartIds.includes(foundPart.id)) {
      setScanErrorMsg(`Деталь №${foundPart.labelNumber} ("${foundPart.name}") уже была просканирована ранее`);
      playSoundEffect('alert');
      return;
    }

    // Mark as scanned
    const newScannedIds = [...scannedPartIds, foundPart.id];
    const isAllScanned = newScannedIds.length >= currentMaterialDetails.length;

    const updatedStageScanning = { ...(order.stageScanningProgress || {}) };
    if (!updatedStageScanning[currentStageId]) {
      updatedStageScanning[currentStageId] = {};
    }
    updatedStageScanning[currentStageId][selectedMaterial] = {
      scannedPartIds: newScannedIds,
      isCompleted: isAllScanned
    };

    onUpdateOrder({
      ...order,
      stageScanningProgress: updatedStageScanning
    });

    // Check for note rules matched
    const matchedRule = getMatchedNoteRule(foundPart.notes, foundPart.name);
    if (matchedRule) {
      playSoundEffect('alert');
      setOperatorInstructionAlert({
        labelNumber: foundPart.labelNumber,
        partName: foundPart.name,
        instruction: matchedRule.instruction,
        color: matchedRule.color
      });
    } else {
      playSoundEffect('success');
    }

    setScanInput('');
    scannerInputRef.current?.focus();
  };

  // Total stage completion status
  const allMaterialGroups = order.birkaData?.materialGroups || [];
  const isAllStageMaterialsCompleted = allMaterialGroups.length > 0 && allMaterialGroups.every(mg => {
    const matDetails = order.birkaData?.details.filter(d => (d.material || 'Без указания материала') === mg.materialName) || [];
    const isReq = materialRequiresStage(mg.materialName, currentStageId, matDetails);
    if (!isReq) return true;

    const matScan = order.stageScanningProgress?.[currentStageId]?.[mg.materialName];
    return matScan?.isCompleted || (matScan?.scannedPartIds?.length || 0) >= matDetails.length;
  });

  // Stage names dictionary
  const stageNames: Record<ProductionStageId, string> = {
    queue: 'Очередь запуска',
    cutting: 'Участок раскроя (Распил)',
    edging: 'Участок кромкооблицовки',
    cnc: 'Участок присадки ЧПУ',
    facades: 'Фасадный участок',
    assembly: 'Участок сборки',
    qc: 'Контроль ОТК',
    packing: 'Участок упаковки',
    ready: 'Готово к отгрузке'
  };

  const nextStageMap: Record<ProductionStageId, ProductionStageId | null> = {
    queue: 'cutting',
    cutting: 'edging',
    edging: 'cnc',
    cnc: 'facades',
    facades: 'assembly',
    assembly: 'qc',
    qc: 'packing',
    packing: 'ready',
    ready: null
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col my-auto">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-slate-900">
                  Заказ №{order.orderNumber}
                </h3>
                <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-800 text-xs font-bold font-mono">
                  {stageNames[order.currentStage] || order.currentStage}
                </span>
                {order.birkaData && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Бирка загружена
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Клиент: <strong className="text-slate-800">{order.clientName}</strong> • Проект: <strong className="text-slate-800">{order.projectName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 pt-4 pb-2 border-b border-slate-100 shrink-0">
          <button
            onClick={() => setActiveTab('card')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'card'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" /> Маршрутная карта и спецификация
          </button>

          <button
            onClick={() => setActiveTab('scanner')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'scanner'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4" /> Физический сканер QR / Выполнение стадии
            {isAllStageMaterialsCompleted && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          
          {/* TAB 1: SPECIFICATION & TECH CARD */}
          {activeTab === 'card' && (
            <div className="space-y-6">
              
              {/* Birka Upload / Re-upload Banner */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">
                      {order.birkaData ? `Файл спецификации: ${order.birkaData.fileName}` : 'Загрузка файла бирок (.bir, .csv, .tsv, .dbf, .zip)'}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {order.birkaData ? `Загружен: ${order.birkaData.uploadedAt || 'Ранее'}. Содержит ${order.birkaData.details.length} деталей.` : 'Загрузите файл Базис-Бирки или CSV, чтобы привязать карту деталей и кромки'}
                    </p>
                  </div>
                </div>

                <label className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer self-start md:self-auto shrink-0">
                  <Upload className="w-4 h-4" />
                  <span>{order.birkaData ? 'Заменить файл бирки' : 'Загрузить файл бирки'}</span>
                  <input
                    type="file"
                    accept=".bir,.brx,.csv,.tsv,.txt,.dbf,.zip"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </div>

              {uploadError && (
                <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Metrics Overview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Площадь деталей</div>
                  <div className="text-lg font-black text-slate-900">{order.totalAreaM2 || 0} м²</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Кромка ПВХ</div>
                  <div className="text-lg font-black text-slate-900">{order.totalEdgeM || 0} п.м.</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Всего деталей</div>
                  <div className="text-lg font-black text-slate-900">{order.partsCount || 0} шт.</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Срок отгрузки</div>
                  <div className="text-sm font-black text-red-600">{formatDeadlineDate(order.deadlineDate)}</div>
                </div>
              </div>

              {/* Materials & Sheets Breakdown */}
              {order.birkaData?.materialGroups && order.birkaData.materialGroups.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Расход материалов и плитного материала
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {order.birkaData.materialGroups.map((group, gIdx) => (
                      <div key={gIdx} className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            <Box className="w-4 h-4 text-indigo-600" />
                            {group.materialName}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold">
                            ~{group.estimatedSheets || 1} шт. листов
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Количество деталей</span>
                            <span className="font-bold text-slate-900">{group.totalQuantity} шт.</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Общая площадь</span>
                            <span className="font-bold text-slate-900">{group.totalAreaM2} м²</span>
                          </div>
                        </div>

                        {/* Edges summary */}
                        {Object.keys(group.edgesSummary || {}).length > 0 && (
                          <div className="pt-2 border-t border-slate-100 text-[11px]">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase mb-1">Кромка:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(group.edgesSummary).map(([eName, eMeters], eIdx) => (
                                <span key={eIdx} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                                  {eName}: {Math.round(eMeters * 10) / 10} п.м.
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Complete Parts List */}
              {order.birkaData?.details && order.birkaData.details.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Перечень деталей из бирки ({order.birkaData.details.length} шт)
                    </h4>

                    <div className="relative min-w-[240px]">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Поиск по № детали, наименованию..."
                        value={searchPartsQuery}
                        onChange={(e) => setSearchPartsQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                          <tr>
                            <th className="px-4 py-3">№ Детали</th>
                            <th className="px-4 py-3">Наименование</th>
                            <th className="px-4 py-3">Размеры (мм)</th>
                            <th className="px-4 py-3">Материал</th>
                            <th className="px-4 py-3 text-center">Кол-во</th>
                            <th className="px-4 py-3 text-center">Кромка L1/L2/W1/W2</th>
                            <th className="px-4 py-3">Примечание / Спец-операции</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {order.birkaData.details
                            .filter(d => 
                              d.labelNumber.toLowerCase().includes(searchPartsQuery.toLowerCase()) ||
                              d.name.toLowerCase().includes(searchPartsQuery.toLowerCase()) ||
                              (d.notes && d.notes.toLowerCase().includes(searchPartsQuery.toLowerCase()))
                            )
                            .map((item, idx) => {
                              const matchedRule = getMatchedNoteRule(item.notes, item.name);
                              const hasEdge = partNeedsEdge(item);

                              let rowBgClass = 'hover:bg-slate-50/80';
                              if (matchedRule) {
                                if (matchedRule.color === 'amber') rowBgClass = 'bg-amber-50/70 hover:bg-amber-100/80 border-l-4 border-amber-500';
                                else if (matchedRule.color === 'blue') rowBgClass = 'bg-blue-50/70 hover:bg-blue-100/80 border-l-4 border-blue-500';
                                else if (matchedRule.color === 'purple') rowBgClass = 'bg-purple-50/70 hover:bg-purple-100/80 border-l-4 border-purple-500';
                                else if (matchedRule.color === 'rose') rowBgClass = 'bg-rose-50/70 hover:bg-rose-100/80 border-l-4 border-rose-500';
                                else if (matchedRule.color === 'emerald') rowBgClass = 'bg-emerald-50/70 hover:bg-emerald-100/80 border-l-4 border-emerald-500';
                              }

                              return (
                                <tr key={item.id || idx} className={`transition-colors ${rowBgClass}`}>
                                  <td className="px-4 py-3 font-mono font-black text-slate-900">
                                    {item.labelNumber}
                                  </td>
                                  <td className="px-4 py-3 font-bold text-slate-900">
                                    {item.name}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-800">
                                    {item.length} × {item.width} × {item.thickness}
                                  </td>
                                  <td className="px-4 py-3 text-slate-600">
                                    {item.material}
                                  </td>
                                  <td className="px-4 py-3 text-center font-bold text-slate-900">
                                    {item.quantity} шт.
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {hasEdge ? (
                                      <div className="flex items-center justify-center gap-1 font-mono text-[10px]">
                                        <span className={`px-1.5 py-0.5 rounded ${item.edgeL1 ? 'bg-indigo-100 text-indigo-800 font-bold' : 'text-slate-300'}`}>
                                          L1
                                        </span>
                                        <span className={`px-1.5 py-0.5 rounded ${item.edgeL2 ? 'bg-indigo-100 text-indigo-800 font-bold' : 'text-slate-300'}`}>
                                          L2
                                        </span>
                                        <span className={`px-1.5 py-0.5 rounded ${item.edgeW1 ? 'bg-indigo-100 text-indigo-800 font-bold' : 'text-slate-300'}`}>
                                          W1
                                        </span>
                                        <span className={`px-1.5 py-0.5 rounded ${item.edgeW2 ? 'bg-indigo-100 text-indigo-800 font-bold' : 'text-slate-300'}`}>
                                          W2
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-300 text-[10px] font-semibold">Без кромки</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    {matchedRule ? (
                                      <div className="flex flex-col gap-0.5">
                                        <span className="font-bold text-amber-900 flex items-center gap-1 text-[11px]">
                                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                          {matchedRule.instruction}
                                        </span>
                                        {item.notes && item.notes !== matchedRule.pattern && (
                                          <span className="text-[10px] text-slate-500">{item.notes}</span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-slate-500 text-[11px]">{item.notes || '—'}</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">К заказу еще не привязан файл деталей / бирка</p>
                  <p className="text-[11px]">Загрузите файл с помощью кнопки выше, чтобы включить сканирование и учет материалов</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PHYSICAL SCANNER & STAGE EXECUTION */}
          {activeTab === 'scanner' && (
            <div className="space-y-6">
              
              {!order.birkaData ? (
                <div className="p-8 bg-amber-50/80 rounded-2xl border border-amber-200 text-center space-y-3">
                  <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto" />
                  <h4 className="font-bold text-amber-900 text-sm">
                    Не загружен файл Бирок для заказа №{order.orderNumber}
                  </h4>
                  <p className="text-xs text-amber-800 max-w-md mx-auto">
                    Чтобы начать сканирование и обработку деталей на станке, сначала загрузите файл бирок (.bir / .csv) на вкладке "Маршрутная карта".
                  </p>
                  <button
                    onClick={() => setActiveTab('card')}
                    className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-500 transition-colors cursor-pointer"
                  >
                    Перейти к загрузке бирки
                  </button>
                </div>
              ) : (
                <>
                  {/* Operator Alert Notification Banner for Matched Note Rule */}
                  {operatorInstructionAlert && (
                    <div className={`p-4 rounded-2xl border shadow-md animate-pulse flex items-center justify-between gap-4 ${
                      operatorInstructionAlert.color === 'rose' ? 'bg-rose-100 border-rose-300 text-rose-950' :
                      operatorInstructionAlert.color === 'purple' ? 'bg-purple-100 border-purple-300 text-purple-950' :
                      operatorInstructionAlert.color === 'blue' ? 'bg-blue-100 border-blue-300 text-blue-950' :
                      'bg-amber-100 border-amber-300 text-amber-950'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                          <div className="text-xs font-black uppercase tracking-wider">
                            Внимание! Инструкция для детали №{operatorInstructionAlert.labelNumber} ("{operatorInstructionAlert.partName}")
                          </div>
                          <div className="text-sm font-bold mt-0.5">
                            👉 {operatorInstructionAlert.instruction}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setOperatorInstructionAlert(null)}
                        className="px-3 py-1.5 bg-white/80 hover:bg-white text-slate-800 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                      >
                        Понятно
                      </button>
                    </div>
                  )}

                  {/* Material Selection Pills */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                      1. Выберите обрабатываемый материал:
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {order.birkaData.materialGroups?.map((mg) => {
                        const isSelected = selectedMaterial === mg.materialName;
                        const matDetails = order.birkaData?.details.filter(d => (d.material || 'Без указания материала') === mg.materialName) || [];
                        const isReq = materialRequiresStage(mg.materialName, currentStageId, matDetails);
                        
                        const matScan = order.stageScanningProgress?.[currentStageId]?.[mg.materialName];
                        const scannedCount = matScan?.scannedPartIds?.length || 0;
                        const totalCount = matDetails.length;
                        const isDone = !isReq || matScan?.isCompleted || (scannedCount >= totalCount && totalCount > 0);

                        return (
                          <button
                            key={mg.materialName}
                            onClick={() => {
                              setSelectedMaterial(mg.materialName);
                              setScanErrorMsg(null);
                            }}
                            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                : isDone
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                                : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-xs truncate max-w-[180px]">
                                {mg.materialName}
                              </span>
                              {isDone ? (
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  isSelected ? 'bg-emerald-400 text-emerald-950' : 'bg-emerald-200 text-emerald-900'
                                }`}>
                                  {!isReq ? 'Не требуется' : 'Готово (100%)'}
                                </span>
                              ) : (
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {scannedCount} / {totalCount} шт.
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] opacity-80 flex items-center justify-between">
                              <span>{mg.totalAreaM2} м² • ~{mg.estimatedSheets || 1} листов</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Material Scanner Control Bar */}
                  {selectedMaterial && (
                    <div className="p-5 bg-slate-900 text-white rounded-3xl space-y-4 shadow-xl">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/30">
                            <Scan className="w-5 h-5 animate-pulse" />
                          </div>
                          <div>
                            <div className="text-xs text-slate-400 font-semibold">
                              Режим сканирования: <strong className="text-white">{stageNames[currentStageId]}</strong>
                            </div>
                            <div className="text-sm font-black text-indigo-300">
                              Материал: {selectedMaterial}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Прогресс сканирования</div>
                            <div className="text-base font-black text-emerald-400">
                              {scannedPartIds.length} из {currentMaterialDetails.length} шт. ({Math.round((scannedPartIds.length / (currentMaterialDetails.length || 1)) * 100)}%)
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Physical Scanner Code Input */}
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleScanCode(scanInput);
                        }}
                        className="flex items-center gap-2"
                      >
                        <div className="relative flex-1">
                          <QrCode className="w-5 h-5 text-indigo-400 absolute left-4 top-1/2 -translate-y-1/2" />
                          <input
                            ref={scannerInputRef}
                            type="text"
                            placeholder="Считайте QR-код на бирке сканером или введите № детали (например: 01.02 или 12)..."
                            value={scanInput}
                            onChange={(e) => setScanInput(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-2xl font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-slate-800/90 transition-all"
                          />
                        </div>

                        <button
                          type="submit"
                          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-xs transition-all shadow-md cursor-pointer shrink-0"
                        >
                          Отметить деталь
                        </button>
                      </form>

                      {scanErrorMsg && (
                        <div className="p-3 bg-red-900/60 border border-red-700 text-red-200 rounded-2xl text-xs font-bold flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                          <span>{scanErrorMsg}</span>
                        </div>
                      )}

                      {/* Scanning Checklist Table for Selected Material */}
                      <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 overflow-hidden">
                        <div className="p-3 bg-slate-800/90 text-xs font-bold text-slate-300 border-b border-slate-700 flex items-center justify-between">
                          <span>Детали данного материала ({currentMaterialDetails.length} шт)</span>
                          <span className="text-[10px] text-slate-400 font-normal">Зеленой галкой отмечены готовые детали</span>
                        </div>

                        <div className="max-h-60 overflow-y-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-900/80 text-slate-400 text-[10px] font-bold uppercase border-b border-slate-700">
                              <tr>
                                <th className="px-4 py-2.5">Статус</th>
                                <th className="px-4 py-2.5">№ Детали</th>
                                <th className="px-4 py-2.5">Наименование</th>
                                <th className="px-4 py-2.5">Размеры</th>
                                <th className="px-4 py-2.5">Кромка</th>
                                <th className="px-4 py-2.5">Примечание</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/60 font-medium">
                              {currentMaterialDetails.map((part) => {
                                const isScanned = scannedPartIds.includes(part.id);
                                const needsEdge = partNeedsEdge(part);
                                const matchedRule = getMatchedNoteRule(part.notes, part.name);

                                return (
                                  <tr 
                                    key={part.id} 
                                    className={`transition-colors ${
                                      isScanned ? 'bg-emerald-950/40 text-emerald-200' : 'text-slate-300 hover:bg-slate-700/40'
                                    }`}
                                  >
                                    <td className="px-4 py-2.5">
                                      {isScanned ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[10px]">
                                          <Check className="w-3 h-3 stroke-[3]" /> Готово
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-700 text-slate-400 font-bold text-[10px]">
                                          Ожидает
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5 font-mono font-black text-white">
                                      {part.labelNumber}
                                    </td>
                                    <td className="px-4 py-2.5 font-bold">
                                      {part.name}
                                    </td>
                                    <td className="px-4 py-2.5 font-mono text-slate-400">
                                      {part.length} × {part.width} × {part.thickness}
                                    </td>
                                    <td className="px-4 py-2.5">
                                      {currentStageId === 'edging' && !needsEdge ? (
                                        <span className="text-emerald-400 text-[10px] font-bold">Кромка не требуется</span>
                                      ) : needsEdge ? (
                                        <span className="text-indigo-300 text-[10px] font-mono font-bold">ПВХ</span>
                                      ) : (
                                        <span className="text-slate-500 text-[10px]">Без кромки</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-400 text-[11px]">
                                      {matchedRule ? (
                                        <span className="text-amber-300 font-bold">{matchedRule.instruction}</span>
                                      ) : (
                                        part.notes || '—'
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>

        {/* Modal Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" /> Распечатать карту
            </button>
          </div>

          <div className="flex items-center gap-3">
            {nextStageMap[currentStageId] && (
              <button
                disabled={!isAllStageMaterialsCompleted}
                onClick={() => {
                  const nextSt = nextStageMap[currentStageId];
                  if (nextSt) {
                    onUpdateOrderStatus(order.id, nextSt);
                    playSoundEffect('success');
                    onClose();
                  }
                }}
                className={`px-5 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                  isAllStageMaterialsCompleted
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-200'
                    : 'bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed'
                }`}
                title={isAllStageMaterialsCompleted ? 'Передать на следующий участок' : 'Сначала завершите сканирование всех деталей текущей стадии'}
              >
                <span>Передать на стадию: {stageNames[nextStageMap[currentStageId]!]}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
