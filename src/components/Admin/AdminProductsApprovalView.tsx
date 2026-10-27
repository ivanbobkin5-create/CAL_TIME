import React, { useEffect, useState } from "react";
import { Check, X, Edit2 } from "lucide-react";

interface DbProduct {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  status: string;
  photos?: string[];
}

export const AdminProductsApprovalView = () => {
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [activeHistory, setActiveHistory] = useState<any[] | null>(null);

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

  const fetchHistory = async (id: string) => {
    const res = await fetch(`/api/products/${id}/history`);
    const data = await res.json();
    setActiveHistory(data);
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
            <button 
              onClick={() => fetchHistory(p.id)}
              className="text-sm text-blue-600 underline mt-2 block"
            >
              Посмотреть историю цен
            </button>
            {p.photos && Array.isArray(p.photos) && (
              <div className="flex gap-2 mt-2 overflow-x-auto">
                {(p.photos as string[]).map((photo, i) => (
                  <img key={i} src={photo} className="w-20 h-20 cursor-pointer object-cover flex-shrink-0" onClick={() => setActivePhoto(photo)} />
                ))}
              </div>
            )}
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
      {activePhoto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setActivePhoto(null)}>
          <img src={activePhoto} className="max-w-full max-h-full object-contain" />
        </div>
      )}
      {activeHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setActiveHistory(null)}>
          <div className="bg-white p-6 rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-4">История цен</h3>
            {activeHistory.length === 0 ? <p>Истории нет</p> : (
              <ul className="space-y-2">
                {activeHistory.map((h: any) => (
                  <li key={h.id} className="border-b pb-2 text-sm">
                    {h.oldPrice} → {h.newPrice} ({new Date(h.createdAt).toLocaleDateString()})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
