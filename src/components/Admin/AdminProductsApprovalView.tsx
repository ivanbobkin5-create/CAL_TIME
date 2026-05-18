import React, { useEffect, useState } from "react";
import { Check, X, Edit2 } from "lucide-react";

interface DbProduct {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  status: string;
}

export const AdminProductsApprovalView = () => {
  const [products, setProducts] = useState<DbProduct[]>([]);

  useEffect(() => {
    fetch("/api/products")
      .then(res => res.json())
      .then(setProducts);
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };

  return (
    <div className="p-6">
      <h2 className="mb-4 text-2xl font-bold">Очередь на модерацию</h2>
      <div className="space-y-4">
        {products.filter(p => p.status === "PENDING").map(p => (
          <div key={p.id} className="p-4 bg-white border rounded shadow">
            <h3 className="font-bold">{p.name}</h3>
            <p>{p.description}</p>
            <p>Цена: {p.price}</p>
            <div className="flex gap-2 mt-2">
              <button 
                onClick={() => updateStatus(p.id, "APPROVED")}
                className="p-2 text-white bg-green-600 rounded"
              >
                <Check size={16} /> Принять
              </button>
              <button 
                onClick={() => updateStatus(p.id, "REJECTED")}
                className="p-2 text-white bg-red-600 rounded"
              >
                <X size={16} /> Отклонить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
