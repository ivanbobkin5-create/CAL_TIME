declare global {
  interface Window {
    BX24?: any;
  }
}

export interface Bitrix24Context {
  isBitrix24: boolean;
  domain?: string;
  memberId?: string;
  placement?: string;
  placementOptions?: Record<string, any>;
  dealId?: number | null;
}

let bx24Context: Bitrix24Context = {
  isBitrix24: false,
};

export const initBitrix24 = (): Promise<Bitrix24Context> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.BX24) {
      bx24Context = { isBitrix24: false };
      resolve(bx24Context);
      return;
    }

    try {
      window.BX24.init(() => {
        let placement = "";
        let placementOptions: Record<string, any> = {};

        try {
          const info = window.BX24.placement?.info?.() || {};
          placement = info.placement || "";
          placementOptions = info.options || {};
        } catch (e) {
          console.warn("Could not read placement info:", e);
        }

        // Detect Deal ID from CRM placement options
        let dealId: number | null = null;
        if (placementOptions?.ID) {
          dealId = parseInt(String(placementOptions.ID), 10) || null;
        } else if (placementOptions?.entityTypeId === 2 && placementOptions?.entityId) {
          dealId = parseInt(String(placementOptions.entityId), 10) || null;
        } else if (placementOptions?.ENTITY_ID) {
          dealId = parseInt(String(placementOptions.ENTITY_ID), 10) || null;
        }

        let domain: string | undefined = undefined;
        try {
          domain = window.BX24.getDomain?.();
        } catch (e) {}

        bx24Context = {
          isBitrix24: true,
          domain,
          placement,
          placementOptions,
          dealId: dealId || null,
        };

        // Automatically adjust iframe height inside Bitrix24
        try {
          window.BX24.fitWindow?.();
        } catch (e) {}

        console.log("Bitrix24 SDK Initialized:", bx24Context);
        resolve(bx24Context);
      });
    } catch (e) {
      console.warn("Bitrix24 init error:", e);
      bx24Context = { isBitrix24: false };
      resolve(bx24Context);
    }
  });
};

export const getBitrix24Context = (): Bitrix24Context => {
  return bx24Context;
};

export const sendToBitrix24Deal = async ({
  dealId,
  totalPrice,
  projectName,
  summaryRows = [],
}: {
  dealId?: number | null;
  totalPrice: number;
  projectName: string;
  summaryRows?: any[];
}): Promise<{ success: boolean; message: string }> => {
  if (!window.BX24) {
    return { success: false, message: "Окружение Битрикс24 не обнаружено." };
  }

  const targetDealId = dealId || bx24Context.dealId;
  if (!targetDealId) {
    return {
      success: false,
      message: "ID сделки не указан. Откройте приложение из карточки сделки в Битрикс24 или укажите ID сделки вручную.",
    };
  }

  return new Promise((resolve) => {
    try {
      // 1. Update deal opportunity amount
      window.BX24.callMethod(
        "crm.deal.update",
        {
          id: targetDealId,
          fields: {
            OPPORTUNITY: totalPrice,
          },
        },
        (resUpdate: any) => {
          if (resUpdate.error()) {
            console.error("BX24 crm.deal.update error:", resUpdate.error());
          }

          // 2. Prepare product rows for Bitrix24 CRM
          const productRows = (summaryRows || []).map((row: any) => ({
            PRODUCT_NAME: row.name || "Позиция расчета",
            PRICE: row.price || 0,
            QUANTITY: parseFloat(row.qty) || 1,
            MEASURE_CODE: 796, // шт
          }));

          if (productRows.length > 0) {
            window.BX24.callMethod(
              "crm.deal.productrows.set",
              {
                id: targetDealId,
                rows: productRows,
              },
              (resRows: any) => {
                if (resRows.error()) {
                  console.warn("BX24 crm.deal.productrows.set warning:", resRows.error());
                }
              }
            );
          }

          // 3. Add timeline comment with summary
          let textComment = `📋 **Расчёт мебельного заказа: ${projectName}**\n`;
          textComment += `Итоговая сумма: **${totalPrice.toLocaleString("ru-RU")} ₽**\n\n`;
          textComment += `Состав проекта:\n`;

          (summaryRows || []).slice(0, 15).forEach((row: any, idx: number) => {
            const rowTotal = row.total !== undefined ? row.total : (row.price * row.qty);
            textComment += `${idx + 1}. ${row.name} — ${row.qty} x ${row.price} ₽ = ${Math.round(rowTotal)} ₽\n`;
          });

          if ((summaryRows || []).length > 15) {
            textComment += `... и ещё ${(summaryRows || []).length - 15} позиций.\n`;
          }

          window.BX24.callMethod(
            "crm.timeline.comment.add",
            {
              fields: {
                ENTITY_ID: targetDealId,
                ENTITY_TYPE: "deal",
                COMMENT: textComment,
              },
            },
            (resComment: any) => {
              if (resComment.error()) {
                console.warn("BX24 comment add error:", resComment.error());
              }
              resolve({
                success: true,
                message: `Расчет на сумму ${totalPrice.toLocaleString("ru-RU")} ₽ успешно сохранен в сделку Битрикс24 #${targetDealId}!`,
              });
            }
          );
        }
      );
    } catch (err: any) {
      console.error("Error sending to Bitrix24:", err);
      resolve({
        success: false,
        message: err.message || "Ошибка при передаче данных в Битрикс24",
      });
    }
  });
};
