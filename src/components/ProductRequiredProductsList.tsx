import React from 'react';
import { Check } from 'lucide-react';

export const ProductRequiredProductsList = ({ 
  requiredProducts, 
  catalogProducts,
  selectedIds,
  onToggle,
  customerType,
  getProductCoefficient,
  resolveBrandCoefficient
}: { 
  requiredProducts: any[]; 
  catalogProducts: any[];
  selectedIds?: Set<string>;
  onToggle?: (id: string) => void;
  customerType?: string;
  getProductCoefficient?: any;
  resolveBrandCoefficient?: any;
}) => {
  if (!requiredProducts || requiredProducts.length === 0) return null;

  const isInteractive = onToggle && selectedIds;

  const getItemPriceInfo = (rp: any) => {
    const prod = catalogProducts.find(p => String(p.id) === String(rp.id));
    if (!prod) return { prod: null, unitPrice: 0, totalPrice: 0 };
    
    let coeff = 1;
    if (typeof getProductCoefficient === 'function') {
      coeff = getProductCoefficient(prod, customerType || 'retail', resolveBrandCoefficient);
    } else {
      coeff = prod.coefficient || 1;
    }

    const basePrice = prod.purchasePrice !== undefined ? prod.purchasePrice : (prod.price || 0);
    const unitPrice = Math.round(basePrice * coeff);
    const qty = rp.qty || 1;
    return { prod, unitPrice, totalPrice: unitPrice * qty };
  };

  const totalExtraCost = requiredProducts.reduce((sum, rp) => {
    const isSelected = isInteractive ? selectedIds.has(String(rp.id)) : true;
    if (!isSelected) return sum;
    const { totalPrice } = getItemPriceInfo(rp);
    return sum + totalPrice;
  }, 0);

  return (
    <div className="mt-2.5 p-2.5 bg-blue-50/40 rounded-xl border border-blue-100 shadow-2xs">
      <div className="flex items-center justify-between mb-1.5 gap-1.5">
        <h4 className="text-[9px] font-black uppercase text-blue-800 tracking-wider">
          Сопутствующие
        </h4>
        {totalExtraCost > 0 && (
          <span className="text-[9px] font-extrabold text-blue-700 bg-blue-100/80 px-1.5 py-0.5 rounded whitespace-nowrap">
            +{totalExtraCost.toLocaleString()} ₽
          </span>
        )}
      </div>

      <div className="space-y-1">
        {requiredProducts.map(rp => {
          const { prod, unitPrice, totalPrice } = getItemPriceInfo(rp);
          const isSelected = isInteractive ? selectedIds.has(String(rp.id)) : true;
          
          if (!isInteractive) {
            return (
              <div 
                key={rp.id} 
                className="flex items-center gap-1.5 p-1 text-[10px] text-gray-700 border-b border-blue-50/60 last:border-0 min-w-0"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                <span className="flex-1 truncate font-medium min-w-0" title={prod?.name || 'Товар'}>{prod?.name || 'Товар'}</span>
                <span className="text-[9px] text-gray-500 font-semibold flex-shrink-0">{rp.qty}шт</span>
                <span className="font-bold text-blue-700 ml-1 whitespace-nowrap text-[9px]">
                  +{totalPrice.toLocaleString()} ₽
                </span>
              </div>
            );
          }

          return (
            <button 
              key={rp.id} 
              type="button"
              onClick={() => onToggle!(String(rp.id))}
              className={`w-full flex items-center gap-1.5 p-1 rounded-lg text-[10px] transition-colors min-w-0 ${
                isSelected ? 'bg-white border border-blue-200 text-blue-900 shadow-2xs' : 'text-gray-500 hover:bg-white/60 opacity-70'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
              }`}>
                {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
              </div>
              <span className="flex-1 text-left truncate font-medium min-w-0" title={prod?.name || 'Товар'}>{prod?.name || 'Товар'}</span>
              <span className="text-[9px] text-gray-500 font-semibold flex-shrink-0">{rp.qty}шт</span>
              <span className="font-bold text-blue-700 whitespace-nowrap text-[9px] flex-shrink-0">
                +{totalPrice.toLocaleString()} ₽
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
