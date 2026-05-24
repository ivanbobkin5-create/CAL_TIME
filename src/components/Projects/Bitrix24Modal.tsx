import React, { useState, useEffect } from 'react';
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
  const [currentUserB24Id, setCurrentUserB24Id] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`/api/firebase/doc/companies/${companyId}`);
        if (response.ok) {
          const data = await response.json();
          setSettings(data.bitrix24 || {});
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
        let res = await fetch(`/api/firebase/doc/companies/${companyId}/employees/${userId}`);
        if (res.ok) {
          const empData = await res.json();
          if (empData.bitrix24UserId) {
            setCurrentUserB24Id(empData.bitrix24UserId);
            return;
          }
        }
        
        res = await fetch(`/api/firebase/doc/users/${userId}`);
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

  const handleLinkDeal = async () => {
    if (!dealId.trim()) return;
    setIsLoading(true);
    try {
      // Extract deal ID from URL if necessary
      let cleanDealId = dealId.trim();
      const match = cleanDealId.match(/\/crm\/deal\/details\/(\d+)\/|deal\/(\d+)/);
      if (match) cleanDealId = match[1] || match[2];

      console.log("DEBUG: Linking deal ID:", cleanDealId);

      const response = await fetch(`/api/firebase/doc/companies/${companyId}/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: { bitrix24DealId: cleanDealId }
        })
      });

      if (response.ok) {
        showAlert('Успешно', 'Проект связан со сделкой Bitrix24.');
        onClose();
        // Since we don't have a direct reload, we might want to refresh the page or rely on the parent state
        window.location.reload(); 
      } else {
        throw new Error("Ошибка при сохранении связи");
      }
    } catch (e) {
      console.error(e);
      showAlert('Ошибка', 'Не удалось связать проект. Попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewDeal = async () => {
    setIsLoading(true);
    try {
      const mapping = settings?.fieldMappings || {};
      const data = project.data || {};
      const summary = data.summary || {};

      // Basic fields for the deal
      const fields: any = {
        TITLE: `Проект: ${project.name}`,
        CURRENCY_ID: "RUB",
      };

      if (settings?.categoryId) fields.CATEGORY_ID = settings.categoryId;
      if (settings?.stageId) fields.STAGE_ID = settings.stageId;
      if (currentUserB24Id) {
        fields.ASSIGNED_BY_ID = currentUserB24Id;
      }

      // Add comments
      let comments = `Создано из приложения Mebelev.\n`;
      if (data.contractNumber) comments += `Договор №: ${data.contractNumber}\n`;
      if (data.comment) comments += `Комментарий: ${data.comment}`;
      fields.COMMENTS = comments;

      // Map dynamic fields from Project Data
      if (mapping.contractNumber && (data.contractNumber || project.contractNumber)) fields[mapping.contractNumber] = data.contractNumber || project.contractNumber;
      if (mapping.totalSum && (data.totalSum || project.totalPrice)) fields[mapping.totalSum] = data.totalSum || project.totalPrice;
      if (mapping.contractDate && (data.contractDate || project.contractDate)) fields[mapping.contractDate] = data.contractDate || project.contractDate;
      if (mapping.readyDate && (data.readyDate || project.readyDate)) fields[mapping.readyDate] = data.readyDate || project.readyDate;
      
      // Values from summary
      if (mapping.hardwareSum && summary.totalHardwarePrice) fields[mapping.hardwareSum] = summary.totalHardwarePrice;
      if (mapping.cabinetSum && summary.totalMaterialsPrice) fields[mapping.cabinetSum] = summary.totalMaterialsPrice;
      if (mapping.facadeSum && (summary.totalFacadePrice || summary.totalCustomFacadePrice)) fields[mapping.facadeSum] = (summary.totalFacadePrice || 0) + (summary.totalCustomFacadePrice || 0);
      if (mapping.deliverySum && summary.totalDeliveryPrice) fields[mapping.deliverySum] = summary.totalDeliveryPrice;
      if (mapping.assemblySum && summary.totalAssemblyPrice) fields[mapping.assemblySum] = summary.totalAssemblyPrice;
      if (mapping.deliveryComment && (data.comment || project.name)) fields[mapping.deliveryComment] = data.comment || project.name;

      // Standart opportunity field
      fields.OPPORTUNITY = data.totalSum || project.totalPrice || 0;

      console.log("DEBUG: Sending request to Bitrix24 with fields:", fields);

      const response = await fetch("/api/bitrix24/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          method: "crm.deal.add",
          fields: fields // Wrap as { fields: { ... } } directly
        })
      });
      
      const resData = await response.json();
      if (resData.result) {
        // Save deal ID back to project
        await fetch(`/api/firebase/doc/companies/${companyId}/projects/${project.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: { bitrix24DealId: resData.result }
          })
        });

        showAlert('Успешно', 'Сделка создана в Bitrix24.');
        onClose();
        window.location.reload();
      } else {
        throw new Error(resData.error_description || "Ошибка создания сделки");
      }
    } catch (e) {
      console.error(e);
      showAlert('Ошибка', 'Не удалось создать сделку. Проверьте настройки вебхука в админ-панели и правильность ID полей.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Bitrix24: {project.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('link')}
            disabled={project.bitrix24DealId}
            className={cn("flex-1 py-2 rounded-xl text-sm font-bold", mode === 'link' ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600", project.bitrix24DealId && "opacity-50 cursor-not-allowed")}
          >
            Связать с существ.
          </button>
          <button
            onClick={() => setMode('create')}
            disabled={project.bitrix24DealId}
            className={cn("flex-1 py-2 rounded-xl text-sm font-bold", mode === 'create' ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600", project.bitrix24DealId && "opacity-50 cursor-not-allowed")}
          >
            Создать новую
          </button>
        </div>

        {project.bitrix24DealId ? (
          <div className="bg-green-50 p-6 rounded-2xl border border-green-100 text-center space-y-4">
             <div className="text-green-800 font-bold">Проект уже связан со сделкой</div>
             <div className="text-sm text-green-600">ID сделки: {project.bitrix24DealId}</div>
             {(() => {
                const bUrl = settings?.webhookUrl?.split('/rest/')[0];
                if (!bUrl) return null;
                return (
                  <a 
                    href={`${bUrl}/crm/deal/details/${project.bitrix24DealId}/`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline"
                  >
                    Открыть в Bitrix24 <ExternalLink className="w-4 h-4" />
                  </a>
                );
             })()}
             <button
              onClick={async () => {
                try {
                  await fetch(`/api/firebase/doc/companies/${companyId}/projects/${project.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ data: { bitrix24DealId: null } })
                  });
                  window.location.reload();
                } catch (e) {
                  showAlert('Ошибка', 'Не удалось отвязать сделку');
                }
              }}
              className="block w-full text-xs text-red-500 hover:text-red-700 font-medium"
             >
               Отвязать сделку
             </button>
          </div>
        ) : mode === 'link' ? (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Ссылка на сделку или ID"
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl"
            />
            <button
              onClick={handleLinkDeal}
              disabled={isLoading || !dealId.trim()}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Link className="w-4 h-4" />}
              Связать
            </button>
          </div>
        ) : (
          <button
            onClick={handleCreateNewDeal}
            disabled={isLoading}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <Send className="w-4 h-4" />}
            Создать сделку в Bitrix24
          </button>
        )}
      </div>
    </div>
  );
};
