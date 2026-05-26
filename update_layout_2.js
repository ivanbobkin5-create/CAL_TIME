const fs = require('fs');
const file = 'src/components/Procurement/ProcurementView.tsx';
let content = fs.readFileSync(file, 'utf8');

const t1 = `<div className="flex items-start justify-between mb-3 gap-2">
                                                                            <div className={cn("text-[9px] font-black uppercase tracking-widest flex items-start gap-1.5 px-2.5 py-1.5 rounded-xl border leading-tight text-left break-words", 
                                                                                isOverBudget ? "bg-rose-100 text-rose-700 border-rose-200" :
                                                                                isFullyReceived ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                                                                                cn(config.color, "bg-white border-white/50")
                                                                            )}>
                                                                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 mt-[2px]", isOverBudget ? "bg-rose-500" : config.dot)} />
                                                                                <div className="flex flex-col gap-1 w-full">
                                                                                    <span>{mainStatus} {items.length > 1 && <span className="opacity-50">({items.length})</span>}</span>
                                                                                    {(items.some((i: any) => i.hasProblem) || isPartialReceived) && (
                                                                                        <div className="flex items-center gap-1 mt-0.5">
                                                                                            <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0 animate-pulse" />
                                                                                            <span className="text-[8px] text-rose-600">ВНИМАНИЕ</span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all shadow-sm shrink-0 mt-0.5">
                                                                                <ChevronRight className="w-3.5 h-3.5 text-blue-500" />
                                                                            </div>
                                                                        </div>`;

const r1 = `<div className="flex items-start justify-between min-w-0 mb-3 gap-1">
                                                                            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                                                                                <div className={cn("text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 min-w-0", 
                                                                                    isOverBudget ? "text-rose-600" :
                                                                                    isFullyReceived ? "text-emerald-600" :
                                                                                    config.color
                                                                                )}>
                                                                                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isOverBudget ? "bg-rose-500" : config.dot)} />
                                                                                    <span className="truncate" title={mainStatus}>{mainStatus} {items.length > 1 && <span className="opacity-50">({items.length})</span>}</span>
                                                                                </div>
                                                                                {(items.some((i: any) => i.hasProblem) || isPartialReceived) && (
                                                                                    <div className="flex items-center gap-1 bg-white border border-rose-100 text-rose-600 px-1.5 py-0.5 rounded shadow-sm text-[8px] font-black uppercase tracking-widest w-fit">
                                                                                        <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                                                                        ВНИМАНИЕ
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all shadow-sm shrink-0">
                                                                                <ChevronRight className="w-3 h-3 text-blue-500" />
                                                                            </div>
                                                                        </div>`;

if (content.includes(t1)) {
    content = content.replace(t1, r1);
    fs.writeFileSync(file, content);
    console.log("Replaced successfully!");
} else {
    console.log("Target not found!");
}
