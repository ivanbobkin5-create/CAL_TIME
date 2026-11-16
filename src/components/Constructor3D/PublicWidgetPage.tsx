import React, { useEffect, useState } from 'react';
import { FurnitureConstructor3D } from './FurnitureConstructor3D';

interface PublicWidgetPageProps {
  companyId: string;
}

export const PublicWidgetPage: React.FC<PublicWidgetPageProps> = ({ companyId }) => {
  const [companyName, setCompanyName] = useState('Мебельная компания');
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [catalogMaterials, setCatalogMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleDisabled, setModuleDisabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadPublicWidgetData() {
      try {
        const res = await fetch(`/api/widget/constructor/${companyId}/config`);
        if (res.ok) {
          const data = await res.json();
          if (!mounted) return;
          if (data.enabled === false) {
            setModuleDisabled(true);
          } else {
            setCompanyName(data.companyName || 'Мебельная компания');
            setCatalogProducts(Array.isArray(data.products) ? data.products : []);
            setCatalogMaterials(Array.isArray(data.materials) ? data.materials : []);
          }
        }
      } catch {
        // Fallback to default library
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadPublicWidgetData();
    return () => {
      mounted = false;
    };
  }, [companyId]);

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-slate-900 text-white text-sm font-medium">
        Загрузка онлайн 3D-конструктора мебели...
      </div>
    );
  }

  if (moduleDisabled) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
        <div className="text-lg font-bold mb-2">Модуль 3D-конструктора не активирован</div>
        <p className="text-xs text-slate-400 max-w-md">
          Для работы виджета на сайте активируйте модуль «Онлайн 3D-Конструктор + Виджет» в панели управления Мебель План.
        </p>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-slate-950 p-2 flex flex-col overflow-hidden">
      <FurnitureConstructor3D
        companyId={companyId}
        companyName={companyName}
        catalogProducts={catalogProducts}
        catalogMaterials={catalogMaterials}
        isWidgetMode={true}
      />
    </div>
  );
};
