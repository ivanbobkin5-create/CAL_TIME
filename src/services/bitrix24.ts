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
                    window.BX24.callMethod(
                      "placement.bind",
                      {
                        PLACEMENT: "LEFT_MENU",
                        HANDLER: appUrl,
                        TITLE: "Заказы от партнеров",
                        DESCRIPTION: "Входящие заказы от салонов и фабрик",
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
              // 3. Register Left Menu Item
              window.BX24.callMethod(
                "placement.bind",
                {
                  PLACEMENT: "LEFT_MENU",
                  HANDLER: appUrl,
                  TITLE: "Заказы от партнеров",
                  DESCRIPTION: "Входящие партнерские заказы мебели от салонов"
                },
                () => {
                  resolve({
                    success: true,
                    message: "Вкладка сделки, Умный виджет и пункт в Левом меню успешно зарегистрированы в Битрикс24!",
                  });
                }
              );
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

// --- Уведомления в колокольчик и чат Битрикс24 (im.notify / im.message) ---

export interface SendBitrix24NotificationParams {
  companyId?: string;
  dealId?: number | string | null;
  userId?: number | string | null;
  message: string;
  type?: 'system' | 'personal' | 'chat';
  tag?: string;
}

export const getBitrix24DealResponsible = async (dealId: number): Promise<{ id: number | null; name?: string }> => {
  if (typeof window === "undefined" || !window.BX24) return { id: null };
  return new Promise((resolve) => {
    try {
      window.BX24.callMethod("crm.deal.get", { id: dealId }, (res: any) => {
        if (res.error()) {
          resolve({ id: null });
        } else {
          const data = res.data() || {};
          const assignedId = data.ASSIGNED_BY_ID ? parseInt(String(data.ASSIGNED_BY_ID), 10) : null;
          resolve({ id: assignedId });
        }
      });
    } catch (_) {
      resolve({ id: null });
    }
  });
};

export const sendBitrix24BellNotification = async ({
  companyId,
  dealId,
  userId,
  message,
  type = 'system',
  tag
}: SendBitrix24NotificationParams): Promise<{ success: boolean; message: string; recipientUserId?: number | string }> => {
  // If running inside Bitrix24 iframe
  if (typeof window !== "undefined" && window.BX24) {
    let targetUserId = userId;

    if (!targetUserId && dealId) {
      const resp = await getBitrix24DealResponsible(Number(dealId));
      if (resp.id) targetUserId = resp.id;
    }

    if (!targetUserId) {
      targetUserId = bx24Context.placementOptions?.userId || null;
    }

    if (!targetUserId) {
      // Fallback: request via backend proxy
      try {
        const res = await fetch("/api/bitrix24/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, dealId, userId, message, type, tag })
        });
        const json = await res.json();
        return json;
      } catch (err: any) {
        return { success: false, message: err.message || "Не удалось отправить уведомление" };
      }
    }

    return new Promise((resolve) => {
      try {
        const method = type === 'chat' 
          ? 'im.message.add' 
          : (type === 'personal' ? 'im.notify.personal.add' : 'im.notify.system.add');

        const params: any = type === 'chat' 
          ? { DIALOG_ID: targetUserId, MESSAGE: message }
          : {
              USER_ID: targetUserId,
              MESSAGE: message,
              TAG: tag || `MEBEL_PLAN_${dealId || 'GENERAL'}_${Date.now()}`
            };

        window.BX24.callMethod(method, params, (res: any) => {
          if (res.error()) {
            console.warn(`BX24 ${method} error:`, res.error());
            resolve({ success: false, message: res.error().toString() });
          } else {
            resolve({
              success: true,
              recipientUserId: targetUserId,
              message: "Уведомление успешно доставлено в колокольчик Битрикс24!"
            });
          }
        });
      } catch (e: any) {
        resolve({ success: false, message: e.message || String(e) });
      }
    });
  }

  // Outside Bitrix24 iframe: Call backend proxy with stored webhook
  try {
    const res = await fetch("/api/bitrix24/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, dealId, userId, message, type, tag })
    });
    const json = await res.json();
    return json;
  } catch (e: any) {
    return { success: false, message: e.message || "Ошибка соединения с сервером" };
  }
};

export const sendBitrix24ChatMessage = async (
  dialogId: number | string,
  message: string,
  companyId?: string
): Promise<{ success: boolean; message: string }> => {
  return sendBitrix24BellNotification({
    companyId,
    userId: dialogId,
    message,
    type: 'chat'
  });
};

// --- Прием фотоотчета монтажа в таймлайн Битрикс24 ---

export interface PhotoReportPayload {
  companyId?: string;
  webhookUrl?: string;
  dealId: number | string;
  installerName: string;
  installerPhone?: string;
  status: 'completed' | 'with_remarks' | 'in_progress';
  comment?: string;
  checklist?: Record<string, boolean>;
  photos?: Array<{ name: string; url?: string; base64?: string; category?: string }>;
  notifyResponsible?: boolean;
}

export const submitBitrix24PhotoReport = async (
  payload: PhotoReportPayload
): Promise<{ success: boolean; message: string; reportId?: string; commentId?: number }> => {
  try {
    // 1. If inside BX24, we can post directly to timeline and notify manager
    if (typeof window !== "undefined" && window.BX24) {
      const nowStr = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });
      const statusLabels: Record<string, string> = {
        completed: "✅ Монтаж завершен успешно",
        with_remarks: "⚠️ Монтаж завершен с замечаниями",
        in_progress: "⏳ Монтаж в процессе (промежуточный отчет)"
      };
      const statusTitle = statusLabels[payload.status] || "📸 Фотоотчет монтажа";

      let timelineText = `📸 ФОТООТЧЕТ МОНТАЖА МЕБЕЛИ\n`;
      timelineText += `─────────────────────────────────────────\n`;
      timelineText += `🏷️ Статус: ${statusTitle}\n`;
      timelineText += `📅 Дата и время: ${nowStr} (МСК)\n`;
      timelineText += `👷 Монтажник: ${payload.installerName || "Монтажная бригада"}${payload.installerPhone ? ` (${payload.installerPhone})` : ""}\n\n`;

      if (payload.checklist && Object.keys(payload.checklist).length > 0) {
        timelineText += `📋 ЧЕК-ЛИСТ ПРИЕМКИ:\n`;
        const checklistTitles: Record<string, string> = {
          level: "Уровень и геометрия конструкции",
          hardware: "Регулировка петель, фасадов и доводчиков",
          appliances: "Врезка и герметизация техники/мойки",
          cleanliness: "Уборка рабочего места, снятие пленок",
          actSigned: "Подписан акт приема-передачи клиентом"
        };
        for (const [k, v] of Object.entries(payload.checklist)) {
          const title = checklistTitles[k] || k;
          timelineText += `  ${v ? "✔" : "✖"} ${title}: ${v ? "Выполнено" : "Не выполнено"}\n`;
        }
        timelineText += `\n`;
      }

      if (payload.comment) {
        timelineText += `📝 КОММЕНТАРИЙ МОНТАЖНИКА:\n${payload.comment}\n\n`;
      }

      if (payload.photos && payload.photos.length > 0) {
        timelineText += `📷 ФОТОГРАФИИ ОБЪЕКТА (${payload.photos.length} шт.):\n`;
        payload.photos.forEach((photo, idx) => {
          const pName = photo.name || photo.category || `Фото ${idx + 1}`;
          const pUrl = photo.url || `[Фото #${idx + 1} прикреплено к отчету]`;
          timelineText += `  ${idx + 1}. ${pName}: ${pUrl}\n`;
        });
        timelineText += `\n`;
      }

      timelineText += `─────────────────────────────────────────\n`;
      timelineText += `Отправлено через Мебель План • ERP & Монтаж`;

      // Call crm.timeline.comment.add directly
      await new Promise<void>((resolve) => {
        window.BX24.callMethod(
          "crm.timeline.comment.add",
          {
            fields: {
              ENTITY_ID: payload.dealId,
              ENTITY_TYPE: "deal",
              COMMENT: timelineText
            }
          },
          (res: any) => {
            if (res.error()) {
              console.warn("BX24 timeline comment error:", res.error());
            }
            resolve();
          }
        );
      });

      // Send bell notification to responsible manager
      if (payload.notifyResponsible !== false) {
        const resp = await getBitrix24DealResponsible(Number(payload.dealId));
        if (resp.id) {
          const bellMsg = `📸 [b]Фотоотчет монтажа по сделке #{payload.dealId}[/b]!\nМонтажник: [b]${payload.installerName}[/b].\nСтатус: ${statusTitle}.\nОтчет добавлен в таймлайн сделки!`;
          await sendBitrix24BellNotification({
            userId: resp.id,
            dealId: payload.dealId,
            message: bellMsg
          });
        }
      }
    }

    // Always mirror to backend to persist records and support webhook sync
    const res = await fetch("/api/bitrix24/timeline/photo-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("Error submitting photo report:", err);
    return { success: false, message: err.message || "Ошибка отправки фотоотчета" };
  }
};

// --- Прием рекламаций в таймлайн Битрикс24 ---

export interface ReclamationPayload {
  companyId?: string;
  webhookUrl?: string;
  dealId: number | string;
  reclamationType: string;
  partName: string;
  priority: 'critical' | 'high' | 'normal';
  department?: string;
  applicantName?: string;
  applicantPhone?: string;
  description: string;
  requiredAction?: string;
  photos?: Array<{ name: string; url?: string; base64?: string }>;
  createTask?: boolean;
  notifyResponsible?: boolean;
}

export const submitBitrix24Reclamation = async (
  payload: ReclamationPayload
): Promise<{ success: boolean; message: string; reclamationId?: string; commentId?: number; taskId?: number }> => {
  try {
    // 1. If inside BX24, we can post directly to timeline, create task and notify
    if (typeof window !== "undefined" && window.BX24) {
      const nowStr = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });
      const priorityBadges: Record<string, string> = {
        critical: "🔴 КРИТИЧНО (СТОП МОНТАЖА)",
        high: "🟡 ВЫСОКИЙ (ДО СДАЧИ ОБЪЕКТА)",
        normal: "🟢 СТАНДАРТНЫЙ (ГАРАНТИЙНЫЙ СЛУЧАЙ)"
      };
      const priorityLabel = priorityBadges[payload.priority] || "⚠️ ВЫСОКИЙ";

      let timelineText = `🚨 РЕКЛАМАЦИЯ / ПРЕТЕНЗИЯ ПО СДЕЛКЕ #${payload.dealId}\n`;
      timelineText += `─────────────────────────────────────────\n`;
      timelineText += `⚠️ Срочность: ${priorityLabel}\n`;
      timelineText += `🛠️ Тип проблемы: ${payload.reclamationType}\n`;
      if (payload.partName) timelineText += `📦 Элемент/Деталь: ${payload.partName}\n`;
      if (payload.department) timelineText += `🏭 Виновный отдел/этап: ${payload.department}\n`;
      timelineText += `👤 Заявитель: ${payload.applicantName || "Монтажник"}${payload.applicantPhone ? ` (${payload.applicantPhone})` : ""}\n`;
      timelineText += `📅 Дата регистрации: ${nowStr} (МСК)\n\n`;

      if (payload.description) {
        timelineText += `📝 ОПИСАНИЕ ДЕФЕКТА:\n${payload.description}\n\n`;
      }

      if (payload.requiredAction) {
        timelineText += `⚡ ТРЕБУЕМОЕ ДЕЙСТВИЕ:\n${payload.requiredAction}\n\n`;
      }

      if (payload.photos && payload.photos.length > 0) {
        timelineText += `📷 ФОТОГРАФИИ ДЕФЕКТА (${payload.photos.length} шт.):\n`;
        payload.photos.forEach((photo, idx) => {
          const pName = photo.name || `Дефект #${idx + 1}`;
          const pUrl = photo.url || `[Фото дефекта #${idx + 1}]`;
          timelineText += `  ${idx + 1}. ${pName}: ${pUrl}\n`;
        });
        timelineText += `\n`;
      }

      timelineText += `─────────────────────────────────────────\n`;
      timelineText += `Зафиксировано через Мебель План • Контроль качества`;

      // Call crm.timeline.comment.add directly
      await new Promise<void>((resolve) => {
        window.BX24.callMethod(
          "crm.timeline.comment.add",
          {
            fields: {
              ENTITY_ID: payload.dealId,
              ENTITY_TYPE: "deal",
              COMMENT: timelineText
            }
          },
          (res: any) => {
            if (res.error()) {
              console.warn("BX24 timeline comment error:", res.error());
            }
            resolve();
          }
        );
      });

      // Get responsible manager
      const resp = await getBitrix24DealResponsible(Number(payload.dealId));

      // Create Task in CRM if requested
      if (payload.createTask !== false) {
        try {
          const deadline = new Date();
          if (payload.priority === "critical") {
            deadline.setHours(deadline.getHours() + 24);
          } else {
            deadline.setDate(deadline.getDate() + 3);
          }

          window.BX24.callMethod(
            "tasks.task.add",
            {
              fields: {
                TITLE: `🚨 Рекламация по сделке #${payload.dealId}: ${payload.partName || payload.reclamationType}`,
                DESCRIPTION: `Срочность: ${priorityLabel}\nЗаявитель: ${payload.applicantName || "Монтажник"}\n\nОписание дефекта:\n${payload.description}\n\nТребуемое решение:\n${payload.requiredAction || "Устранить замечания"}\n\nСделка: #${payload.dealId}`,
                RESPONSIBLE_ID: resp.id || undefined,
                DEADLINE: deadline.toISOString(),
                PRIORITY: payload.priority === "critical" ? 2 : 1,
                UF_CRM_TASK: [`D_${payload.dealId}`]
              }
            },
            (resTask: any) => {
              if (resTask.error()) {
                console.warn("BX24 tasks.task.add error:", resTask.error());
              }
            }
          );
        } catch (_) {}
      }

      // Send bell notification to manager
      if (payload.notifyResponsible !== false && resp.id) {
        const bellMsg = `🚨 [b]РЕКЛАМАЦИЯ по сделке #{payload.dealId}![/b]\nСрочность: ${priorityLabel}\nДеталь: [b]${payload.partName || payload.reclamationType}[/b]\nЗаявитель: ${payload.applicantName || "Монтажник"}.\nПроверьте таймлайн сделки!`;
        await sendBitrix24BellNotification({
          userId: resp.id,
          dealId: payload.dealId,
          message: bellMsg
        });
      }
    }

    // Always mirror to backend for persistence & history
    const res = await fetch("/api/bitrix24/timeline/reclamation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("Error submitting reclamation:", err);
    return { success: false, message: err.message || "Ошибка фиксации рекламации" };
  }
};

// --- История таймлайна по сделке (фотоотчеты и рекламации) ---

export const fetchBitrix24TimelineHistory = async (
  companyId: string,
  dealId?: number | string | null
): Promise<{ photoReports: any[]; reclamations: any[] }> => {
  try {
    const url = `/api/bitrix24/timeline/history?companyId=${encodeURIComponent(companyId)}${dealId ? `&dealId=${encodeURIComponent(String(dealId))}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) return { photoReports: [], reclamations: [] };
    const data = await res.json();
    return {
      photoReports: data.photoReports || [],
      reclamations: data.reclamations || []
    };
  } catch (err) {
    console.error("Error fetching timeline history:", err);
    return { photoReports: [], reclamations: [] };
  }
};
