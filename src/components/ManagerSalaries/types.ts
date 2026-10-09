export type DealStatus = 'formalized' | 'not_formalized';

export interface ManagerDeal {
  id: string;
  companyId: string;
  managerId: string;
  managerName: string;
  managerEmail?: string;
  meetingDate: string; // YYYY-MM-DD
  status: DealStatus; // 'formalized' (Оформлен) | 'not_formalized' (Не оформлен)
  contractDate?: string; // Дата заключения договора (YYYY-MM-DD)
  notes?: string; // Заметки по встрече / причина отказа

  // Данные оформленного договора:
  contractNumber?: string; // Номер договора
  clientName?: string; // Заказчик (ФИО / Название)
  saleDate?: string; // Дата продажи (YYYY-MM-DD)
  completionDate?: string; // Дата завершения договора (YYYY-MM-DD)
  handoverDate?: string; // Дата передачи заказа (YYYY-MM-DD)

  contractAmount?: number; // Сумма договора
  productsAmount?: number; // Сумма Продукция
  customCountertopsAmount?: number; // Столешницы заказные
  appliancesAmount?: number; // Техника
  goodsAmount?: number; // Сумма Товары (авто: contractAmount - products - countertops - appliances)

  // График платежей от заказчика:
  prepayment1?: number; // Предоплата (1-я часть)
  prepayment1Date?: string;
  prepayment1Paid?: boolean;

  payment2?: number; // Вторая часть оплаты
  payment2Date?: string;
  payment2Paid?: boolean;

  payment3?: number; // Третья часть оплаты
  payment3Date?: string;
  payment3Paid?: boolean;

  payment4?: number; // Четвертая часть оплаты
  payment4Date?: string;
  payment4Paid?: boolean;

  isInstallment?: boolean; // Статус рассрочки: Да / Нет

  // Штрафы по сделке:
  penaltyAmount?: number; // Сумма штрафа
  penaltyReason?: string; // Причина штрафа

  createdAt: string;
  updatedAt: string;
}

export type ExtraPercentBase = 'all' | 'general' | 'products' | 'countertops' | 'appliances' | 'goods';

export interface BonusPolicy {
  id: string;
  companyId: string;
  effectiveDate: string; // YYYY-MM-DD (дата, с которой действует схема)
  title?: string;
  description?: string;

  // Разделение по типам:
  splitByTypes: boolean; // Да / Нет
  generalPercent: number; // Если нет: % от общей суммы договора

  // Если splitByTypes === true:
  productsPercent: number; // Процент от Продукции
  countertopsPercent: number; // Процент Столешницы заказные
  appliancesPercent: number; // Процент от Техники
  goodsPercent: number; // Процент от Суммы Товары

  // Конверсия:
  conversionThresholdPercent: number; // Порог конверсии в % (напр. 30%)
  conversionFixedBonus: number; // Фиксированная премия (руб.)
  conversionExtraPercent: number; // Дополнительный процент (% бонус)
  conversionExtraBase: ExtraPercentBase; // От чего начисляется доп. процент

  // Привязка к плану продаж:
  linkToSalesPlan: boolean; // Привязана ли ЗП к плану продаж
  planBonusType: 'fixed' | 'percent'; // Фикс руб. или % бонус
  planBonusValue: number; // Значение бонуса

  // Оклад:
  hasBaseSalary: boolean; // Есть ли оклад
  baseSalaryAmount: number; // Размер оклада (руб.)

  // Правила штрафов:
  penaltyRulesNote?: string;

  createdAt: string;
  updatedAt: string;
}

export interface PayoutSettings {
  id: string;
  companyId: string;
  payoutMode: 'by_payments' | 'full_on_close'; // 'by_payments' (от внесенных платежей/аванса) или 'full_on_close' (общий расчет по сделке)
  advancePayoutPercent: number; // Фиксированный % выплаты от аванса (если применимо) или расчет по доле оплаты
  payoutDates: Array<{
    id: string;
    dayOfMonth: number; // Например, 10 или 25
    title: string; // "Аванс" или "Окончательный расчет"
    payoutType: 'advance' | 'final' | 'all';
    targetMonthOffset: number; // 0 = текущий, -1 = за прошлый месяц
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlySalesPlan {
  id: string;
  companyId: string;
  month: string; // YYYY-MM
  companyTargetAmount: number; // Общий план продаж по компании
  managerPlans: Record<string, {
    targetAmount: number;
    targetMeetingsCount?: number;
    targetConversionPercent?: number;
    note?: string;
  }>;
  status: 'draft' | 'approved'; // Черновик / Утвержден
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ManagerMonthlySalaryCalculation {
  managerId: string;
  managerName: string;
  managerEmail?: string;
  month: string; // YYYY-MM
  policyUsed: BonusPolicy;

  // Встречи и конверсия
  totalMeetings: number;
  formalizedCount: number;
  notFormalizedCount: number;
  conversionPercent: number;
  conversionThreshold: number;
  conversionAchieved: boolean;

  // Суммы продаж по оформленным договорам месяца
  totalSales: number;
  productsTotal: number;
  countertopsTotal: number;
  appliancesTotal: number;
  goodsTotal: number;

  // Платежи клиентов за месяц (по датам платежей)
  monthlyPaymentsReceived: number;
  totalContractPaymentsReceived: number;

  // Начисления
  baseSalary: number; // Оклад
  baseCommission: number; // Премия от сделок БЕЗ конверсии
  conversionExtraCommission: number; // Дополнительная премия за конверсию (% от базы)
  conversionFixedBonus: number; // Фиксированный бонус за конверсию
  totalEarnedCommission: number; // Полная премия по договорам

  // Выплата с учетом схемы выплат (пропорционально платежам / авансу)
  payableFromPaymentsCommission: number; // Сколько начислено к выплате в этом месяце с учетом поступивших платежей

  // План продаж
  salesPlanTarget: number;
  salesPlanPercent: number;
  planBonusEarned: number;

  // Штрафы
  dealPenalties: number;

  // ИТОГО К ВЫПЛАТЕ
  totalPayout: number;

  // Детализация по сделкам
  dealsBreakdown: Array<{
    deal: ManagerDeal;
    dealCommissionBase: number;
    dealCommissionWithConversion: number;
    conversionActive: boolean;
    paidInThisMonth: number;
    payableCommissionThisMonth: number;
    unpaidClientBalance: number;
  }>;

  notes: string[];
}
