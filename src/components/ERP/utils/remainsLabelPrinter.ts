import { ProductionOrder } from '../types';

/**
 * Direct thermal label printing utility for material offcuts and edge remains.
 * Renders an isolated iframe and sends the exact mm-dimension label to the printer.
 * Features a precise 16 mm horizontal strip centered on the label bounded by dotted lines,
 * with material name on the left and remain sizes, order # and operator name on the right.
 */
export async function printRemainsLabelDirect(
  materialName: string,
  dimensions: string, // e.g. "2040x1453" or "25 м"
  orderNumber: string,
  employeeName: string,
  settings?: { widthMm?: number; heightMm?: number }
): Promise<boolean> {
  try {
    const widthMm = settings?.widthMm || 58;
    const heightMm = settings?.heightMm || 40;

    // Extract surname if possible, otherwise use full name
    const parts = employeeName.trim().split(/\s+/);
    const surname = parts.length > 0 ? parts[0] : employeeName;

    // Split material name into two lines if it's too long
    let line1 = materialName;
    let line2 = "";
    if (materialName.length > 22) {
      // Find a space near the middle to break
      const mid = Math.floor(materialName.length / 2);
      const leftSpace = materialName.lastIndexOf(" ", mid);
      const rightSpace = materialName.indexOf(" ", mid);
      let breakIdx = -1;
      
      if (leftSpace !== -1 && rightSpace !== -1) {
        breakIdx = (mid - leftSpace < rightSpace - mid) ? leftSpace : rightSpace;
      } else if (leftSpace !== -1) {
        breakIdx = leftSpace;
      } else if (rightSpace !== -1) {
        breakIdx = rightSpace;
      }

      if (breakIdx !== -1) {
        line1 = materialName.substring(0, breakIdx);
        line2 = materialName.substring(breakIdx + 1);
      } else {
        line1 = materialName.substring(0, 22);
        line2 = materialName.substring(22);
      }
    }

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

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Этикетка остатка - ${materialName}</title>
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
              font-family: Arial, "Helvetica Neue", Helvetica, sans-serif !important;
              overflow: hidden !important;
            }
            .label-box {
              width: ${widthMm}mm;
              height: ${heightMm}mm;
              max-width: ${widthMm}mm;
              max-height: ${heightMm}mm;
              display: flex;
              flex-direction: column;
              justify-content: center; /* Centering the 16mm strip vertically */
              background: #ffffff !important;
              color: #000000 !important;
              overflow: hidden;
              page-break-inside: avoid;
              page-break-after: avoid;
            }
            .strip-16mm {
              height: 16mm;
              min-height: 16mm;
              border-top: 1.5px dashed #000000 !important;
              border-bottom: 1.5px dashed #000000 !important;
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 0 ${widthMm > 60 ? '6mm' : '3mm'};
              background: #ffffff !important;
            }
            .left-col {
              flex: 1;
              min-width: 0;
              padding-right: 2mm;
              display: flex;
              flex-direction: column;
              justify-content: center;
            }
            .material-title {
              font-size: ${widthMm > 60 ? '11pt' : '8pt'};
              font-weight: 900;
              line-height: 1.15;
              color: #000000 !important;
              text-transform: uppercase;
              word-break: break-word;
              overflow: hidden;
            }
            .material-subtitle {
              font-size: ${widthMm > 60 ? '9.5pt' : '7pt'};
              font-weight: 700;
              line-height: 1.15;
              color: #000000 !important;
              text-transform: uppercase;
              margin-top: 1px;
              word-break: break-word;
              overflow: hidden;
              opacity: 0.9;
            }
            .right-col {
              display: flex;
              flex-direction: column;
              align-items: flex-end;
              justify-content: center;
              flex-shrink: 0;
              text-align: right;
            }
            .dimension-text {
              font-size: ${widthMm > 60 ? '18pt' : '12pt'};
              font-weight: 950;
              line-height: 1;
              font-family: "Arial Black", Arial, sans-serif;
              color: #000000 !important;
              letter-spacing: -0.5px;
            }
            .order-text {
              font-size: ${widthMm > 60 ? '9.5pt' : '7pt'};
              font-weight: 700;
              line-height: 1.1;
              color: #000000 !important;
              margin-top: 2px;
            }
            .employee-text {
              font-size: ${widthMm > 60 ? '9pt' : '6.5pt'};
              font-weight: 700;
              line-height: 1.1;
              color: #000000 !important;
              margin-top: 1px;
              opacity: 0.8;
            }
          </style>
        </head>
        <body>
          <div class="label-box">
            <div class="strip-16mm">
              <div class="left-col">
                <div class="material-title">${line1}</div>
                ${line2 ? `<div class="material-subtitle">${line2}</div>` : ''}
              </div>
              <div class="right-col">
                <div class="dimension-text">${dimensions}</div>
                <div class="order-text">${orderNumber}</div>
                <div class="employee-text">${surname}</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    frameDoc.close();

    // Small delay to ensure content parsing by iframe
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
    console.error('printRemainsLabelDirect failed:', err);
    return false;
  }
}
