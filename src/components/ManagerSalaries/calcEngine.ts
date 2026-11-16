import {
  ManagerDeal,
  BonusPolicy,
  PayoutSettings,
  MonthlySalesPlan,
  ManagerMonthlySalaryCalculation
} from './types';

export const DEFAULT_BONUS_POLICY: BonusPolicy = {
  id: 'default_policy',
  companyId: '',
  effectiveDate: '2020-01-01',
  title: 'Базовая схема премирования',
  description: 'Действующая схема премирования менеджеров по продажам',
  splitByTypes: true,
  generalPercent: 5,
  productsPercent: 7,
  countertopsPercent: 5,
  appliancesPercent: 3,
  goodsPercent: 4,
  conversionThresholdPercent: 30,
  conversionFixedBonus: 10000,
  conversionExtraPercent: 2,
  conversionExtraBase: 'products',
  linkToSalesPlan: true,
  planBonusType: 'fixed',
  planBonusValue: 15000,
  hasBaseSalary: true,
  baseSalaryAmount: 45000,
  penaltyRulesNote: 'Штраф может начисляться за рекламацию по вине менеджера или срыв сроков согласования проекта.',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

export const DEFAULT_PAYOUT_SETTINGS: PayoutSettings = {
  id: 'default_payout_settings',
  companyId: '',
  payoutMode: 'by_payments',
  advancePayoutPercent: 5,
  payoutDates: [
    {
      id: 'payout_1',
      dayOfMonth: 10,
      title: 'Авансовая выплата',
      payoutType: 'advance',
      targetMonthOffset: 0
    },
    {
      id: 'payout_2',
      dayOfMonth: 25,
      title: 'Окончательный расчет по итогам месяца',
      payoutType: 'final',
      targetMonthOffset: 0
    }
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

/**
 * Выбирает схему премирования, действовавшую на указанный месяц (YYYY-MM).
 * Схемы сортируются по effectiveDate: берется последняя схема, у которой effectiveDate <= конец месяца.
 */
export function resolveBonusPolicyForMonth(
  policies: BonusPolicy[],
  monthStr: string // YYYY-MM
): BonusPolicy {
  if (!policies || policies.length === 0) {
    return DEFAULT_BONUS_POLICY;
  }

  const monthEnd = `${monthStr}-31`;
  const sorted = [...policies].sort((a, b) => (a.effectiveDate || '').localeCompare(b.effectiveDate || ''));

  let applicable: BonusPolicy | null = null;
  for (const pol of sorted) {
    if ((pol.effectiveDate || '') <= monthEnd) {
      applicable = pol;
    }
  }

  return applicable || sorted[0] || DEFAULT_BONUS_POLICY;
}

/**
 * Подсчитывает авторасчетное поле "Сумма Товары"
 */
export function calculateGoodsAmount(
  contractAmount: number = 0,
  productsAmount: number = 0,
  customCountertopsAmount: number = 0,
  appliancesAmount: number = 0
): number {
  const sumOther = (productsAmount || 0) + (customCountertopsAmount || 0) + (appliancesAmount || 0);
  const diff = (contractAmount || 0) - sumOther;
  return Math.max(0, diff);
}

/**
 * Расчет базовой комиссии по сделке (без бонуса за конверсию)
 */
export function calculateDealBaseCommission(
  deal: ManagerDeal,
  policy: BonusPolicy
): number {
  if (deal.status !== 'formalized') return 0;

  const contractTotal = deal.contractAmount || 0;
  if (contractTotal <= 0) return 0;

  if (!policy.splitByTypes) {
    // Единый процент от общей суммы
    const pct = policy.generalPercent || 0;
    return Math.round((contractTotal * pct) / 100);
  }

  // Разделение по типам
  const prod = deal.productsAmount || 0;
  const count = deal.customCountertopsAmount || 0;
  const app = deal.appliancesAmount || 0;
  const goods = deal.goodsAmount !== undefined ? deal.goodsAmount : calculateGoodsAmount(contractTotal, prod, count, app);

  const prodComm = (prod * (policy.productsPercent || 0)) / 100;
  const countComm = (count * (policy.countertopsPercent || 0)) / 100;
  const appComm = (app * (policy.appliancesPercent || 0)) / 100;
  const goodsComm = (goods * (policy.goodsPercent || 0)) / 100;

  return Math.round(prodComm + countComm + appComm + goodsComm);
}

/**
 * Расчет надбавки за конверсию по сделке
 */
export function calculateDealConversionExtra(
  deal: ManagerDeal,
  policy: BonusPolicy
): number {
  if (deal.status !== 'formalized') return 0;
  if (!policy.conversionExtraPercent || policy.conversionExtraPercent <= 0) return 0;

  const contractTotal = deal.contractAmount || 0;
  const prod = deal.productsAmount || 0;
  const count = deal.customCountertopsAmount || 0;
  const app = deal.appliancesAmount || 0;
  const goods = deal.goodsAmount !== undefined ? deal.goodsAmount : calculateGoodsAmount(contractTotal, prod, count, app);

  let baseAmount = contractTotal;
  switch (policy.conversionExtraBase) {
    case 'products':
      baseAmount = prod;
      break;
    case 'countertops':
      baseAmount = count;
      break;
    case 'appliances':
      baseAmount = app;
      break;
    case 'goods':
      baseAmount = goods;
      break;
    case 'general':
    case 'all':
    default:
      baseAmount = contractTotal;
      break;
  }

  return Math.round((baseAmount * policy.conversionExtraPercent) / 100);
}

/**
 * Проверяет, был ли внесен платеж в указанном месяце (YYYY-MM)
 */
export function getDealPaymentsInMonth(
  deal: ManagerDeal,
  monthStr: string
): { totalPaidThisMonth: number; totalPaidOverall: number; hasAnyPaymentInMonth: boolean } {
  let totalThisMonth = 0;
  let totalOverall = 0;

  const checkPart = (paid?: boolean, amount?: number, date?: string) => {
    if (paid && amount && amount > 0) {
      totalOverall += amount;
      if (date && date.startsWith(monthStr)) {
        totalThisMonth += amount;
      }
    }
  };

  checkPart(deal.prepayment1Paid, deal.prepayment1, deal.prepayment1Date);
  checkPart(deal.payment2Paid, deal.payment2, deal.payment2Date);
  checkPart(deal.payment3Paid, deal.payment3, deal.payment3Date);
  checkPart(deal.payment4Paid, deal.payment4, deal.payment4Date);

  return {
    totalPaidThisMonth: totalThisMonth,
    totalPaidOverall: totalOverall,
    hasAnyPaymentInMonth: totalThisMonth > 0
  };
}

/**
 * Основной расчет зарплаты менеджера за месяц
 */
export function calculateManagerMonthlySalary(
  managerId: string,
  managerName: string,
  monthStr: string, // YYYY-MM
  allDeals: ManagerDeal[],
  policies: BonusPolicy[],
  payoutSettings: PayoutSettings = DEFAULT_PAYOUT_SETTINGS,
  salesPlan?: MonthlySalesPlan,
  managerEmail?: string
): ManagerMonthlySalaryCalculation {
  const policy = resolveBonusPolicyForMonth(policies, monthStr);

  // Сделки менеджера
  const managerDeals = allDeals.filter(d => d.managerId === managerId);

  // Встречи, проведенные в данном месяце (по дате встречи meetingDate или saleDate)
  const monthMeetings = managerDeals.filter(d => {
    const dDate = d.meetingDate || d.saleDate || d.contractDate || '';
    return dDate.startsWith(monthStr);
  });

  const totalMeetings = monthMeetings.length;
  const formalizedDeals = monthMeetings.filter(d => d.status === 'formalized');
  const formalizedCount = formalizedDeals.length;
  const notFormalizedCount = totalMeetings - formalizedCount;

  // Конверсия
  const conversionPercent = totalMeetings > 0 ? Math.round((formalizedCount / totalMeetings) * 1000) / 10 : 0;
  const conversionAchieved = conversionPercent >= policy.conversionThresholdPercent && totalMeetings > 0;

  // Объемы продаж по оформленным договорам месяца
  let totalSales = 0;
  let productsTotal = 0;
  let countertopsTotal = 0;
  let appliancesTotal = 0;
  let goodsTotal = 0;

  formalizedDeals.forEach(d => {
    const cAmount = d.contractAmount || 0;
    const pAmount = d.productsAmount || 0;
    const ctAmount = d.customCountertopsAmount || 0;
    const apAmount = d.appliancesAmount || 0;
    const gAmount = d.goodsAmount !== undefined ? d.goodsAmount : calculateGoodsAmount(cAmount, pAmount, ctAmount, apAmount);

    totalSales += cAmount;
    productsTotal += pAmount;
    countertopsTotal += ctAmount;
    appliancesTotal += apAmount;
    goodsTotal += gAmount;
  });

  // Расчет комиссий по сделкам месяца
  let baseCommission = 0;
  let conversionExtraCommission = 0;
  let dealPenalties = 0;

  // Детализация сделок
  const dealsBreakdown: ManagerMonthlySalaryCalculation['dealsBreakdown'] = [];

  // Также учитываем сделки, по которым в этом месяце поступили платежи (даже если договор был заключен ранее)
  const relevantDealsForPayout = managerDeals.filter(d => {
    if (d.status !== 'formalized') return false;
    const isThisMonthContract = (d.saleDate || d.contractDate || d.meetingDate || '').startsWith(monthStr);
    const { totalPaidThisMonth } = getDealPaymentsInMonth(d, monthStr);
    return isThisMonthContract || totalPaidThisMonth > 0;
  });

  let payableFromPaymentsCommission = 0;
  let monthlyPaymentsReceived = 0;
  let totalContractPaymentsReceived = 0;

  relevantDealsForPayout.forEach(d => {
    const dBase = calculateDealBaseCommission(d, policy);
    const dExtra = conversionAchieved ? calculateDealConversionExtra(d, policy) : 0;
    const dTotalWithConversion = dBase + dExtra;

    if ((d.saleDate || d.contractDate || d.meetingDate || '').startsWith(monthStr)) {
      baseCommission += dBase;
      if (conversionAchieved) {
        conversionExtraCommission += dExtra;
      }
      if (d.penaltyAmount) {
        dealPenalties += d.penaltyAmount;
      }
    }

    const { totalPaidThisMonth, totalPaidOverall } = getDealPaymentsInMonth(d, monthStr);
    monthlyPaymentsReceived += totalPaidThisMonth;
    totalContractPaymentsReceived += totalPaidOverall;

    const contractTotal = d.contractAmount || 1;
    const unpaidClientBalance = Math.max(0, contractTotal - totalPaidOverall);

    // Выплата в этом месяце в зависимости от схемы выплат:
    let payableThisMonth = 0;
    if (payoutSettings.payoutMode === 'by_payments') {
      // При выплате от платежей: премия начисляется пропорционально поступившей сумме за этот месяц
      if (totalPaidThisMonth > 0 && contractTotal > 0) {
        const paymentRatio = totalPaidThisMonth / contractTotal;
        payableThisMonth = Math.round(dTotalWithConversion * paymentRatio);
      } else if (payoutSettings.advancePayoutPercent && d.prepayment1Paid && (d.prepayment1Date || '').startsWith(monthStr)) {
        payableThisMonth = Math.round((d.prepayment1 || 0) * (payoutSettings.advancePayoutPercent / 100));
      }
    } else {
      // full_on_close: вся комиссия начисляется в месяц заключения / завершения
      if ((d.saleDate || d.contractDate || d.meetingDate || '').startsWith(monthStr)) {
        payableThisMonth = dTotalWithConversion;
      }
    }

    payableFromPaymentsCommission += payableThisMonth;

    dealsBreakdown.push({
      deal: d,
      dealCommissionBase: dBase,
      dealCommissionWithConversion: dTotalWithConversion,
      conversionActive: conversionAchieved,
      paidInThisMonth: totalPaidThisMonth,
      payableCommissionThisMonth: payableThisMonth,
      unpaidClientBalance
    });
  });

  // Фиксированная премия за конверсию (если порог достигнут)
  const conversionFixedBonus = conversionAchieved ? (policy.conversionFixedBonus || 0) : 0;

  // Полная начисленная премия по договорам месяца
  const totalEarnedCommission = baseCommission + conversionExtraCommission;

  // План продаж
  let salesPlanTarget = 0;
  let salesPlanPercent = 0;
  let planBonusEarned = 0;

  if (salesPlan && salesPlan.managerPlans && salesPlan.managerPlans[managerId]) {
    salesPlanTarget = salesPlan.managerPlans[managerId].targetAmount || 0;
  } else if (salesPlan && salesPlan.companyTargetAmount) {
    salesPlanTarget = salesPlan.companyTargetAmount;
  }

  if (salesPlanTarget > 0) {
    salesPlanPercent = Math.round((totalSales / salesPlanTarget) * 1000) / 10;
    if (salesPlanPercent >= 100 && policy.linkToSalesPlan) {
      if (policy.planBonusType === 'fixed') {
        planBonusEarned = policy.planBonusValue || 0;
      } else {
        planBonusEarned = Math.round((totalSales * (policy.planBonusValue || 0)) / 100);
      }
    }
  }

  // Оклад
  const baseSalary = policy.hasBaseSalary ? (policy.baseSalaryAmount || 0) : 0;

  // Итого к выплате:
  // Если действует выплата от платежей: Оклад + Начислено с поступивших платежей + Фикс бонус за конверсию + Бонус за план - Штрафы
  // Если общий расчет по сделкам: Оклад + Комиссия по сделкам + Фикс бонус за конверсию + Бонус за план - Штрафы
  const commissionPartToPay = payoutSettings.payoutMode === 'by_payments'
    ? payableFromPaymentsCommission
    : totalEarnedCommission;

  const totalPayout = Math.max(0, baseSalary + commissionPartToPay + conversionFixedBonus + planBonusEarned - dealPenalties);

  const notes: string[] = [];
  if (conversionAchieved) {
    notes.push(`Выполнена конверсия на ${conversionPercent}% (порог ${policy.conversionThresholdPercent}%): начислен бонус за конверсию`);
  } else if (totalMeetings > 0) {
    notes.push(`Конверсия ${conversionPercent}% ниже порога ${policy.conversionThresholdPercent}%: бонус за конверсию не начислен`);
  }
  if (salesPlanTarget > 0) {
    if (salesPlanPercent >= 100) {
      notes.push(`План продаж выполнен на ${salesPlanPercent}%! Начислен бонус ${planBonusEarned.toLocaleString('ru-RU')} ₽`);
    } else {
      notes.push(`План продаж выполнен на ${salesPlanPercent}% (цель: ${salesPlanTarget.toLocaleString('ru-RU')} ₽)`);
    }
  }
  if (dealPenalties > 0) {
    notes.push(`Удержаны штрафы по сделкам на сумму: ${dealPenalties.toLocaleString('ru-RU')} ₽`);
  }

    return {
    managerId,
    managerName,
    managerEmail,
    month: monthStr,
    policyUsed: policy,
    totalMeetings,
    formalizedCount,
    notFormalizedCount,
    conversionPercent,
    conversionThreshold: policy.conversionThresholdPercent,
    conversionAchieved,
    totalSales,
    productsTotal,
    countertopsTotal,
    appliancesTotal,
    goodsTotal,
    monthlyPaymentsReceived,
    totalContractPaymentsReceived,
    baseSalary,
    baseCommission,
    conversionExtraCommission,
    conversionFixedBonus,
    totalEarnedCommission,
    payableFromPaymentsCommission,
    salesPlanTarget,
    salesPlanPercent,
    planBonusEarned,
    dealPenalties,
    totalPayout,
    dealsBreakdown,
    notes
  };
}

/**
 * Возвращает список месяцев YYYY-MM между startYm и endYm включительно
 */
export function getMonthsBetween(startYm: string, endYm: string): string[] {
  if (!startYm || !endYm) return [startYm || endYm || new Date().toISOString().substring(0, 7)];
  const [sY, sM] = startYm.substring(0, 7).split('-').map(Number);
  const [eY, eM] = endYm.substring(0, 7).split('-').map(Number);
  if (isNaN(sY) || isNaN(sM) || isNaN(eY) || isNaN(eM)) return [startYm.substring(0, 7)];

  const result: string[] = [];
  let curY = sY;
  let curM = sM;
  const maxSteps = 120; // Защита от бесконечного цикла (до 10 лет)
  let steps = 0;

  while ((curY < eY || (curY === eY && curM <= eM)) && steps < maxSteps) {
    result.push(`${curY}-${String(curM).padStart(2, '0')}`);
    curM++;
    if (curM > 12) {
      curM = 1;
      curY++;
    }
    steps++;
  }

  return result.length > 0 ? result : [startYm.substring(0, 7)];
}

/**
 * Проверяет, попадает ли дата (YYYY-MM-DD или YYYY-MM) в интервал [startDate, endDate] (YYYY-MM-DD)
 */
export function isDateWithinRange(
  dateStr: string | undefined,
  startDate: string,
  endDate: string
): boolean {
  if (!dateStr) return false;
  const clean = dateStr.trim();
  if (!clean) return false;
  if (clean.length === 7) {
    return clean >= startDate.substring(0, 7) && clean <= endDate.substring(0, 7);
  }
  const d = clean.substring(0, 10);
  return d >= startDate && d <= endDate;
}

/**
 * Проверяет платежи по сделке, совершенные в произвольном периоде [startDate, endDate]
 */
export function getDealPaymentsInRange(
  deal: ManagerDeal,
  startDate: string,
  endDate: string
): { totalPaidInRange: number; totalPaidOverall: number; hasAnyPaymentInRange: boolean } {
  let totalInRange = 0;
  let totalOverall = 0;

  const checkPart = (paid?: boolean, amount?: number, date?: string) => {
    if (paid && amount && amount > 0) {
      totalOverall += amount;
      if (date && isDateWithinRange(date, startDate, endDate)) {
        totalInRange += amount;
      }
    }
  };

  checkPart(deal.prepayment1Paid, deal.prepayment1, deal.prepayment1Date);
  checkPart(deal.payment2Paid, deal.payment2, deal.payment2Date);
  checkPart(deal.payment3Paid, deal.payment3, deal.payment3Date);
  checkPart(deal.payment4Paid, deal.payment4, deal.payment4Date);

  return {
    totalPaidInRange: totalInRange,
    totalPaidOverall: totalOverall,
    hasAnyPaymentInRange: totalInRange > 0
  };
}

/**
 * Расчет зарплаты и показателей менеджера за выбранный период (1 месяц, 3 месяца, год или произвольные даты)
 */
export function calculateManagerPeriodSalary(
  managerId: string,
  managerName: string,
  months: string[],
  startDate: string, // YYYY-MM-DD
  endDate: string,   // YYYY-MM-DD
  allDeals: ManagerDeal[],
  policies: BonusPolicy[],
  payoutSettings: PayoutSettings = DEFAULT_PAYOUT_SETTINGS,
  salesPlans: MonthlySalesPlan[] = [],
  managerEmail?: string,
  isExactSingleMonth: boolean = false
): ManagerMonthlySalaryCalculation {
  if (isExactSingleMonth && months.length === 1) {
    const m = months[0];
    const plan = salesPlans.find(p => p.month === m);
    return calculateManagerMonthlySalary(
      managerId,
      managerName,
      m,
      allDeals,
      policies,
      payoutSettings,
      plan,
      managerEmail
    );
  }

  // Фильтруем сделки и платежи так, чтобы они также строго попадали в [startDate, endDate]
  const clippedDeals: ManagerDeal[] = allDeals.map(d => {
    const clone: ManagerDeal = { ...d };
    // Если дата оплаты выходит за рамки [startDate, endDate], не учитываем ее как оплату внутри этого периода
    if (clone.prepayment1Date && !isDateWithinRange(clone.prepayment1Date, startDate, endDate)) {
      clone.prepayment1Date = '';
    }
    if (clone.payment2Date && !isDateWithinRange(clone.payment2Date, startDate, endDate)) {
      clone.payment2Date = '';
    }
    if (clone.payment3Date && !isDateWithinRange(clone.payment3Date, startDate, endDate)) {
      clone.payment3Date = '';
    }
    if (clone.payment4Date && !isDateWithinRange(clone.payment4Date, startDate, endDate)) {
      clone.payment4Date = '';
    }
    return clone;
  }).filter(d => {
    const dDate = d.meetingDate || d.saleDate || d.contractDate || '';
    const dealInDateRange = isDateWithinRange(dDate, startDate, endDate);
    const { hasAnyPaymentInRange } = getDealPaymentsInRange(d, startDate, endDate);
    return dealInDateRange || hasAnyPaymentInRange;
  });

  const currentYm = new Date().toISOString().substring(0, 7);
  const lastMonth = months[months.length - 1] || currentYm;
  const latestPolicy = resolveBonusPolicyForMonth(policies, lastMonth);

  let totalMeetings = 0;
  let formalizedCount = 0;
  let notFormalizedCount = 0;
  let totalSales = 0;
  let productsTotal = 0;
  let countertopsTotal = 0;
  let appliancesTotal = 0;
  let goodsTotal = 0;
  let monthlyPaymentsReceived = 0;
  let totalContractPaymentsReceived = 0;
  let baseSalary = 0;
  let baseCommission = 0;
  let conversionExtraCommission = 0;
  let conversionFixedBonus = 0;
  let totalEarnedCommission = 0;
  let payableFromPaymentsCommission = 0;
  let salesPlanTarget = 0;
  let planBonusEarned = 0;
  let dealPenalties = 0;
  let totalPayout = 0;

  const breakdownMap = new Map<string, ManagerMonthlySalaryCalculation['dealsBreakdown'][0]>();
  const allNotes: string[] = [];

  months.forEach((m, idx) => {
    const plan = salesPlans.find(p => p.month === m);
    const mCalc = calculateManagerMonthlySalary(
      managerId,
      managerName,
      m,
      clippedDeals,
      policies,
      payoutSettings,
      plan,
      managerEmail
    );

    // Для будущих месяцев (которые еще не наступили и в которых нет встреч/оплат) не начисляем пустой оклад при просмотре за весь год
    const hasActivityInMonth =
      mCalc.totalMeetings > 0 ||
      mCalc.totalSales > 0 ||
      mCalc.monthlyPaymentsReceived > 0 ||
      mCalc.payableFromPaymentsCommission > 0;
    const includeBaseSalary = months.length === 1 || m <= currentYm || hasActivityInMonth || idx === 0;

    const effectiveMonthBaseSalary = includeBaseSalary ? mCalc.baseSalary : 0;
    const effectiveMonthTotalPayout = includeBaseSalary
      ? mCalc.totalPayout
      : Math.max(0, mCalc.totalPayout - mCalc.baseSalary);

    totalMeetings += mCalc.totalMeetings;
    formalizedCount += mCalc.formalizedCount;
    notFormalizedCount += mCalc.notFormalizedCount;
    totalSales += mCalc.totalSales;
    productsTotal += mCalc.productsTotal;
    countertopsTotal += mCalc.countertopsTotal;
    appliancesTotal += mCalc.appliancesTotal;
    goodsTotal += mCalc.goodsTotal;
    monthlyPaymentsReceived += mCalc.monthlyPaymentsReceived;
    baseSalary += effectiveMonthBaseSalary;
    baseCommission += mCalc.baseCommission;
    conversionExtraCommission += mCalc.conversionExtraCommission;
    conversionFixedBonus += mCalc.conversionFixedBonus;
    totalEarnedCommission += mCalc.totalEarnedCommission;
    payableFromPaymentsCommission += mCalc.payableFromPaymentsCommission;
    salesPlanTarget += mCalc.salesPlanTarget;
    planBonusEarned += mCalc.planBonusEarned;
    dealPenalties += mCalc.dealPenalties;
    totalPayout += effectiveMonthTotalPayout;

    mCalc.dealsBreakdown.forEach(item => {
      const existing = breakdownMap.get(item.deal.id);
      if (existing) {
        existing.paidInThisMonth += item.paidInThisMonth;
        existing.payableCommissionThisMonth += item.payableCommissionThisMonth;
        existing.conversionActive = existing.conversionActive || item.conversionActive;
        existing.dealCommissionWithConversion = Math.max(
          existing.dealCommissionWithConversion,
          item.dealCommissionWithConversion
        );
      } else {
        breakdownMap.set(item.deal.id, { ...item });
      }
    });
  });

  const mergedBreakdown = Array.from(breakdownMap.values());
  totalContractPaymentsReceived = mergedBreakdown.reduce((sum, item) => {
    const { totalPaidOverall } = getDealPaymentsInRange(item.deal, startDate, endDate);
    return sum + totalPaidOverall;
  }, 0);

  const conversionPercent = totalMeetings > 0 ? Math.round((formalizedCount / totalMeetings) * 1000) / 10 : 0;
  const conversionAchieved =
    (conversionPercent >= latestPolicy.conversionThresholdPercent && totalMeetings > 0) ||
    conversionFixedBonus > 0 ||
    conversionExtraCommission > 0;
  const salesPlanPercent = salesPlanTarget > 0 ? Math.round((totalSales / salesPlanTarget) * 1000) / 10 : 0;

  if (conversionAchieved) {
    allNotes.push(`Средняя конверсия за период: ${conversionPercent}% (оформлено ${formalizedCount} из ${totalMeetings} встреч)`);
  } else if (totalMeetings > 0) {
    allNotes.push(`Конверсия за период: ${conversionPercent}% (${formalizedCount} из ${totalMeetings} встреч)`);
  }
  if (salesPlanTarget > 0) {
    allNotes.push(`Выполнение плана за период: ${salesPlanPercent}% (${totalSales.toLocaleString('ru-RU')} ₽ из ${salesPlanTarget.toLocaleString('ru-RU')} ₽)`);
  }

  return {
    managerId,
    managerName,
    managerEmail,
    month: months.length === 1 ? months[0] : `${months[0]}..${months[months.length - 1]}`,
    policyUsed: latestPolicy,
    totalMeetings,
    formalizedCount,
    notFormalizedCount,
    conversionPercent,
    conversionThreshold: latestPolicy.conversionThresholdPercent,
    conversionAchieved,
    totalSales,
    productsTotal,
    countertopsTotal,
    appliancesTotal,
    goodsTotal,
    monthlyPaymentsReceived,
    totalContractPaymentsReceived,
    baseSalary,
    baseCommission,
    conversionExtraCommission,
    conversionFixedBonus,
    totalEarnedCommission,
    payableFromPaymentsCommission,
    salesPlanTarget,
    salesPlanPercent,
    planBonusEarned,
    dealPenalties,
    totalPayout,
    dealsBreakdown: mergedBreakdown,
    notes: allNotes
  };
}

