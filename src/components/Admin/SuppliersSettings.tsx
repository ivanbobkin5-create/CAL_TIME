import React, { useState, useMemo } from "react";
import { Supplier } from "../../types";
import { Trash2, Plus, GripVertical } from "lucide-react";

export const SuppliersSettings = ({
  companyId,
  companyData,
  suppliers,
  setSuppliers,
  productCategories,
  db,
  doc,
  setDoc,
  deleteDoc,
  collection
}: {
  companyId?: string;
  companyData?: any;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  productCategories: string[];
  db: any;
  doc: any;
  setDoc: any;
  deleteDoc: any;
  collection: any;
}) => {
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierCategories, setNewSupplierCategories] = useState<string[]>([]);
  const [customCategoryInput, setCustomCategoryInput] = useState("");

  const customCategories = useMemo(() => {
    const allGlobalCats = new Set(productCategories);
    const existingCustoms = new Set<string>();
    
    // Add custom categories explicitly saved in company settings
    if (companyData?.customSupplierCategories) {
        companyData.customSupplierCategories.forEach((cat: string) => existingCustoms.add(cat));
    }
    
    suppliers.forEach(supplier => {
      supplier.categories?.forEach(cat => {
        if (!allGlobalCats.has(cat)) {
          existingCustoms.add(cat);
        }
      });
    });
    return Array.from(existingCustoms).sort();
  }, [suppliers, productCategories, companyData?.customSupplierCategories]);

  const handleAddSupplier = async () => {
    if (!newSupplierName.trim() || !companyId) return;
    const newSupplier: Supplier = {
      id: Math.random().toString(36).substr(2, 9),
      name: newSupplierName,
      categories: newSupplierCategories,
    };
    await setDoc(doc(db, 'companies', companyId, 'suppliers', newSupplier.id), newSupplier);
    setSuppliers([...suppliers, newSupplier]);
    setNewSupplierName("");
    setNewSupplierCategories([]);
  };

  const handleRemoveSupplier = async (id: string) => {
    if (!companyId) return;
    await deleteDoc(doc(db, 'companies', companyId, 'suppliers', id));
    setSuppliers(suppliers.filter((s) => s.id !== id));
  };

  const toggleCategory = (cat: string) => {
    setNewSupplierCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleAddCustomCategory = async () => {
    const trimmed = customCategoryInput.trim();
    if (trimmed && !newSupplierCategories.includes(trimmed)) {
      setNewSupplierCategories([...newSupplierCategories, trimmed]);
      setCustomCategoryInput("");
      
      // Save it globally so it's not lost when we create a new supplier later
      if (companyId) {
          const currentCustoms = companyData?.customSupplierCategories || [];
          if (!currentCustoms.includes(trimmed)) {
              await setDoc(doc(db, 'companies', companyId), {
                  customSupplierCategories: [...currentCustoms, trimmed]
              }, { merge: true });
          }
      }
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Настройка поставщиков</h2>
      
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <h3 className="font-semibold">Добавить нового поставщика</h3>
        <input
          type="text"
          value={newSupplierName}
          onChange={(e) => setNewSupplierName(e.target.value)}
          placeholder="Название поставщика"
          className="w-full p-2 border rounded"
        />
        
        <div className="space-y-2">
            <p className="font-medium text-sm text-gray-700">Категории (товары и сырье):</p>
            <div className="flex flex-wrap gap-2">
                {Array.from(new Set([...productCategories, ...customCategories, ...newSupplierCategories])).map((cat) => (
                    <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1 rounded-full text-sm ${
                            newSupplierCategories.includes(cat)
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-800"
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
            
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={customCategoryInput}
                onChange={(e) => setCustomCategoryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomCategory();
                  }
                }}
                placeholder="Своя категория (например, 'Стекла')"
                className="flex-1 p-2 border rounded text-sm max-w-sm"
              />
              <button
                onClick={handleAddCustomCategory}
                className="bg-gray-200 text-gray-700 px-3 py-2 rounded hover:bg-gray-300 text-sm"
              >
                Добавить
              </button>
            </div>
        </div>
        
        <button
          onClick={handleAddSupplier}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Сохранить поставщика
        </button>
      </div>

      <div className="space-y-2">
        {suppliers.map((supplier) => (
          <div key={supplier.id} className="flex items-center justify-between p-3 border rounded">
            <div>
              <p className="font-bold">{supplier.name}</p>
              <p className="text-sm text-gray-500">{supplier.categories?.join(", ")}</p>
            </div>
            <button
              onClick={() => handleRemoveSupplier(supplier.id)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
