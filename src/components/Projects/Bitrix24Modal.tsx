import React, { useState } from 'react';
import { X, ExternalLink, Loader2, Send } from 'lucide-react';

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
  const [mode, setMode] = useState<'link' | 'create'>('link');
  const [dealId, setDealId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateNewDeal = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/bitrix24/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          method: "crm.deal.add",
          fields: {
            TITLE: `Проект: ${project.name}`,
            // We'll map fields here based on requirements later
            COMMENT: project.data?.comment || "",
          }
        })
      });
      const data = await response.json();
      if (data.result) {
        showAlert('Успешно', 'Сделка создана в Bitrix24.');
        window.open(`https://your-bitrix24-url/crm/deal/details/${data.result}/`, '_blank');
        onClose();
      } else {
        throw new Error(data.error_description || "Ошибка создания сделки");
      }
    } catch (e) {
      console.error(e);
      showAlert('Ошибка', 'Не удалось создать сделку в Bitrix24');
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
import { cn } from "../../lib/utils";
