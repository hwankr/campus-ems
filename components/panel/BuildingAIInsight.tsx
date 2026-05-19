"use client";

import { BrainCircuit, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

interface BuildingAIInsightProps {
  bNo: string;
}

interface BuildingInsight {
  summary: string;
  priority: "상" | "중" | "하";
  evidence: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
  recommendations: string[];
  caution: string;
}

function getPriorityClass(priority: BuildingInsight["priority"]): string {
  if (priority === "상") return "border-red-400/40 bg-red-400/10 text-red-200";
  if (priority === "중") return "border-amber-300/40 bg-amber-300/10 text-amber-100";
  return "border-slate-500/40 bg-slate-500/10 text-slate-200";
}

export function BuildingAIInsight({ bNo }: BuildingAIInsightProps) {
  const [insight, setInsight] = useState<BuildingInsight | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setInsight(null);
    setErrorMessage(null);
    setIsLoading(false);
  }, [bNo]);

  const loadInsight = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/ai/building-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bNo }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "AI 인사이트 생성에 실패했습니다.");
      }

      setInsight(payload as BuildingInsight);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "AI 인사이트 생성에 실패했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="border border-slate-800 bg-slate-900/55 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-violet-300">
            Building AI Insight
          </p>
          <h3 className="mt-2 text-sm font-semibold text-slate-100">
            선택 건물 AI 인사이트
          </h3>
        </div>
        <BrainCircuit className="h-5 w-5 shrink-0 text-violet-300" aria-hidden />
      </div>

      <button
        type="button"
        onClick={loadInsight}
        disabled={isLoading}
        className="mt-4 flex h-9 w-full items-center justify-center gap-2 border border-violet-300/40 bg-violet-400/15 px-3 text-xs font-semibold text-violet-100 transition-colors hover:bg-violet-400/25 focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Sparkles className="h-4 w-4" aria-hidden />
        )}
        AI 인사이트 보기
      </button>

      {errorMessage ? (
        <p className="mt-3 text-sm leading-6 text-red-200">{errorMessage}</p>
      ) : null}

      {insight ? (
        <div className="mt-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold leading-6 text-slate-100">
              {insight.summary}
            </p>
            <span
              className={`shrink-0 border px-2 py-1 text-xs ${getPriorityClass(
                insight.priority,
              )}`}
            >
              {insight.priority}
            </span>
          </div>

          <div className="grid gap-3 text-xs leading-5 text-slate-400">
            <div>
              <p className="mb-1 font-semibold text-slate-300">근거</p>
              <div className="grid gap-2">
                {insight.evidence.map((item) => (
                  <div key={item.label} className="border border-slate-800 bg-slate-950/45 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">{item.label}</span>
                      <span className="font-semibold text-slate-100">{item.value}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 font-semibold text-slate-300">권고</p>
              {insight.recommendations.map((recommendation) => (
                <p key={recommendation}>{recommendation}</p>
              ))}
            </div>
          </div>

          <p className="border border-amber-300/25 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">
            {insight.caution}
          </p>
        </div>
      ) : null}
    </section>
  );
}
