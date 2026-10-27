const fs = require('fs');
let content = fs.readFileSync('src/components/Procurement/ProcurementView.tsx', 'utf8');

content = content.replace(
  'import { Supplier, ProcurementSettings } from \'../../types\';',
  'import { Banknote } from \'lucide-react\';\nimport { Supplier, ProcurementSettings } from \'../../types\';'
);

content = content.replace(
  'const [editArrivalDate, setEditArrivalDate] = useState(\'\');',
  'const [editArrivalDate, setEditArrivalDate] = useState(\'\');\n    const [editIsCredit, setEditIsCredit] = useState(false);'
);

content = content.replace(
  'arrivalDate: editArrivalDate,\n                updatedAt: new Date().toISOString()',
  'arrivalDate: editArrivalDate,\n                isCredit: editIsCredit,\n                updatedAt: new Date().toISOString()'
);

content = content.replace(
  'arrivalDate: editArrivalDate,\n                updatedAt: new Date().toISOString()',
  'arrivalDate: editArrivalDate,\n                isCredit: editIsCredit,\n                updatedAt: new Date().toISOString()'
);

content = content.replace(
  'setEditArrivalDate(\'\');',
  'setEditArrivalDate(\'\');\n                setEditIsCredit(false);'
);

content = content.replace(
  'setEditArrivalDate(\'\');',
  'setEditArrivalDate(\'\');\n                                                   setEditIsCredit(false);'
);

content = content.replace(
  'setEditArrivalDate(\'\');',
  'setEditArrivalDate(\'\');\n                                                   setEditIsCredit(false);'
);

content = content.replace(
  'setEditArrivalDate(item.arrivalDate || \'\');',
  'setEditArrivalDate(item.arrivalDate || \'\');\n                                                                       setEditIsCredit(item.isCredit || false);'
);

content = content.replace(
  '<div className="flex justify-end gap-3 mt-8">',
  `{editStatus === 'Заказано' && (
      <label className="flex items-center gap-3 col-span-2 cursor-pointer mt-4 p-4 border-2 border-gray-100 rounded-2xl hover:border-blue-200 transition-colors">
          <input 
              type="checkbox" 
              checked={editIsCredit} 
              onChange={(e) => setEditIsCredit(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded-lg border-2 border-gray-300 focus:ring-blue-500 focus:ring-2"
          />
          <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-900">Везут в долг</span>
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mt-0.5">Оплата будет позже</span>
          </div>
      </label>
   )}\n                                                   <div className="flex justify-end gap-3 mt-8">`
);

let result = false;
const idx = content.indexOf('{(items.some((i: any) => i.hasProblem) || isPartialReceived) && (');
if (idx > 0) {
    const startStr = `{(items.some((i: any) => i.hasProblem) || isPartialReceived) && (
                                                                                    <div className="flex items-center gap-1 bg-white border border-rose-100 text-rose-600 px-1.5 py-0.5 rounded shadow-sm text-[8px] font-black uppercase tracking-widest w-fit">
                                                                                        <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                                                                        ВНИМАНИЕ
                                                                                    </div>
                                                                                )}`;
                                                                                
    const repStr = `{(items.some((i: any) => i.hasProblem) || isPartialReceived) && (
                                                                                    <div className="flex items-center gap-1 bg-white border border-rose-100 text-rose-600 px-1.5 py-0.5 rounded shadow-sm text-[8px] font-black uppercase tracking-widest w-fit">
                                                                                        <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                                                                        ВНИМАНИЕ
                                                                                    </div>
                                                                                )}
                                                                                {items.some((i: any) => i.status === 'Заказано' && i.isCredit) && (
                                                                                    <div className="flex items-center gap-1 bg-white border border-amber-200 text-amber-700 px-1.5 py-0.5 rounded shadow-sm text-[8px] font-black uppercase tracking-widest w-fit mt-1">
                                                                                        <Banknote className="w-2.5 h-2.5 shrink-0" />
                                                                                        В ДОЛГ
                                                                                    </div>
                                                                                )}`;
    content = content.replace(startStr, repStr);
}

fs.writeFileSync('src/components/Procurement/ProcurementView.tsx', content);
