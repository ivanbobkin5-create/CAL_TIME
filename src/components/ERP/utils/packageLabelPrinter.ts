import QRCode from 'qrcode';
import { ProductionOrder, OrderPackage, PackageLabelSettings } from '../types';

/**
 * Direct silent / fast thermal label printing utility for packaging and kitting stations.
 * Renders an isolated iframe and sends the exact mm-dimension label to the printer without blocking the UI.
 */
export async function printPackageLabelDirect(
  order: ProductionOrder,
  pkg: OrderPackage,
  totalPackagesCount: number = 1,
  settings?: PackageLabelSettings
): Promise<boolean> {
  try {
    const widthMm = settings?.widthMm || 120;
    const heightMm = settings?.heightMm || 75;
    const showDetails = settings?.showDetailsList !== false;
    const showEmployee = settings?.showEmployeeName !== false;
    const showDateTime = settings?.showDateTime !== false;
    const showQr = settings?.showOrderQr !== false;
    const fontScale = settings?.fontSizeScale || 100;

    // Generate QR code data URL (encodes the direct public package passport web URL for installers)
    const packageCode = pkg.code || `PKG-${order.orderNumber}-${pkg.packageNumber}`;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const qrPayload = `${origin}/p/${encodeURIComponent(packageCode)}`;

    let qrDataUrl = '';
    if (showQr) {
      try {
        qrDataUrl = await QRCode.toDataURL(qrPayload, {
          width: 1024,
          margin: 1,
          errorCorrectionLevel: 'H',
          color: { dark: '#000000', light: '#ffffff' }
        });
      } catch (err) {
        console.error('QR generation for label direct print failed:', err);
      }
    }

    const formattedDate = pkg.createdAt
      ? new Date(pkg.createdAt).toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : new Date().toLocaleString('ru-RU');

    // Create an isolated hidden iframe
    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = '0';
    document.body.appendChild(printIframe);

    const frameDoc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (!frameDoc || !printIframe.contentWindow) {
      document.body.removeChild(printIframe);
      return false;
    }

    const partsListHtml = (pkg.type === 'kitting') ? `
      <div style="font-size: 8px; font-weight: 900; color: #000000; text-transform: uppercase; margin-bottom: 2px;">Состав фурнитуры / комплекта:</div>
      <div style="font-size: 9.5px; font-weight: 700; color: #000000; background: #ffffff; padding: 3px; border: 1px solid #000000; max-height: 80px; overflow: hidden;">
        ${pkg.customItemsNote || 'Фурнитура, крепеж, комплектующие'}
      </div>
    ` : (showDetails && pkg.parts && pkg.parts.length > 0) ? `
      <div style="display: flex; justify-content: space-between; font-size: 8.5px; font-weight: 900; color: #000000; text-transform: uppercase; margin-bottom: 2px;">
        <span>Вложенные детали:</span>
        <span style="font-family: monospace; font-weight: 900;">${pkg.parts.length} шт.</span>
      </div>
      <div style="max-height: 85px; overflow: hidden;">
        ${pkg.parts.slice(0, 5).map((p: any) => `
          <div class="part-item">
            <span style="font-weight: 700; max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #000000;">
              #${p.labelNumber} ${p.name}
            </span>
            <span style="font-family: monospace; font-size: 9px; color: #000000; font-weight: bold; flex-shrink: 0;">
              ${p.length && p.width ? `${p.length}×${p.width}` : ''}
            </span>
          </div>
        `).join('')}
        ${pkg.parts.length > 5 ? `
          <div style="font-size: 8.5px; font-weight: 900; color: #000000; font-style: italic; margin-top: 1px;">
            + еще ${pkg.parts.length - 5} дет. (всего ${pkg.parts.length} шт)
          </div>
        ` : ''}
      </div>
    ` : `
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #000000; font-size: 10.5px; font-weight: bold; font-style: italic;">
        ${pkg.parts?.length || 0} деталей упаковано
      </div>
    `;

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Этикетка ${order.orderNumber} - Место ${pkg.packageNumber}</title>
          <style>
            @page {
              size: ${widthMm}mm ${heightMm}mm;
              margin: 0mm !important;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              width: ${widthMm}mm;
              height: ${heightMm}mm;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
              overflow: hidden !important;
            }
            .label-box {
              width: ${widthMm}mm;
              height: ${heightMm}mm;
              max-width: ${widthMm}mm;
              max-height: ${heightMm}mm;
              padding: 2.5mm 3.5mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              border: 1.5mm solid #000000;
              background: #ffffff !important;
              color: #000000 !important;
              overflow: hidden;
              page-break-inside: avoid;
              page-break-after: avoid;
            }
            .header-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #000000;
              padding-bottom: 3px;
              margin-bottom: 4px;
              background: #ffffff !important;
            }
            .sub-box {
              background: #ffffff !important;
              border: 1.5px solid #000000;
              padding: 2.5px 5px;
              border-radius: 2px;
              margin-bottom: 4px;
            }
            .badge {
              background: #ffffff !important;
              color: #000000 !important;
              border: 2px solid #000000;
              padding: 2px 6px;
              font-weight: 900;
              font-family: monospace;
              font-size: 13px;
              border-radius: 2px;
              display: inline-block;
            }
            .middle-row {
              display: flex;
              gap: 8px;
              flex: 1;
              min-height: 0;
              overflow: hidden;
              background: #ffffff !important;
            }
            .parts-list {
              flex: 1;
              min-width: 0;
              overflow: hidden;
              font-size: 10px;
              line-height: 1.25;
              color: #000000 !important;
              background: #ffffff !important;
            }
            .part-item {
              display: flex;
              justify-content: space-between;
              border-bottom: 1px dotted #000000;
              padding: 1px 0;
              color: #000000 !important;
            }
            .qr-col {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              border-left: 2px solid #000000;
              padding-left: 6px;
              flex-shrink: 0;
              width: 96px;
              background: #ffffff !important;
            }
            .footer-row {
              border-top: 2px solid #000000;
              padding-top: 3px;
              margin-top: 3px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 9.5px;
              line-height: 1.2;
              color: #000000 !important;
              background: #ffffff !important;
            }
          </style>
        </head>
        <body>
          <div class="label-box">
            <div>
              <div class="header-row">
                <div>
                  <div style="font-size: 18px; font-weight: 900; letter-spacing: -0.5px; color: #000000; line-height: 1;">
                    ЗАКАЗ: ${order.orderNumber}
                  </div>
                </div>
                <div style="text-align: right;">
                  <div class="badge">МЕСТО № ${pkg.packageNumber}</div>
                  <div style="font-size: 8.5px; font-family: monospace; color: #000000; margin-top: 1px; font-weight: 900;">
                    ${pkg.type === 'kitting' ? 'КОМПЛЕКТАЦИЯ' : 'УПАКОВКА'}
                  </div>
                </div>
              </div>

              <div class="sub-box">
                <div style="font-size: 8px; font-weight: 900; color: #000000; text-transform: uppercase;">Наименование места:</div>
                <div style="font-size: 11.5px; font-weight: 900; color: #000000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${pkg.name || `Место №${pkg.packageNumber}`}
                </div>
              </div>
            </div>

            <div class="middle-row">
              <div class="parts-list">
                ${partsListHtml}
              </div>

              ${showQr && qrDataUrl ? `
                <div class="qr-col">
                  <img src="${qrDataUrl}" alt="QR" style="width: 86px; height: 86px; max-width: 86px; max-height: 86px; object-fit: contain; image-rendering: pixelated; image-rendering: crisp-edges;" />
                  <div style="font-size: 7.5px; font-weight: 900; color: #000000; margin-top: 1px; text-align: center; text-transform: uppercase;">
                    Паспорт места
                  </div>
                  <div style="font-size: 7.5px; font-family: monospace; font-weight: 900; color: #000000; max-width: 90px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${pkg.code || `PKG-${order.orderNumber}-${pkg.packageNumber}`}
                  </div>
                </div>
              ` : ''}
            </div>

            <div class="footer-row">
              <div>
                ${showEmployee ? `<div>Упаковщик: <strong style="font-weight: 900; color: #000000;">${pkg.createdByEmployeeName || 'Мастер цеха'}</strong></div>` : ''}
                ${showDateTime ? `<div style="color: #000000; font-family: monospace; font-weight: 700;">Сформировано: ${formattedDate}</div>` : ''}
              </div>
              <div style="text-align: right; font-family: monospace; font-weight: 900; font-size: 10px; color: #000000;">
                ERP-${order.orderNumber}-M${pkg.packageNumber}
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(printIframe)) {
          document.body.removeChild(printIframe);
        }
      }, 2500);
    }, 250);

    return true;
  } catch (err) {
    console.error('printPackageLabelDirect error:', err);
    return false;
  }
}
