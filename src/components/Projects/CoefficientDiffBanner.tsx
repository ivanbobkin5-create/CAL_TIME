import React, { useState } from 'react';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Info,
  Zap
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CoefficientDiffItem {
  id: string;
  label: string;
  savedVal: number;
  currentVal: number;
  diffPercent: number;
  diffValue: number;
  type: 'increase' | 'decrease';
}

export function normalizeCoefficients(raw: any, customerType: string = 'retail'): Record<string, any> {
  if (!raw) return {};

  let src = raw;
  if (raw[customerType] && typeof raw[customerType] === 'object') {
    src = raw[customerType];
  } else if (raw.retail && typeof raw.retail === 'object') {
    src = raw.retail;
  }

  const getNum = (...vals: any[]) => {
    for (const v of vals) {
      if (typeof v === 'number' && !isNaN(v)) return v;
      if (typeof v === 'string' && !isNaN(parseFloat(v))) return parseFloat(v);
    }
    return undefined;
  };

  const productsSrc: Record<string, number> = {};
  const rawProds = src.products || raw.products || {};
  Object.entries(rawProds).forEach(([k, v]) => {
    const num = getNum(v);
    if (num !== undefined) productsSrc[k] = num;
  });

  Object.entries(src).forEach(([k, v]) => {
    const num = getNum(v);
    if (num !== undefined) {
      if (k.startsWith('cat_')) {
        productsSrc[k.replace('cat_', '')] = num;
      } else if (!['ldsp', 'hdf', 'edge', 'facadeSheet', 'facadeCustom', 'hardware', 'services', 'assembly', 'delivery', 'products', 'retail', 'wholesale', 'designer'].includes(k)) {
        productsSrc[k] = num;
      }
    }
  });

  if (productsSrc["Посудосушитель"]) {
    if (!productsSrc["Посудосушители"]) {
      productsSrc["Посудосушители"] = productsSrc["Посудосушитель"];
    }
    delete productsSrc["Посудосушитель"];
  }

  return {
    ldsp: getNum(src.ldsp, raw.ldsp),
    hdf: getNum(src.hdf, raw.hdf),
    edge: getNum(src.edge, raw.edge),
    facadeSheet: getNum(src.facadeSheet, raw.facadeSheet),
    facadeCustom: getNum(src.facadeCustom, raw.facadeCustom),
    hardware: getNum(src.hardware, raw.hardware),
    products: productsSrc,
  };
}

export function getCoefficientDifferences(savedCoeffs: any, currentCoeffs: any, customerType: string = 'retail'): CoefficientDiffItem[] {
  if (!savedCoeffs || !currentCoeffs) return [];

  const savedNorm = normalizeCoefficients(savedCoeffs, customerType);
  const currentNorm = normalizeCoefficients(currentCoeffs, customerType);

  const diffs: CoefficientDiffItem[] = [];

  const labelsMap: Record<string, string> = {
    ldsp: "ЛДСП",
    hdf: "ХДФ / ДВП",
    edge: "Кромочные материалы",
    facadeSheet: "Фасады плитные",
    facadeCustom: "Фасады заказные",
    hardware: "Фурнитура",
  };

  // 1. Compare base coefficient keys
  Object.keys(labelsMap).forEach((key) => {
    const saved = savedNorm[key];
    const current = currentNorm[key];
    if (typeof saved === 'number' && typeof current === 'number') {
      if (Math.abs(saved - current) >= 0.001) {
        const diffVal = Number((current - saved).toFixed(2));
        const diffPct = Number((((current - saved) / (saved || 1)) * 100).toFixed(1));
        diffs.push({
          id: key,
          label: labelsMap[key],
          savedVal: saved,
          currentVal: current,
          diffPercent: diffPct,
          diffValue: diffVal,
          type: current > saved ? 'increase' : 'decrease',
        });
      }
    }
  });

  // 2. Compare product categories
  const savedProds = savedNorm.products || {};
  const currentProds = currentNorm.products || {};
  const allCategories = Array.from(new Set([...Object.keys(savedProds), ...Object.keys(currentProds)]));

  allCategories.forEach((cat) => {
    const saved = savedProds[cat];
    const current = currentProds[cat];
    if (typeof saved === 'number' && typeof current === 'number') {
      if (Math.abs(saved - current) >= 0.001) {
        const diffVal = Number((current - saved).toFixed(2));
        const diffPct = Number((((current - saved) / (saved || 1)) * 100).toFixed(1));
        diffs.push({
          id: `cat_${cat}`,
          label: `Категория "${cat}"`,
          savedVal: saved,
          currentVal: current,
          diffPercent: diffPct,
          diffValue: diffVal,
          type: current > saved ? 'increase' : 'decrease',
        });
      }
    }
  });

  return diffs;
}

export interface CoefficientDiffBannerProps {
  savedSnapshot?: {
    savedAt?: string;
    coefficients?: any;
    resolvedCoefficients?: any;
    customerType?: string;
  };
  currentCoefficients: any;
  onApplyCurrentCoefficients: () => void;
  onRevertSavedCoefficients?: () => void;
  activeMode?: 'saved' | 'current';
  savedTotal?: number;
  currentTotal?: number;
  className?: string;
  compact?: boolean;
}

export const CoefficientDiffBanner: React.FC<CoefficientDiffBannerProps> = ({
  savedSnapshot,
  currentCoefficients,
  onApplyCurrentCoefficients,
  onRevertSavedCoefficients,
  activeMode = 'saved',
  savedTotal,
  currentTotal,
  className,
  compact = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const customerType = savedSnapshot?.customerType || 'retail';
  const savedCoeffsToCompare = savedSnapshot?.resolvedCoefficients || savedSnapshot?.coefficients;

  // Derive differences
  const diffs = (savedSnapshot && savedCoeffsToCompare && currentCoefficients)
    ? getCoefficientDifferences(savedCoeffsToCompare, currentCoefficients, customerType)
    : [];

  const formattedSavedDate = savedSnapshot?.savedAt
    ? new Date(savedSnapshot.savedAt).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'ранее';

  // Calculate prices for comparison
  const calcSavedTotal = savedTotal || 0;
  const calcCurrentTotal = currentTotal || 0;

  const diffAmount = (calcCurrentTotal > 0 && calcSavedTotal > 0)
    ? calcCurrentTotal - calcSavedTotal
    : undefined;

  const diffPercent = (calcCurrentTotal > 0 && calcSavedTotal > 0)
    ? Number((((calcCurrentTotal - calcSavedTotal) / calcSavedTotal) * 100).toFixed(1))
    : undefined;

  const isCurrentMode = activeMode === 'current';

  // When no diffs exist or price didn't actually change, show reassuring green status block
  if (diffs.length === 0 || Math.abs(calcSavedTotal - calcCurrentTotal) < 1) {
    return (
      <div className={cn(
        "rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 sm:p-4 transition-all duration-200 shadow-2xs",
        className
      )}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-emerald-950">
                Актуальные коэффициенты компании
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-200/70 text-emerald-900 tracking-wider">
                Применены
              </span>
            </div>
            <p className="text-xs text-emerald-800/90 mt-0.5">
              Текущий расчет соответствует актуальной тарифной сетке наценок.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm",
      isCurrentMode 
        ? "bg-emerald-50/80 border-emerald-300/80" 
        : "bg-gradient-to-r from-amber-50 via-orange-50/90 to-amber-50 border-amber-300/80",
      className
    )}>
      {/* Banner Header */}
      <div className={cn("p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4", compact && "p-3 sm:p-4")}>
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div className={cn(
            "p-2.5 rounded-xl flex-shrink-0 shadow-sm mt-0.5",
            isCurrentMode 
              ? "bg-emerald-600 text-white" 
              : "bg-amber-500 text-white animate-pulse"
          )}>
            {isCurrentMode ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={cn(
                "font-black text-sm sm:text-base leading-snug",
                isCurrentMode ? "text-emerald-950" : "text-amber-950"
              )}>
                {isCurrentMode 
                  ? "Применены актуальные коэффициенты компании" 
                  : "Изменились коэффициенты компании!"}
              </h4>
              <span className={cn(
                "text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider shadow-2xs",
                isCurrentMode
                  ? "bg-emerald-200 text-emerald-900 border border-emerald-300"
                  : "bg-amber-200 text-amber-950 border border-amber-300"
              )}>
                {isCurrentMode ? "Новые цены" : `Расчет от ${formattedSavedDate}`}
              </span>
            </div>

            <p className={cn(
              "text-xs mt-1 leading-relaxed",
              isCurrentMode ? "text-emerald-800" : "text-amber-800"
            )}>
              {isCurrentMode ? (
                <>Проект пересчитан по новым коэффициентам компании. Вы можете вернуть исходную цену на момент первого расчета одной кнопкой.</>
              ) : (
                <>С момента сохранения проекта ({formattedSavedDate}) тарифы наценок изменились ({diffs.length} кат.). Вы можете продать клиенту по <b>старой цене</b> или мгновенно обновить до <b>новых цен</b>.</>
              )}
            </p>

            {/* Impact Sum preview */}
            {(calcSavedTotal > 0 || calcCurrentTotal > 0) && (
              <div className="mt-2.5 flex items-center gap-2.5 flex-wrap text-xs font-bold">
                <div className={cn(
                  "px-2.5 py-1 rounded-lg border flex items-center gap-1.5",
                  !isCurrentMode
                    ? "bg-amber-100 border-amber-300 text-amber-950 shadow-2xs"
                    : "bg-white/80 border-emerald-200 text-gray-700"
                )}>
                  <span className="text-gray-500 font-medium">Старая цена:</span>
                  <span className="font-black text-sm">{calcSavedTotal.toLocaleString()} ₽</span>
                  {!isCurrentMode && <span className="text-[10px] text-amber-800 bg-amber-200/80 px-1.5 py-0.2 rounded font-extrabold">Активна</span>}
                </div>

                <span className="text-gray-400 font-black">➔</span>

                <div className={cn(
                  "px-2.5 py-1 rounded-lg border flex items-center gap-1.5",
                  isCurrentMode
                    ? "bg-emerald-200/90 border-emerald-400 text-emerald-950 shadow-2xs"
                    : "bg-white/80 border-amber-200 text-gray-700"
                )}>
                  <span className="text-gray-500 font-medium">Новая цена:</span>
                  <span className="font-black text-sm">{calcCurrentTotal.toLocaleString()} ₽</span>
                  {isCurrentMode && <span className="text-[10px] text-emerald-900 bg-emerald-300 px-1.5 py-0.2 rounded font-extrabold">Активна</span>}
                </div>

                {diffAmount !== undefined && diffAmount !== 0 && (
                  <span className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 border shadow-2xs",
                    diffAmount > 0 
                      ? "bg-red-100 text-red-900 border-red-200" 
                      : "bg-emerald-100 text-emerald-900 border-emerald-200"
                  )}>
                    {diffAmount > 0 ? ` Разница: +${diffAmount.toLocaleString()} ₽` : ` Разница: ${diffAmount.toLocaleString()} ₽`}
                    {diffPercent !== undefined && ` (${diffAmount > 0 ? '+' : ''}${diffPercent}%)`}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto flex-shrink-0">
          {!isCurrentMode ? (
            <button
              onClick={() => {
                onApplyCurrentCoefficients();
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Продать по новым коэффициентам</span>
            </button>
          ) : (
            onRevertSavedCoefficients && (
              <button
                onClick={() => {
                  onRevertSavedCoefficients();
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 rounded-xl font-bold text-xs shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <span>Продать по старым ценам ({formattedSavedDate})</span>
              </button>
            )
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "flex items-center justify-center gap-1 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors border shadow-2xs",
              isCurrentMode
                ? "bg-emerald-100 border-emerald-300 text-emerald-900 hover:bg-emerald-200"
                : "bg-amber-100 border-amber-300 text-amber-950 hover:bg-amber-200"
            )}
          >
            <span>{isExpanded ? "Скрыть детали" : `Что изменилось (${diffs.length})`}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded breakdown list */}
      {isExpanded && (
        <div className={cn(
          "p-4 border-t text-xs space-y-3",
          isCurrentMode ? "bg-emerald-100/40 border-emerald-200/80" : "bg-amber-100/40 border-amber-200/80"
        )}>
          <div className="flex items-center justify-between font-bold text-gray-800 pb-1">
            <span className="flex items-center gap-1.5 text-amber-950">
              <Info className="w-4 h-4 text-amber-600" />
              Детализация изменений коэффициентов компаний:
            </span>
            <span className="text-[11px] text-gray-500 font-normal hidden sm:inline">
              Сравнение значений на момент сохранения проекта и действующих сейчас
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {diffs.map((diff) => (
              <div 
                key={diff.id}
                className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs flex flex-col justify-between space-y-2"
              >
                <div className="font-bold text-gray-800 truncate text-xs" title={diff.label}>
                  {diff.label}
                </div>

                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 text-[11px]">Старый:</span>
                    <span className="font-extrabold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{diff.savedVal}</span>
                    <span className="text-gray-400">➔</span>
                    <span className="text-gray-400 text-[11px]">Новый:</span>
                    <span className="font-black text-gray-900 bg-blue-50 text-blue-900 px-1.5 py-0.5 rounded border border-blue-200">{diff.currentVal}</span>
                  </div>

                  <span className={cn(
                    "flex items-center gap-0.5 px-1.5 py-0.5 rounded font-black text-[10px]",
                    diff.type === 'increase'
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  )}>
                    {diff.type === 'increase' ? (
                      <TrendingUp className="w-3 h-3 text-red-600" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-emerald-600" />
                    )}
                    {diff.type === 'increase' ? `+${diff.diffPercent}%` : `${diff.diffPercent}%`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
