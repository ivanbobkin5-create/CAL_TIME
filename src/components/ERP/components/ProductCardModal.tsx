import React from 'react';
import { X, Box, Tag, Layers, DollarSign, BarChart2, Package, Check, ExternalLink, MapPin } from 'lucide-react';

export interface ProductCardModalProps {
  product: any | null;
  isOpen: boolean;
  onClose: () => void;
  warehouseLocation?: string | null;
}

export const ProductCardModal: React.FC<ProductCardModalProps> = ({
  product,
  isOpen,
  onClose,
  warehouseLocation
}) => {
  if (!isOpen || !product) return null;

  const category = product.category || product.customCategory || product.type || 'Фурнитура и комплектующие';
  const price = product.price || product.basePrice || product.cost || 0;
  const unit = product.unit || product.uom || 'шт';
  const brand = product.brand || product.manufacturer || product.vendor || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono text-xs font-black">
                  {product.article || 'БЕЗ АРТИКУЛА'}
                </span>
                {brand && (
                  <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-bold">
                    {brand}
                  </span>
                )}
              </div>
              <h3 className="text-base font-black text-white truncate mt-1">
                Карточка товара
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Main Title & Image/Icon */}
          <div className="flex items-start gap-4">
            {product.image || product.imageUrl || product.photo ? (
              <img 
                src={product.image || product.imageUrl || product.photo} 
                alt={product.name} 
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shrink-0 bg-slate-50"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex flex-col items-center justify-center shrink-0">
                <Box className="w-8 h-8 text-slate-400" />
                <span className="text-[9px] font-bold mt-1 text-slate-500">Товар</span>
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {category}
              </div>
              <h4 className="text-sm sm:text-base font-black text-slate-900 leading-snug mt-0.5">
                {product.name}
              </h4>
              {product.description && (
                <p className="text-xs text-slate-600 mt-1 line-clamp-3">
                  {product.description}
                </p>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Артикул товара</div>
              <div className="text-xs sm:text-sm font-mono font-black text-slate-900 mt-0.5">
                {product.article || '—'}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Категория</div>
              <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">
                {category}
              </div>
            </div>

            {price > 0 && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
                <div className="text-[10px] font-bold text-emerald-700 uppercase">Цена в калькуляторе</div>
                <div className="text-sm font-black text-emerald-950 mt-0.5 font-mono">
                  {price.toLocaleString('ru-RU')} ₽ <span className="text-[10px] font-normal text-slate-500">/ {unit}</span>
                </div>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Единица измерения</div>
              <div className="text-xs font-bold text-slate-900 mt-0.5">
                {unit}
              </div>
            </div>

            {warehouseLocation && (
              <div className="col-span-2 p-3.5 rounded-2xl bg-cyan-50/80 border border-cyan-200 text-cyan-950 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-700 shrink-0" />
                  <div>
                    <div className="text-[10px] font-bold uppercase text-cyan-700">Ячейка хранения на складе</div>
                    <div className="text-xs font-black font-mono mt-0.5">{warehouseLocation}</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-cyan-600 text-white font-black text-[10px]">
                  Закреплено
                </span>
              </div>
            )}
          </div>

          {/* Parameters / Attributes if available */}
          {product.parameters && Object.keys(product.parameters).length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                Характеристики
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 divide-y divide-slate-100 text-xs">
                {Object.entries(product.parameters).map(([key, val]: [string, any]) => (
                  <div key={key} className="py-1.5 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                    <span className="text-slate-500">{key}:</span>
                    <span className="font-bold text-slate-800 text-right">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Синхронизировано с базой калькулятора
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
