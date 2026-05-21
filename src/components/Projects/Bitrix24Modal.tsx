import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Loader2, Send, Settings } from 'lucide-react';
import { cn } from "../../lib/utils";

export const Bitrix24Modal = ({
  project,
  companyId,
  onClose,
  showAlert,
}: {
  project: any;
  companyId: string;
  onClose: () => void;
  showAlert: (title: string, message: string) => void;
}) => {
  const [mode, setMode] = useState<'link' | 'create'>('create');
  const [dealId, setDealId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);

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

      // Add comments
      let comments = `Создано из приложения Mebelev.\n`;
      if (data.contractNumber) comments += `Договор №: ${data.contractNumber}\n`;
      if (data.comment) comments += `Комментарий: ${data.comment}`;
      fields.COMMENTS = comments;

      // Map dynamic fields from Project Data
      if (mapping.contractNumber && data.contractNumber) fields[mapping.contractNumber] = data.contractNumber;
      if (mapping.totalSum && data.totalSum) fields[mapping.totalSum] = data.totalSum;
      if (mapping.contractDate && data.contractDate) fields[mapping.contractDate] = data.contractDate;
      if (mapping.readyDate && data.readyDate) fields[mapping.readyDate] = data.readyDate;
      
      // Values from summary
      if (mapping.hardwareSum && summary.totalHardwarePrice) fields[mapping.hardwareSum] = summary.totalHardwarePrice;
      if (mapping.cabinetSum && summary.totalMaterialsPrice) fields[mapping.cabinetSum] = summary.totalMaterialsPrice;
      if (mapping.facadeSum && summary.totalFacadePrice) fields[mapping.facadeSum] = summary.totalFacadePrice;
      if (mapping.customFacadeSum && summary.totalCustomFacadePrice) fields[mapping.customFacadeSum] = summary.totalCustomFacadePrice;
      if (mapping.deliverySum && summary.totalDeliveryPrice) fields[mapping.deliverySum] = summary.totalDeliveryPrice;
      if (mapping.assemblySum && summary.totalAssemblyPrice) fields[mapping.assemblySum] = summary.totalAssemblyPrice;
      if (mapping.deliveryComment && data.comment) fields[mapping.deliveryComment] = data.comment;

      // Standart opportunity field
      fields.OPPORTUNITY = data.totalSum || 0;

      const response = await fetch("/api/bitrix24/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          method: "crm.deal.add",
          fields
        })
      });
      
      const resData = await response.json();
      if (resData.result) {
        showAlert('Успешно', 'Сделка создана в Bitrix24.');
        onClose();
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
            className={cn("flex-1 py-2 rounded-xl text-sm font-bold", mode === 'link' ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600")}
          >
            Связать с существ.
          </button>
          <button
            onClick={() => setMode('create')}
            className={cn("flex-1 py-2 rounded-xl text-sm font-bold", mode === 'create' ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600")}
          >
            Создать новую
          </button>
        </div>

        {mode === 'link' ? (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Ссылка на сделку в Битрикс24"
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl"
            />
            <button
              onClick={() => { showAlert('В разработке', 'Функционал связки с существующей сделкой будет реализован в следующем обновлении'); onClose(); }}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold"
            >
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
