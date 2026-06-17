import React, { useState, useEffect } from 'react';
import { X, Loader2, Send } from 'lucide-react';

export const TransferProjectModal = ({
  project,
  companyId,
  companyEmployees,
  onClose,
  showAlert,
  onConfirm
}: {
  project: any;
  companyId: string;
  companyEmployees: any[];
  onClose: () => void;
  showAlert: (title: string, message: string) => void;
  onConfirm: (targetUserId: string) => void;
}) => {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-gray-50 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-gray-900">Передать проект "{project.name}"</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mb-6">
          <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Выберите сотрудника</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm text-gray-900"
          >
            <option value="">Не выбран</option>
            {companyEmployees.map((emp, index) => (
              <option key={emp.uid || index} value={emp.uid} className="text-gray-900">
                {emp.name || emp.displayName || emp.email || "Без имени"}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            if (!selectedUserId) return;
            setIsLoading(true);
            onConfirm(selectedUserId);
          }}
          disabled={!selectedUserId || isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Передать"}
        </button>
      </div>
    </div>
  );
};
