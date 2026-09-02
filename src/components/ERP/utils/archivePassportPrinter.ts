import { ProductionOrder, ERPEmployee } from '../types';
import { formatDeadlineDate, formatDateTimeSafe, getStageNameRussian } from '../utils';

/**
 * Generates and prints a full A4 Archive Order Dossier / Passport (Паспорт заказа и история выполнения)
 */
export function printArchiveOrderPassport(order: ProductionOrder, employees: ERPEmployee[] = []) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Не удалось открыть окно печати. Разрешите всплывающие окна в браузере.');
    return;
  }

  const dateNow = new Date().toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const packages = order.packages || [];
  const parts = order.birkaData?.details || [];
  const hardwareItems = order.hardwareData?.items || [];
  const stageProgress = order.stageProgress || {};
  const workLogs = order.workLogs || [];

  // Stage names in Russian
  const stageNames: Record<string, string> = {
    queue: 'Очередь / Планирование',
    cutting: 'Распил',
    cut: 'Распил',
    edging: 'Кромкооблицовка',
    edge: 'Кромкооблицовка',
    milling: 'Присадка / ЧПУ',
    cnc: 'Присадка / ЧПУ',
    facades: 'Фасады',
    assembly: 'Сборка',
    kitting: 'Комплектовка фурнитуры',
    qc: 'Контроль ОТК',
    packing: 'Упаковка деталей',
    packaging: 'Упаковка деталей',
    ready: 'Готово к отгрузке',
    shipping: 'Отгрузка водителю'
  };

  // Build packages HTML
  let packagesHtml = '';
  if (packages.length === 0) {
    packagesHtml = '<div style="color: #64748b; font-style: italic; padding: 8px 0;">Упаковочные места не формировались</div>';
  } else {
    packagesHtml = packages.map((pkg, idx) => {
      const partsListHtml = (pkg.parts && pkg.parts.length > 0)
        ? `<table style="width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 9pt;">
            <thead>
              <tr style="background: #f8fafc; text-align: left; border-bottom: 1px solid #cbd5e1;">
                <th style="padding: 4px 6px;">Поз.</th>
                <th style="padding: 4px 6px;">Наименование</th>
                <th style="padding: 4px 6px;">Материал</th>
                <th style="padding: 4px 6px;">Размер (ДхШхТ)</th>
                <th style="padding: 4px 6px; text-align: right;">Кол-во</th>
              </tr>
            </thead>
            <tbody>
              ${pkg.parts.map(p => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 3px 6px; font-weight: bold; font-family: monospace;">${p.labelNumber}</td>
                  <td style="padding: 3px 6px;">${p.name}</td>
                  <td style="padding: 3px 6px; color: #475569;">${p.material || '—'}</td>
                  <td style="padding: 3px 6px; font-family: monospace;">${p.length && p.width ? `${p.length}×${p.width}${p.thickness ? `×${p.thickness}` : ''} мм` : '—'}</td>
                  <td style="padding: 3px 6px; text-align: right; font-weight: bold;">${p.quantity || 1} шт</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`
        : '';

      const hardwareListHtml = (pkg.hardwareItems && pkg.hardwareItems.length > 0)
        ? `<table style="width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 9pt;">
            <thead>
              <tr style="background: #f8fafc; text-align: left; border-bottom: 1px solid #cbd5e1;">
                <th style="padding: 4px 6px;">Артикул</th>
                <th style="padding: 4px 6px;">Наименование фурнитуры</th>
                <th style="padding: 4px 6px;">Категория</th>
                <th style="padding: 4px 6px; text-align: right;">Кол-во</th>
              </tr>
            </thead>
            <tbody>
              ${pkg.hardwareItems.map(h => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 3px 6px; font-family: monospace;">${h.article || '—'}</td>
                  <td style="padding: 3px 6px; font-weight: bold;">${h.name}</td>
                  <td style="padding: 3px 6px; color: #475569;">${h.category || 'Фурнитура'}</td>
                  <td style="padding: 3px 6px; text-align: right; font-weight: bold;">${h.quantity} ${h.unit || 'шт'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`
        : '';

      return `
        <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; margin-bottom: 10px; background: #fff; page-break-inside: avoid;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px; margin-bottom: 6px;">
            <div>
              <span style="font-weight: 900; font-size: 11pt; color: #0f172a;">Место №${pkg.packageNumber || idx + 1}: ${pkg.name}</span>
              <span style="font-size: 8.5pt; color: #64748b; margin-left: 8px;">Код: ${pkg.code}</span>
            </div>
            <div style="font-size: 8.5pt; font-weight: bold; color: ${pkg.isShipped ? '#15803d' : '#0369a1'};">
              ${pkg.isShipped ? '✓ ОТГРУЖЕНО' : 'ЗАПЕЧАТАНО'}
            </div>
          </div>
          <div style="font-size: 8.5pt; color: #475569; display: flex; gap: 15px; margin-bottom: 6px;">
            <span>Упаковал: <strong>${pkg.createdByEmployeeName || '—'}</strong> (${formatDateTimeSafe(pkg.createdAt)})</span>
            ${pkg.shippedAt ? `<span>Отгрузил: <strong>${pkg.shippedByEmployeeName || '—'}</strong> (${formatDateTimeSafe(pkg.shippedAt)})</span>` : ''}
          </div>
          ${partsListHtml}
          ${hardwareListHtml}
          ${pkg.customItemsNote ? `<div style="font-size: 8.5pt; color: #334155; margin-top: 4px; background: #f8fafc; padding: 4px 6px; border-radius: 4px;"><strong>Вложено:</strong> ${pkg.customItemsNote}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  // Build Hardware Reconciliation HTML (План / Факт)
  let hardwareHtml = '';
  if (hardwareItems.length > 0) {
    hardwareHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 9pt;">
        <thead>
          <tr style="background: #f1f5f9; text-align: left; border-bottom: 1.5px solid #94a3b8;">
            <th style="padding: 5px 6px;">Артикул</th>
            <th style="padding: 5px 6px;">Наименование позиции</th>
            <th style="padding: 5px 6px;">Категория</th>
            <th style="padding: 5px 6px; text-align: right;">План</th>
            <th style="padding: 5px 6px; text-align: right;">Факт укомпл.</th>
            <th style="padding: 5px 6px; text-align: center;">Статус</th>
          </tr>
        </thead>
        <tbody>
          ${hardwareItems.map(item => {
            const packed = item.packedQuantity || 0;
            const isMatch = packed >= item.quantity;
            return `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 4px 6px; font-family: monospace;">${item.article || '—'}</td>
                <td style="padding: 4px 6px; font-weight: bold;">${item.name}</td>
                <td style="padding: 4px 6px; color: #475569;">${item.category || 'Фурнитура'}</td>
                <td style="padding: 4px 6px; text-align: right; font-family: monospace;">${item.quantity} ${item.unit || 'шт'}</td>
                <td style="padding: 4px 6px; text-align: right; font-weight: bold; font-family: monospace; color: ${isMatch ? '#166534' : '#b91c1c'};">${packed} ${item.unit || 'шт'}</td>
                <td style="padding: 4px 6px; text-align: center; font-weight: bold; font-size: 8pt; color: ${isMatch ? '#166534' : '#b91c1c'};">
                  ${isMatch ? '✓ Полностью' : `⚠️ Нехватка ${item.quantity - packed}`}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  } else {
    hardwareHtml = '<div style="color: #64748b; font-style: italic; padding: 6px 0;">Комплектовочная ведомость не загружалась</div>';
  }

  // Stages & Participants
  const stagesToRender = { ...stageProgress };
  if (order.status === 'shipped' || order.status === 'completed' || !!order.shippedAt) {
    stagesToRender.shipping = {
      status: 'done',
      completedBy: stageProgress.shipping?.completedBy || order.shippedByEmployeeName || order.driverInfo?.driverName || 'Экспедитор',
      completedAt: stageProgress.shipping?.completedAt || order.shippedAt || new Date().toISOString()
    };
  }

  const stagesHtml = Object.entries(stagesToRender).map(([stId, stData]: [string, any]) => {
    const isDone = stData?.status === 'done';
    const isInProgress = stData?.status === 'in_progress';
    return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 4px 6px; font-weight: bold;">${stageNames[stId] || getStageNameRussian(stId)}</td>
        <td style="padding: 4px 6px; color: ${isDone ? '#166534' : (isInProgress ? '#0369a1' : '#64748b')}; font-weight: bold;">
          ${isDone ? '✓ Выполнен' : (isInProgress ? 'В работе' : 'Ожидание')}
        </td>
        <td style="padding: 4px 6px;">${stData?.completedBy || '—'}</td>
        <td style="padding: 4px 6px; font-family: monospace;">${formatDateTimeSafe(stData?.completedAt)}</td>
        <td style="padding: 4px 6px; color: #475569;">${stData?.notes || '—'}</td>
      </tr>
    `;
  }).join('');

  // Work logs table HTML
  const workLogsHtml = (workLogs && workLogs.length > 0)
    ? `
      <div class="section-title" style="page-break-before: auto;">4. Журнал работы сотрудников над заказом</div>
      <table style="width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 14px;">
        <thead>
          <tr style="background: #f1f5f9; text-align: left; border-bottom: 1.5px solid #94a3b8;">
            <th style="padding: 5px 6px;">Сотрудник</th>
            <th style="padding: 5px 6px;">Участок</th>
            <th style="padding: 5px 6px;">Начало</th>
            <th style="padding: 5px 6px;">Окончание</th>
            <th style="padding: 5px 6px; text-align: right;">Выработка</th>
          </tr>
        </thead>
        <tbody>
          ${workLogs.map(log => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 4px 6px; font-weight: bold;">${log.employeeName || 'Сотрудник'}</td>
              <td style="padding: 4px 6px;">${stageNames[log.stageId] || getStageNameRussian(log.stageId)}</td>
              <td style="padding: 4px 6px; font-family: monospace;">${formatDateTimeSafe(log.startTime)}</td>
              <td style="padding: 4px 6px; font-family: monospace;">${formatDateTimeSafe(log.endTime, 'В процессе')}</td>
              <td style="padding: 4px 6px; text-align: right; font-weight: bold;">
                ${log.scannedPartsCount ? `${log.scannedPartsCount} дет.` : ''} ${log.scannedAreaM2 ? `${log.scannedAreaM2} м²` : ''} ${log.scannedEdgeM ? `${log.scannedEdgeM} м` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="utf-8">
      <title>Архивный паспорт заказа №${order.orderNumber}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 12mm 12mm 12mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 0;
          font-size: 9.5pt;
          line-height: 1.35;
          background: #fff;
        }
        .header-box {
          border-bottom: 2px solid #0f172a;
          padding-bottom: 10px;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .title {
          font-size: 16pt;
          font-weight: 900;
          margin: 0 0 4px 0;
          color: #0f172a;
        }
        .subtitle {
          font-size: 10pt;
          color: #334155;
          margin: 0;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 14px;
        }
        .meta-item {
          display: flex;
          flex-direction: column;
        }
        .meta-label {
          font-size: 7.5pt;
          text-transform: uppercase;
          font-weight: bold;
          color: #64748b;
        }
        .meta-val {
          font-size: 9.5pt;
          font-weight: bold;
          color: #0f172a;
        }
        .section-title {
          font-size: 11pt;
          font-weight: 900;
          color: #0f172a;
          border-bottom: 1.5px solid #e2e8f0;
          padding-bottom: 4px;
          margin: 14px 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .footer-signatures {
          margin-top: 25px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          page-break-inside: avoid;
        }
        .signature-line {
          border-top: 1px solid #0f172a;
          padding-top: 4px;
          display: flex;
          justify-content: space-between;
          font-size: 8.5pt;
          color: #475569;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="header-box">
        <div>
          <h1 class="title">Архивный паспорт заказа №${order.orderNumber}</h1>
          <p class="subtitle">${order.clientName} ${order.projectName ? `— ${order.projectName}` : ''} ${order.salonName ? `(${order.salonName})` : ''}</p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 8.5pt; color: #64748b;">Дата выгрузки архива:</div>
          <div style="font-size: 9.5pt; font-weight: bold; font-family: monospace;">${dateNow}</div>
          <div style="font-size: 8.5pt; font-weight: bold; color: #166534; margin-top: 3px;">
            ${order.status === 'shipped' ? '✓ ЗАКАЗ ОТГРУЖЕН' : '✓ ПРОИЗВОДСТВО ЗАВЕРШЕНО'}
          </div>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <span class="meta-label">Дата создания / Срок</span>
          <span class="meta-val">${order.createdAt ? order.createdAt.substring(0, 10) : '—'} / ${formatDeadlineDate(order.deadlineDate)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Объем производства</span>
          <span class="meta-val">${order.totalAreaM2 || 0} м² (${order.partsCount || 0} дет.)</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Кромка всего</span>
          <span class="meta-val">${order.totalEdgeM || 0} п.м.</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Упаковочные места</span>
          <span class="meta-val">${packages.length} мест</span>
        </div>
      </div>

      ${order.driverInfo ? `
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 6px 12px; margin-bottom: 12px; font-size: 9pt;">
          <strong>Отгрузка водителю:</strong> ${order.driverInfo.driverName || '—'} | Авто: ${order.driverInfo.carPlate || '—'} | Тел: ${order.driverInfo.phone || '—'}
          ${order.shippedAt ? ` | Дата: ${formatDateTimeSafe(order.shippedAt)}` : ''}
        </div>
      ` : ''}

      <div class="section-title">1. Упаковочные места и уложенные детали</div>
      ${packagesHtml}

      <div class="section-title" style="page-break-before: auto;">2. Комплектовочная ведомость (Фурнитура и крепеж)</div>
      ${hardwareHtml}

      <div class="section-title" style="page-break-before: auto;">3. История технологических этапов и исполнители</div>
      <table style="width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 14px;">
        <thead>
          <tr style="background: #f1f5f9; text-align: left; border-bottom: 1.5px solid #94a3b8;">
            <th style="padding: 5px 6px;">Участок</th>
            <th style="padding: 5px 6px;">Статус</th>
            <th style="padding: 5px 6px;">Исполнитель</th>
            <th style="padding: 5px 6px;">Дата / Время</th>
            <th style="padding: 5px 6px;">Примечание</th>
          </tr>
        </thead>
        <tbody>
          ${stagesHtml}
        </tbody>
      </table>

      ${workLogsHtml}

      <div class="footer-signatures">
        <div>
          <div class="signature-line">
            <span>Мастер смены / Начальник цеха:</span>
            <span>(подпись / ФИО)</span>
          </div>
        </div>
        <div>
          <div class="signature-line">
            <span>Кладовщик / Отгрузка готовой продукции:</span>
            <span>(подпись / ФИО)</span>
          </div>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
