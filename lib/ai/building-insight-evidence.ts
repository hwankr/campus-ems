import type { Re100BuildingContext } from "@/lib/ai/re100-context";

export interface BuildingInsightEvidenceItem {
  label: string;
  value: string;
  detail: string;
}

export type BuildingInsightPriority = "상" | "중" | "하";

export function getBuildingInsightPriority(rank: number): BuildingInsightPriority {
  if (rank <= 5) return "상";
  if (rank <= 12) return "중";
  return "하";
}

export function buildBuildingInsightEvidence(
  building: Re100BuildingContext,
): BuildingInsightEvidenceItem[] {
  return [
    {
      label: "연간 사용량",
      value: building.display.annualUsage,
      detail: "최근 12개월 전력 사용량 기준",
    },
    {
      label: "태양광 잠재량",
      value: building.display.annualSolarPotential,
      detail: "건축면적과 설치 가능 비율 기준",
    },
    {
      label: "전력 자립률",
      value: building.display.selfSufficiencyRate,
      detail: `예상 회수기간 ${building.display.paybackYears}`,
    },
  ];
}
