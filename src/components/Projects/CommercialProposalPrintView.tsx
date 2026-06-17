import React, { useRef, useState, useMemo, useEffect } from "react";
import html2pdf from "html2pdf.js";
import { Download, Loader2, Phone, User, MessageSquare, Send, CheckCircle2, Image as ImageIcon, Briefcase, FileText } from "lucide-react";

export const CommercialProposalPrintView = ({
  projects,
  setData,
  specificationConfig,
  employees: initialEmployees = [],
  catalogProducts = [],
  onClose,
}: {
  projects: any[];
  setData: any;
  specificationConfig?: any;
  employees?: any[];
  catalogProducts?: any[];
  onClose: () => void;
}) => {
  const summary = setData?.summary || {};
  const contentRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [employees, setEmployees] = useState<any[]>(initialEmployees);

  useEffect(() => {
    if (initialEmployees && initialEmployees.length > 0) {
      setEmployees(initialEmployees);
      return;
    }
    const mainProject = projects?.[0];
    const companyId = mainProject?.companyId || specificationConfig?.companyId || "";
    if (!companyId) return;

    fetch(`/api/db/col/companies/${companyId}/employees`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const list = data.map((item: any) => ({
            uid: item.id,
            ...item.data
          }));
          setEmployees(list);
        }
      })
      .catch((err) => console.error("Error loading employees inside proposal print:", err));
  }, [initialEmployees, projects, specificationConfig]);

  // Local document visual toggles (only visible on-screen, not in PDF)
  const [showItemPrices, setShowItemPrices] = useState(true);
  const [showDetailedMaterials, setShowDetailedMaterials] = useState(true);
  const [showDetailedHardware, setShowDetailedHardware] = useState(true);
  const [showSketches, setShowSketches] = useState(true);
  const [showManagerCard, setShowManagerCard] = useState(true);
  const [showCustomIntro, setShowCustomIntro] = useState(true);
  const [showAlternatives, setShowAlternatives] = useState(true);

  // Config variables
  const config = useMemo(() => {
    return {
      title: specificationConfig?.proposalTitle || "Коммерческое предложение",
      intro: specificationConfig?.proposalIntroText || "С удовольствием представляем вам расчет стоимости изготовления изделий по вашему индивидуальному проекту. Мы проработали каждую деталь, подобрали качественные материалы и фурнитуру, чтобы готовый продукт радовал вас долгие годы. Будем рады ответить на ваши вопросы и приступить к реализации!",
      logo: specificationConfig?.companyLogo || "",
      phone: specificationConfig?.companyPhone || "+7 (999) 000-00-00",
      telegram: specificationConfig?.telegramLink || "https://t.me/",
      maxLink: specificationConfig?.maxLink || "https://max.com/",
      showQuantity: specificationConfig?.showMaterialQuantity !== false,
      includes: specificationConfig?.contractSumIncludes ?? {
        materials: true,
        hardware: true,
        services: true,
        delivery: false,
        assembly: false,
      }
    };
  }, [specificationConfig]);

  // Resolve proper delivery and assembly amounts from project serviceData
  const finalDeliveryPrice = useMemo(() => {
    const sumFromProjects = projects?.reduce((sum, p) => sum + (p.data?.serviceData?.deliveryPrice || 0), 0) || 0;
    return sumFromProjects || summary.totalDeliveryPrice || 0;
  }, [projects, summary.totalDeliveryPrice]);

  const finalAssemblyPrice = useMemo(() => {
    const sumFromProjects = projects?.reduce((sum, p) => sum + (p.data?.serviceData?.assemblyPrice || 0), 0) || 0;
    return sumFromProjects || summary.totalAssemblyPrice || 0;
  }, [projects, summary.totalAssemblyPrice]);

  // Find Project Manager
  const managerDetails = useMemo(() => {
    const mainProject = projects?.[0];
    if (!mainProject) return null;
    const employee = employees.find(emp => emp.uid === mainProject.createdBy);
    const employeePhone = employee?.phone || employee?.phoneNumber || employee?.telegram || specificationConfig?.companyPhone || "+7 (999) 000-00-00";
    return {
      name: employee ? (employee.name || employee.displayName || employee.email) : (mainProject.createdByName || "Специалист компании"),
      email: employee?.email || mainProject.createdByEmail || "info@company.ru",
      phone: employeePhone,
      role: "Менеджер проекта"
    };
  }, [projects, employees, specificationConfig]);

  // Contract sum calculation
  const totalSum = useMemo(() => {
    const incl = config.includes;
    return (
      (incl.materials ? ((summary.totalMaterialsPrice || 0) + (summary.totalFacadePrice || 0) + (summary.totalCustomFacadePrice || 0)) : 0) +
      (incl.hardware ? (summary.totalHardwarePrice || 0) : 0) +
      (incl.services ? (summary.totalServicesPrice || 0) : 0) +
      (incl.delivery ? finalDeliveryPrice : 0) +
      (incl.assembly ? finalAssemblyPrice : 0)
    );
  }, [summary, config.includes, finalDeliveryPrice, finalAssemblyPrice]);

  // Alternatives calculation
  const alternatives = useMemo(() => {
    let hardwarePremiumCost = 0;
    let hardwareOptimaCost = 0;
    let hardwareCurrentCost = 0;

    // Iterate through the project's hardware rows to calculate the precise differences based on analogues if available
    if (summary.hardware && summary.hardware.length > 0) {
      summary.hardware.forEach((item: any) => {
        const qty = item.qty || 1;
        const currentItemCost = (item.price || 0) * qty;
        hardwareCurrentCost += currentItemCost;

        // Try to find the product in the catalog to inspect analogs
        const catProd = catalogProducts?.find((cp: any) => 
          String(cp.id) === String(item.productId || item.id) ||
          cp.name?.toLowerCase().trim() === item.name?.toLowerCase().trim()
        );

        let foundPremium = false;
        let foundOptima = false;

        if (catProd && catProd.analogs && catProd.analogs.length > 0) {
          const analogsList = catProd.analogs
            .map((aid: string) => catalogProducts?.find((cp: any) => String(cp.id) === String(aid)))
            .filter(Boolean);

          if (analogsList.length > 0) {
            // Premium is more expensive than current catalog item
            const premiumAnalogs = analogsList.filter((ap: any) => (ap.price || ap.purchasePrice || 0) > (catProd.price || catProd.purchasePrice || 0));
            // Optima is cheaper than current catalog item
            const economyAnalogs = analogsList.filter((ap: any) => (ap.price || ap.purchasePrice || 0) < (catProd.price || catProd.purchasePrice || 0));

            if (premiumAnalogs.length > 0) {
              premiumAnalogs.sort((a, b) => (b.price || 0) - (a.price || 0));
              hardwarePremiumCost += (premiumAnalogs[0].price || 0) * qty;
              foundPremium = true;
            }

            if (economyAnalogs.length > 0) {
              economyAnalogs.sort((a, b) => (a.price || 0) - (b.price || 0));
              hardwareOptimaCost += (economyAnalogs[0].price || 0) * qty;
              foundOptima = true;
            }
          }
        }

        // Fallbacks if no specific analogue matches exist in the DB
        if (!foundPremium) {
          // Standard upgrade to premium (e.g., Boyard to Hettich is +45%)
          hardwarePremiumCost += Math.round(currentItemCost * 1.45);
        }
        if (!foundOptima) {
          // Standard downgrade to base (e.g., Comfort to base Boyard/Firmax is -25%)
          hardwareOptimaCost += Math.round(currentItemCost * 0.75);
        }
      });
    }

    // Calculate differences
    const premiumDiff = hardwarePremiumCost - hardwareCurrentCost;
    const optimaDiff = hardwareCurrentCost - hardwareOptimaCost;

    // Apply to the total sum
    let premiumPrice = totalSum + (premiumDiff > 0 ? premiumDiff : Math.round(totalSum * 0.16));
    let comfortPlusPrice = totalSum;
    let optimaPrice = totalSum - (optimaDiff > 0 ? optimaDiff : Math.round(totalSum * 0.12));

    // Bounds checking to make sure Premium > Comfort Plus > Optima
    if (premiumPrice <= comfortPlusPrice) {
      premiumPrice = Math.round(comfortPlusPrice * 1.16);
    }
    if (optimaPrice >= comfortPlusPrice) {
      optimaPrice = Math.round(comfortPlusPrice * 0.88);
    }

    return {
      premiumPrice,
      comfortPlusPrice,
      optimaPrice
    };
  }, [totalSum, summary.hardware, catalogProducts]);

  const proposalNumber = useMemo(() => {
    if (setData?.contractNumber) return setData.contractNumber;
    const mainProj = projects?.[0];
    return mainProj?.id ? mainProj.id.slice(0, 8).toUpperCase() : "КП-001";
  }, [setData, projects]);

  const proposalDate = useMemo(() => {
    const d = setData?.contractDate ? new Date(setData.contractDate) : new Date();
    return !isNaN(d.getTime()) ? d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : new Date().toLocaleDateString("ru-RU");
  }, [setData]);

  const handleSavePdf = () => {
    if (!contentRef.current) return;
    setIsGeneratingPdf(true);
    
    setTimeout(async () => {
      try {
        const opt = {
          margin:       [6, 6, 6, 6] as [number, number, number, number],
          filename:     `КП_${proposalNumber}.pdf`,
          image:        { type: "jpeg" as const, quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true, allowTaint: true, logging: false },
          jsPDF: {
            unit: "mm" as const,
            format: "a4" as const,
            orientation: "portrait" as const,
          },
        };
        const html2pdfModule = (html2pdf as any).default || html2pdf;
        await html2pdfModule().from(contentRef.current).set(opt).save();
      } catch (err) {
        console.error("PDF generation failed:", err);
        alert(
          "Возникли сложности с автоматической сборкой PDF (такое случается из-за блокировок CORS сторонних картинок во фрейме).\n\n" +
          "Решение: Пожалуйста, воспользуйтесь кнопкой 'Печать КП' и в поле принтера выберите 'Сохранить как PDF'. Это сработает мгновенно и сохранит все картинки, QR-коды и высокое качество верстки!"
        );
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 455);
  };

  const handlePrint = () => {
    window.print();
  };

  // Dynamic helper for presenting hardware descriptions and types elegantly
  const formatHardwareName = (h: any) => {
    const nameLower = (h.name || "").toLowerCase();
    const subLower = (h.sub || "").toLowerCase();
    
    let isHinge = nameLower.includes("петл") || subLower.includes("петл") || nameLower.includes("hinge");
    let isRunner = nameLower.includes("направл") || subLower.includes("направл") || nameLower.includes("runner") || nameLower.includes("ящик") || nameLower.includes("box");
    
    let badge = "";
    let enrichedName = h.name;

    if (isHinge) {
      const withCloser = nameLower.includes("довод") || nameLower.includes("soft") || nameLower.includes("blum") || nameLower.includes("hettich") || nameLower.includes("sensys") || nameLower.includes("clip top") || nameLower.includes("плавн");
      enrichedName = withCloser 
        ? `Петли с доводчиком плавного закрывания` 
        : `Петли мебельные стандартные (без доводчика)`;
      badge = h.name; // Keep the original detailed product brand/code as badge
    } else if (isRunner) {
      const isUndermount = nameLower.includes("скрыт") || nameLower.includes("скрыт. монтажа") || nameLower.includes("tandem") || nameLower.includes("legrabox") || nameLower.includes("movento") || nameLower.includes("actro") || nameLower.includes("quadro") || nameLower.includes("скрытого");
      enrichedName = isUndermount 
        ? `Направляющие ящиков скрытого монтажа с доводчиком` 
        : `Телескопические направляющие ящиков полного выдвижения`;
      badge = h.name;
    }

    return { enrichedName, badge };
  };

  return (
    <div id="kp-modal-container" className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[150] overflow-y-auto flex justify-center p-4 sm:p-6 font-sans print:bg-white print:p-0">
      
      {/* Dynamic styles injected specifically for cleaner browser printing */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide all application shells and sidebars */
          body > * {
            visibility: hidden !important;
          }
          /* Only display our commercial proposal container */
          #kp-modal-container, #kp-modal-container * {
            visibility: visible !important;
          }
          #kp-modal-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            overflow: visible !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #kp-sidebar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #kp-printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            min-height: 0 !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}} />

      {/* ON-SCREEN CONTROL BAR */}
      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-6">
        
        {/* Real-time Document Customizer Sidebar */}
        <div id="kp-sidebar" className="w-full lg:w-80 bg-white rounded-3xl p-6 shadow-2xl h-fit border border-gray-100 flex-shrink-0 animate-in fade-in slide-in-from-left duration-300 print:hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base leading-tight">Настройка бланка</h2>
              <p className="text-[10px] text-gray-400">Индивидуальные опции КП</p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider block border-b pb-1">
              Отображение разделов
            </span>

            <label className="flex items-center gap-3 py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={showCustomIntro}
                onChange={(e) => setShowCustomIntro(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-gray-700">Вводный текст</span>
            </label>

            <label className="flex items-center gap-3 py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={showItemPrices}
                onChange={(e) => setShowItemPrices(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-gray-700">Цены за разделы</span>
            </label>

            <label className="flex items-center gap-3 py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={showDetailedMaterials}
                onChange={(e) => setShowDetailedMaterials(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-gray-700">Материалы изделий</span>
            </label>

            <label className="flex items-center gap-3 py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={showDetailedHardware}
                onChange={(e) => setShowDetailedHardware(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-gray-700">Фурнитура</span>
            </label>

            <label className="flex items-center gap-3 py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={showAlternatives}
                onChange={(e) => setShowAlternatives(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-gray-700">Альтернативные бюджеты</span>
            </label>

            <label className="flex items-center gap-3 py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={showSketches}
                onChange={(e) => setShowSketches(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-gray-700">Эскизы и визуализация</span>
            </label>

            <label className="flex items-center gap-3 py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={showManagerCard}
                onChange={(e) => setShowManagerCard(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-gray-700">Ваш менеджер</span>
            </label>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleSavePdf}
              disabled={isGeneratingPdf}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-md active:scale-95 disabled:scale-100 disabled:opacity-50 text-sm cursor-pointer"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Создание PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Скачать КП
                </>
              )}
            </button>

            {/* Native browser print option */}
            <button
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-md active:scale-95 text-sm cursor-pointer"
            >
              <span>🖨️ Печать / Сохранить в PDF</span>
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all text-sm cursor-pointer"
            >
              Закрыть
            </button>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-100 text-[11px] text-gray-400 space-y-1">
            <p>💡 <span className="font-bold">Совет:</span> Текст КП, логотип компании, контакты и активные ссылки на мессенджеры настраиваются администратором в разделе "Настройки КП" (закладка сверху).</p>
          </div>
        </div>

        {/* PRINTABLE PAGE WRAPPER */}
        <div id="kp-printable-area" className="flex-1 bg-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-gray-100 h-fit max-w-[210mm] overflow-x-auto min-h-[297mm] animate-in fade-in zoom-in-95 duration-300 print:shadow-none print:border-none print:p-0">
          
          {/* THE CAPTURE TARGET */}
          <div ref={contentRef} className="text-gray-800 text-xs leading-relaxed max-w-[190mm]_mx-auto bg-white" style={{ fontFamily: '"Inter", sans-serif' }}>
            
            {/* 1. HEADER HERO BANNER (Title left, Company logo right) */}
            <div className="flex items-center justify-between border-b pb-6 border-gray-100 gap-6">
              <div className="text-left space-y-2 max-w-[65%]">
                <h1 className="text-2xl font-black tracking-tight text-gray-950 uppercase">{config.title}</h1>
                <p className="text-gray-500 text-[11px] font-medium">
                  Код предложения: <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{proposalNumber}</span> от {proposalDate}
                </p>
              </div>

              {/* LOGO ON THE RIGHT */}
              <div className="flex-shrink-0">
                {config.logo ? (
                  <img 
                    src={config.logo} 
                    alt="Company Logo" 
                    className="max-h-20 max-w-[200px] object-contain"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-100 rounded-2xl">
                    <span className="text-xs font-black tracking-widest text-indigo-700 uppercase px-2 py-0.5 bg-white rounded-lg shadow-sm">
                      Mebel
                    </span>
                    <span className="font-sans font-bold text-[10px] text-indigo-900 pr-2">PRO</span>
                  </div>
                )}
              </div>
            </div>

            {/* CONTACT & MESSENGER DETAILS WITH DYNAMIC HIGH-RES QR CODES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-b border-gray-100 items-center justify-between">
              <div className="flex items-center gap-3 text-left bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Телефон для связи</span>
                  <span className="font-extrabold text-gray-900 text-sm">{config.phone}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-6 bg-gray-50/40 p-2.5 rounded-2xl border border-gray-100">
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Связаться в чате</span>
                  <span className="text-[9px] text-gray-400">Наведите камеру смартфона</span>
                </div>
                <div className="flex items-center gap-4">
                  {config.telegram && config.telegram !== "https://t.me/" && (
                    <div className="flex flex-col items-center">
                      <div className="p-1.5 bg-white rounded-lg border border-gray-100 shadow-sm">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=1&data=${encodeURIComponent(config.telegram)}`}
                          alt="Telegram Чат"
                          className="w-11 h-11"
                        />
                      </div>
                      <span className="text-[8px] font-extrabold text-[#229ED9] mt-1">Telegram</span>
                    </div>
                  )}

                  {config.maxLink && config.maxLink !== "https://max.com/" && (
                    <div className="flex flex-col items-center">
                      <div className="p-1.5 bg-white rounded-lg border border-gray-100 shadow-sm">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=1&data=${encodeURIComponent(config.maxLink)}`}
                          alt="Чат Max"
                          className="w-11 h-11"
                        />
                      </div>
                      <span className="text-[8px] font-extrabold text-violet-600 mt-1">Чат Max</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. INTRODUCTORY GREETING */}
            {showCustomIntro && (
              <div className="mt-6 mb-8 p-5 bg-gradient-to-r from-indigo-50/50 to-purple-50/20 rounded-2xl border border-indigo-50/50">
                <p className="text-gray-700 text-xs italic leading-relaxed whitespace-pre-line text-left">
                  {config.intro}
                </p>
              </div>
            )}

            {/* 3. CORE VALUE PROPOSAL GRID (ITEMS BREAKDOWN) */}
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-extrabold uppercase text-[10px] text-gray-400 tracking-wider">
                  Расчет изделий проекта
                </span>
                <span className="text-gray-400 text-[10px]">Валюта расчета: <span className="font-bold text-gray-700">RUB (₽)</span></span>
              </div>

              {projects.map((projectItem, pIdx) => {
                const subSummary = projectItem.data?.summary || {};
                const localMat = subSummary.materials || [];
                const localHdw = subSummary.hardware || [];

                return (
                  <div key={pIdx} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm p-5 space-y-4 break-inside-avoid">
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                      <div className="text-left">
                        <h3 className="font-bold text-gray-900 text-sm">
                          Изделие: {projectItem.name}
                        </h3>
                        <p className="text-[10px] text-gray-400 mt-0.5">Габариты и чертеж согласованы с заказчиком</p>
                      </div>
                      
                      {showItemPrices && (
                        <div className="text-right">
                          <p className="text-[11px] text-gray-400 font-medium">Стоимость изделия</p>
                          <span className="text-sm font-black text-indigo-700">
                            {(projectItem.totalPrice || 0).toLocaleString()} ₽
                          </span>
                        </div>
                      )}
                    </div>

                    {/* CONCISE AND BEAUTIFUL MATERIALS BOX */}
                    {showDetailedMaterials && localMat.length > 0 && (
                      <div className="space-y-2 pt-1 text-left">
                        <span className="font-extrabold text-[10px] text-gray-400 uppercase tracking-widest block mb-1">
                          📋 Используемые материалы
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-1">
                          {localMat.map((m: any, mIdx: number) => {
                            const decor = m.decor && m.decor !== "Не указан" && m.decor !== "-" ? m.decor : "";
                            const sub = m.subType || m.subtype || m.partType || m.sub || "";
                            const qty = m.qty || "";
                            return (
                              <div key={mIdx} className="flex justify-between items-start gap-3 text-gray-700 bg-white hover:bg-gray-50/50 p-2.5 rounded-xl text-xs transition-colors border border-gray-100">
                                <div className="flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-505 bg-indigo-500 mt-1.5 flex-shrink-0" />
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-bold text-gray-800 leading-tight">
                                      {m.name}
                                    </span>
                                    {(decor || sub) && (
                                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                        {decor && <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md font-medium">декор: {decor}</span>}
                                        {sub && <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md font-medium">{sub}</span>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {config.showQuantity && qty && (
                                  <span className="font-bold text-gray-550 bg-gray-50 border border-gray-100 text-gray-600 px-2 py-0.5 rounded-lg text-[10px] whitespace-nowrap self-center font-mono">
                                    {qty}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* DYNAMIC AND ENRICHED HARDWARE BOX */}
                    {showDetailedHardware && localHdw.length > 0 && (
                      <div className="space-y-2 mt-3 pt-3 border-t border-gray-100 text-left">
                        <span className="font-extrabold text-[10px] text-gray-400 uppercase tracking-widest block mb-1">
                          ⚙️ Фурнитура и комплектующие
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-1">
                          {localHdw.map((h: any, hIdx: number) => {
                            const { enrichedName, badge } = formatHardwareName(h);
                            const decor = h.decor && h.decor !== "Не указан" && h.decor !== "-" ? h.decor : "";
                            const qty = h.qty || "";
                            return (
                              <div key={hIdx} className="flex justify-between items-start gap-3 text-gray-700 bg-white hover:bg-gray-50/50 p-2.5 rounded-xl text-xs transition-colors border border-gray-100">
                                <div className="flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-1.5 flex-shrink-0" />
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-bold text-gray-800 leading-tight">
                                      {enrichedName}
                                    </span>
                                    {(decor || badge) && (
                                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                        {decor && <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md font-medium">декор: {decor}</span>}
                                        {badge && <span className="text-[10px] text-pink-650 text-pink-700 bg-pink-50 px-1.5 py-0.5 rounded-md font-medium">{badge}</span>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {qty && (
                                  <span className="font-bold text-pink-600 bg-pink-50 border border-pink-100/50 px-2 py-0.5 rounded-lg text-[10px] whitespace-nowrap self-center font-mono">
                                    {qty}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* LOGISTICS & SERVICE DETAILS CARD */}
            {((config.includes.delivery || finalDeliveryPrice > 0) || (config.includes.assembly || finalAssemblyPrice > 0)) ? (
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 break-inside-avoid">
                {(config.includes.delivery || finalDeliveryPrice > 0) && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2 shadow-sm text-left">
                    <div className="flex justify-between items-center bg-gray-50/60 p-2 rounded-xl">
                      <span className="font-extrabold text-[10px] text-gray-500 uppercase tracking-widest">Доставка и логистика</span>
                      {!config.includes.delivery && (
                        <span className="text-xs font-black text-indigo-700">{(finalDeliveryPrice).toLocaleString()} ₽</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed font-sans px-1 pt-1">
                      Бережная транспортировка на специализированном мебельном автотранспорте в защитной упаковке прямо на адрес клиента.
                    </p>
                    <div className="px-1">
                      {config.includes.delivery ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg font-bold text-[10px] border border-emerald-100 shadow-sm">
                          <span className="w-1 h-1 rounded-full bg-emerald-600" />
                          Включено в стоимость проекта
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-lg font-bold text-[10px] border border-amber-100">
                          Оплачивается отдельно
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {(config.includes.assembly || finalAssemblyPrice > 0) && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2 shadow-sm text-left">
                    <div className="flex justify-between items-center bg-gray-50/60 p-2 rounded-xl">
                      <span className="font-extrabold text-[10px] text-gray-500 uppercase tracking-widest">Сборка и монтаж</span>
                      {!config.includes.assembly && (
                        <span className="text-xs font-black text-indigo-700">{(finalAssemblyPrice).toLocaleString()} ₽</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed font-sans px-1 pt-1">
                      Профессиональная сборка, навес, стяжка модулей и точная регулировка мебельных фасадов и петель для долговечной эксплуатации.
                    </p>
                    <div className="px-1">
                      {config.includes.assembly ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg font-bold text-[10px] border border-emerald-100 shadow-sm">
                          <span className="w-1 h-1 rounded-full bg-emerald-600" />
                          Включено в стоимость проекта
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-lg font-bold text-[10px] border border-amber-100">
                          Оплачивается отдельно
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-8 bg-amber-50/50 rounded-2xl border border-amber-100 p-4 text-left break-inside-avoid shadow-sm flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-850 flex items-center justify-center flex-shrink-0 text-sm">ℹ️</div>
                <div>
                  <p className="text-xs font-bold text-amber-900 mb-0.5">Услуги доставки, подъема и сборки мебели не включены в данный расчет стоимости.</p>
                  <p className="text-[10.5px] text-amber-800 leading-relaxed font-sans">
                    Если вам потребуются логистика и монтажные услуги, обратитесь к вашему менеджеру проекта. Он сделает точный расчет стоимости с учетом дальности и всех особенностей помещения.
                  </p>
                </div>
              </div>
            )}

            {/* 4. BUDGET OPTIMIZATION & DESIGN ALTERNATIVES */}
            {showAlternatives && (
              <div className="mt-8 bg-gray-50/50 rounded-3xl p-6 border border-gray-100 space-y-4 text-left break-inside-avoid shadow-sm">
                <div className="flex items-center gap-2 border-b pb-3 border-gray-100">
                  <FileText className="w-4.5 h-4.5 text-indigo-600" />
                  <div>
                    <h4 className="font-bold text-xs text-gray-900 leading-tight uppercase tracking-wider">Варианты оптимизации бюджета мебели</h4>
                    <p className="text-[10px] text-gray-400">Сравнение стоимости при замене ключевых брендов фурнитуры</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Premium Option */}
                  <div className="bg-white rounded-2xl p-4 space-y-2 border border-gray-200 flex flex-col justify-between hover:border-indigo-200 transition-colors shadow-sm">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-bold text-indigo-600 block font-sans">Вариант «Премиум»</span>
                      <p className="text-lg font-bold font-mono text-gray-800">{(alternatives.premiumPrice).toLocaleString()} ₽</p>
                      <p className="text-[10.5px] text-gray-500 leading-relaxed font-sans pt-1">
                        Премиальная немецкая фурнитура Hettich/Blum с пожизненной гарантией, скрытые направляющие Quadro/Actro плавного скольжения, влагостойкие декоры плит.
                      </p>
                    </div>
                  </div>

                  {/* Comfort Option */}
                  <div className="bg-indigo-950 text-white rounded-2xl p-4 space-y-2 border-2 border-indigo-500/80 relative overflow-hidden flex flex-col justify-between shadow-sm">
                    <div className="absolute top-0 right-0 bg-indigo-600 text-[8px] font-black uppercase text-white px-2.5 py-0.5 rounded-bl-lg">
                      Выбранный
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-bold text-indigo-300 block">Вариант «Комфорт Плюс»</span>
                      <p className="text-lg font-bold font-mono">{(alternatives.comfortPlusPrice).toLocaleString()} ₽</p>
                      <p className="text-[10.5px] text-indigo-100 leading-relaxed font-sans pt-1">
                        Ваш проект с оптимальным балансом цены и надежности. Комплектация фурнитурой DTC/Samet/Boyard Comfort со встроенными доводчиками и мягким амортизатором.
                      </p>
                    </div>
                    <div className="pt-2 border-t border-indigo-900/55 mt-2">
                       <span className="text-[9px] font-bold text-indigo-150 bg-indigo-900/40 px-2 py-0.5 rounded-lg text-emerald-300">Базовый выбор проекта</span>
                    </div>
                  </div>

                  {/* Standard Option */}
                  <div className="bg-white rounded-2xl p-4 space-y-2 border border-gray-200 flex flex-col justify-between hover:border-indigo-200 transition-colors shadow-sm">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-bold text-amber-600 block">Вариант «Оптима»</span>
                      <p className="text-lg font-bold font-mono text-gray-800">{(alternatives.optimaPrice).toLocaleString()} ₽</p>
                      <p className="text-[10.5px] text-gray-500 leading-relaxed font-sans pt-1">
                        Использование надежной фурнитуры Boyard/Firmax с доводчиками в основных зонах, надежные телескопические направляющие ящиков полного выдвижения.
                      </p>
                    </div>
                    <div className="pt-2 border-t border-gray-100 mt-2">
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg font-sans">Выгода до 12% (~{(alternatives.comfortPlusPrice - alternatives.optimaPrice).toLocaleString()} ₽)</span>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* 5. TOTAL EXECUTIVES SUMMARY */}
            <div className="mt-8 bg-indigo-900 text-white rounded-3xl p-6 shadow-md flex justify-between items-center flex-wrap gap-4 break-inside-avoid">
              <div className="space-y-1.5 text-left">
                <span className="text-indigo-200 font-extrabold tracking-widest uppercase text-[10px]">
                  Общие итоги предложения
                </span>
                <p className="text-xl font-extrabold font-sans">
                  Итоговая стоимость проекта:
                </p>
                <div className="text-[10px] text-indigo-200 flex flex-wrap gap-x-3 gap-y-1 font-medium pb-1.5">
                  <span>Материалы: {config.includes.materials ? "Включены" : "Отдельно"}</span>
                  <span>Фурнитура: {config.includes.hardware ? "Включены" : "Отдельно"}</span>
                  <span>Услуги: {config.includes.services ? "Включены" : "Отдельно"}</span>
                  <span>Сборка: {config.includes.assembly ? "Включена" : "Отдельно"}</span>
                  <span>Доставка: {config.includes.delivery ? "Включена" : "Отдельно"}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black text-white tracking-tight">
                  {totalSum.toLocaleString()} ₽
                </span>
                <p className="text-[10px] text-indigo-200">Действительно в течение 14 дней</p>
              </div>
            </div>

            {/* 6. SKETCHES AND VISUALS */}
            {showSketches && projects.some(p => p.sketches && p.sketches.length > 0) && (
              <div className="mt-8 space-y-4 break-inside-avoid text-left">
                <span className="font-extrabold uppercase text-[10px] text-gray-400 tracking-wider block">
                  📸 Эскизы и конструкторские 3D-модели:
                </span>
                <div className="grid grid-cols-1 gap-6 w-full">
                  {projects.flatMap((p: any) => p.sketches || []).map((url: string, index: number) => (
                    <div key={index} className="rounded-2xl overflow-hidden border border-gray-100 shadow-md bg-white p-2 relative flex flex-col items-center justify-center max-w-full">
                      <img 
                        src={url} 
                        alt={`Эскиз ${index + 1}`} 
                        className="w-full h-auto max-h-[520px] object-contain rounded-xl" 
                        referrerPolicy="no-referrer" 
                      />
                      <div className="absolute top-4 left-4 bg-black/60 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest">
                        Эскиз проекта {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. PROJECT MANAGER SIGNATURE PROFILE */}
            {showManagerCard && managerDetails && (
              <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between flex-wrap gap-4 break-inside-avoid">
                <div className="flex items-center gap-4 text-left">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold uppercase text-base shadow-sm">
                    {managerDetails.name.slice(0, 1)}
                  </div>
                  <div>
                    <p className="text-[10px] text-indigo-600 font-black uppercase tracking-wider">{managerDetails.role}</p>
                    <h4 className="font-bold text-gray-900 text-sm">{managerDetails.name}</h4>
                    <p className="text-[11px] text-gray-500 font-semibold font-sans mt-0.5">Телефон: {managerDetails.phone}</p>
                    <p className="text-[10px] text-gray-400 font-sans">Электронная почта: {managerDetails.email}</p>
                  </div>
                </div>

                <div className="text-right bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100 max-w-xs">
                  <span className="text-[9px] uppercase font-bold text-gray-400 block mb-1">Согласование проекта</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-[10px] text-emerald-800 font-bold">Параметры подтверждены</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
};
