const fs = require('fs');
let text = fs.readFileSync('src/components/Procurement/ProcurementView.tsx', 'utf8');
const searchElement = `                                                                <div className="text-left min-w-0 w-full">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="text-[11px] font-black text-gray-900 truncate">{item.invoiceNumber || "Без номера"}</span>
                                                                        <span className={cn("text-[8px] font-black px-2 py-0.5 rounded-full border shrink-0", config.bg, config.color, config.border)}>
                                                                            {item.status}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3">`;

const replaceElement = `                                                                <div className="text-left min-w-0 w-full">
                                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                        <span className="text-[11px] font-black text-gray-900 truncate">{item.invoiceNumber || "Без номера"}</span>
                                                                        <span className={cn("text-[8px] font-black px-2 py-0.5 rounded-full border shrink-0", config.bg, config.color, config.border)}>
                                                                            {item.status}
                                                                        </span>
                                                                        {item.hasProblem && (
                                                                            <span className="text-[8px] font-black px-2 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-rose-600 flex items-center gap-1 shrink-0">
                                                                                <AlertTriangle className="w-2.5 h-2.5" />
                                                                                ВНИМАНИЕ
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3">`;
                                                                    
text = text.replace(searchElement, replaceElement);
fs.writeFileSync('src/components/Procurement/ProcurementView.tsx', text);
