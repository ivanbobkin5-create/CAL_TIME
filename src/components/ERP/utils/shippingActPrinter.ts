import QRCode from 'qrcode';
import { ProductionOrder, ERPCompanySettings } from '../types';

/**
 * Утилита прямой печати Акта приема-передачи готовой продукции на листе формата А4.
 * Создает изолированный iframe со строгой типографикой и стилями печати А4,
 * гарантируя отсутствие элементов веб-интерфейса браузера на отпечатке.
 */
export async function printShippingActDocumentA4(
  order: ProductionOrder,
  settings?: ERPCompanySettings,
  customCompanyName?: string
): Promise<boolean> {
  try {
    const tpl = settings?.shippingActTemplate || {};
    const companyTitle = tpl.companyTitle || customCompanyName || 'Мебельное производство';
    const companyInn = tpl.companyInn || '';
    const companyPhone = tpl.companyPhone || '+7 (495) 000-00-00';
    const actHeader = tpl.actHeaderTitle || `АКТ ПРИЕМА-ПЕРЕДАЧИ ГОТОВОЙ ПРОДУКЦИИ № ${order.orderNumber}-ОТГ`;
    const introText = tpl.actTextIntro || 'Настоящий акт составлен о том, что Изготовитель (Поставщик) передал, а Заказчик (Получатель) принял готовые мебельные изделия и упаковочные места по заказу в полном объеме и надлежащем качестве.';
    const termsText = tpl.actTermsText || 'Заказчик подтверждает, что доставленные упаковки и комплектующие осмотрены при получении, механических повреждений тары не обнаружено, количество мест соответствует настоящему документу. Претензий по внешнему виду и количеству мест нет.';
    const footerNotes = tpl.customFooterNotes || 'Благодарим за сотрудничество! Гарантия на изделия действует согласно паспорту изделия.';
    const showQr = tpl.showQrForAssembler !== false;

    const delivery = order.deliveryData || {};
    const clientName = delivery.clientName || order.clientName || 'Физическое лицо';
    const clientPhone = delivery.clientPhone || (order as any).clientPhone || '—';
    const deliveryAddress = delivery.address || 'Самовывоз со склада производства';
    const deliveryPrice = Number(delivery.deliveryPrice) || 0;
    const assemblyPrice = Number(delivery.assemblyPrice) || 0;
    const floor = delivery.floor ? `Этаж: ${delivery.floor}` : '';
    const elevator = delivery.hasElevator !== undefined ? (delivery.hasElevator ? 'Лифт: Есть' : 'Лифт: Нет') : '';
    const deliveryMeta = [floor, elevator].filter(Boolean).join(', ');

    const driverName = order.driverInfo?.driverName || 'Доставка предприятия';
    const carPlate = order.driverInfo?.carPlate ? `(${order.driverInfo.carPlate})` : '';
    const driverPhone = order.driverInfo?.phone ? `тел. ${order.driverInfo.phone}` : '';

    const packages = order.packages || [];
    const totalPackages = packages.length;

    const todayFormatted = new Date().toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // QR-код для сборщика / клиента
    let qrDataUrl = '';
    if (showQr) {
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const qrPayload = `${origin}/?orderId=${encodeURIComponent(order.id || order.orderNumber)}`;
        qrDataUrl = await QRCode.toDataURL(qrPayload, {
          width: 512,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#ffffff' }
        });
      } catch (err) {
        console.warn('QR code generation failed:', err);
      }
    }

    // Создаем изолированный скрытый iframe
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

    // Генерируем строки таблицы упаковочных мест
    let packagesTableRows = '';
    if (packages.length > 0) {
      packagesTableRows = packages.map((pkg, idx) => `
        <tr>
          <td style="border: 1px solid #1e293b; padding: 6px 8px; text-align: center; font-weight: bold; font-family: monospace;">${idx + 1}</td>
          <td style="border: 1px solid #1e293b; padding: 6px 8px; font-weight: 600;">${pkg.name || `Место #${pkg.packageNumber}`}</td>
          <td style="border: 1px solid #1e293b; padding: 6px 8px; text-align: center; font-family: monospace; font-weight: bold;">${pkg.code || `PKG-${order.orderNumber}-${pkg.packageNumber}`}</td>
          <td style="border: 1px solid #1e293b; padding: 6px 8px; text-align: center;">${pkg.parts?.length ? `${pkg.parts.length} дет.` : (pkg.hardwareItems?.length ? `${pkg.hardwareItems.length} поз. фурн.` : 'Комплект')}</td>
          <td style="border: 1px solid #1e293b; padding: 6px 8px; text-align: center; font-weight: bold; color: #047857;">Осмотрено, цело</td>
        </tr>
      `).join('');
    } else {
      packagesTableRows = `
        <tr>
          <td colspan="5" style="border: 1px solid #1e293b; padding: 12px; text-align: center; font-style: italic; color: #475569;">
            Заказ передается единым комплектом готовой мебели по спецификации (${order.partsCount || 0} деталей).
          </td>
        </tr>
      `;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Акт приема-передачи № ${order.orderNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.35;
    }
    .doc-container {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .title-block {
      text-align: center;
      margin: 12px 0 16px 0;
    }
    .title-main {
      font-size: 13pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 4px 0;
    }
    .title-sub {
      font-size: 9pt;
      color: #475569;
      margin: 0;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      background-color: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
    }
    .info-table td {
      padding: 5px 10px;
      font-size: 9.5pt;
      vertical-align: top;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-label {
      width: 25%;
      font-weight: bold;
      color: #475569;
    }
    .info-value {
      font-weight: 600;
      color: #0f172a;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 9pt;
    }
    .data-table th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 800;
      border: 1px solid #1e293b;
      padding: 6px 8px;
      text-align: left;
    }
    .terms-box {
      font-size: 8.5pt;
      color: #334155;
      line-height: 1.4;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      border-radius: 4px;
      margin-bottom: 24px;
    }
    .terms-box p {
      margin: 3px 0;
    }
    .signatures-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    .signatures-table td {
      width: 50%;
      padding: 0 16px 0 0;
      vertical-align: top;
    }
    .sign-line {
      border-bottom: 1px solid #0f172a;
      height: 32px;
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 8.5pt;
      color: #64748b;
      padding-bottom: 2px;
    }
  </style>
</head>
<body>
  <div class="doc-container">
    
    <!-- Шапка документа -->
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <div style="font-size: 13pt; font-weight: 900; text-transform: uppercase; color: #0f172a;">${companyTitle}</div>
          ${companyInn ? `<div style="font-size: 8.5pt; color: #475569; margin-top: 2px;">ИНН/ОГРН: ${companyInn}</div>` : ''}
          <div style="font-size: 8.5pt; color: #475569;">Тел.: ${companyPhone}</div>
        </td>
        <td style="vertical-align: top; text-align: right;">
          <div style="font-size: 10pt; font-weight: bold; font-family: monospace; color: #0f172a;">АКТ № ${order.orderNumber}-ОТГ</div>
          <div style="font-size: 9pt; color: #334155; margin-top: 2px;">${todayFormatted} г.</div>
          ${qrDataUrl ? `<div style="margin-top: 4px;"><img src="${qrDataUrl}" width="64" height="64" alt="QR" style="display: inline-block; vertical-align: middle;"></div>` : ''}
        </td>
      </tr>
    </table>

    <!-- Название акта -->
    <div class="title-block">
      <h1 class="title-main">${actHeader}</h1>
      <p class="title-sub">к Заказу / Договору № <strong>${order.orderNumber}</strong></p>
    </div>

    <!-- Вводный текст -->
    <div style="font-size: 9pt; color: #334155; margin-bottom: 10px;">
      ${introText}
    </div>

    <!-- Реквизиты доставки и клиента -->
    <table class="info-table">
      <tr>
        <td class="info-label">Заказчик (Получатель):</td>
        <td class="info-value" colspan="3">${clientName}</td>
      </tr>
      <tr>
        <td class="info-label">Телефон заказчика:</td>
        <td class="info-value">${clientPhone}</td>
        <td class="info-label" style="width: 20%;">Стоимость доставки:</td>
        <td class="info-value" style="width: 25%;">${deliveryPrice > 0 ? `${deliveryPrice.toLocaleString('ru-RU')} ₽` : 'Включена в заказ'}</td>
      </tr>
      <tr>
        <td class="info-label">Адрес доставки:</td>
        <td class="info-value" colspan="3">${deliveryAddress} ${deliveryMeta ? `(${deliveryMeta})` : ''}</td>
      </tr>
      <tr>
        <td class="info-label">Перевозчик / Водитель:</td>
        <td class="info-value">${driverName} ${carPlate} ${driverPhone ? `• ${driverPhone}` : ''}</td>
        <td class="info-label">Сборка:</td>
        <td class="info-value">${assemblyPrice > 0 ? `${assemblyPrice.toLocaleString('ru-RU')} ₽` : (order.currentStage === 'assembly' ? 'Требуется' : 'Не требуется')}</td>
      </tr>
      ${order.projectName ? `
      <tr>
        <td class="info-label">Наименование проекта:</td>
        <td class="info-value" colspan="3">${order.projectName}</td>
      </tr>` : ''}
    </table>

    <!-- Таблица упаковочных мест -->
    <div style="font-size: 9.5pt; font-weight: 800; text-transform: uppercase; color: #1e293b; margin-bottom: 6px;">
      1. Перечень передаваемых упаковочных мест и комплектующих (Всего мест: ${totalPackages || 1}):
    </div>
    
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 35px; text-align: center;">№</th>
          <th>Наименование места / Упаковки</th>
          <th style="width: 140px; text-align: center;">Штрихкод / Маркировка</th>
          <th style="width: 90px; text-align: center;">Состав</th>
          <th style="width: 120px; text-align: center;">Состояние упаковки</th>
        </tr>
      </thead>
      <tbody>
        ${packagesTableRows}
      </tbody>
    </table>

    <!-- Условия передачи -->
    <div class="terms-box">
      <p>• ${termsText}</p>
      <p>• Скрытые дефекты, которые невозможно обнаружить при приемке тары без вскрытия, регулируются гарантийными обязательствами производителя.</p>
      <p style="margin-top: 6px; font-weight: bold; color: #0f172a;">${footerNotes}</p>
    </div>

    <!-- Блок подписей -->
    <table class="signatures-table">
      <tr>
        <td>
          <div style="font-weight: bold; font-size: 9.5pt; color: #0f172a;">Сдал (Перевозчик / Изготовитель):</div>
          <div style="font-size: 8.5pt; color: #64748b; margin-top: 2px;">Товар и упаковки передал в надлежащем виде</div>
          <div class="sign-line">
            <span>Подпись: __________________</span>
            <span>/ ${driverName} /</span>
          </div>
        </td>
        <td style="padding-right: 0; padding-left: 16px;">
          <div style="font-weight: bold; font-size: 9.5pt; color: #0f172a;">Принял (Заказчик / Получатель):</div>
          <div style="font-size: 8.5pt; color: #64748b; margin-top: 2px;">Товар и упаковки в указанном кол-ве принял, претензий нет</div>
          <div class="sign-line">
            <span>Подпись: __________________</span>
            <span>/ ${clientName} /</span>
          </div>
        </td>
      </tr>
    </table>

  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;

    frameDoc.open();
    frameDoc.write(htmlContent);
    frameDoc.close();

    // Авто-очистка iframe после закрытия диалога печати
    setTimeout(() => {
      try {
        if (printIframe.parentNode) {
          document.body.removeChild(printIframe);
        }
      } catch (_) {}
    }, 60000);

    return true;
  } catch (err) {
    console.error('Failed to print shipping act A4:', err);
    window.print();
    return false;
  }
}
