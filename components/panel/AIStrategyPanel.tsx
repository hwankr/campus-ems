"use client";

import { BrainCircuit, ChevronRight, Loader2, RefreshCcw, Sparkles } from "lucide-react";
import { useState } from "react";

export interface AIStrategyRecommendation {
  bNo: string;
  bName: string;
  priority: "상" | "중" | "하";
  reason: string;
  expectedImpact: string;
  evidence: {
    annualUsage: string;
    buildingArea: string;
    paybackYears: string;
  } | null;
}

interface AIStrategyResponse {
  campusSummary: string;
  bottlenecks: string[];
  campus: {
    display: {
      annualUsage: string;
      annualSolarPotential: string;
      selfSufficiencyRate: string;
      co2Reduction: string;
      annualSavings: string;
    };
  };
  recommendedBuildings: AIStrategyRecommendation[];
  roadmap: Array<{
    phase: string;
    title: string;
    actions: string[];
  }>;
}

interface AIStrategyPanelProps {
  onRecommendationGenerated: (buildingNos: string[]) => void;
  onRecommendationSelect: (bNo: string) => void;
}

function getPriorityClass(priority: AIStrategyRecommendation["priority"]): string {
  if (priority === "상") return "border-red-400/40 bg-red-400/10 text-red-200";
  if (priority === "중") return "border-amber-300/40 bg-amber-300/10 text-amber-100";
  return "border-slate-500/40 bg-slate-500/10 text-slate-200";
}

export function AIStrategyPanel({
  onRecommendationGenerated,
  onRecommendationSelect,
}: AIStrategyPanelProps) {
  const [strategy, setStrategy] = useState<AIStrategyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const generateStrategy = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/ai/campus-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "AI 전략 생성에 실패했습니다.");
      }

      setStrategy(payload as AIStrategyResponse);
      onRecommendationGenerated(
        (payload as AIStrategyResponse).recommendedBuildings.map((building) => building.bNo),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "AI 전략 생성에 실패했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="h-full min-h-0 overflow-y-auto px-5 py-5 text-slate-100">
      <div className="space-y-5">
        <header className="border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-violet-300">
                AX Decision Copilot
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-50">
                AI RE100 전략 코파일럿
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                계산값을 바탕으로 우선 투자 건물과 실행 로드맵을 제안합니다.
              </p>
            </div>
            <BrainCircuit className="h-6 w-6 shrink-0 text-violet-300" aria-hidden />
          </div>

          <button
            type="button"
            onClick={generateStrategy}
            disabled={isLoading}
            className="mt-4 flex h-10 w-full items-center justify-center gap-2 border border-violet-300/40 bg-violet-400/15 px-3 text-sm font-semibold text-violet-100 transition-colors hover:bg-violet-400/25 focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : strategy ? (
              <RefreshCcw className="h-4 w-4" aria-hidden />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden />
            )}
            {strategy ? "다시 생성" : "AI 전략 생성"}
          </button>
        </header>

        {isLoading ? (
          <div className="border border-slate-800 bg-slate-900/55 p-4 text-sm text-slate-300">
            캠퍼스 데이터를 분석하는 중...
          </div>
        ) : null}

        {errorMessage ? (
          <div className="border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200">
            {errorMessage}
          </div>
        ) : null}

        {strategy ? (
          <>
            <section className="border border-slate-800 bg-slate-900/55 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Campus Diagnosis
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-100">
                {strategy.campusSummary}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <span className="border border-slate-800 bg-slate-950/50 p-2">
                  사용량 {strategy.campus.display.annualUsage}
                </span>
                <span className="border border-slate-800 bg-slate-950/50 p-2">
                  잠재량 {strategy.campus.display.annualSolarPotential}
                </span>
                <span className="border border-slate-800 bg-slate-950/50 p-2">
                  자급률 {strategy.campus.display.selfSufficiencyRate}
                </span>
                <span className="border border-slate-800 bg-slate-950/50 p-2">
                  절감 {strategy.campus.display.annualSavings}
                </span>
              </div>
              <div className="mt-3 space-y-1 text-xs leading-5 text-slate-400">
                {strategy.bottlenecks.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-100">
                  우선 투자 건물 TOP 5
                </h3>
                <span className="text-xs text-violet-300">지도 하이라이트</span>
              </div>
              <div className="space-y-3">
                {strategy.recommendedBuildings.map((building, index) => (
                  <button
                    key={`${building.bNo}-${index}`}
                    type="button"
                    onClick={() => onRecommendationSelect(building.bNo)}
                    className="w-full border border-slate-800 bg-slate-900/55 p-4 text-left transition-colors hover:border-violet-300/60 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-50">
                          {index + 1}. {building.bName}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          {building.reason}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 border px-2 py-1 text-xs ${getPriorityClass(
                          building.priority,
                        )}`}
                      >
                        {building.priority}
                      </span>
                    </div>

                    <div className="mt-3 border border-slate-800 bg-slate-950/45 p-3">
                      <p className="text-xs font-semibold text-slate-300">
                        왜 이 건물부터?
                      </p>
                      {building.evidence ? (
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-400">
                          <span>사용량 {building.evidence.annualUsage}</span>
                          <span>면적 {building.evidence.buildingArea}</span>
                          <span>회수 {building.evidence.paybackYears}</span>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-amber-200">추가 검증 필요</p>
                      )}
                    </div>

                    <p className="mt-2 flex items-center gap-1 text-xs text-violet-300">
                      {building.expectedImpact}
                      <ChevronRight className="h-3 w-3" aria-hidden />
                    </p>
                  </button>
                ))}
              </div>
            </section>

            <section className="border border-slate-800 bg-slate-900/55 p-4">
              <h3 className="text-sm font-semibold text-slate-100">
                3단계 실행 로드맵
              </h3>
              <div className="mt-3 space-y-3">
                {strategy.roadmap.map((step) => (
                  <div key={step.phase} className="border-l-2 border-emerald-300/60 pl-3">
                    <p className="text-xs font-semibold text-emerald-200">
                      {step.phase} · {step.title}
                    </p>
                    <div className="mt-1 space-y-1 text-xs leading-5 text-slate-400">
                      {step.actions.map((action) => (
                        <p key={action}>{action}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="border border-slate-800 bg-slate-900/45 p-4 text-sm leading-6 text-slate-400">
            AI 전략을 생성하면 TOP 5 건물이 지도에 표시되고, 각 카드에서 사용량·면적·회수기간 근거를 확인할 수 있습니다.
          </section>
        )}
      </div>
    </section>
  );
}
