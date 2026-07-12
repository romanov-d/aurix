import { createContext, useContext } from 'react';

// Данные /admin/dashboard, чтобы блоки (взятые из Metronic) читали наши числа.
export const DashboardDataContext = createContext({});
export const useDashboardData = () => useContext(DashboardDataContext) || {};

export const fmtRub = (v) => {
  const n = Number(v) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')} млн ₽`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} тыс ₽`;
  return `${n.toLocaleString('ru-RU')} ₽`;
};
