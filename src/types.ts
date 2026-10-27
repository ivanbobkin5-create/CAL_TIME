export interface Supplier {
  id: string;
  name: string;
  categories: string[];
}

export interface ProcurementSettings {
  enabled: boolean;
  crmPipelineId?: string;
  crmStageId?: string;
}

export interface ProcurementOrder {
  id: string;
  orderId: string;
  orderName: string;
  readyDate: string;
  categories: {
    [key: string]: {
      sum: number;
      status: 'pending' | 'ordered' | 'received';
      supplierId?: string;
      invoiceNumber?: string;
    };
  };
}
