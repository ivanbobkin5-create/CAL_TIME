import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Server,
  Wifi,
  WifiOff,
  RefreshCw,
  Upload,
  Download,
  Copy,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Smartphone,
  HardDrive,
  Clock,
  Layers,
  Users,
  PackageCheck,
  Monitor,
  Radar,
  Check,
  ArrowRight
} from 'lucide-react';

interface DiscoveredLanServer {
  url: string;
  erpUrl: string;
  ip: string;
  port: number;
  hostname: string;
  companyId: string;
  companyName: string;
  ordersCount: number;
  employeesCount: number;
  role: string;
  isSelf?: boolean;
}

interface DesktopRoleConfig {
  role: 'unconfigured' | 'server' | 'workstation';
  targetServerUrl?: string;
  targetCompanyId?: string;
  targetCompanyName?: string;
  stationName?: string;
  autoOpenStation?: boolean;
}

interface EdgeStatusResponse {
  success: boolean;
  isEdgeMode: boolean;
  hostname?: string;
  port: number;
  dataDir: string;
  lanUrls: string[];
  lanBaseUrls: string[];
  desktopRole?: DesktopRoleConfig;
  edgeConfig: {
    cloudUrl: string;
    companyId: string;
    companyName?: string;
    autoSyncIntervalSec: number;
    lastSyncAt?: string;
    lastPullAt?: string;
    lastError?: string | null;
    lastSyncStatus?: string;
    syncedEventsTotal?: number;
  };
  pendingOutboxCount: number;
  ordersCount: number;
  employeesCount: number;
}

const STATION_PRESETS = [
  'Участок распила (Форматно-раскроечный)',
  'Участок кромкооблицовки',
  'Участок присадки и ЧПУ',
  'Участок фрезеровки / МДФ',
  'Участок сборки и комплектации',
  'Участок упаковки и отгрузки',
  'Склад материалов и фурнитуры',
];

export const ERPEdgeConsoleView: React.FC = () => {
  const [status, setStatus] = useState<EdgeStatusResponse | null>(null);
  const [cloudUrl, setCloudUrl] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [autoSyncSec, setAutoSyncSec] = useState(30);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const initializedRef = useRef(false);

  // Desktop role state ('server' = Сервер ПК, 'workstation' = Терминал участка)
  const [pcRole, setPcRole] = useState<'unconfigured' | 'server' | 'workstation'>('server');
  const [stationName, setStationName] = useState('Участок распила (Форматно-раскроечный)');
  const [targetServerUrl, setTargetServerUrl] = useState('');
  const [targetCompanyName, setTargetCompanyName] = useState('');
  const [autoOpenStation, setAutoOpenStation] = useState(true);
  const [discoveredServers, setDiscoveredServers] = useState<DiscoveredLanServer[]>([]);
  const [isScanningLan, setIsScanningLan] = useState(false);
  const [manualServerInput, setManualServerInput] = useState('');

  const scanLanForServers = async () => {
    setIsScanningLan(true);
    try {
      const res = await fetch('/api/edge/discover-lan');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.servers)) {
          setDiscoveredServers(data.servers);
        }
      }
    } catch (_) {
    } finally {
      setIsScanningLan(false);
    }
  };

  const saveDesktopRole = async (next: Partial<DesktopRoleConfig>, openImmediatelyUrl?: string) => {
    try {
      const payload: DesktopRoleConfig = {
        role: next.role || pcRole,
        stationName: next.stationName ?? stationName,
        targetServerUrl: next.targetServerUrl ?? targetServerUrl,
        targetCompanyId: next.targetCompanyId ?? '',
        targetCompanyName: next.targetCompanyName ?? targetCompanyName,
        autoOpenStation: next.autoOpenStation ?? autoOpenStation,
      };
      const res = await fetch('/api/edge/desktop-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        if (next.role) setPcRole(next.role);
        if (next.targetServerUrl !== undefined) setTargetServerUrl(next.targetServerUrl);
        if (next.targetCompanyName !== undefined) setTargetCompanyName(next.targetCompanyName);
        if (openImmediatelyUrl) {
          window.location.href = openImmediatelyUrl;
        } else {
          setBanner({
            type: 'ok',
            text:
              payload.role === 'workstation'
                ? `Режим ПК сохранен: Терминал участка «${payload.stationName}».`
                : 'Режим ПК сохранен: Главный ПК — Сервер цеха.',
          });
        }
      }
    } catch (_) {}
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/edge/status');
      if (!res.ok) return;
      const data: EdgeStatusResponse = await res.json();
      setStatus(data);
      if (!initializedRef.current) {
        setCloudUrl(data.edgeConfig?.cloudUrl || '');
        setCompanyId(data.edgeConfig?.companyId || '');
        setAutoSyncSec(data.edgeConfig?.autoSyncIntervalSec || 30);

        const params = new URLSearchParams(window.location.search);
        const queryMode = params.get('mode');
        const selectRole = params.get('select_role');
        if (selectRole === '1') {
          setPcRole('unconfigured');
        } else if (queryMode === 'workstation') {
          setPcRole('workstation');
          scanLanForServers();
        } else if (data.desktopRole?.role) {
          setPcRole(data.desktopRole.role);
          if (data.desktopRole.role === 'workstation' || data.desktopRole.role === 'unconfigured') {
            scanLanForServers();
          }
        }
        if (data.desktopRole?.stationName) setStationName(data.desktopRole.stationName);
        if (data.desktopRole?.targetServerUrl) setTargetServerUrl(data.desktopRole.targetServerUrl);
        if (data.desktopRole?.targetCompanyName) setTargetCompanyName(data.desktopRole.targetCompanyName);
        if (typeof data.desktopRole?.autoOpenStation === 'boolean') {
          setAutoOpenStation(data.desktopRole.autoOpenStation);
        }
        initializedRef.current = true;
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, 5000);
    return () => clearInterval(timer);
  }, []);

  const primaryLanUrl = status?.lanUrls?.[0] || `http://localhost:${status?.port || 3000}/erp`;

  useEffect(() => {
    if (!primaryLanUrl) return;
    QRCode.toDataURL(primaryLanUrl, { width: 180, margin: 1 })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, [primaryLanUrl]);

  const handleCopy = (val: string) => {
    navigator.clipboard?.writeText(val).catch(() => {});
    setCopiedUrl(val);
    setTimeout(() => setCopiedUrl(null), 1800);
  };

  const handleSaveAndSync = async (e?: React.FormEvent, triggerSync = true) => {
    if (e) e.preventDefault();
    setIsSavingConfig(true);
    if (triggerSync) setIsSyncing(true);
    setBanner(null);
    try {
      const res = await fetch('/api/edge/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloudUrl: cloudUrl.trim(),
          companyId: companyId.trim(),
          autoSyncIntervalSec: Number(autoSyncSec) || 30,
          syncNow: triggerSync,
        }),
      });
      const data = await res.json();
      if (triggerSync && data.syncResult) {
        if (data.syncResult.success) {
          setBanner({
            type: 'ok',
            text: `Синхронизация выполнена: отправлено событий ${data.syncResult.pushedEvents}, загружено документов ${data.syncResult.pulledDocs}`,
          });
        } else {
          setBanner({
            type: 'err',
            text: `Настройки сохранены, но облако недоступно: ${data.syncResult.error || 'нет связи'}. Цех продолжает работать автономно.`,
          });
        }
      } else {
        setBanner({ type: 'ok', text: 'Конфигурация сохранена.' });
      }
      await fetchStatus();
    } catch (err: any) {
      setBanner({ type: 'err', text: err?.message || 'Ошибка сохранения настроек' });
    } finally {
      setIsSavingConfig(false);
      setIsSyncing(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setBanner(null);
    try {
      const res = await fetch('/api/edge/sync-now', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setBanner({
          type: 'ok',
          text: `Синхронизация завершена: отправлено событий ${data.pushedEvents}, обновлено документов ${data.pulledDocs}`,
        });
      } else {
        setBanner({
          type: 'err',
          text: `Ошибка связи с облаком: ${data.error || 'нет подключения'}. Очередь цеха сохранена локально.`,
        });
      }
      await fetchStatus();
    } catch (err: any) {
      setBanner({ type: 'err', text: err?.message || 'Ошибка синхронизации' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBanner(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const cid = parsed.companyId || companyId.trim() || status?.edgeConfig?.companyId || 'default';
      const res = await fetch(`/api/erp/${encodeURIComponent(cid)}/sync/import-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package: parsed }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (parsed.companyId && !companyId) {
          setCompanyId(parsed.companyId);
        }
        setBanner({
          type: 'ok',
          text: `Пакет загружен: документов ${data.appliedDocs}, событий ${data.appliedEvents}`,
        });
        await fetchStatus();
      } else {
        setBanner({ type: 'err', text: data.error || 'Ошибка импорта файла' });
      }
    } catch (err: any) {
      setBanner({ type: 'err', text: `Не удалось прочитать файл: ${err?.message || err}` });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportReport = () => {
    const cid = companyId.trim() || status?.edgeConfig?.companyId;
    if (!cid) {
      setBanner({ type: 'err', text: 'Сначала укажите ID компании или загрузите пакет заказов.' });
      return;
    }
    window.location.href = `/api/erp/${encodeURIComponent(cid)}/sync/export-file?direction=edge_to_cloud`;
  };

  const handleOpenErp = () => {
    const cid = companyId.trim() || status?.edgeConfig?.companyId;
    const url = cid ? `/c/${encodeURIComponent(cid)}/erp` : '/erp';
    window.location.href = url;
  };

  const pendingCount = status?.pendingOutboxCount ?? 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Role Switcher Banner: Single .exe Installer -> Server PC vs Station Terminal */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-blue-600 mb-0.5">
                Единое приложение «Мебель План — Цех» для Windows (.exe)
              </div>
              <h2 className="text-base md:text-lg font-black text-slate-900">
                Выберите назначение этого компьютера в цехе:
              </h2>
            </div>

            <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 border border-slate-200 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setPcRole('server');
                  saveDesktopRole({ role: 'server' });
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                  pcRole === 'server'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Server className="w-4 h-4" />
                Главный ПК — Сервер цеха
              </button>

              <button
                type="button"
                onClick={() => {
                  setPcRole('workstation');
                  saveDesktopRole({ role: 'workstation' });
                  scanLanForServers();
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                  pcRole === 'workstation'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Monitor className="w-4 h-4" />
                Терминал участка (Клиент в сети)
              </button>
            </div>
          </div>

          {/* WORKSTATION CLIENT MODE: Automatic LAN Server Discovery */}
          {(pcRole === 'workstation' || pcRole === 'unconfigured') && (
            <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-emerald-900 font-black text-sm">
                    <Radar className={`w-4 h-4 text-emerald-600 ${isScanningLan ? 'animate-spin' : ''}`} />
                    Автоматический поиск запущенного Сервера цеха в локальной сети (Wi-Fi / LAN)
                  </div>
                  <p className="text-xs text-emerald-800/80 mt-0.5">
                    Сотрудникам участка не нужно открывать браузер или вводить IP-адрес — выберите найденный сервер один раз, и ярлык на Рабочем столе Windows будет сразу открывать экран участка.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={scanLanForServers}
                  disabled={isScanningLan}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center gap-2 shrink-0 cursor-pointer transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanningLan ? 'animate-spin' : ''}`} />
                  {isScanningLan ? 'Поиск серверов в сети...' : 'Найти серверы в сети'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Название этого рабочего места / участка
                  </label>
                  <select
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none"
                  >
                    {STATION_PRESETS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 w-full cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoOpenStation}
                      onChange={(e) => setAutoOpenStation(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      При запуске с Рабочего стола сразу открывать экран участка
                    </span>
                  </label>
                </div>
              </div>

              {/* Discovered LAN Servers List */}
              <div className="space-y-2">
                <div className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Доступные серверы «Мебель План» в вашей локальной сети ({discoveredServers.length}):
                </div>

                {discoveredServers.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      {isScanningLan
                        ? 'Сканируем локальную сеть 192.168.x.x / 10.x.x.x на наличие запущенного Сервера цеха...'
                        : 'Серверы в локальной сети пока не найдены. Убедитесь, что на главном ПК цеха запущена программа в режиме «Сервер цеха».'}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={manualServerInput}
                        onChange={(e) => setManualServerInput(e.target.value)}
                        placeholder="http://192.168.1.45:3000"
                        className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const raw = manualServerInput.trim().replace(/\/+$/, '');
                          if (!raw) return;
                          const url = raw.startsWith('http') ? raw : `http://${raw}`;
                          saveDesktopRole(
                            {
                              role: 'workstation',
                              targetServerUrl: url,
                              stationName,
                              autoOpenStation,
                            },
                            `${url}/erp`
                          );
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                      >
                        Подключить
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {discoveredServers.map((srv) => {
                      const isSelected = targetServerUrl === srv.url;
                      return (
                        <div
                          key={srv.url}
                          className={`p-4 rounded-2xl bg-white border-2 transition-all flex items-center justify-between gap-3 ${
                            isSelected ? 'border-emerald-500 shadow-sm' : 'border-slate-200'
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className="font-black text-sm text-slate-900 truncate">
                                {srv.companyName}
                              </span>
                              {srv.isSelf && (
                                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold">
                                  Этот ПК
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 font-mono truncate">
                              ПК: {srv.hostname} • {srv.ip}:{srv.port}
                            </div>
                            <div className="text-[11px] font-bold text-slate-600">
                              Заказов в работе: <span className="text-blue-600">{srv.ordersCount}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              saveDesktopRole(
                                {
                                  role: 'workstation',
                                  targetServerUrl: srv.url,
                                  targetCompanyId: srv.companyId,
                                  targetCompanyName: srv.companyName,
                                  stationName,
                                  autoOpenStation,
                                },
                                srv.erpUrl
                              )
                            }
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs transition-all"
                          >
                            {isSelected ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                            Открыть участок
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Top Header */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200 shrink-0">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Локальный цех-сервер активен (Порт {status?.port || 3000})
              </div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900">
                ERP Цех-Сервер {status?.edgeConfig?.companyName ? `— ${status.edgeConfig.companyName}` : ''}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                База данных: <span className="font-mono text-slate-700">{status?.dataDir || '...'}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              Синхронизировать с облаком
            </button>
            <button
              onClick={handleOpenErp}
              className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-blue-200"
            >
              <ExternalLink className="w-4 h-4" />
              Открыть ERP на этом ПК
            </button>
          </div>
        </div>

        {banner && (
          <div
            className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-semibold ${
              banner.type === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            {banner.type === 'ok' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
              <Layers className="w-4 h-4 text-blue-600" /> Заказов в цехе
            </div>
            <div className="text-2xl font-black text-slate-900">{status?.ordersCount ?? 0}</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
              <Users className="w-4 h-4 text-indigo-600" /> Сотрудников
            </div>
            <div className="text-2xl font-black text-slate-900">{status?.employeesCount ?? 0}</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
              <HardDrive className="w-4 h-4 text-amber-600" /> Очередь отправки
            </div>
            <div className="text-2xl font-black text-slate-900">{pendingCount}</div>
            <div className="text-[11px] text-slate-400">неотправленных событий</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
              {status?.edgeConfig?.lastSyncStatus === 'error' ? (
                <WifiOff className="w-4 h-4 text-amber-600" />
              ) : (
                <Wifi className="w-4 h-4 text-emerald-600" />
              )}
              Последний обмен
            </div>
            <div className="text-sm font-black text-slate-900 mt-1">
              {status?.edgeConfig?.lastSyncAt
                ? new Date(status.edgeConfig.lastSyncAt).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Еще не выполнялся'}
            </div>
          </div>
        </div>

        {/* Main 2-column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LAN Access for Multi-PC */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-base text-slate-900">
                Подключение других ПК и планшетов цеха
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Все компьютеры, терминалы со сканерами и планшеты в локальной сети (Wi-Fi / LAN) открывают ERP без интернета по адресу ниже:
            </p>

            <div className="space-y-2">
              {(status?.lanUrls || [primaryLanUrl]).map((url) => (
                <div
                  key={url}
                  className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200"
                >
                  <span className="font-mono text-xs font-bold text-blue-700 truncate">{url}</span>
                  <button
                    onClick={() => handleCopy(url)}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedUrl === url ? 'Скопировано' : 'Копия'}
                  </button>
                </div>
              ))}
            </div>

            {qrDataUrl && (
              <div className="pt-2 flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <img src={qrDataUrl} alt="QR ссылка цеха" className="w-40 h-40 rounded-xl bg-white p-1.5 border border-slate-200" />
                <span className="text-[11px] font-semibold text-slate-500 mt-2 text-center">
                  Отсканируйте камерой телефона или планшета для быстрого входа на участке
                </span>
              </div>
            )}
          </div>

          {/* Right Column: Cloud Sync + USB Manual Sync */}
          <div className="lg:col-span-7 space-y-6">
            {/* Cloud Auto-Sync Settings */}
            <form
              onSubmit={(e) => handleSaveAndSync(e, true)}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-emerald-600" />
                  <h2 className="font-bold text-base text-slate-900">
                    Авто-синхронизация с облачным сервером
                  </h2>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> каждые {autoSyncSec} сек
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    URL основного облака ERP
                  </label>
                  <input
                    type="text"
                    value={cloudUrl}
                    onChange={(e) => setCloudUrl(e.target.value)}
                    placeholder="https://vash-domen.ru"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ID компании (скопируйте в Настройках облака)
                  </label>
                  <input
                    type="text"
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    placeholder="например: e5om9lzxh"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="text-[11px] text-slate-500">
                  Когда появляется интернет или мобильная точка доступа, сервер сам отправит сканы в облако.
                </div>
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
                >
                  <PackageCheck className="w-4 h-4" />
                  Сохранить и забрать заказы
                </button>
              </div>
            </form>

            {/* Offline USB / File Exchange */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-amber-600" />
                <h2 className="font-bold text-base text-slate-900">
                  Ручной обмен файлом (.erpsync.json) — если интернета в цехе нет вообще
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Скачайте пакет заказов в офисе на сайте, перенесите на флешке (или в мессенджере) на компьютер цеха и загрузите сюда. В конце смены выгрузите отчёт цеха обратно в облако.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.erpsync.json"
                onChange={handleImportFile}
                className="hidden"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/70 hover:bg-blue-100/70 text-blue-900 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Upload className="w-4 h-4 text-blue-600" />
                  Загрузить заказы с флешки (.erpsync)
                </button>

                <button
                  type="button"
                  onClick={handleExportReport}
                  className="p-4 rounded-2xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-900 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  Выгрузить отчёт цеха (.erpsync)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
