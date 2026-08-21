import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  RefreshCw, 
  Bot, 
  User, 
  Info, 
  HelpCircle, 
  Factory, 
  Layers, 
  AlertCircle,
  FileText,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductionOrder, ERPEmployee, MachineEquipment, ERPCompanySettings } from '../types';

interface ERPCopilotViewProps {
  companyId: string;
  companyName?: string;
  settings: ERPCompanySettings;
  orders: ProductionOrder[];
  employees: ERPEmployee[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const ERPCopilotView: React.FC<ERPCopilotViewProps> = ({
  companyId,
  companyName = 'Производство',
  settings,
  orders = [],
  employees = []
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'msg-welcome',
        role: 'assistant',
        text: `Приветствую! Я — ваш **ИИ-ассистент Copilot**. \n\nЯ полностью подключен к вашей базе данных ERP. Вы можете задать мне любые вопросы о текущих заказах, загруженности оборудования, сотрудниках или настроенных правилах примечаний. Например, спросите меня:\n\n* *«Какие заказы сейчас в производстве?»*\n* *«Есть ли просроченные заказы?»*\n* *«Какие правила обработки пазов у нас настроены?»*`,
        timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Preset prompts
  const PRESET_PROMPTS = [
    { text: 'Какие заказы в работе?', label: '📋 Заказы в работе' },
    { text: 'Есть ли задержки по заказам?', label: '⚠️ Анализ задержек' },
    { text: 'Покажи статус оборудования', label: '⚙️ Станки и оборудование' },
    { text: 'Объясни правила примечаний', label: '🔍 Правила ЧПУ и пазов' }
  ];

  // Helper to parse very simple markdown for rendering
  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let content: React.ReactNode = line;

      // Unordered lists
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        const listText = line.trim().substring(2);
        content = (
          <li className="ml-4 list-disc my-1 text-slate-700">
            {parseBoldText(listText)}
          </li>
        );
      } else {
        content = parseBoldText(line);
      }

      // Headers
      if (line.trim().startsWith('### ')) {
        return (
          <h4 key={idx} className="text-xs font-black text-slate-900 uppercase tracking-wider mt-4 mb-2">
            {line.trim().substring(4)}
          </h4>
        );
      }
      if (line.trim().startsWith('## ')) {
        return (
          <h3 key={idx} className="text-sm font-black text-slate-900 mt-5 mb-2.5">
            {line.trim().substring(3)}
          </h3>
        );
      }

      return (
        <p key={idx} className="min-h-[1.25rem] leading-relaxed my-1">
          {content}
        </p>
      );
    });
  };

  // Nested bold parsing **text** -> <strong>text</strong>
  const parseBoldText = (text: string): React.ReactNode => {
    const parts = text.split('**');
    if (parts.length <= 1) return text;
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-bold text-slate-950 bg-slate-100/80 px-1 rounded">{part}</strong>;
      }
      return part;
    });
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Build history payload
      const history = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        text: m.text
      }));

      const res = await fetch(`/api/erp/${companyId}/copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          history: history
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Ошибка ИИ-сервера');
      }

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        text: data.text || 'Извините, не удалось получить внятный ответ.',
        timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ошибка соединения с ИИ-ассистентом. Проверьте сетевое подключение.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'msg-welcome',
        role: 'assistant',
        text: `Приветствую! Чат очищен. Спросите меня о текущих заказах, сотрудниках или оборудовании.`,
        timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setError(null);
  };

  const equipmentList = settings.equipmentList || [];
  const noteRules = settings.noteRules || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-10rem)] items-stretch">
      
      {/* LEFT CHAT PANEL (8 cols) */}
      <div className="lg:col-span-8 flex flex-col bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden h-full">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">ИИ Ассистент Copilot</h3>
              <p className="text-[10px] text-slate-400 font-medium">Интерактивный помощник на базе Google Gemini</p>
            </div>
          </div>

          <button
            onClick={clearChat}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5"
            title="Очистить диалог"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Очистить
          </button>
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 bg-slate-50/20">
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex gap-3 max-w-[85%] ${isAssistant ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold shadow-sm ${
                    isAssistant ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-blue-600 text-white'
                  }`}>
                    {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  {/* Body */}
                  <div className="space-y-1">
                    <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                      isAssistant 
                        ? 'bg-white text-slate-800 border border-slate-200/60 shadow-sm rounded-tl-none' 
                        : 'bg-blue-600 text-white rounded-tr-none'
                    }`}>
                      {renderMessageContent(msg.text)}
                    </div>
                    <div className={`text-[10px] text-slate-400 px-1 font-mono ${!isAssistant && 'text-right'}`}>
                      {msg.timestamp}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3 max-w-[85%] mr-auto">
              <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/60 shadow-sm rounded-tl-none text-xs text-slate-400 flex items-center gap-2 font-medium">
                <span className="flex space-x-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                Анализирую данные производства...
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-xs text-red-800 items-start">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <strong className="font-bold">Ошибка: </strong>
                {error}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input and Preset prompts */}
        <div className="p-4 border-t border-slate-100 bg-white space-y-4">
          {/* Presets */}
          <div className="flex flex-wrap gap-2">
            {PRESET_PROMPTS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(preset.text)}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 font-bold text-[10px] transition-all cursor-pointer whitespace-nowrap disabled:opacity-55"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Input field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Спросите что-нибудь о заказах или цехе..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 text-white disabled:text-slate-400 transition-all shadow-md shadow-indigo-100 disabled:shadow-none cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT SIDEBAR PANEL: CONTEXT ANALYZER (4 cols) */}
      <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-5 flex flex-col overflow-y-auto h-full">
        <div>
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Статус анализатора</h4>
          <h3 className="font-bold text-slate-900 text-sm">Подключенный контекст</h3>
          <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">Данные, которые ИИ учитывает при генерации каждого ответа в реальном времени</p>
        </div>

        <hr className="border-slate-100" />

        {/* Context Stats Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-700">Заказы в ERP</span>
            </div>
            <span className="font-mono text-xs font-black text-slate-900 bg-white border px-2 py-0.5 rounded-lg shadow-sm">
              {orders.length}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold text-slate-700">Сотрудники</span>
            </div>
            <span className="font-mono text-xs font-black text-slate-900 bg-white border px-2 py-0.5 rounded-lg shadow-sm">
              {employees.length}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <Factory className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-700">Оборудование</span>
            </div>
            <span className="font-mono text-xs font-black text-slate-900 bg-white border px-2 py-0.5 rounded-lg shadow-sm">
              {equipmentList.length}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-slate-700">Тех. примечания</span>
            </div>
            <span className="font-mono text-xs font-black text-slate-900 bg-white border px-2 py-0.5 rounded-lg shadow-sm">
              {noteRules.length}
            </span>
          </div>
        </div>

        <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100/50 space-y-2 mt-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Безопасность ИИ
          </div>
          <p className="text-[10px] text-indigo-900 leading-relaxed">
            Все запросы к ИИ обрабатываются строго на стороне сервера. Персональные ключи и коммерческие данные компании надежно скрыты и не передаются в браузер клиентов.
          </p>
        </div>
      </div>

    </div>
  );
};
