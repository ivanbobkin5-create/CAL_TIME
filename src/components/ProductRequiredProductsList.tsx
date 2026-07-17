import React from 'react';
import { Check } from 'lucide-react';

export const ProductRequiredProductsList = ({ 
  requiredProducts, 
  catalogProducts,
  selectedIds,
  onToggle 
}: { 
  requiredProducts: any[]; 
  catalogProducts: any[];
  selectedIds?: Set<string>;
  onToggle?: (id: string) => void;
}) => {
  if (!requiredProducts || requiredProducts.length === 0) return null;

  const isInteractive = onToggle && selectedIds;

  return (
    <div className="mt-3 p-3 bg-white rounded-xl border border-blue-100 shadow-sm">
      <h4 className="text-[10px] font-black uppercase text-blue-700 mb-2 tracking-wider">В комплекте:</h4>
      <div className="space-y-1.5">
        {requiredProducts.map(rp => {
          const prod = catalogProducts.find(p => String(p.id) === String(rp.id));
          const isSelected = isInteractive ? selectedIds.has(String(rp.id)) : true;
          
          if (!isInteractive) {
            return (
              <div 
                key={rp.id} 
                className="flex items-center gap-2 p-1.5 text-[11px] text-gray-600 border-b border-gray-50 last:border-0"
              >
                <div className="w-1 h-1 rounded-full bg-blue-300 flex-shrink-0" />
                <span className="flex-1 truncate">{prod?.name || 'Товар'}</span>
                <span className="font-bold text-blue-600">{rp.qty} шт.</span>
              </div>
            );
          }

          return (
            <button 
              key={rp.id} 
              onClick={() => onToggle!(String(rp.id))}
              className={`w-full flex items-center gap-2 p-1.5 rounded-lg text-[11px] transition-colors ${isSelected ? 'bg-blue-50 text-blue-900' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="flex-1 text-left truncate">{prod?.name || 'Товар'}</span>
              <span className="font-bold">{rp.qty} шт.</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
