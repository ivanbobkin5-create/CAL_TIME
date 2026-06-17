import React, { useState, useEffect, useMemo } from 'react';
import { X, ExternalLink, Loader2, Send, Settings, Link } from 'lucide-react';
import { cn } from "../../lib/utils";

export const Bitrix24Modal = ({
  project,
  companyId,
  userId,
  onClose,
  showAlert,
}: {
  project: any;
  companyId: string;
  userId?: string;
  onClose: () => void;
  showAlert: (title: string, message: string) => void;
}) => {
  const [mode, setMode] = useState<'link' | 'create'>('create');
  const [dealId, setDealId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [companyType, setCompanyType] = useState<string | null>(null);
  const [currentUserB24Id, setCurrentUserB24Id] = useState<string | null>(null);
  const [associatedProjects, setAssociatedProjects] = useState<any[]>([]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`/api/db/doc/companies/${companyId}`);
        if (response.ok) {
          const data = await response.json();
          setSettings(data.bitrix24 || {});
          setCompanyType(data.companyType || null);
        }
      } catch (e) {
        console.error("Error fetching bitrix settings:", e);
      }
    };
    fetchSettings();
  }, [companyId]);

  useEffect(() => {
    if (!userId) return;
    const fetchUserB24Id = async () => {
      try {
        let res = await fetch(`/api/db/doc/companies/${companyId}/employees/${userId}`);
        if (res.ok) {
          const empData = await res.json();
          if (empData.bitrix24UserId) {
            setCurrentUserB24Id(empData.bitrix24UserId);
            return;
          }
        }
        
        res = await fetch(`/api/db/doc/users/${userId}`);
        if (res.ok) {
          const userData = await res.json();
          if (userData.bitrix24UserId) {
            setCurrentUserB24Id(userData.bitrix24UserId);
          }
        }
      } catch (e) {
        console.error("Error loading user bitrix id:", e);
      }
    };
    fetchUserB24Id();
  }, [userId, companyId]);

  // Load associated projects in case this is a compilation of sets
  useEffect(() => {
    const fetchAssociatedProjects = async () => {
      const pIds = project.projectIds || project.data?.projectIds || [];
      if (pIds.length > 0) {
        try {
          const fetched: any[] = [];
          for (const pId of pIds) {
            const res = await fetch(`/api/db/doc/companies/${companyId}/projects/${pId}`);
            if (res.ok) {
              const pData = await res.json();
              fetched.push({ id: pId, ...pData });
            }
          }
          setAssociatedProjects(fetched);
        } catch (e) {
          console.error("Error fetching associated projects:", e);
        }
      } else {
        setAssociatedProjects([project]);
      }
    };
    fetchAssociatedProjects();
  }, [project, companyId]);

  // Dynamically calculate individual structural sums
  const computedSummary = useMemo(() => {
    let totalMaterialsPrice = 0;
    let totalHardwarePrice = 0;
    let totalServicesPrice = 0;
    let totalDeliveryPrice = 0;
    let totalAssemblyPrice = 0;
    let totalFacadePrice = 0;
    let totalCustomFacadePrice = 0;

    const materials: any[] = [];
    const hardware: any[] = [];
    const services: any[] = [];

    // Fallback direct summary checks
    if (project.summary) {
      return project.summary;
    }
    if (project.data?.summary) {
      return project.data.summary;
    }

    associatedProjects.forEach((p) => {
      if (!p.data) return;
      
      const rows = p.data.summaryRows;
      if (rows && rows.length > 0) {
        rows.forEach((row: any) => {
          const rowNameLower = (row.name || "").toLowerCase();
          if (
            row.type === "product" ||
            row.type === "product_edge" ||
            row.type === "hardware"
          ) {
            if (row.name === "Комплект метизов") {
              totalMaterialsPrice += row.total || 0;
              materials.push({ ...row, projectName: p.name });
            } else {
              totalHardwarePrice += row.total || 0;
              hardware.push({ ...row, projectName: p.name });
            }
          } else if (row.type === "service") {
            if (rowNameLower.includes("доставка")) {
              totalDeliveryPrice += row.total || 0;
            } else if (rowNameLower.includes("сборк") || rowNameLower.includes("монтаж")) {
              totalAssemblyPrice += row.total || 0;
            } else {
              totalServicesPrice += row.total || 0;
              services.push({ ...row, projectName: p.name });
            }
          } else if (row.type === "facade" || rowNameLower.includes("фасад")) {
             if (rowNameLower.includes("заказн")) {
               totalCustomFacadePrice += row.total || 0;
             } else {
               totalFacadePrice += row.total || 0;
             }
             materials.push({ ...row, projectName: p.name });
          } else {
            totalMaterialsPrice += row.total || 0;
            materials.push({ ...row, projectName: p.name });
          }
        });
      } else {
        // Obsolete or fallback schemas calculation
        const results = p.data.results || {};
        const selectedDecor = p.data.selectedDecor || {};

        Object.entries(results).forEach(([key, r]: [string, any]) => {
          totalMaterialsPrice += r.totalPrice || 0;
          materials.push({
            projectName: p.name,
            name: r.name || r.type,
            category: r.category,
            brand: (selectedDecor[key] || "Не указан").split("|")[0],
            decor: (selectedDecor[key] || "Не указан"),
            total: r.totalPrice,
            type: "material"
          });
        });

        (p.data.addedProducts || []).forEach((item: any) => {
          const qty = parseFloat(item.quantity || item.qty || 1) || 1;
          totalHardwarePrice += (item.price || 0) * qty;
          hardware.push({ ...item, qty, projectName: p.name });
        });

        (p.data.addedServices || []).forEach((item: any) => {
          const qty = parseFloat(item.quantity || item.qty || 1) || 1;
          const rowNameLower = (item.name || "").toLowerCase();
          if (rowNameLower.includes("доставка")) {
            totalDeliveryPrice += (item.price || 0) * qty;
          } else if (rowNameLower.includes("сборк") || rowNameLower.includes("монтаж")) {
            totalAssemblyPrice += (item.price || 0) * qty;
          } else {
            totalServicesPrice += (item.price || 0) * qty;
            services.push({ ...item, qty, projectName: p.name });
          }
        });

        const serviceData = p.data.serviceData || {};
        totalDeliveryPrice += serviceData.deliveryPrice || 0;
        if (serviceData.assemblyPrice) {
          totalAssemblyPrice += serviceData.assemblyPrice;
        }
      }
    });

    return {
      totalMaterialsPrice,
      totalHardwarePrice,
      totalServicesPrice,
      totalDeliveryPrice,
      totalAssemblyPrice,
      totalFacadePrice,
      totalCustomFacadePrice,
      materials,
      hardware,
      services,
      totalOverall: totalMaterialsPrice + totalHardwarePrice + totalServicesPrice + totalDeliveryPrice + totalAssemblyPrice
    };
  }, [associatedProjects, project]);

  const handleLinkDeal = async () => {
    if (!dealId.trim()) return;
    setIsLoading(true);
    try {
      let cleanDealId = dealId.trim();
      const match = cleanDealId.match(/\/crm\/deal\/details\/(\d+)\/|deal\/(\d+)/);
      if (match) cleanDealId = match[1] || match[2];

      console.log("DEBUG: Linking deal ID:", cleanDealId);

      const collectionName = project.isSet ? "sets" : "projects";
      const response = await fetch(`/api/db/doc/companies/${companyId}/${collectionName}/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: { bitrix24DealId: cleanDealId }
        })
      });

      if (response.ok) {
        showAlert('Успешно', 'Заказ связан со сделкой Bitrix24.');
        onClose();
      } else {
        const errText = await response.text();
        let errMsg = "Ошибка при сохранении связи";
        try {
          const parsed = JSON.parse(errText);
          if (parsed.error) errMsg = parsed.error;
        } catch (_) {
          if (errText) errMsg = errText.substring(0, 150);
        }
        throw new Error(errMsg);
      }
    } catch (e: any) {
      console.error(e);
      showAlert('Ошибка', `Не удалось связать заказ. Попробуйте еще раз. ${e.message ? '(' + e.message + ')' : ''}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewDeal = async () => {
    setIsLoading(true);
    try {
      const mapping = settings?.fieldMappings || {};
      const data = project.data || {};

      // Basic fields for the deal
      const fields: any = {
        TITLE: project.isSet ? `Спецификация комплекта: ${project.name}` : `Спецификация проекта: ${project.name}`,
        CURRENCY_ID: "RUB",
      };

      if (settings?.categoryId) fields.CATEGORY_ID = settings.categoryId;
      if (settings?.stageId) fields.STAGE_ID = settings.stageId;
      if (currentUserB24Id) {
        fields.ASSIGNED_BY_ID = currentUserB24Id;
      }

      const contractNum = project.contractNumber || data.contractNumber || "";
      const contractDt = project.contractDate || data.contractDate || "";
      const readyDt = project.readyDate || data.readyDate || "";
      const totalS = project.totalPrice || data.totalSum || computedSummary.totalOverall || 0;

      // Add comments
      let comments = `Создано из приложения Mebelev.\n`;
      if (contractNum) comments += `Договор №: ${contractNum}\n`;
      if (contractDt) comments += `Дата договора: ${contractDt}\n`;
      if (readyDt) comments += `Дата готовности: ${readyDt}\n`;
      if (data.comment) comments += `Комментарий: ${data.comment}`;
      fields.COMMENTS = comments;

      // Map dynamic fields from Project Data
      if (mapping.contractNumber && contractNum) fields[mapping.contractNumber] = contractNum;
      if (mapping.totalSum && totalS) fields[mapping.totalSum] = totalS;
      if (mapping.contractDate && contractDt) fields[mapping.contractDate] = contractDt;
      if (mapping.readyDate && readyDt) fields[mapping.readyDate] = readyDt;
      
      // Values from structural summary
      if (mapping.hardwareSum && computedSummary.totalHardwarePrice) {
        fields[mapping.hardwareSum] = computedSummary.totalHardwarePrice;
      }
      if (mapping.cabinetSum && computedSummary.totalMaterialsPrice) {
        fields[mapping.cabinetSum] = computedSummary.totalMaterialsPrice;
      }
      if (mapping.facadeSum && computedSummary.totalFacadePrice) {
        fields[mapping.facadeSum] = computedSummary.totalFacadePrice;
      }
      if (mapping.customFacadeSum && computedSummary.totalCustomFacadePrice) {
        fields[mapping.customFacadeSum] = computedSummary.totalCustomFacadePrice;
      }
      if (mapping.assemblySum && computedSummary.totalAssemblyPrice) {
        fields[mapping.assemblySum] = computedSummary.totalAssemblyPrice;
      }
      if (mapping.deliverySum && computedSummary.totalDeliveryPrice) {
        fields[mapping.deliverySum] = computedSummary.totalDeliveryPrice;
      }

      // Calculate new advanced synchronization fields: Product Cost and Expenses
      const parseQty = (qtyStr: any): number => {
        if (typeof qtyStr === 'number') return qtyStr;
        if (!qtyStr) return 0;
        const str = String(qtyStr).trim();
        const match = str.match(/^([\d.,]+)/);
        if (match) {
          return parseFloat(match[1].replace(',', '.')) || 0;
        }
        return 0;
      };

      const getRowPurchaseSum = (row: any) => {
        if (row.total !== undefined) {
          if (row.coef && row.coef > 0) {
            return row.total / row.coef;
          }
          return row.total;
        }
        const qty = parseQty(row.qty);
        const pr = row.rawPrice !== undefined ? row.rawPrice : (row.price || 0);
        return qty * pr;
      };

      // Collate allRows across all associated projects
      const allRows: any[] = [];
      associatedProjects.forEach((p) => {
        if (!p.data) return;
        if (p.data.summaryRows && p.data.summaryRows.length > 0) {
          allRows.push(...p.data.summaryRows.map((row: any) => ({ ...row, _project: p })));
        } else {
          // Build rows from fallback schema
          const results = p.data.results || {};
          const selectedDecor = p.data.selectedDecor || {};
          const facadeType = p.data.facadeType || {};
          const facadeCustomType = p.data.facadeCustomType || {};

          Object.entries(results).forEach(([key, r]: [string, any]) => {
            const decor = selectedDecor[key] || "Не выбран";
            const isFacade = r.type === "Фасад";
            
            allRows.push({
              type: isFacade ? "facade" : "material",
              name: isFacade ? `Фасад (${facadeCustomType[key] || "Пленка"})` : r.name || r.type,
              sub: r.category || "",
              decor: decor,
              qty: r.totalArea ? `${r.totalArea.toFixed(2)} м²` : "1 л.",
              price: r.totalPrice / (r.totalArea || 1), 
              rawPrice: r.totalPrice / (r.totalArea || 1),
              total: r.totalPrice,
              coef: 1.5, 
              _project: p,
              key: key
            });
          });

          (p.data.addedProducts || []).forEach((item: any) => {
            allRows.push({
              type: "product",
              name: item.name,
              sub: item.category || "",
              decor: "-",
              qty: `${item.quantity} шт`,
              price: item.price || 0,
              total: (item.price || 0) * (item.quantity || 1),
              coef: 1,
              _project: p,
              id: item.id
            });
          });
        }
      });

      const isFacadeOrMdfEdge = (row: any) => {
        const parentProj = row._project;
        if (parentProj?.data?.results && row.key && parentProj.data.results[row.key]) {
          const parentMat = parentProj.data.results[row.key];
          if (parentMat.type === "МДФ" || parentMat.type === "Фасад") {
            return true;
          }
        }
        const rowNameL = (row.name || "").toLowerCase();
        const subL = (row.sub || "").toLowerCase();
        const decorL = (row.decor || "").toLowerCase();
        return rowNameL.includes("мдф") || subL.includes("мдф") || decorL.includes("мдф") || rowNameL.includes("фасад") || subL.includes("фасад");
      };

      // 1. Стоимость продукции: (Корпус+Фасады) это сумма без фурнитуры (customer sales price)
      const corpPlusFacadesSum = (computedSummary.totalMaterialsPrice || 0) + (computedSummary.totalFacadePrice || 0) + (computedSummary.totalCustomFacadePrice || 0);

      // 2. Расходы на корпус
      let expenseCorp = 0;
      allRows.forEach((row) => {
        const nameL = (row.name || "").toLowerCase();
        const subL = (row.sub || "").toLowerCase();
        const type = row.type;
        
        const isLdsp = nameL.includes("лдсп") || subL.includes("лдсп");
        const isHdfOrBack = nameL.includes("хдф") || nameL.includes("двп") || nameL.includes("задняя") || subL.includes("задняя");
        const isEdge = type === "edge" || type === "product_edge" || nameL.includes("кромка");
        const isHardwareKit = row.name === "Комплект метизов" || nameL.includes("метиз");

        const belongsToCorp = isLdsp || isHdfOrBack || (isEdge && !isFacadeOrMdfEdge(row)) || (isHardwareKit && (companyType === "Салон" || companyType === "Дизайнер"));
        
        if (belongsToCorp) {
          expenseCorp += getRowPurchaseSum(row);
        }
      });

      // 3. Расходы на фасады (плитные МДФ и кромка к нему)
      let expenseFacades = 0;
      allRows.forEach((row) => {
        const nameL = (row.name || "").toLowerCase();
        const subL = (row.sub || "").toLowerCase();
        const type = row.type;
        
        const isMdf = nameL.includes("мдф") || subL.includes("мдф");
        const isEdge = type === "edge" || type === "product_edge" || nameL.includes("кромка");
        const isFacade = type === "facade" || nameL.includes("фасад");
        const isCustomFacade = isFacade && (nameL.includes("заказн") || nameL.includes("пленка") || nameL.includes("эмаль") || nameL.includes("эмалирован") || subL.includes("заказн") || subL.includes("пленка") || subL.includes("эмаль"));

        const belongsToPlitnyFacades = (isMdf && !isCustomFacade) || (isFacade && !isCustomFacade && !isEdge) || (isEdge && isFacadeOrMdfEdge(row));

        if (belongsToPlitnyFacades) {
          expenseFacades += getRowPurchaseSum(row);
        }
      });

      // 4. Расходы на фасады заказные (сумма закупки м2 из прайс листа)
      let expenseCustomFacades = 0;
      allRows.forEach((row) => {
        const nameL = (row.name || "").toLowerCase();
        const subL = (row.sub || "").toLowerCase();
        const type = row.type;
        
        const isFacade = type === "facade" || nameL.includes("фасад");
        const isCustomFacade = isFacade && (nameL.includes("заказн") || nameL.includes("пленка") || nameL.includes("эмаль") || nameL.includes("эмалирован") || subL.includes("заказн") || subL.includes("пленка") || subL.includes("эмаль"));

        if (isCustomFacade) {
          expenseCustomFacades += getRowPurchaseSum(row);
        }
      });

      // 5. Расходы фурнитура (за исключением столешниц из камня / компактламината и техники)
      let expenseHardware = 0;
      allRows.forEach((row) => {
        const nameL = (row.name || "").toLowerCase();
        const subL = (row.sub || "").toLowerCase();
        const type = row.type;
        
        const isHardwareKit = row.name === "Комплект метизов" || nameL.includes("метиз");
        const isStoneCountertop = nameL.includes("камень") || nameL.includes("компактламинат") || nameL.includes("компакт ламинат") || nameL.includes("компакт-ламинат") || nameL.includes("акрил") || nameL.includes("кварц") || subL.includes("камень") || subL.includes("компактламинат") || subL.includes("компакт ламинат") || subL.includes("компакт-ламинат");
        const isAppliance = nameL.includes("техника") || nameL.includes("духовой") || nameL.includes("варочная") || nameL.includes("вытяжка") || nameL.includes("холодильник") || nameL.includes("посудомойка") || subL.includes("техника");
        
        const isHardwareRow = type === "hardware" || type === "product" || isHardwareKit;

        if (isHardwareRow && !isStoneCountertop && !isAppliance) {
          if (isHardwareKit && (companyType === "Салон" || companyType === "Дизайнер")) {
            return;
          }
          expenseHardware += getRowPurchaseSum(row);
        }
      });

      // 6 & 7. Запас на корпус ДОП ЛИСТЫ & Запас на фасады ДОП ЛИСТЫ
      const reserveCorpExtraSheets = project.reserveCorpExtraSheets || project.data?.reserveCorpExtraSheets || 0;
      const reserveFacadesExtraSheets = project.reserveFacadesExtraSheets || project.data?.reserveFacadesExtraSheets || 0;

      // 8. Расходы столешницы камень/компактламинат
      let expenseStoneCountertops = 0;
      allRows.forEach((row) => {
        const nameL = (row.name || "").toLowerCase();
        const subL = (row.sub || "").toLowerCase();
        
        const isStoneCountertop = nameL.includes("камень") || nameL.includes("компактламинат") || nameL.includes("компакт ламинат") || nameL.includes("компакт-ламинат") || nameL.includes("акрил") || nameL.includes("кварц") || subL.includes("камень") || subL.includes("компактламинат") || subL.includes("компакт ламинат") || subL.includes("компакт-ламинат");
        
        if (isStoneCountertop) {
          expenseStoneCountertops += getRowPurchaseSum(row);
        }
      });

      // 9. Расходы техника
      let expenseAppliances = 0;
      allRows.forEach((row) => {
        const nameL = (row.name || "").toLowerCase();
        const subL = (row.sub || "").toLowerCase();
        
        const isAppliance = nameL.includes("техника") || nameL.includes("духовой") || nameL.includes("варочная") || nameL.includes("вытяжка") || nameL.includes("холодильник") || nameL.includes("посудомойка") || subL.includes("техника");
        
        if (isAppliance) {
          expenseAppliances += getRowPurchaseSum(row);
        }
      });

      // Map everything into fields
      if (mapping.corpPlusFacadesSum && corpPlusFacadesSum) fields[mapping.corpPlusFacadesSum] = Math.round(corpPlusFacadesSum);
      if (mapping.expenseCorp && expenseCorp) fields[mapping.expenseCorp] = Math.round(expenseCorp);
      if (mapping.expenseFacades && expenseFacades) fields[mapping.expenseFacades] = Math.round(expenseFacades);
      if (mapping.expenseCustomFacades && expenseCustomFacades) fields[mapping.expenseCustomFacades] = Math.round(expenseCustomFacades);
      if (mapping.expenseHardware && expenseHardware) fields[mapping.expenseHardware] = Math.round(expenseHardware);
      if (mapping.reserveCorpExtraSheets && reserveCorpExtraSheets) fields[mapping.reserveCorpExtraSheets] = reserveCorpExtraSheets;
      if (mapping.reserveFacadesExtraSheets && reserveFacadesExtraSheets) fields[mapping.reserveFacadesExtraSheets] = reserveFacadesExtraSheets;
      if (mapping.expenseStoneCountertops && expenseStoneCountertops) fields[mapping.expenseStoneCountertops] = Math.round(expenseStoneCountertops);
      if (mapping.expenseAppliances && expenseAppliances) fields[mapping.expenseAppliances] = Math.round(expenseAppliances);

      // Generate Delivery comment detail if delivery is split across multiple products
      let deliveryCommentText = "";
      if (associatedProjects.length > 1) {
        deliveryCommentText = "Доставка разбита по проектам:\n";
        associatedProjects.forEach((p) => {
          let pDelivery = 0;
          if (p.data?.summaryRows) {
            p.data.summaryRows.forEach((row: any) => {
              if (row.type === "service" && (row.name || "").toLowerCase().includes("доставка")) {
                pDelivery += row.total || 0;
              }
            });
          } else {
            const serviceData = p.data?.serviceData || {};
            pDelivery += serviceData.deliveryPrice || 0;
            if (p.data?.addedServices) {
              p.data.addedServices.forEach((item: any) => {
                if ((item.name || "").toLowerCase().includes("доставка")) {
                  const qty = parseFloat(item.quantity || item.qty || 1) || 1;
                  pDelivery += (item.price || 0) * qty;
                }
              });
            }
          }
          deliveryCommentText += `- ${p.name || p.id}: ${pDelivery.toLocaleString()} ₽\n`;
        });
      } else {
        deliveryCommentText = data.comment || project.name || "";
      }

      if (mapping.deliveryComment && deliveryCommentText) {
        fields[mapping.deliveryComment] = deliveryCommentText;
      }

      // Opportunity field
      fields.OPPORTUNITY = totalS;

      console.log("DEBUG: Sending request to Bitrix24 with fields:", fields);

      const response = await fetch("/api/bitrix24/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          method: "crm.deal.add",
          fields: fields
        })
      });
      
      let resData: any;
      try {
        resData = await response.json();
      } catch (jsonErr) {
        throw new Error("Неверный формат ответа от сервера (ожидался JSON)");
      }
      if (resData.result) {
        const collectionName = project.isSet ? "sets" : "projects";
        await fetch(`/api/db/doc/companies/${companyId}/${collectionName}/${project.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: { bitrix24DealId: resData.result }
          })
        });

        showAlert('Успешно', 'Сделка сохранена и связана с Bitrix24.');
        onClose();
      } else {
        throw new Error(resData.error_description || resData.error || "Ошибка создания сделки");
      }
    } catch (e: any) {
      console.error(e);
      showAlert('Ошибка', `Не удалось создать сделку в Bitrix24. ${e.message || ''}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-gray-50 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <div>
            <span className="text-[10px] uppercase font-black tracking-wider text-orange-500 bg-orange-50 px-2.5 py-1 rounded-full">
              Интеграция CRM
            </span>
            <h2 className="text-xl font-black text-gray-900 mt-2 truncate max-w-[340px]">
              {project.name}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-6 py-2">
          {/* Real-time parameters to sync preview */}
          <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-400">
              Передаваемые показатели спецификации
            </h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-white p-3 rounded-xl border border-gray-50">
                <div className="text-gray-400 font-medium">Номер договора</div>
                <div className="font-extrabold text-gray-900 mt-1">
                  {project.contractNumber || project.data?.contractNumber || "—"}
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-50">
                <div className="text-gray-400 font-medium">Сумма договора</div>
                <div className="font-extrabold text-emerald-600 mt-1">
                  {(project.totalPrice || project.data?.totalSum || computedSummary.totalOverall || 0).toLocaleString()} ₽
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-50">
                <div className="text-gray-400 font-medium">Корпус (ЛДСП/ХДФ)</div>
                <div className="font-bold text-gray-800 mt-1">
                  {computedSummary.totalMaterialsPrice.toLocaleString()} ₽
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-50">
                <div className="text-gray-400 font-medium font-bold text-gray-800">Фурнитура</div>
                <div className="font-bold text-gray-800 mt-1">
                  {computedSummary.totalHardwarePrice.toLocaleString()} ₽
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-50">
                <div className="text-gray-400 font-medium">Плитные фасады</div>
                <div className="font-bold text-gray-800 mt-1">
                  {computedSummary.totalFacadePrice.toLocaleString()} ₽
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-50">
                <div className="text-gray-400 font-medium">Заказные фасады</div>
                <div className="font-bold text-gray-800 mt-1">
                  {computedSummary.totalCustomFacadePrice.toLocaleString()} ₽
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-50">
                <div className="text-gray-400 font-medium">Монтаж и сборка</div>
                <div className="font-bold text-gray-800 mt-1">
                  {computedSummary.totalAssemblyPrice.toLocaleString()} ₽
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-50">
                <div className="text-gray-400 font-medium">Доставка</div>
                <div className="font-bold text-gray-800 mt-1">
                  {computedSummary.totalDeliveryPrice.toLocaleString()} ₽
                </div>
              </div>
            </div>
            {associatedProjects.length > 1 && (
              <div className="mt-2 text-[10px] text-orange-600 font-semibold bg-orange-50/50 p-2.5 rounded-xl border border-orange-100">
                Для комплекта доставка разделена индивидуально по {associatedProjects.length} проектам и передается детализированным комментарием!
              </div>
            )}
          </div>

          <div className="flex gap-2 p-1 bg-gray-50 rounded-xl relative">
            <button
              onClick={() => setMode('link')}
              disabled={project.bitrix24DealId}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-xs font-black transition-all",
                mode === 'link' ? "bg-white text-gray-900 shadow-sm border border-gray-100/10" : "text-gray-500 hover:text-gray-800",
                project.bitrix24DealId && "opacity-50 cursor-not-allowed"
              )}
            >
              Связать с существующей
            </button>
            <button
              onClick={() => setMode('create')}
              disabled={project.bitrix24DealId}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-xs font-black transition-all",
                mode === 'create' ? "bg-white text-gray-900 shadow-sm border border-gray-100/10" : "text-gray-500 hover:text-gray-800",
                project.bitrix24DealId && "opacity-50 cursor-not-allowed"
              )}
            >
              Создать новую сделку
            </button>
          </div>

          <div>
            {project.bitrix24DealId ? (
              <div className="bg-green-50/40 p-6 rounded-2xl border border-green-100/60 text-center space-y-4">
                <div className="text-green-800 font-black text-sm">Этот заказ уже связан со сделкой Bitrix24!</div>
                <div className="text-xs text-green-600 font-bold">Идентификатор в CRM: {project.bitrix24DealId}</div>
                {(() => {
                  const bUrl = settings?.webhookUrl?.split('/rest/')[0];
                  if (!bUrl) return null;
                  return (
                    <a 
                      href={`${bUrl}/crm/deal/details/${project.bitrix24DealId}/`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-600 font-extrabold text-xs hover:underline bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100"
                    >
                      Открыть сделку в CRM <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  );
                })()}
                <div className="pt-2 border-t border-green-100/50">
                  <button
                    onClick={async () => {
                      try {
                        const collectionName = project.isSet ? "sets" : "projects";
                        await fetch(`/api/db/doc/companies/${companyId}/${collectionName}/${project.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ data: { bitrix24DealId: null } })
                        });
                        showAlert('Успешно', 'Связь со сделкой удалена.');
                        onClose();
                      } catch (e) {
                        showAlert('Ошибка', 'Не удалось удалить связь со сделкой.');
                      }
                    }}
                    className="text-red-500 hover:text-red-700 text-[10px] font-black tracking-wider uppercase"
                  >
                    Отвязать сделку c Битрикс
                  </button>
                </div>
              </div>
            ) : mode === 'link' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">
                    ID сделки или Ссылка
                  </label>
                  <input
                    type="text"
                    placeholder="Пример: 15478 или ссылка на страницу CRM"
                    value={dealId}
                    onChange={(e) => setDealId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-blue-500 focus:bg-white rounded-xl outline-none font-bold text-xs transition-all"
                  />
                </div>
                <button
                  onClick={handleLinkDeal}
                  disabled={isLoading || !dealId.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                  Связать проект со сделкой
                </button>
              </div>
            ) : (
              <button
                onClick={handleCreateNewDeal}
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Создать новую сделку Битрикс24
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
