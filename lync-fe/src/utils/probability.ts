export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function normalizeProbability(yes: number, no: number): { yes: number; no: number } {
  const total = yes + no;
  if (total === 0) return { yes: 0.5, no: 0.5 };
  return { yes: yes / total, no: no / total };
}
