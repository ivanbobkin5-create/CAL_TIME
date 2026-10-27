import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Check, Sparkles, X, Layers } from 'lucide-react';
import { LDSP_DATABASE } from '../../../constants';

export const EDGE_BRANDS = [
  'Rehau',
  'Galoplast',
  'Egger',
  'Kantenwelt',
  'Evosoft',
  'Kronospan',
  'Lamarty',
  'Nordeco',
  'Все бренды'
];

interface EdgeDecorSelectorProps {
  selectedBrand: string;
  onBrandChange: (brand: string) => void;
  decorValue: string;
  onDecorChange: (decor: string) => void;
  catalogMaterials?: Record<string, string[]>;
  catalogProducts?: any[];
  orderEdges?: { name: string; totalMeters?: number }[];
  placeholder?: string;
  required?: boolean;
}

export const EdgeDecorSelector: React.FC<EdgeDecorSelectorProps> = ({
  selectedBrand,
  onBrandChange,
  decorValue,
  onDecorChange,
  catalogMaterials = {},
  catalogProducts = [],
  orderEdges = [],
  placeholder = 'Начните вводить декор или название (например: U702, Кашемир)...',
  required = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Collect all available decors from catalogMaterials, LDSP_DATABASE, catalogProducts, orderEdges
  const availableDecors = useMemo(() => {
    const list: { brand: string; decor: string; source: string }[] = [];
    const seen = new Set<string>();

    const addDecor = (brand: string, decorStr: string, source: string) => {
      if (!decorStr) return;
      const clean = decorStr.trim();
      if (!clean) return;
      const key = `${brand.toLowerCase()}:${clean.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      list.push({ brand, decor: clean, source });
    };

    // 1. Current Order Edges (High Priority)
    orderEdges.forEach(e => {
      addDecor(selectedBrand || 'Заказ', e.name, 'Из файла Бирок заказа');
    });

    // 2. catalogMaterials
    Object.entries(catalogMaterials).forEach(([brand, decors]) => {
      if (Array.isArray(decors)) {
        decors.forEach(d => addDecor(brand, d, 'Каталог материалов'));
      }
    });

    // 3. LDSP_DATABASE
    Object.entries(LDSP_DATABASE).forEach(([brand, decors]) => {
      if (Array.isArray(decors)) {
        decors.forEach(d => addDecor(brand, d, 'База декоров'));
      }
    });

    // 4. catalogProducts
    catalogProducts.forEach(p => {
      if (p.category === 'Кромочные материалы' || p.category === 'Кромка' || p.decor) {
        const b = p.brand || 'Кромка';
        const d = p.decor || p.name;
        addDecor(b, d, 'Каталог товаров');
      }
    });

    return list;
  }, [catalogMaterials, catalogProducts, orderEdges, selectedBrand]);

  // Filter decors based on brand & searchQuery
  const filteredSuggestions = useMemo(() => {
    const q = decorValue.trim().toLowerCase();
    
    return availableDecors.filter(item => {
      // Brand filter
      if (selectedBrand && selectedBrand !== 'Все бренды') {
        const bMatch = item.brand.toLowerCase() === selectedBrand.toLowerCase();
        // Allow cross-match if brand is closely related
        if (!bMatch && item.source !== 'Из файла Бирок заказа' && item.source !== 'База декоров') {
          return false;
        }
      }

      if (!q) return true; // Show top recommendations when query is empty

      return (
        item.decor.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q)
      );
    }).slice(0, 18);
  }, [availableDecors, selectedBrand, decorValue]);

  const handleSelectDecor = (item: { brand: string; decor: string }) => {
    // Format full decor name cleanly if needed
    onDecorChange(item.decor);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2.5 relative" ref={dropdownRef}>
      {/* Brand selector pills */}
      <div>
        <label className="block text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
          <span>Бренд кромки *</span>
          <span className="text-[10px] text-indigo-600 font-normal">из Мебельного Калькулятора</span>
        </label>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {EDGE_BRANDS.map(b => {
            const isActive = selectedBrand === b;
            return (
              <button
                key={b}
                type="button"
                onClick={() => {
                  onBrandChange(b);
                  setIsOpen(true);
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {b}
              </button>
            );
          })}
        </div>
      </div>

      {/* Autocomplete Input */}
      <div className="relative">
        <label className="block text-[11px] font-bold text-slate-700 mb-1">
          Декор / Наименование кромки *
        </label>
        <div className="relative">
          <input
            type="text"
            required={required}
            value={decorValue}
            onChange={(e) => {
              onDecorChange(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />

          {decorValue && (
            <button
              type="button"
              onClick={() => onDecorChange('')}
              className="absolute right-2.5 top-2.5 p-0.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown overlay */}
        {isOpen && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in-50 zoom-in-95">
            <div className="p-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                Декоры {selectedBrand ? `(${selectedBrand})` : ''}
              </span>
              <span>{filteredSuggestions.length} найдено</span>
            </div>

            {filteredSuggestions.length === 0 ? (
              <div className="p-3 text-xs text-slate-500 text-center font-medium">
                Декор не найден. Вы можете ввести название вручную.
              </div>
            ) : (
              filteredSuggestions.map((item, idx) => {
                const isSelected = decorValue === item.decor;
                return (
                  <button
                    key={`${item.brand}-${item.decor}-${idx}`}
                    type="button"
                    onClick={() => handleSelectDecor(item)}
                    className={`w-full p-2.5 text-left text-xs flex items-center justify-between gap-2 hover:bg-indigo-50/80 transition-colors cursor-pointer ${
                      isSelected ? 'bg-indigo-50 text-indigo-900 font-extrabold' : 'text-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 flex-wrap">
                        <span>{item.decor}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        Бренд: <strong className="text-slate-600">{item.brand}</strong> • {item.source}
                      </div>
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
