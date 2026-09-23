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

export const fetchBitrix24DealDetails = async (dealId: number): Promise<{ title: string | null; contactId: number | null; companyId: number | null }> => {
  if (!window.BX24) return { title: null, contactId: null, companyId: null };
  return new Promise((resolve) => {
    try {
      window.BX24.callMethod(
        "crm.deal.get",
        { id: dealId },
        (res: any) => {
          if (res.error()) {
            console.warn("BX24 crm.deal.get error:", res.error());
            resolve({ title: null, contactId: null, companyId: null });
          } else {
            const data = res.data() || {};
            const contactId = data.CONTACT_ID ? parseInt(String(data.CONTACT_ID), 10) : null;
            const companyId = data.COMPANY_ID ? parseInt(String(data.COMPANY_ID), 10) : null;
            resolve({
              title: data.TITLE || null,
              contactId: contactId || null,
              companyId: companyId || null,
            });
          }
        }
      );
    } catch (e) {
      resolve({ title: null, contactId: null, companyId: null });
    }
  });
};

export const openBitrix24Contact = (contactId?: number | null, companyId?: number | null, dealId?: number | null) => {
  if (typeof window === "undefined") return;
  
  if (window.BX24?.openPath) {
    if (contactId) {
      window.BX24.openPath(`/crm/contact/details/${contactId}/`);
    } else if (companyId) {
      window.BX24.openPath(`/crm/company/details/${companyId}/`);
    } else if (dealId) {
      window.BX24.openPath(`/crm/deal/details/${dealId}/`);
    } else {
      window.BX24.openPath(`/crm/contact/`);
    }
  } else {
    // Fallback if not inside BX24 frame
    const domain = window.BX24?.getDomain?.() || "";
    if (domain) {
      const url = contactId 
        ? `https://${domain}/crm/contact/details/${contactId}/` 
        : (companyId ? `https://${domain}/crm/company/details/${companyId}/` : `https://${domain}/crm/deal/details/${dealId}/`);
      window.open(url, "_blank");
    }
  }
};

export const fetchBitrix24DealTitle = async (dealId: number): Promise<string | null> => {
  const details = await fetchBitrix24DealDetails(dealId);
  return details.title;
};

export const updateBitrix24DealTitle = async (dealId: number, title: string): Promise<boolean> => {
  if (!window.BX24) return false;
  return new Promise((resolve) => {
    try {
      window.BX24.callMethod(
        "crm.deal.update",
        {
          id: dealId,
          fields: { TITLE: title }
        },
        (res: any) => {
          if (res.error()) {
            console.warn("BX24 crm.deal.update title error:", res.error());
            resolve(false);
          } else {
            resolve(true);
          }
        }
      );
    } catch (e) {
      resolve(false);
    }
  });
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

          // 3. Add timeline comment with full specification
          let textComment = `📋 СПЕЦИФИКАЦИЯ К СДЕЛКЕ: ${projectName}\n`;
          textComment += `─────────────────────────────────────────\n`;
          textComment += `💰 Итоговая сумма заказа: ${totalPrice.toLocaleString("ru-RU")} ₽\n\n`;

          if (summaryRows && summaryRows.length > 0) {
            textComment += `СОСТАВ ПРОЕКТА И СМЕТА:\n`;
            textComment += `─────────────────────────────────────────\n`;

            summaryRows.forEach((row: any, idx: number) => {
              const rowName = row.name || "Позиция спецификации";
              const qty = row.qty !== undefined ? row.qty : 1;
              const unit = row.unit || row.measure || "шт";
              const price = row.price ? Math.round(row.price) : 0;
              const rowTotal = row.total !== undefined ? Math.round(row.total) : Math.round(price * qty);

              textComment += `${idx + 1}. ${rowName}\n`;
              textComment += `   Количество: ${qty} ${unit} | Цена: ${price.toLocaleString("ru-RU")} ₽ | Сумма: ${rowTotal.toLocaleString("ru-RU")} ₽\n\n`;
            });

            textComment += `─────────────────────────────────────────\n`;
            textComment += `ВСЕГО ПО СПЕЦИФИКАЦИИ: ${totalPrice.toLocaleString("ru-RU")} ₽\n`;
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

export const registerBitrix24Placement = async (): Promise<{ success: boolean; message: string }> => {
  if (!window.BX24) {
    return { success: false, message: "Окружение Битрикс24 не найдено. Откройте приложение внутри Битрикс24." };
  }

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  return new Promise((resolve) => {
    try {
      window.BX24.callMethod(
        "placement.bind",
        {
          PLACEMENT: "CRM_DEAL_DETAIL_TAB",
          HANDLER: appUrl,
          TITLE: "Калькулятор Мебели",
          DESCRIPTION: "Расчет стоимости мебели и материалов",
        },
        (res: any) => {
          if (res.error()) {
            console.error("BX24 placement.bind error:", res.error());
            resolve({
              success: false,
              message: `Ошибка регистрации вкладки: ${res.error()}`,
            });
          } else {
            resolve({
              success: true,
              message: "Вкладка «Калькулятор Мебели» успешно зарегистрирована в Сделках CRM!",
            });
          }
        }
      );
    } catch (err: any) {
      resolve({
        success: false,
        message: err.message || "Ошибка при вызове placement.bind",
      });
    }
  });
};
