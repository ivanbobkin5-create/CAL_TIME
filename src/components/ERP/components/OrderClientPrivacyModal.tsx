import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Phone, 
  User, 
  Truck, 
  Wrench, 
  Building2, 
  Copy, 
  Check, 
  ShieldAlert, 
  Lock, 
  Eye, 
  EyeOff,
  Coins,
  MessageSquare
} from 'lucide-react';
import { ProductionOrder, ERPEmployee } from '../types';

interface OrderClientPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder;
  currentUser?: ERPEmployee | null;
}

export const OrderClientPrivacyModal: React.FC<OrderClientPrivacyModalProps> = ({
  isOpen,
  onClose,
  order,
  currentUser
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Check if current employee has master/management/head rights
  const isMasterOrAdmin = (() => {
    if (!currentUser) return true; // Default allow if no auth restrictions
    const roleLower = (currentUser.role || '').toLowerCase();
    const prodRoleLower = (currentUser.productionRole || '').toLowerCase();
    return (
      currentUser.isOwner ||
      currentUser.department === 'management' ||
      roleLower.includes('начальник') ||
      roleLower.includes('мастер') ||
      roleLower.includes('управляющий') ||
      roleLower.includes('админ') ||
      prodRoleLower.includes('начальник') ||
      prodRoleLower.includes('мастер')
    );
  })();

  const [isRevealed, setIsRevealed] = useState<boolean>(isMasterOrAdmin);

  if (!isOpen) return null;

  const delivery = order.deliveryData || {};
  const assembly = order.assemblyData || {};

  const clientName = delivery.clientName || order.clientName || 'Не указан';
  const rawPhone = delivery.clientPhone || (order as any).clientPhone || '';
  const rawAddress = delivery.address || 'Адрес доставки не заполнен';
  const floor = delivery.floor ? `${delivery.floor} этаж` : 'Не указан';
  const elevator = delivery.hasElevator 
    ? (typeof delivery.hasElevator === 'boolean' ? 'Есть лифт' : delivery.hasElevator)
    : 'Без лифта';
  const deliveryPrice = delivery.deliveryPrice ?? (order as any).deliveryPrice;
  const assemblyPrice = assembly.assemblyPrice ?? delivery.assemblyPrice ?? (order as any).assemblyPrice;
  const comment = delivery.comment || order.comments || 'Комментариев нет';

  // Masking helpers
  const maskPhone = (phoneStr: string) => {
    if (!phoneStr) return 'Телефон не указан';
    if (phoneStr.length < 6) return '********';
    return phoneStr.slice(0, 4) + ' ***-**-' + phoneStr.slice(-2);
  };

  const maskAddress = (addrStr: string) => {
    if (!addrStr || addrStr === 'Адрес доставки не заполнен') return addrStr;
    const parts = addrStr.split(',');
    if (parts.length <= 1) return 'ул. **********, д. **';
    return `${parts[0]}, д. **`;
  };

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">
                Заказ № {order.orderNumber}
              </div>
              <h3 className="text-base font-black text-slate-900">
                Данные клиента, доставки и сборки
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Privacy Lock Banner if restricted */}
        {!isMasterOrAdmin && !isRevealed && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <div className="font-bold">Доступ ограничен правами доступа</div>
              <div className="text-[11px] text-amber-800">
                Телефон и адрес клиента скрыты для линейных сотрудников цеха. Полная информация доступна Начальнику цеха и Управляющему.
              </div>
              <button
                type="button"
                onClick={() => setIsRevealed(true)}
                className="mt-1 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Показать контакты (снять скрытие)</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Details Card */}
        <div className="space-y-3">
          
          {/* Client & Phone */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
              <span className="flex items-center gap-1.5 text-slate-600">
                <User className="w-4 h-4 text-violet-600" /> ФИО Заказчика
              </span>
              {isRevealed && (
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Доступно
                </span>
              )}
            </div>

            <div className="font-black text-slate-900 text-base">
              {clientName}
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-800">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{isRevealed ? (rawPhone || 'Телефон не указан') : maskPhone(rawPhone)}</span>
              </div>

              {isRevealed && rawPhone && (
                <div className="flex items-center gap-1.5">
                  <a
                    href={`tel:${rawPhone.replace(/[^0-9+]/g, '')}`}
                    className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Позвонить</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopy(rawPhone, 'phone')}
                    className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                    title="Скопировать номер"
                  >
                    {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Address & Floor */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
              <span className="flex items-center gap-1.5 text-slate-600">
                <MapPin className="w-4 h-4 text-rose-500" /> Адрес доставки
              </span>
              {isRevealed && rawAddress && (
                <button
                  type="button"
                  onClick={() => handleCopy(rawAddress, 'address')}
                  className="text-[11px] font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1 cursor-pointer"
                >
                  {copiedField === 'address' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === 'address' ? 'Скопировано!' : 'Копировать'}</span>
                </button>
              )}
            </div>

            <div className="font-bold text-slate-900 text-xs leading-relaxed">
              {isRevealed ? rawAddress : maskAddress(rawAddress)}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium">Этаж:</span>
                <strong className="text-slate-900 font-bold">{floor}</strong>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium">Лифт:</span>
                <strong className="text-slate-900 font-bold">{elevator}</strong>
              </div>
            </div>
          </div>

          {/* Costs & Assembly Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
              <div className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-emerald-600" /> Доставка
              </div>
              <div className="text-base font-black text-emerald-950 font-mono">
                {deliveryPrice ? `${Number(deliveryPrice).toLocaleString('ru-RU')} ₽` : 'Не указана'}
              </div>
            </div>

            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-1">
              <div className="text-[10px] font-bold text-indigo-800 uppercase flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-indigo-600" /> Сборка мебели
              </div>
              <div className="text-base font-black text-indigo-950 font-mono">
                {assemblyPrice ? `${Number(assemblyPrice).toLocaleString('ru-RU')} ₽` : 'Не указана'}
              </div>
            </div>
          </div>

          {/* Comments */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-slate-500" /> Комментарии по доставке
            </div>
            <div className="text-slate-800 font-medium leading-relaxed italic">
              "{comment}"
            </div>
          </div>

          {/* Assigned Assembler if available */}
          {assembly.assemblerName && (
            <div className="p-3 bg-violet-50 rounded-2xl border border-violet-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-violet-600" />
                <span className="font-bold text-violet-950">Сборщик: {assembly.assemblerName}</span>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-violet-200 text-violet-800">
                {assembly.status === 'completed' ? 'Завершена' : 'Назначен'}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-md transition-all"
          >
            Понятно, закрыть
          </button>
        </div>

      </div>
    </div>
  );
};
