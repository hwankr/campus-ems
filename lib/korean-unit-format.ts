const koNumberFormatter = new Intl.NumberFormat("ko-KR");

function formatOneDecimal(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

export function formatKrw(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0원";
  if (value >= 100000000) return `${formatOneDecimal(value / 100000000)}억원`;
  if (value >= 10000) return `${koNumberFormatter.format(Math.round(value / 10000))}만원`;
  return `${koNumberFormatter.format(Math.round(value))}원`;
}

export function formatKwh(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0kWh";
  if (value >= 100000000) return `${formatOneDecimal(value / 100000000)}억kWh`;
  if (value >= 10000) return `${koNumberFormatter.format(Math.round(value / 10000))}만kWh`;
  return `${koNumberFormatter.format(Math.round(value))}kWh`;
}

export function formatCo2Kg(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0톤";
  return `${koNumberFormatter.format(Math.round(value / 1000))}톤`;
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0%";
  return `${formatOneDecimal(value)}%`;
}

export function formatAreaM2(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "추가 검증 필요";
  }
  return `${koNumberFormatter.format(Math.round(value))}m²`;
}

export function formatPaybackYears(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value <= 0) {
    return "추가 검증 필요";
  }
  return `${formatOneDecimal(value)}년`;
}
