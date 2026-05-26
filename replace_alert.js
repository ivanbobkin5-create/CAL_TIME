const fs = require('fs');
const file = 'src/components/Procurement/ProcurementView.tsx';
let txt = fs.readFileSync(file, 'utf8');
txt = txt.replace(
    '<div className="flex items-center gap-2 mb-1">\n                                                                        <span className="text-[11px] font-black text-gray-900 truncate">{item.invoiceNumber || "Без номера"}</span>\n                                                                        <span className={cn("text-[8px] font-black px-2 py-0.5 rounded-full border shrink-0", config.bg, config.color, config.border)}>\n                                                                            {item.status}\n                                                                        </span>\n                                                                    </div>',
    `<div className="flex flex-wrap items-center gap-2 mb-1">
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
                                                                    </div>`
);
fs.writeFileSync(file, txt);
