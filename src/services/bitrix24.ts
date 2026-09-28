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
  userEmail?: string;
  userName?: string;
  userPhone?: string;
}

let bx24Context: Bitrix24Context = {
  isBitrix24: false,
};

export const initBitrix24 = (): Promise<Bitrix24Context> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      bx24Context = { isBitrix24: false };
      resolve(bx24Context);
      return;
    }

    // Read URL query params fallback
    let urlDomain: string | undefined = undefined;
    let urlPlacement = "";
    let urlPlacementOptions: Record<string, any> = {};
    let urlDealId: number | null = null;
    let isB24Url = false;

    try {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.has("DOMAIN") || searchParams.has("member_id") || searchParams.has("PLACEMENT") || searchParams.has("AUTH_ID")) {
        isB24Url = true;
        urlDomain = searchParams.get("DOMAIN") || undefined;
        urlPlacement = searchParams.get("PLACEMENT") || "";
        const rawOpts = searchParams.get("PLACEMENT_OPTIONS");
        if (rawOpts) {
          try {
            urlPlacementOptions = JSON.parse(rawOpts);
          } catch (_) {}
        }
        if (urlPlacementOptions?.ID) {
          urlDealId = parseInt(String(urlPlacementOptions.ID), 10) || null;
        } else if (urlPlacementOptions?.entityTypeId === 2 && urlPlacementOptions?.entityId) {
          urlDealId = parseInt(String(urlPlacementOptions.entityId), 10) || null;
        } else if (searchParams.get("deal_id")) {
          urlDealId = parseInt(String(searchParams.get("deal_id")), 10) || null;
        }
      }
    } catch (_) {}

    if (!window.BX24) {
      bx24Context = {
        isBitrix24: isB24Url,
        domain: urlDomain,
        placement: urlPlacement,
        placementOptions: urlPlacementOptions,
        dealId: urlDealId,
      };
      resolve(bx24Context);
      return;
    }

    try {
      window.BX24.init(() => {
        let placement = urlPlacement;
        let placementOptions: Record<string, any> = urlPlacementOptions;

        try {
          const info = window.BX24.placement?.info?.() || {};
          if (info.placement) placement = info.placement;
          if (info.options) placementOptions = info.options || {};
        } catch (e) {
          console.warn("Could not read placement info:", e);
        }

        // Detect Deal ID from CRM placement options
        let dealId: number | null = urlDealId;
        if (placementOptions?.ID) {
          dealId = parseInt(String(placementOptions.ID), 10) || null;
        } else if (placementOptions?.entityTypeId === 2 && placementOptions?.entityId) {
          dealId = parseInt(String(placementOptions.entityId), 10) || null;
        } else if (placementOptions?.ENTITY_ID) {
          dealId = parseInt(String(placementOptions.ENTITY_ID), 10) || null;
        }

        let domain: string | undefined = urlDomain;
        try {
          domain = window.BX24.getDomain?.() || urlDomain;
        } catch (e) {}

        bx24Context = {
          isBitrix24: true,
          domain,
          placement,
          placementOptions,
          dealId: dealId || null,
        };

        // Fetch current user info from Bitrix24
        try {
          if (typeof window.BX24.callMethod === 'function') {
            window.BX24.callMethod('user.current', {}, (res: any) => {
              if (res && typeof res.data === 'function') {
                const uData = res.data();
                if (uData) {
                  const email = uData.EMAIL || uData.email;
                  const name = [uData.NAME, uData.LAST_NAME].filter(Boolean).join(' ') || uData.NAME;
                  const phone = uData.WORK_PHONE || uData.PERSONAL_PHONE || uData.PERSONAL_MOBILE;
                  if (email) bx24Context.userEmail = email.trim().toLowerCase();
                  if (name) bx24Context.userName = name.trim();
                  if (phone) bx24Context.userPhone = phone.trim();
                }
              }
              resolve(bx24Context);
            });
          } else {
            resolve(bx24Context);
          }
        } catch (_) {
          resolve(bx24Context);
        }

        // Automatically adjust iframe height inside Bitrix24
        try {
          window.BX24.fitWindow?.();
        } catch (e) {}

        // Handle Bitrix24 Marketplace Installation
        try {
          const isInstallMode = 
            (typeof window.BX24.isInstall === "function" && window.BX24.isInstall()) ||
            window.location.search.includes("INSTALL=Y") ||
            window.location.search.includes("status=L");

          if (isInstallMode && typeof window.BX24.installFinish === "function") {
            console.log("Bitrix24 Marketplace Installation detected. Registering placements and finishing install...");
            const appUrl = typeof window !== "undefined" ? window.location.origin : "";
            window.BX24.callMethod(
              "placement.bind",
              {
                PLACEMENT: "CRM_DEAL_DETAIL_TAB",
                HANDLER: appUrl,
                TITLE: "Калькулятор Мебели",
                DESCRIPTION: "Расчет стоимости мебели и материалов",
              },
              () => {
                window.BX24.callMethod(
                  "placement.bind",
                  {
                    PLACEMENT: "CRM_DEAL_DETAIL_ACTIVITY",
                    HANDLER: appUrl,
                    TITLE: "Мебель План (Виджет)",
                    DESCRIPTION: "Интерактивный виджет производства и расчета мебели",
                  },
                  () => {
                    try {
                      window.BX24.installFinish?.();
                    } catch (_) {}
                  }
                );
              }
            );
          }
        } catch (err) {
          console.warn("Bitrix24 install handling error:", err);
        }

        console.log("Bitrix24 SDK Initialized:", bx24Context);
        resolve(bx24Context);
      });
    } catch (e) {
      console.warn("Bitrix24 init error:", e);
      bx24Context = {
        isBitrix24: isB24Url,
        domain: urlDomain,
        placement: urlPlacement,
        placementOptions: urlPlacementOptions,
        dealId: urlDealId,
      };
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

export const createBitrix24DealForPartnerOrder = async ({
  title,
  opportunity,
  salonName,
  contractNumber,
  details
}: {
  title: string;
  opportunity: number;
  salonName?: string;
  contractNumber?: string;
  details?: string;
}): Promise<{ success: boolean; dealId?: number; message: string }> => {
  if (typeof window === "undefined" || !window.BX24) {
    return { success: false, message: "Окружение Битрикс24 не обнаружено." };
  }

  return new Promise((resolve) => {
    try {
      const commentText = `Заказ от партнера: ${salonName || 'Салон'}\nДоговор: ${contractNumber || 'Б/Н'}\nСумма производства: ${opportunity.toLocaleString()} руб.\n\n${details || ''}`;
      window.BX24.callMethod(
        "crm.deal.add",
        {
          fields: {
            TITLE: title,
            OPPORTUNITY: opportunity,
            CURRENCY_ID: "RUB",
            COMMENTS: commentText,
          }
        },
        (res: any) => {
          if (res.error()) {
            resolve({ success: false, message: res.error().toString() });
          } else {
            const newDealId = res.data();
            resolve({ success: true, dealId: newDealId, message: "Сделка успешно создана!" });
          }
        }
      );
    } catch (e: any) {
      resolve({ success: false, message: e.message || String(e) });
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
      // 1. Register Deal Tab
      window.BX24.callMethod(
        "placement.bind",
        {
          PLACEMENT: "CRM_DEAL_DETAIL_TAB",
          HANDLER: appUrl,
          TITLE: "Калькулятор Мебели",
          DESCRIPTION: "Расчет стоимости мебели и материалов",
        },
        () => {
          // 2. Register Deal Activity Widget (Right Sidebar)
          window.BX24.callMethod(
            "placement.bind",
            {
              PLACEMENT: "CRM_DEAL_DETAIL_ACTIVITY",
              HANDLER: appUrl,
              TITLE: "Мебель План (Виджет)",
              DESCRIPTION: "Интерактивный виджет производства и расчета мебели",
            },
            () => {
              resolve({
                success: true,
                message: "Вкладка сделки и Умный виджет в правой колонке успешно зарегистрированы в Битрикс24!",
              });
            }
          );
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

export const registerBitrix24ActivityWidget = async (): Promise<{ success: boolean; message: string }> => {
  return registerBitrix24Placement();
};
