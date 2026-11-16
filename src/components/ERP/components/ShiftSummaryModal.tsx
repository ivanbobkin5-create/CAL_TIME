import React, { useRef, useEffect } from 'react';
import { CheckCircle2, X, Printer, Scissors, Layers, Factory, Package, Clock, User, Award, FileText, Check, ShieldCheck, Wrench } from 'lucide-react';
import { ProductionOrder, ERPEmployee, ERPCompanySettings } from '../types';

interface ShiftSummaryModalProps {
  isOpen: boolean;
  currentUser?: ERPEmployee | any;
  orders: ProductionOrder[];
  settings?: ERPCompanySettings;
  companyName?: string;
  onClose: () => void;
  onConfirmEndShift?: () => void;
}

export const ShiftSummaryModal: React.FC<ShiftSummaryModalProps> = ({
  isOpen,
  currentUser,
  orders,
  settings,
  companyName: customCompanyName,
  onClose,
  onConfirmEndShift
}) => {
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  // Keyboard shortcut listener: Enter confirms end shift, Esc closes
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (onConfirmEndShift) {
          onConfirmEndShift();
        }
        onClose();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirmEndShift, onClose]);

  if (!isOpen) return null;

  const now = new Date();
  const dateStr = now.toLocaleDateString('ru-RU');
  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  // Resolve Real Employee Name (Strictly FIO without hardcoded 'Мастер смены')
  const empName = 
    currentUser?.name || 
    currentUser?.employeeName || 
    currentUser?.fullName || 
    currentUser?.displayName || 
    (currentUser?.email ? currentUser.email.split('@')[0] : null) ||
    'Сотрудник производства';

  const empRole = 
    currentUser?.productionRole || 
    currentUser?.role || 
    currentUser?.department || 
    'Мастер цеха';

  // Resolve Real Company Name (from settings or custom prop, no generic fake name)
  const companyTitle = 
    customCompanyName ||
    settings?.companyTitle || 
    (settings as any)?.companyName || 
    settings?.shippingActTemplate?.companyTitle || 
    (window as any)?.__ERP_COMPANY_NAME__ ||
    localStorage.getItem('erp_company_title') ||
    localStorage.getItem('company_name') ||
    'Производственная компания';

  const reportNumber = `СР-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${(currentUser?.id || currentUser?.employeeId || 'EMP').slice(-4).toUpperCase()}`;

  // Calculate real performance metrics across all orders
  let totalCuttingParts = 0;
  let totalCuttingM2 = 0;
  let totalEdgingParts = 0;
  let totalEdgingM = 0;
  let totalCncParts = 0;
  let totalCncHoles = 0;
  let totalPackedBoxes = 0;
  let totalPackedPartsCount = 0;
  let totalFacadesParts = 0;
  let totalQcParts = 0;

  const processedOrdersMap = new Map<string, { orderNumber: string; clientName: string; totalParts: number; packedParts: number; packagesCount: number; stagesDone: string[] }>();

  orders.forEach(ord => {
    const details = ord.birkaData?.details || [];
    const packages = ord.packages || [];
    const totalOrdParts = details.reduce((sum, d) => sum + Math.max(1, d.quantity || 1), 0) || ord.partsCount || 1;
    const stagesDone: string[] = [];

    // Helper for edge meters of a single detail
    const calcDetailEdgeM = (dt: any) => {
      let meters = 0;
      if (dt.edgeL1) meters += (dt.length || 0) / 1000;
      if (dt.edgeL2) meters += (dt.length || 0) / 1000;
      if (dt.edgeW1) meters += (dt.width || 0) / 1000;
      if (dt.edgeW2) meters += (dt.width || 0) / 1000;
      if (meters === 0 && (dt.edge || dt.edgeMaterial)) {
        meters = ((dt.length + dt.width) * 2) / 1000;
      }
      return meters;
    };

    // 1. Cutting Progress
    const isCuttingCompleted = (ord.stageProgress as any)?.cutting?.status === 'done' || (ord.stageProgress as any)?.raskroy?.status === 'done' || !!ord.forcedStageCompletions?.cutting;
    const cuttingScannedIds = new Set<string>();
    if (ord.stageScanningProgress?.cutting) {
      Object.values(ord.stageScanningProgress.cutting).forEach(mat => {
        mat?.scannedPartIds?.forEach(id => cuttingScannedIds.add(id));
      });
    }
    if (isCuttingCompleted && cuttingScannedIds.size === 0 && details.length > 0) {
      details.forEach(d => {
        const qty = Math.max(1, d.quantity || 1);
        totalCuttingParts += qty;
        totalCuttingM2 += ((d.length * d.width) / 1000000) * qty;
      });
      stagesDone.push(`Раскрой (${details.length} поз.)`);
    } else if (cuttingScannedIds.size > 0) {
      let ordCuttingCount = 0;
      cuttingScannedIds.forEach(partId => {
        const dt = details.find(d => d.id === partId || partId.startsWith(d.id));
        if (dt) {
          totalCuttingParts++;
          ordCuttingCount++;
          totalCuttingM2 += (dt.length * dt.width) / 1000000;
        }
      });
      if (ordCuttingCount > 0) stagesDone.push(`Раскрой (${ordCuttingCount} дет.)`);
    }

    // 2. Edging Progress
    const isEdgingCompleted = (ord.stageProgress as any)?.edging?.status === 'done' || (ord.stageProgress as any)?.kromka?.status === 'done' || !!ord.forcedStageCompletions?.edging;
    const edgingScannedIds = new Set<string>();
    if (ord.stageScanningProgress?.edging) {
      Object.values(ord.stageScanningProgress.edging).forEach(mat => {
        mat?.scannedPartIds?.forEach(id => edgingScannedIds.add(id));
      });
    }
    if (isEdgingCompleted && edgingScannedIds.size === 0 && details.length > 0) {
      details.forEach(d => {
        const edgeM = calcDetailEdgeM(d);
        if (edgeM > 0) {
          const qty = Math.max(1, d.quantity || 1);
          totalEdgingParts += qty;
          totalEdgingM += edgeM * qty;
        }
      });
      stagesDone.push(`Кромка (${details.length} поз.)`);
    } else if (edgingScannedIds.size > 0) {
      let ordEdgingCount = 0;
      edgingScannedIds.forEach(partId => {
        const dt = details.find(d => d.id === partId || partId.startsWith(d.id));
        if (dt) {
          totalEdgingParts++;
          ordEdgingCount++;
          totalEdgingM += calcDetailEdgeM(dt);
        }
      });
      if (ordEdgingCount > 0) stagesDone.push(`Кромка (${ordEdgingCount} дет.)`);
    }

    // 3. CNC Progress
    const isCncCompleted = (ord.stageProgress as any)?.cnc?.status === 'done' || (ord.stageProgress as any)?.prisadka?.status === 'done' || !!ord.forcedStageCompletions?.cnc;
    const cncScannedIds = new Set<string>();
    if (ord.stageScanningProgress?.cnc) {
      Object.values(ord.stageScanningProgress.cnc).forEach(mat => {
        mat?.scannedPartIds?.forEach(id => cncScannedIds.add(id));
      });
    }
    if (isCncCompleted && cncScannedIds.size === 0 && details.length > 0) {
      details.forEach(d => {
        const holes = d.holesCount || ((d as any).hasDrilling ? 6 : 0);
        if (holes > 0) {
          const qty = Math.max(1, d.quantity || 1);
          totalCncParts += qty;
          totalCncHoles += holes * qty;
        }
      });
      stagesDone.push(`Присадка (${details.length} поз.)`);
    } else if (cncScannedIds.size > 0) {
      let ordCncCount = 0;
      cncScannedIds.forEach(partId => {
        const dt = details.find(d => d.id === partId || partId.startsWith(d.id));
        if (dt) {
          totalCncParts++;
          ordCncCount++;
          totalCncHoles += dt.holesCount || 4;
        }
      });
      if (ordCncCount > 0) stagesDone.push(`Присадка (${ordCncCount} дет.)`);
    }

    // 4. Packaging Progress
    if (packages.length > 0) {
      let ordPackedPieces = 0;
      packages.forEach(p => {
        (p.parts || []).forEach(pt => {
          ordPackedPieces += (pt.quantity || 1);
        });
      });
      totalPackedBoxes += packages.length;
      totalPackedPartsCount += ordPackedPieces;
      stagesDone.push(`Упаковка (${packages.length} мест, ${ordPackedPieces} дет.)`);
      processedOrdersMap.set(ord.id, {
        orderNumber: ord.orderNumber,
        clientName: ord.clientName || 'Частный заказчик',
        totalParts: totalOrdParts,
        packedParts: ordPackedPieces,
        packagesCount: packages.length,
        stagesDone
      });
    } else if (stagesDone.length > 0) {
      processedOrdersMap.set(ord.id, {
        orderNumber: ord.orderNumber,
        clientName: ord.clientName || 'Частный заказчик',
        totalParts: totalOrdParts,
        packedParts: 0,
        packagesCount: 0,
        stagesDone
      });
    }
  });

  const estimatedSheets = Math.ceil(totalCuttingM2 / 5.7);

  // Clean Isolated A4 Print Engine
  const handlePrintA4 = () => {
    try {
      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      document.body.appendChild(printIframe);

      const frameDoc = printIframe.contentWindow?.document || printIframe.contentDocument;
      if (frameDoc && printIframe.contentWindow) {
        const rowsHtml = Array.from(processedOrdersMap.values()).map((row, idx) => {
          const pct = Math.min(100, Math.round((row.packedParts / Math.max(1, row.totalParts)) * 100));
          return `
            <tr>
              <td style="border: 1px solid #000; padding: 4px 6px; font-weight: bold; font-family: monospace;">${row.orderNumber}</td>
              <td style="border: 1px solid #000; padding: 4px 6px;">${row.clientName}</td>
              <td style="border: 1px solid #000; padding: 4px 6px;">${row.stagesDone.join(', ') || 'Обработка'}</td>
              <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; font-family: monospace; font-weight: bold;">${row.packagesCount > 0 ? `${row.packagesCount} мест` : '—'}</td>
              <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; font-family: monospace;">${row.packedParts > 0 ? `${pct}% (${row.packedParts}/${row.totalParts})` : `${row.totalParts} дет.`}</td>
            </tr>
          `;
        }).join('');

        frameDoc.open();
        frameDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Сменный рапорт ${reportNumber} - ${empName}</title>
              <style>
                @page {
                  size: A4 portrait;
                  margin: 10mm 12mm 10mm 12mm;
                }
                * {
                  box-sizing: border-box;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                html, body {
                  margin: 0;
                  padding: 0;
                  background: #ffffff;
                  color: #000000;
                  font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
                  font-size: 11pt;
                  line-height: 1.35;
                }
                .doc-page {
                  width: 100%;
                  max-width: 190mm;
                  margin: 0 auto;
                }
                .header-table {
                  width: 100%;
                  border-collapse: collapse;
                  border-bottom: 2.5px solid #000;
                  padding-bottom: 8px;
                  margin-bottom: 12px;
                }
                .company-name {
                  font-size: 13pt;
                  font-weight: 900;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                }
                .doc-title {
                  font-size: 16pt;
                  font-weight: 900;
                  text-transform: uppercase;
                  margin: 4px 0 2px 0;
                }
                .doc-meta {
                  font-size: 9.5pt;
                  color: #333;
                }
                .info-grid {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 14px;
                }
                .info-grid td {
                  padding: 3px 6px;
                  font-size: 10pt;
                }
                .info-label {
                  color: #555;
                  width: 130px;
                  font-size: 9pt;
                  text-transform: uppercase;
                  font-weight: bold;
                }
                .info-val {
                  font-weight: bold;
                }
                .section-title {
                  font-size: 11pt;
                  font-weight: 900;
                  text-transform: uppercase;
                  border-bottom: 1.5px solid #000;
                  padding-bottom: 3px;
                  margin: 12px 0 6px 0;
                }
                .metrics-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 12px;
                }
                .metrics-table th {
                  border: 1.5px solid #000;
                  background-color: #f2f2f2 !important;
                  padding: 5px 8px;
                  text-align: left;
                  font-size: 9pt;
                  text-transform: uppercase;
                }
                .metrics-table td {
                  border: 1px solid #000;
                  padding: 5px 8px;
                  font-size: 10pt;
                }
                .orders-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 14px;
                }
                .orders-table th {
                  border: 1.5px solid #000;
                  background-color: #f2f2f2 !important;
                  padding: 5px 6px;
                  font-size: 8.5pt;
                  text-transform: uppercase;
                  text-align: left;
                }
                .orders-table td {
                  border: 1px solid #000;
                  padding: 4px 6px;
                  font-size: 9pt;
                }
                .notes-block {
                  border: 1px solid #888;
                  min-height: 40px;
                  padding: 6px;
                  font-size: 9pt;
                  color: #666;
                  margin-bottom: 14px;
                }
                .sign-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-top: 18px;
                }
                .sign-table td {
                  padding: 8px 12px;
                  vertical-align: bottom;
                  font-size: 9.5pt;
                }
                .sign-line {
                  border-bottom: 1px solid #000;
                  height: 22px;
                  margin-top: 4px;
                }
              </style>
            </head>
            <body>
              <div class="doc-page">
                <table class="header-table">
                  <tr>
                    <td style="vertical-align: top;">
                      <div class="company-name">${companyTitle}</div>
                      <div class="doc-title">СМЕННЫЙ РАПОРТ ВЫРАБОТКИ</div>
                      <div class="doc-meta">Документ первичного производственного учета № ${reportNumber}</div>
                    </td>
                    <td style="text-align: right; vertical-align: top; width: 180px;">
                      <div style="font-size: 9pt; font-weight: bold; text-transform: uppercase; color: #555;">Дата рапорта:</div>
                      <div style="font-size: 13pt; font-weight: 900; font-family: monospace;">${dateStr}</div>
                      <div style="font-size: 9pt; color: #555;">Время закрытия: ${timeStr}</div>
                    </td>
                  </tr>
                </table>

                <table class="info-grid">
                  <tr>
                    <td class="info-label">Сотрудник:</td>
                    <td class="info-val">${empName}</td>
                    <td class="info-label">Участок / Цех:</td>
                    <td class="info-val">${empRole}</td>
                  </tr>
                  <tr>
                    <td class="info-label">Табельный №:</td>
                    <td class="info-val font-mono">${(currentUser?.id || '001').slice(-6).toUpperCase()}</td>
                    <td class="info-label">Статус смены:</td>
                    <td class="info-val">ЗАВЕРШЕНА</td>
                  </tr>
                </table>

                <div class="section-title">1. Сводные производственные показатели за смену</div>
                <table class="metrics-table">
                  <thead>
                    <tr>
                      <th>Производственный участок</th>
                      <th>Объем выработки</th>
                      <th>Количество единиц / деталей</th>
                      <th>Примечание</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="font-weight: bold;">Участок раскроя (Распил)</td>
                      <td style="font-family: monospace; font-weight: bold;">${totalCuttingM2.toFixed(2)} м²</td>
                      <td style="font-family: monospace;">${totalCuttingParts} деталей</td>
                      <td style="font-size: 8.5pt; color: #444;">~ ${estimatedSheets} листов ЛДСП</td>
                    </tr>
                    <tr>
                      <td style="font-weight: bold;">Участок кромкооблицовки</td>
                      <td style="font-family: monospace; font-weight: bold;">${totalEdgingM.toFixed(1)} пог. м</td>
                      <td style="font-family: monospace;">${totalEdgingParts} деталей</td>
                      <td style="font-size: 8.5pt; color: #444;">Облицовка торцов</td>
                    </tr>
                    <tr>
                      <td style="font-weight: bold;">Участок присадки / ЧПУ</td>
                      <td style="font-family: monospace; font-weight: bold;">${totalCncHoles} отверстий</td>
                      <td style="font-family: monospace;">${totalCncParts} деталей</td>
                      <td style="font-size: 8.5pt; color: #444;">Сверление карт</td>
                    </tr>
                    <tr>
                      <td style="font-weight: bold;">Участок комплектации и упаковки</td>
                      <td style="font-family: monospace; font-weight: bold;">${totalPackedBoxes} мест</td>
                      <td style="font-family: monospace;">${processedOrdersMap.size} заказов</td>
                      <td style="font-size: 8.5pt; color: #444;">Маркировка и стикеровка</td>
                    </tr>
                  </tbody>
                </table>

                <div class="section-title">2. Реестр обработанных заказов</div>
                ${processedOrdersMap.size > 0 ? `
                  <table class="orders-table">
                    <thead>
                      <tr>
                        <th style="width: 85px;">№ Заказа</th>
                        <th>Заказчик / Проект</th>
                        <th>Выполненные операции</th>
                        <th style="width: 80px; text-align: center;">Упаковано</th>
                        <th style="width: 100px; text-align: center;">Готовность</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${rowsHtml}
                    </tbody>
                  </table>
                ` : `
                  <div style="border: 1px dashed #999; padding: 10px; text-align: center; color: #666; font-size: 9.5pt; margin-bottom: 12px;">
                    В течение смены выполнялись подготовительные и регламентные работы цеха.
                  </div>
                `}

                <div class="section-title">3. Замечания по качеству, браку и оборудованию</div>
                <div class="notes-block">
                  Замечания по сырью, оборудованию и отклонениям от ТУ отсутствуют. Станки обслужены, рабочие места сданы.
                </div>

                <table class="sign-table">
                  <tr>
                    <td style="width: 50%;">
                      <div style="font-size: 8.5pt; text-transform: uppercase; font-weight: bold; color: #555;">Смену сдал (Сотрудник):</div>
                      <div style="margin-top: 14px; font-weight: bold;">${empName}</div>
                      <div class="sign-line"></div>
                      <div style="font-size: 7.5pt; color: #777; margin-top: 2px;">(подпись, расшифровка)</div>
                    </td>
                    <td style="width: 50%;">
                      <div style="font-size: 8.5pt; text-transform: uppercase; font-weight: bold; color: #555;">Смену принял (Мастер цеха / Нач. производства):</div>
                      <div style="margin-top: 14px; font-weight: bold;">___________________________</div>
                      <div class="sign-line"></div>
                      <div style="font-size: 7.5pt; color: #777; margin-top: 2px;">(подпись, расшифровка)</div>
                    </td>
                  </tr>
                </table>
              </div>
            </body>
          </html>
        `);
        frameDoc.close();

        setTimeout(() => {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(printIframe);
          }, 2500);
        }, 300);
        return;
      }
    } catch (e) {
      console.warn('Iframe print error fallback', e);
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-slate-100 rounded-3xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl border border-slate-300 space-y-4 my-auto max-h-[96vh] flex flex-col">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-300 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">
                Отчет выработки по итогу завершения смены
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Рапорт № {reportNumber} • {empName} • {dateStr}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintA4}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-md hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Печать рапорта (А4)</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-200 cursor-pointer"
              title="Закрыть (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Shift Summary A4 Document Preview */}
        <div className="overflow-y-auto flex-1 bg-white p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-inner text-slate-900 font-sans">
          <div ref={printAreaRef} className="space-y-6 max-w-[210mm] mx-auto text-xs leading-relaxed">
            
            {/* Header / Banner */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{companyTitle}</span>
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">
                  СМЕННЫЙ РАПОРТ ВЫРАБОТКИ
                </h1>
                <div className="text-xs font-bold text-emerald-700 mt-0.5">
                  Сотрудник: {empName} ({empRole})
                </div>
              </div>

              <div className="text-right font-mono">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Рапорт № {reportNumber}</div>
                <div className="text-sm font-black text-slate-900">{dateStr}</div>
                <div className="text-[10px] text-slate-500">Время: {timeStr}</div>
              </div>
            </div>

            {/* Stage Performance Cards */}
            <div className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
                Фактическая выработка по участкам за смену
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Cutting */}
                <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 font-black text-blue-900 text-xs">
                    <Scissors className="w-4 h-4 text-blue-600" />
                    <span>Участок раскроя (Распил)</span>
                  </div>
                  <div className="text-lg font-black font-mono text-slate-900 mt-1">
                    {totalCuttingM2.toFixed(2)} м² <span className="text-xs font-normal text-slate-600">(~ {estimatedSheets} листов ЛДСП)</span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">
                    Распилено деталей: <strong className="font-mono text-slate-900">{totalCuttingParts} шт.</strong>
                  </div>
                </div>

                {/* 2. Edging */}
                <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 font-black text-indigo-900 text-xs">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Участок кромкооблицовки</span>
                  </div>
                  <div className="text-lg font-black font-mono text-slate-900 mt-1">
                    {totalEdgingM.toFixed(1)} п.м. <span className="text-xs font-normal text-slate-600">кромки</span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">
                    Облицовано деталей: <strong className="font-mono text-slate-900">{totalEdgingParts} шт.</strong>
                  </div>
                </div>

                {/* 3. CNC */}
                <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 font-black text-purple-900 text-xs">
                    <Factory className="w-4 h-4 text-purple-600" />
                    <span>Участок присадки / ЧПУ</span>
                  </div>
                  <div className="text-lg font-black font-mono text-slate-900 mt-1">
                    {totalCncHoles} <span className="text-xs font-normal text-slate-600">отверстий</span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">
                    Обработано деталей: <strong className="font-mono text-slate-900">{totalCncParts} шт.</strong>
                  </div>
                </div>

                {/* 4. Packaging */}
                <div className="p-3.5 bg-orange-50/60 border border-orange-200 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 font-black text-orange-900 text-xs">
                    <Package className="w-4 h-4 text-orange-600" />
                    <span>Участок упаковки и комплектовки</span>
                  </div>
                  <div className="text-lg font-black font-mono text-slate-900 mt-1">
                    {totalPackedBoxes} <span className="text-xs font-normal text-slate-600">упакованных мест</span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">
                    Обработано заказов: <strong className="font-mono text-slate-900">{processedOrdersMap.size} зак.</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Orders Packaging Breakdown */}
            {processedOrdersMap.size > 0 && (
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">
                  Статус комплектации и упаковки заказов за смену
                </h2>

                <table className="w-full border-collapse border border-slate-900 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-bold text-left">
                      <th className="border border-slate-900 p-2">№ Заказа</th>
                      <th className="border border-slate-900 p-2">Заказчик</th>
                      <th className="border border-slate-900 p-2">Выполненные операции</th>
                      <th className="border border-slate-900 p-2 text-center">Сформировано мест</th>
                      <th className="border border-slate-900 p-2 text-center">Прогресс упаковки</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(processedOrdersMap.values()).map((row, idx) => {
                      const pct = Math.min(100, Math.round((row.packedParts / Math.max(1, row.totalParts)) * 100));
                      return (
                        <tr key={idx}>
                          <td className="border border-slate-900 p-2 font-mono font-bold">{row.orderNumber}</td>
                          <td className="border border-slate-900 p-2 font-bold">{row.clientName}</td>
                          <td className="border border-slate-900 p-2 text-slate-700">{row.stagesDone.join(', ') || 'Обработка'}</td>
                          <td className="border border-slate-900 p-2 text-center font-mono font-bold">{row.packagesCount > 0 ? `${row.packagesCount} мест` : '—'}</td>
                          <td className="border border-slate-900 p-2 text-center font-mono font-bold">
                            <span className={pct === 100 ? 'text-emerald-700 font-black' : 'text-orange-700'}>
                              {pct}% ({row.packedParts} / {row.totalParts} дет.)
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Signatures Footer */}
            <div className="pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 font-medium">
              <div>
                <div className="text-slate-500 text-[10px] uppercase font-bold mb-4">Смену сдал (Сотрудник):</div>
                <div className="border-b border-slate-900 pb-1 font-bold">{empName} _______________</div>
              </div>

              <div>
                <div className="text-slate-500 text-[10px] uppercase font-bold mb-4">Смену принял (Мастер/Нач. цеха):</div>
                <div className="border-b border-slate-900 pb-1 font-bold">__________________________</div>
              </div>
            </div>

          </div>
        </div>

        {/* QR Re-scan & Hotkey Tip */}
        <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 font-bold">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Для закрытия смены повторно отсканируйте QR «Завершить смену» или нажмите <strong>Enter</strong></span>
          </div>
          <span className="text-[11px] text-emerald-700 font-normal">Esc — закрыть отчет</span>
        </div>

        {/* Modal Bottom Actions */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
          >
            Закрыть окно (Esc)
          </button>

          {onConfirmEndShift && (
            <button
              type="button"
              onClick={() => {
                onConfirmEndShift();
                onClose();
              }}
              className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Подтвердить завершение смены (Enter)</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

