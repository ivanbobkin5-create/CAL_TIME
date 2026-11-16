const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const badBlockStart = code.indexOf('                            const exists = current.some((rp: any) => String(typeof rp === "object" ? rp.id : rp) === String(prodId));\n                            if (exists) {\n                              alert("Этот товар уже добавлен в список сопутствующих!");\n                              return;\n                            }\n                               return (\n                      <div className="absolute top-3 right-3 flex flex-col gap-1.5 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 z-20">');
const badBlockEndStr = '                    );                 })()} hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 justify-center cursor-pointer"';
const badBlockEnd = code.indexOf(badBlockEndStr, badBlockStart) + badBlockEndStr.length;

if (badBlockStart !== -1 && badBlockEnd !== -1) {
  const goodCode = `                            const exists = current.some((rp: any) => String(typeof rp === "object" ? rp.id : rp) === String(prodId));
                            if (exists) {
                              alert("Этот товар уже добавлен в список сопутствующих!");
                              return;
                            }
                            setNewProduct((prev: any) => ({
                              ...prev,
                              requiredProducts: [...(prev.requiredProducts || []), { id: prodId, qty: 1 }]
                            }));
                            selectEl.value = "";
                          } else {
                            alert("Пожалуйста, выберите товар из списка.");
                          }
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-colors shrink-0 cursor-pointer"
                      >
                        Добавить
                      </button>
                    </div>

                    {(newProduct.requiredProducts || []).length > 0 ? (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {(newProduct.requiredProducts || []).map((rp: any, idx: number) => {
                          const reqId = typeof rp === "object" ? rp.id : rp;
                          const reqQty = typeof rp === "object" ? rp.qty || 1 : 1;
                          const reqProduct = catalogProducts.find((cp) => String(cp.id) === String(reqId));
                          return (
                            <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-xl border border-gray-100 text-xs">
                              <span className="font-semibold text-gray-700 truncate max-w-[200px] sm:max-w-[300px]" title={reqProduct?.name || reqId}>
                                {reqProduct?.name || ("Товар [ID: " + reqId + "]" )}
                              </span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={reqQty}
                                  onChange={(e) => {
                                    const newQty = parseInt(e.target.value) || 1;
                                    const updated = (newProduct.requiredProducts || []).map((item: any, i: number) => {
                                      if (i === idx) {
                                        return typeof item === "object" ? { ...item, qty: newQty } : { id: item, qty: newQty };
                                      }
                                      return item;
                                    });
                                    setNewProduct((prev: any) => ({ ...prev, requiredProducts: updated }));
                                  }}
                                  className="w-12 px-1.5 py-0.5 text-center text-xs font-bold border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <span className="text-[10px] text-gray-400 font-medium">шт.</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewProduct((prev: any) => ({
                                      ...prev,
                                      requiredProducts: (prev.requiredProducts || []).filter((_: any, i: number) => i !== idx)
                                    }));
                                  }}
                                  className="text-red-500 hover:bg-red-50 p-1 rounded-lg transition-colors cursor-pointer"
                                  title="Удалить сопутствующий товар"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4 border border-dashed border-gray-200 rounded-xl text-gray-400 text-xs font-medium">
                        Сопутствующие товары не добавлены
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-4 rounded-b-3xl z-10">
              <button
                onClick={resetForm}
                disabled={isSavingProduct}
                className="px-8 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 hover:text-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateProduct}
                disabled={!newProduct.name || isSavingProduct}
                className="px-12 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 justify-center cursor-pointer"`;
  
  code = code.substring(0, badBlockStart) + goodCode + code.substring(badBlockEnd);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Fixed code successfully.");
} else {
  console.log("Could not find the bad block bounds. Start:", badBlockStart, "End:", badBlockEnd);
}
