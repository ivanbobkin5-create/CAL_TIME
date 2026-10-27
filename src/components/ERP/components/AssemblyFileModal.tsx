import React, { useState, useEffect } from 'react';
import { Wrench, X, Download, Upload, FileText, Trash2, Copy, Check, Search, Eye, File } from 'lucide-react';
import { ProductionOrder } from '../types';

interface AssemblyFileModalProps {
  order: ProductionOrder;
  isOpen: boolean;
  onClose: () => void;
  onUpdateOrder: (updatedOrder: ProductionOrder) => void;
}

export const AssemblyFileModal: React.FC<AssemblyFileModalProps> = ({
  order,
  isOpen,
  onClose,
  onUpdateOrder
}) => {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const assemblyData = order.assemblyFileData;

  // Generate local Blob URL for PDF preview to bypass browser iframe restrictions
  useEffect(() => {
    if (assemblyData?.fileContent && (assemblyData.fileName.toLowerCase().endsWith('.pdf') || assemblyData.fileContent.startsWith('data:application/pdf'))) {
      try {
        const content = assemblyData.fileContent;
        if (content.startsWith('data:')) {
          const parts = content.split(';base64,');
          if (parts.length === 2) {
            const contentType = parts[0].split(':')[1] || 'application/pdf';
            const raw = window.atob(parts[1]);
            const rawLength = raw.length;
            const uInt8Array = new Uint8Array(rawLength);
            for (let i = 0; i < rawLength; ++i) {
              uInt8Array[i] = raw.charCodeAt(i);
            }
            const blob = new Blob([uInt8Array], { type: contentType });
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
            return () => {
              URL.revokeObjectURL(url);
            };
          }
        }
      } catch (e) {
        console.error('Ошибка создания Blob URL для PDF:', e);
      }
    }
    setPdfUrl(null);
  }, [assemblyData?.fileContent, assemblyData?.fileName, isOpen]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!assemblyData?.fileContent) {
      alert('Содержимое файла не сохранено в памяти');
      return;
    }

    const content = assemblyData.fileContent;
    const isDataUrl = content.startsWith('data:');
    let url = '';

    if (isDataUrl) {
      try {
        const parts = content.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        const blob = new Blob([uInt8Array], { type: contentType });
        url = URL.createObjectURL(blob);
      } catch (e) {
        url = content;
      }
    } else {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      url = URL.createObjectURL(blob);
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = assemblyData.fileName || `Assembly_${order.orderNumber}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  };

  const handleCopyContent = () => {
    if (assemblyData?.fileContent) {
      const isPdf = assemblyData.fileName.toLowerCase().endsWith('.pdf') || assemblyData.fileContent.startsWith('data:');
      if (isPdf) {
        alert('Невозможно скопировать двоичные данные PDF как текст.');
        return;
      }
      navigator.clipboard.writeText(assemblyData.fileContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const isPdfFile = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
      let fileContent = '';

      if (isPdfFile) {
        fileContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else {
        const textContent = await file.text();
        fileContent = textContent.substring(0, 500000);
      }

      const updatedOrder: ProductionOrder = {
        ...order,
        assemblyFileData: {
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('ru-RU'),
          fileContent: fileContent
        }
      };
      onUpdateOrder(updatedOrder);
      alert(`Файл Сборки "${file.name}" успешно прикреплен!`);
    } catch (err: any) {
      alert(err.message || 'Ошибка загрузки файла Сборка');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteFile = () => {
    if (window.confirm(`Вы уверены, что хотите удалить файл Сборка "${assemblyData?.fileName}" из заказа №${order.orderNumber}?`)) {
      const updatedOrder: ProductionOrder = {
        ...order,
        assemblyFileData: undefined
      };
      onUpdateOrder(updatedOrder);
      onClose();
    }
  };

  const formattedSize = assemblyData?.fileSize 
    ? `${(assemblyData.fileSize / 1024).toFixed(1)} КБ` 
    : '—';

  const isPdf = assemblyData?.fileName?.toLowerCase().endsWith('.pdf') || assemblyData?.fileContent?.startsWith('data:application/pdf');
  const lines = (!isPdf && assemblyData?.fileContent) ? assemblyData.fileContent.split('\n') : [];
  const filteredLines = lines.filter(line => 
    !searchQuery || line.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 my-auto">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0 bg-purple-50/50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
                Технический файл Сборка
              </div>
              <h3 className="text-lg font-black text-slate-900">
                Заказ №{order.orderNumber} — {assemblyData?.fileName || 'Файл Сборка не загружен'}
              </h3>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-2xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {!assemblyData ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                <Wrench className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">Файл Сборка еще не прикреплен</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Прикрепите чертеж, спецификацию сборки или сборочные инструкции (.sb, .csv, .txt, .pdf) к данному заказу.
                </p>
              </div>

              <label className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Загрузить файл Сборка</span>
                <input 
                  type="file"
                  accept=".sb,.csv,.tsv,.txt,.pdf,.json,.xml,.xlsx,.xls"
                  onChange={handleReplaceFile}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>
          ) : (
            <>
              {/* Info Badges & Action Toolbar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Имя файла</div>
                  <div className="text-xs font-black text-slate-900 truncate mt-0.5">{assemblyData.fileName}</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Размер файла</div>
                  <div className="text-xs font-black text-slate-900 mt-0.5">{formattedSize}</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Дата загрузки</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">{assemblyData.uploadedAt || 'Ранее'}</div>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="flex items-center justify-between gap-3 flex-wrap bg-purple-50/60 p-3.5 rounded-2xl border border-purple-200/80">
                <div className="flex items-center gap-2 flex-wrap">
                  {assemblyData.fileContent && (
                    <button
                      onClick={handleDownload}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Скачать файл</span>
                    </button>
                  )}

                  {!isPdf && assemblyData.fileContent && (
                    <button
                      onClick={handleCopyContent}
                      className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-purple-900 font-bold text-xs border border-purple-200 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'Скопировано!' : 'Скопировать текст'}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Заменить файл</span>
                    <input 
                      type="file"
                      accept=".sb,.csv,.tsv,.txt,.pdf,.json,.xml,.xlsx,.xls"
                      onChange={handleReplaceFile}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>

                  <button
                    onClick={handleDeleteFile}
                    className="p-2 rounded-xl hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors cursor-pointer"
                    title="Удалить файл Сборка"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Text / PDF File Preview Panel */}
              {isPdf ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-purple-600" />
                    Интерактивный просмотр чертежа PDF
                  </h4>
                  {pdfUrl ? (
                    <div className="border border-slate-200 rounded-3xl overflow-hidden bg-slate-100 shadow-inner">
                      <iframe 
                        src={`${pdfUrl}#toolbar=1&navpanes=0&statusbar=0`}
                        title="PDF Viewer"
                        className="w-full h-[600px] border-none"
                      />
                    </div>
                  ) : (
                    <div className="p-10 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                      Генерируется предпросмотр документа PDF...
                    </div>
                  )}
                </div>
              ) : assemblyData.fileContent ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-purple-600" />
                      Просмотр содержимого файла ({lines.length} строк)
                    </h4>

                    {lines.length > 1 && (
                      <div className="relative w-64">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Поиск по содержимому..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-900 text-slate-200 rounded-2xl p-4 font-mono text-xs max-h-96 overflow-y-auto shadow-inner space-y-1">
                    {filteredLines.length > 0 ? (
                      filteredLines.map((line, idx) => (
                        <div key={idx} className="hover:bg-slate-800/80 px-2 py-0.5 rounded flex items-start gap-3">
                          <span className="text-slate-600 select-none text-[10px] w-8 shrink-0 text-right">{idx + 1}</span>
                          <span className="whitespace-pre-wrap break-all">{line}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 text-center py-6">Ничего не найдено по запросу "{searchQuery}"</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                  Содержимое файла недоступно для предпросмотра. Вы можете скачать его с помощью кнопки «Скачать файл».
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end shrink-0 bg-slate-50/50 rounded-b-3xl">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
