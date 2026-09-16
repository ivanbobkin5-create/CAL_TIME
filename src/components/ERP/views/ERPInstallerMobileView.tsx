import React, { useState, useMemo } from 'react';
import { 
  Wrench, 
  Calendar, 
  CheckCircle2, 
  DollarSign, 
  Clock, 
  Phone, 
  MapPin, 
  FileText, 
  ChevronRight, 
  Check, 
  AlertCircle, 
  Navigation, 
  User, 
  Building2, 
  Layers, 
  ArrowRight,
  X,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Info,
  Coins,
  FileSpreadsheet,
  AlertTriangle,
  Camera
} from 'lucide-react';
import { ERPEmployee, InstallationTask, InstallationActSettings } from '../types';
import { ExtraWorksMobileModal } from '../components/ExtraWorksMobileModal';
import { InstallationActViewModal } from '../components/InstallationActViewModal';
import { InstallerPhotoUploader } from '../components/InstallerPhotoUploader';
import { InstallerReclamationModal } from '../components/InstallerReclamationModal';
import { calculateWarrantyDate } from '../utils/installationActUtils';

interface ERPInstallerMobileViewProps {
  installerId: string;
  aliasOrId: string;
  employees: ERPEmployee[];
  tasks: InstallationTask[];
  onUpdateTask: (task: InstallationTask) => void;
  onBackToErp?: () => void;
  actSettings?: InstallationActSettings;
  companyName?: string;
}

export const ERPInstallerMobileView: React.FC<ERPInstallerMobileViewProps> = ({
  installerId,
  aliasOrId,
  employees,
  tasks,
  onUpdateTask,
  onBackToErp,
  actSettings,
  companyName = 'Мебельное производство'
}) => {
  // Active Tab ('proposed' | 'active' | 'completed' | 'earnings' | 'schedule')
  const [activeTab, setActiveTab] = useState<'proposed' | 'active' | 'completed' | 'earnings' | 'schedule'>('proposed');

  // Modal State for Taking a Task (Agreeing Date & Time)
  const [takeModalTask, setTakeModalTask] = useState<InstallationTask | null>(null);
  const [agreeDate, setAgreeDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [agreeTime, setAgreeTime] = useState<string>('10:00');
  const [agreeComment, setAgreeComment] = useState<string>('');

  // Modal State for Extra Works & Act View
  const [extraWorksModalTask, setExtraWorksModalTask] = useState<InstallationTask | null>(null);
  const [actViewModalTask, setActViewModalTask] = useState<InstallationTask | null>(null);
  const [reclamationModalTask, setReclamationModalTask] = useState<InstallationTask | null>(null);

  // Modal State for Completing a Task
  const [completeModalTask, setCompleteModalTask] = useState<InstallationTask | null>(null);
  const [completeNotes, setCompleteNotes] = useState<string>('');
  const [paymentReceived, setPaymentReceived] = useState<boolean>(false);

  // Modal State for Drawing / Specification Viewing
  const [viewDrawingTask, setViewDrawingTask] = useState<InstallationTask | null>(null);

  // Find Installer Employee Profile
  const installer = useMemo(() => {
    return employees.find(e => e.id === installerId || e.badgeCode === installerId) || {
      id: installerId,
      name: 'Сборщик мебели',
      role: 'Сборщик мебели',
      productionRole: 'Сборщик мебели',
      phone: '',
      shiftType: '2/2'
    } as ERPEmployee;
  }, [employees, installerId]);

  // Filter Tasks for this Installer
  const installerTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.installerEmployeeId === installer.id || t.installerEmployeeName === installer.name) {
        return true;
      }
      // Unassigned proposed tasks for assemblers
      if (!t.installerEmployeeId && (t.status === 'new' || t.status === 'scheduled')) {
        return true;
      }
      return false;
    });
  }, [tasks, installer]);

  // Tab 1: Proposed Tasks (New or Scheduled without client agreement)
  const proposedTasks = useMemo(() => {
    return installerTasks.filter(t => 
      (t.status === 'new' || (t.status === 'scheduled' && !(t as any).agreedWithClient))
    );
  }, [installerTasks]);

  // Tab 2: Active Tasks (Scheduled with client agreement or in_progress)
  const activeTasks = useMemo(() => {
    return installerTasks.filter(t => 
      (t.status === 'scheduled' && (t as any).agreedWithClient) || t.status === 'in_progress'
    );
  }, [installerTasks]);

  // Tab 3: Completed Tasks
  const completedTasks = useMemo(() => {
    return installerTasks.filter(t => t.status === 'completed');
  }, [installerTasks]);

  // Financial Stats for Earnings Tab
  const stats = useMemo(() => {
    const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
    
    let totalEarnedMonth = 0;
    let totalEarnedAll = 0;
    let activePendingAmount = 0;

    completedTasks.forEach(t => {
      const price = t.assemblyPrice || 0;
      totalEarnedAll += price;
      if (t.completedDate && t.completedDate.startsWith(currentMonthStr)) {
        totalEarnedMonth += price;
      }
    });

    activeTasks.forEach(t => {
      activePendingAmount += (t.assemblyPrice || 0);
    });

    return {
      totalEarnedMonth,
      totalEarnedAll,
      activePendingAmount,
      completedCount: completedTasks.length,
      activeCount: activeTasks.length
    };
  }, [completedTasks, activeTasks]);

  // Handle Taking Task into Work (Agreeing Date & Time)
  const handleConfirmTakeInWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!takeModalTask) return;

    const scheduledDateTime = `${agreeDate}T${agreeTime}`;

    const updated: InstallationTask = {
      ...takeModalTask,
      status: 'scheduled',
      scheduledDate: scheduledDateTime,
      installerEmployeeId: installer.id,
      installerEmployeeName: installer.name,
      comment: agreeComment ? `${takeModalTask.comment ? takeModalTask.comment + '\n' : ''}Согласовано с клиентом: ${agreeComment}` : takeModalTask.comment,
      ...({
        agreedWithClient: true,
        agreedAt: new Date().toISOString()
      } as any)
    };

    onUpdateTask(updated);
    setTakeModalTask(null);
    setAgreeComment('');
    setActiveTab('active');
  };

  // Handle Completing Task
  const handleConfirmComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeModalTask) return;

    const updated: InstallationTask = {
      ...completeModalTask,
      status: 'completed',
      completedDate: new Date().toISOString(),
      paymentStatus: paymentReceived ? 'paid' : completeModalTask.paymentStatus,
      comment: completeNotes ? `${completeModalTask.comment ? completeModalTask.comment + '\n' : ''}Завершено сборщиком: ${completeNotes}` : completeModalTask.comment
    };

    onUpdateTask(updated);
    setCompleteModalTask(null);
    setCompleteNotes('');
    setActiveTab('completed');
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-20 select-none">
      {/* Top Mobile Header */}
      <div className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-30">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-600 text-white flex items-center justify-center font-black text-sm shadow-sm border border-cyan-400/30 shrink-0">
              {(installer.name || 'С').substring(0, 2).toUpperCase()}
            </div>

            <div>
              <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                <Wrench className="w-3 h-3" /> Личный кабинет сборщика
              </div>
              <h1 className="text-sm font-black truncate max-w-[200px]">
                {installer.name}
              </h1>
            </div>
          </div>

          {onBackToErp && (
            <button
              onClick={onBackToErp}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition-colors cursor-pointer"
            >
              В систему ERP
            </button>
          )}
        </div>

        {/* Quick Tabs Bar */}
        <div className="max-w-md mx-auto mt-3.5 flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            onClick={() => setActiveTab('proposed')}
            className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'proposed'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span>Предлагаемый</span>
            {proposedTasks.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                {proposedTasks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'active'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span>Активные</span>
            {activeTasks.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 font-black text-[10px] flex items-center justify-center">
                {activeTasks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'completed'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span>Завершенные</span>
            {completedTasks.length > 0 && (
              <span className="text-[10px] opacity-75">({completedTasks.length})</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('earnings')}
            className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'earnings'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span>Заработок</span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'schedule'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span>График</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-md mx-auto p-4 space-y-4">

        {/* TAB 1: PROPOSED TASKS */}
        {activeTab === 'proposed' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
              <span>Предложенные монтажи ({proposedTasks.length})</span>
              <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                Ознакомьтесь и согласуйте время
              </span>
            </div>

            {proposedTasks.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Новых предложений нет</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Все доступные заказы уже взяты в работу. Проверьте вкладку «Активные».
                </p>
              </div>
            ) : (
              proposedTasks.map(task => (
                <div key={task.id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3.5">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black text-[10px]">
                          Заказ №{task.orderNumber}
                        </span>
                        {task.type === 'reclamation' && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                            ⚠️ Рекламация
                          </span>
                        )}
                      </div>
                      <h3 className="font-black text-slate-900 text-base mt-1">
                        {task.clientName}
                      </h3>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Оплата за монтаж</div>
                      <div className="text-lg font-black text-cyan-800 font-mono">
                        {(task.assemblyPrice || 0).toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                  </div>

                  {/* Task Key Info */}
                  <div className="space-y-2 text-xs">
                    {/* Address & Navigation */}
                    <div className="flex items-start gap-2 text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900">{task.address || 'Адрес не указан'}</div>
                        {(task.floor || task.hasElevator !== undefined) && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Этаж: {task.floor || '1'} | Лифт: {task.hasElevator ? 'Есть (грузовой)' : 'Нет'}
                          </div>
                        )}
                      </div>
                      {task.address && (
                        <a
                          href={`https://yandex.ru/maps/?text=${encodeURIComponent(task.address)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-xl bg-cyan-100 text-cyan-900 font-bold text-[10px] shrink-0 flex items-center gap-1 hover:bg-cyan-200 transition-colors"
                        >
                          <Navigation className="w-3 h-3 text-cyan-700" />
                          <span>Карта</span>
                        </a>
                      )}
                    </div>

                    {/* Client Phone & Direct Call */}
                    {task.clientPhone && (
                      <div className="flex items-center justify-between gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-emerald-600" />
                          <span className="font-mono font-bold text-slate-900">{task.clientPhone}</span>
                        </div>
                        <a
                          href={`tel:${task.clientPhone.replace(/[^0-9+]/g, '')}`}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Позвонить</span>
                        </a>
                      </div>
                    )}

                    {/* Drawing & Specification button */}
                    <button
                      onClick={() => setViewDrawingTask(task)}
                      className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-cyan-600" />
                      <span>Сборочный чертеж и детализация</span>
                    </button>
                  </div>

                  {/* Main Action: Take in Work */}
                  <button
                    onClick={() => {
                      setTakeModalTask(task);
                      setAgreeDate(new Date().toISOString().split('T')[0]);
                      setAgreeTime('10:00');
                    }}
                    className="w-full py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs shadow-md shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Взять в работу (Согласовать время)</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: ACTIVE TASKS */}
        {activeTab === 'active' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
              <span>Активные монтажи ({activeTasks.length})</span>
              <span className="text-[10px] text-cyan-800 font-bold bg-cyan-50 px-2 py-0.5 rounded-lg border border-cyan-200">
                Время согласовано с клиентом
              </span>
            </div>

            {activeTasks.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Активных монтажей пока нет</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Возьмите заказ из вкладки «Предлагаемый», чтобы согласовать время с клиентом.
                </p>
              </div>
            ) : (
              activeTasks.map(task => {
                const dateFormatted = task.scheduledDate 
                  ? new Date(task.scheduledDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
                  : 'Дата не указана';

                return (
                  <div key={task.id} className="bg-white rounded-3xl p-5 border-2 border-cyan-300 shadow-md space-y-3.5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-900 font-black text-[10px]">
                            Заказ №{task.orderNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            ✓ Время согласовано
                          </span>
                        </div>
                        <h3 className="font-black text-slate-900 text-base mt-1">
                          {task.clientName}
                        </h3>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-slate-400 font-semibold uppercase">Оплата</div>
                        <div className="text-lg font-black text-cyan-800 font-mono">
                          {(task.assemblyPrice || 0).toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                    </div>

                    {/* Agreed Appointment Banner */}
                    <div className="p-3 bg-cyan-50 rounded-2xl border border-cyan-200 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] text-cyan-800 font-bold uppercase tracking-wider">Начало сборки:</div>
                        <div className="text-xs font-black text-slate-900">
                          {dateFormatted}
                        </div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-xs">
                      {/* Address */}
                      <div className="flex items-start gap-2 text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-900">{task.address || 'Адрес не указан'}</div>
                        </div>
                        {task.address && (
                          <a
                            href={`https://yandex.ru/maps/?text=${encodeURIComponent(task.address)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 rounded-xl bg-cyan-100 text-cyan-900 font-bold text-[10px] shrink-0 flex items-center gap-1 hover:bg-cyan-200 transition-colors"
                          >
                            <Navigation className="w-3 h-3 text-cyan-700" />
                            <span>Карта</span>
                          </a>
                        )}
                      </div>

                      {/* Phone */}
                      {task.clientPhone && (
                        <div className="flex items-center justify-between gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-emerald-600" />
                            <span className="font-mono font-bold text-slate-900">{task.clientPhone}</span>
                          </div>
                          <a
                            href={`tel:${task.clientPhone.replace(/[^0-9+]/g, '')}`}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Позвонить</span>
                          </a>
                        </div>
                      )}

                      {/* Drawings */}
                      <button
                        onClick={() => setViewDrawingTask(task)}
                        className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-cyan-600" />
                        <span>Сборочный чертеж и спецификация</span>
                      </button>

                      {/* Extra Works Mobile Button */}
                      <button
                        onClick={() => setExtraWorksModalTask(task)}
                        className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-between px-4 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-slate-950" />
                          <span>Дополнительные работы</span>
                        </div>
                        <div className="bg-slate-950 text-amber-400 font-mono text-[11px] font-black px-2.5 py-0.5 rounded-xl">
                          {task.extraWorksTotal ? `+${task.extraWorksTotal.toLocaleString('ru-RU')} ₽` : 'Прейскурант'}
                        </div>
                      </button>

                      {/* Photo Attachment (Up to 10 photos) */}
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        <InstallerPhotoUploader
                          photos={task.photos || []}
                          maxPhotos={10}
                          title="Фотоотчет монтажа"
                          onPhotosChange={(newPhotos) => {
                            const updatedTask: InstallationTask = {
                              ...task,
                              photos: newPhotos,
                              updatedAt: new Date().toISOString()
                            };
                            onUpdateTask(updatedTask);
                          }}
                        />
                      </div>

                      {/* Reclamation Warning Flag if Submitted */}
                      {task.hasPendingReclamationFlag && (
                        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-center gap-2.5 text-rose-900 text-xs font-bold">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Сигнал о рекламации передан руководству ({task.reclamationSignal?.reason})</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setTakeModalTask(task);
                            if (task.scheduledDate) {
                              const [d, t] = task.scheduledDate.split('T');
                              setAgreeDate(d || new Date().toISOString().split('T')[0]);
                              setAgreeTime(t || '10:00');
                            }
                          }}
                          className="px-3 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer shrink-0"
                        >
                          Перенести
                        </button>

                        <button
                          onClick={() => setActViewModalTask(task)}
                          className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          <span>Акт и Завершить</span>
                        </button>
                      </div>

                      {/* Red "Создать рекламацию" Button */}
                      <button
                        onClick={() => setReclamationModalTask(task)}
                        className="w-full py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Создать рекламацию (сигнал о браке)</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: COMPLETED TASKS */}
        {activeTab === 'completed' && (
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-600 px-1">
              Завершенные монтажи ({completedTasks.length})
            </div>

            {completedTasks.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Завершенных монтажей нет</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  После завершения активного монтажа история будет сохраняться здесь.
                </p>
              </div>
            ) : (
              completedTasks.map(task => (
                <div key={task.id} className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                      Заказ №{task.orderNumber}
                    </span>
                    <span className="text-xs font-mono font-black text-emerald-800">
                      +{((task.assemblyPrice || 0) + (task.extraWorksTotal || 0)).toLocaleString('ru-RU')} ₽
                    </span>
                  </div>

                  <div className="font-bold text-slate-900 text-xs">
                    {task.clientName} — <span className="text-slate-500 font-normal">{task.address}</span>
                  </div>

                  {task.completedDate && (
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Завершено: {new Date(task.completedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      {task.warrantyUntil && (
                        <span className="text-emerald-700 font-bold">Гарантия до {task.warrantyUntil}</span>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => setActViewModalTask(task)}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Посмотреть Акт приема-передачи</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: EARNINGS Dashboard */}
        {activeTab === 'earnings' && (
          <div className="space-y-4">
            <div className="text-xs font-bold text-slate-600 px-1">
              Финансовый отчет и доход
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-5 shadow-md space-y-4">
              <div>
                <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Заработано за этот месяц:
                </div>
                <div className="text-2xl md:text-3xl font-black font-mono text-white mt-1">
                  {stats.totalEarnedMonth.toLocaleString('ru-RU')} ₽
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700/80 text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold">Всего за время:</div>
                  <div className="font-mono font-black text-slate-100 text-sm mt-0.5">
                    {stats.totalEarnedAll.toLocaleString('ru-RU')} ₽
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-cyan-300 font-semibold">Ожидается (В работе):</div>
                  <div className="font-mono font-black text-cyan-200 text-sm mt-0.5">
                    {stats.activePendingAmount.toLocaleString('ru-RU')} ₽
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 space-y-3">
              <h3 className="font-black text-slate-900 text-sm">Сводка выполненных работ</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Завершенных заказов:</span>
                  <span className="font-bold text-slate-900">{stats.completedCount}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Заказов в работе:</span>
                  <span className="font-bold text-cyan-800">{stats.activeCount}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500">Ставка за смену / тариф:</span>
                  <span className="font-bold text-indigo-600">{installer.rateType === 'piecework' ? 'Сдельная (% от заказа)' : `${installer.baseRate || 0} ₽`}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SCHEDULE */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <div className="text-xs font-bold text-slate-600 px-1">
              График смен и календаря сборщика
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-black text-slate-900 text-sm">Ваш график работы</div>
                <span className="px-2.5 py-1 rounded-xl bg-cyan-100 text-cyan-900 font-mono font-bold text-xs">
                  {installer.shiftType || '2/2'}
                </span>
              </div>

              <p className="text-xs text-slate-500">
                Все согласованные заказы с датой автоматически бронируют выезд в вашем графике.
              </p>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-800">Ближайшие запланированные выезды:</div>
                {activeTasks.length === 0 ? (
                  <div className="text-xs text-slate-400 italic">Свободные дни. Монтажи не забронированы.</div>
                ) : (
                  activeTasks.map(t => (
                    <div key={t.id} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-slate-200">
                      <div>
                        <div className="font-bold text-slate-900">Заказ №{t.orderNumber}</div>
                        <div className="text-[10px] text-slate-500">{t.address}</div>
                      </div>
                      <span className="font-mono font-bold text-cyan-800 text-[11px] shrink-0">
                        {t.scheduledDate ? new Date(t.scheduledDate).toLocaleDateString('ru-RU') : 'Скоро'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODAL: TAKE IN WORK (AGREE DATE & TIME) */}
      {takeModalTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-cyan-600 uppercase">Согласование времени</span>
                <h3 className="font-black text-slate-900 text-base">
                  Взять в работу Заказ №{takeModalTask.orderNumber}
                </h3>
              </div>

              <button
                onClick={() => setTakeModalTask(null)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmTakeInWork} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Дата начала монтажа *
                </label>
                <input
                  type="date"
                  required
                  value={agreeDate}
                  onChange={(e) => setAgreeDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Время прибытия к клиенту *
                </label>
                <input
                  type="time"
                  required
                  value={agreeTime}
                  onChange={(e) => setAgreeTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Примечание / Согласованные условия (опционально)
                </label>
                <textarea
                  value={agreeComment}
                  onChange={(e) => setAgreeComment(e.target.value)}
                  placeholder="например: Договорились на утреннее время, парковка во дворе по звонку..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 font-medium text-slate-900 text-xs focus:ring-2 focus:ring-cyan-500 outline-none resize-none"
                />
              </div>

              <div className="p-3 bg-cyan-50 rounded-2xl border border-cyan-200 text-[11px] text-cyan-900 font-medium">
                💡 После нажатия дата и время мгновенно обновятся в основной ERP-системе цеха в разделе «Монтаж и сборка».
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs shadow-md shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Подтвердить и перевести в Активные</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COMPLETE TASK */}
      {completeModalTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Завершение монтажа</span>
                <h3 className="font-black text-slate-900 text-base">
                  Заказ №{completeModalTask.orderNumber}
                </h3>
              </div>

              <button
                onClick={() => setCompleteModalTask(null)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmComplete} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Комментарий к завершению
                </label>
                <textarea
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  placeholder="Сборка выполнена полностью, клиент принял работу без замечаний..."
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 font-medium text-slate-900 text-xs focus:ring-2 focus:ring-cyan-500 outline-none resize-none"
                />
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={paymentReceived}
                  onChange={(e) => setPaymentReceived(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                />
                <span className="font-bold text-slate-800 text-xs">
                  Оплата от клиента получен на месте
                </span>
              </label>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Завершить монтаж</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DRAWING & SPECIFICATION VIEWER */}
      {viewDrawingTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-cyan-600 uppercase">Сборочный чертеж</span>
                <h3 className="font-black text-slate-900 text-base">
                  Заказ №{viewDrawingTask.orderNumber} ({viewDrawingTask.clientName})
                </h3>
              </div>

              <button
                onClick={() => setViewDrawingTask(null)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-2">
                <FileText className="w-8 h-8 text-cyan-600 mx-auto" />
                <div className="font-bold text-slate-800">
                  Сборочный чертеж и комплектовочная карта
                </div>
                <p className="text-[11px] text-slate-500">
                  Документы прикреплены к заказу №{viewDrawingTask.orderNumber}.
                </p>
                <a
                  href={`#drawing-${viewDrawingTask.orderNumber}`}
                  onClick={(e) => {
                    e.preventDefault();
                    alert(`Чертежи заказа №${viewDrawingTask.orderNumber} загружаются из файлового хранилища.`);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 text-white font-bold text-xs shadow-xs hover:bg-cyan-500 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Открыть полный PDF чертеж</span>
                </a>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-900">Детали адреса и заказа:</div>
                <div className="text-slate-600">Адрес: {viewDrawingTask.address || '—'}</div>
                <div className="text-slate-600">Количество коробок: {viewDrawingTask.packagesCount || '1'}</div>
                <div className="text-slate-600">Стоимость монтажа: {viewDrawingTask.assemblyPrice || 0} ₽</div>
              </div>
            </div>

            <button
              onClick={() => setViewDrawingTask(null)}
              className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* MODAL: EXTRA WORKS MOBILE SELECTOR */}
      {extraWorksModalTask && (
        <ExtraWorksMobileModal
          isOpen={!!extraWorksModalTask}
          onClose={() => setExtraWorksModalTask(null)}
          task={extraWorksModalTask}
          actSettings={actSettings}
          onUpdateTask={(updated) => {
            onUpdateTask(updated);
            setExtraWorksModalTask(updated);
          }}
        />
      )}

      {/* MODAL: INSTALLATION ACT & COMPLETION */}
      {actViewModalTask && (
        <InstallationActViewModal
          isOpen={!!actViewModalTask}
          onClose={() => setActViewModalTask(null)}
          task={actViewModalTask}
          actSettings={actSettings}
          companyName={companyName}
          isReadOnly={actViewModalTask.status === 'completed'}
          onConfirmComplete={(notes, paymentReceived) => {
            const completedDate = new Date().toISOString().split('T')[0];
            const warrantyYears = actSettings?.warrantyYears || 2;
            const warrantyUntilFormatted = calculateWarrantyDate(completedDate, warrantyYears);

            const assemblyPrice = actViewModalTask.assemblyPrice || 0;
            const extraWorksTotal = actViewModalTask.extraWorksTotal || 0;
            const grandTotal = assemblyPrice + extraWorksTotal;

            const completionComment = `Монтаж завершен. Оплата ${paymentReceived ? 'получена в полном объеме' : 'ожидает подтверждения'}. Выполнено доп. работ на ${extraWorksTotal.toLocaleString('ru-RU')} ₽. Итоговая сумма: ${grandTotal.toLocaleString('ru-RU')} ₽. Гарантия действует до ${warrantyUntilFormatted}.${notes ? '\nКомментарий: ' + notes : ''}`;

            const updated: InstallationTask = {
              ...actViewModalTask,
              status: 'completed',
              completedDate,
              warrantyUntil: warrantyUntilFormatted,
              paymentStatus: paymentReceived ? 'paid' : actViewModalTask.paymentStatus,
              comment: actViewModalTask.comment ? `${actViewModalTask.comment}\n${completionComment}` : completionComment,
              updatedAt: new Date().toISOString()
            };

            onUpdateTask(updated);
            setActViewModalTask(null);
          }}
        />
      )}

      {/* MODAL: RECLAMATION SIGNAL MODAL */}
      {reclamationModalTask && (
        <InstallerReclamationModal
          isOpen={!!reclamationModalTask}
          onClose={() => setReclamationModalTask(null)}
          task={reclamationModalTask}
          onSubmitReclamationSignal={(reason, details, photos) => {
            const updated: InstallationTask = {
              ...reclamationModalTask,
              hasPendingReclamationFlag: true,
              reclamationSignal: {
                reason,
                details,
                photos,
                createdAt: new Date().toISOString(),
                status: 'pending'
              },
              updatedAt: new Date().toISOString()
            };
            onUpdateTask(updated);
            alert('Сигнальный запрос о рекламации успешно передан мастеру производства.');
            setReclamationModalTask(null);
          }}
        />
      )}
    </div>
  );
};
