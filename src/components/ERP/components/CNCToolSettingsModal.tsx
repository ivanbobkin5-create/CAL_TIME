import React, { useState } from 'react';
import { X, Cpu, Plus, Trash2, Save, CheckCircle2 } from 'lucide-react';
import { DEFAULT_CNC_TOOL_MAPPING } from '../utils/cncParser';

interface CNCToolSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolMapping: Record<string, number>;
  onSaveToolMapping: (newMap: Record<string, number>) => void;
}

export const CNCToolSettingsModal: React.FC<CNCToolSettingsModalProps> = ({
  isOpen,
  onClose,
  toolMapping,
  onSaveToolMapping
}) => {
  const [localMap, setLocalMap] = useState<Record<string, number>>(() => ({
    ...DEFAULT_CNC_TOOL_MAPPING,
    ...(toolMapping || {})
  }));

  const [newToolId, setNewToolId] = useState('');
  const [newDiameter, setNewDiameter] = useState('');

  if (!isOpen) return null;

  const handleAddTool = () => {
    if (!newToolId.trim()) return;
    const key = newToolId.trim().toUpperCase().startsWith('T') ? newToolId.trim().toUpperCase() : `T${newToolId.trim()}`;
    const diam = parseFloat(newDiameter) || 8;
    setLocalMap(prev => ({ ...prev, [key]: diam }));
    setNewToolId('');
    setNewDiameter('');
  };

  const handleRemoveTool = (toolId: string) => {
    const copy = { ...localMap };
    delete copy[toolId];
    setLocalMap(copy);
  };

  const handleSave = () => {
    onSaveToolMapping(localMap);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden text-white">

        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Карта инструмента ЧПУ станка</h3>
              <p className="text-xs text-slate-400">Сопоставление номеров T1, T2... с диаметрами сверл</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">

          {/* Add New Tool Form */}
          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
            <span className="text-xs font-bold text-indigo-300 block">Добавить позицию инструмента:</span>
            <div className="grid grid-cols-5 gap-2">
              <input
                type="text"
                placeholder="T105"
                value={newToolId}
                onChange={e => setNewToolId(e.target.value)}
                className="col-span-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <input
                type="number"
                placeholder="Диаметр (мм)"
                value={newDiameter}
                onChange={e => setNewDiameter(e.target.value)}
                className="col-span-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddTool}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tool Map Table */}
          <div className="space-y-1.5 font-mono text-xs">
            {Object.entries(localMap).map(([tId, diam]) => (
              <div
                key={tId}
                className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                    {tId}
                  </span>
                  <span className="text-slate-200 font-bold">Сверло ⌀{diam} мм</span>
                </div>
                <button
                  onClick={() => handleRemoveTool(tId)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Удалить инструмент"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all shadow-md shadow-indigo-600/30 cursor-pointer flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Сохранить карту</span>
          </button>
        </div>

      </div>
    </div>
  );
};
