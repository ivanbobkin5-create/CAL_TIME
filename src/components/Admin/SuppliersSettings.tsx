import React, { useState } from "react";
import { Supplier } from "../../types";
import { Trash2, Plus, GripVertical } from "lucide-react";

export const SuppliersSettings = ({
  companyId,
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
            <p className="font-medium text-sm text-gray-700">Категории товаров:</p>
            <div className="flex flex-wrap gap-2">
                {productCategories.map((cat) => (
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
        </div>
        
        <button
          onClick={handleAddSupplier}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>

      <div className="space-y-2">
        {suppliers.map((supplier) => (
          <div key={supplier.id} className="flex items-center justify-between p-3 border rounded">
            <div>
              <p className="font-bold">{supplier.name}</p>
              <p className="text-sm text-gray-500">{supplier.categories.join(", ")}</p>
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
