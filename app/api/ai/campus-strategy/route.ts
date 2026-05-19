import { NextResponse } from "next/server";

import { createOpenAIClient, getOpenAIModel } from "@/lib/ai/openai-client";
import { buildCampusRe100Context } from "@/lib/ai/re100-context";
import { formatAreaM2 } from "@/lib/korean-unit-format";
import { loadServerCampusData } from "@/lib/server/campus-data";

const campusStrategySchema = {
  type: "object",
  additionalProperties: false,
  required: ["campusSummary", "bottlenecks", "recommendedBuildings", "roadmap"],
  properties: {
    campusSummary: { type: "string" },
    bottlenecks: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string" },
    },
    recommendedBuildings: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["bNo", "bName", "priority", "reason", "expectedImpact"],
        properties: {
          bNo: { type: "string" },
          bName: { type: "string" },
          priority: { type: "string", enum: ["상", "중", "하"] },
          reason: { type: "string" },
          expectedImpact: { type: "string" },
        },
      },
    },
    roadmap: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["phase", "title", "actions"],
        properties: {
          phase: { type: "string" },
          title: { type: "string" },
          actions: {
            type: "array",
            minItems: 2,
            maxItems: 3,
            items: { type: "string" },
          },
        },
      },
    },
  },
} as const;

const systemInstructions = [
  "한국어로 짧고 명확하게 작성한다.",
  "수치는 입력 데이터에 있는 값만 사용한다.",
  "금액, 전력량, CO2, 비율은 반드시 display 필드의 문자열만 사용한다.",
  "2032786950원, 5746011kg 같은 긴 raw 숫자는 출력하지 않는다.",
  "없는 수치는 추정하지 말고 '추가 검증 필요'라고 표현한다.",
  "각 문장은 발표 화면에서 읽기 좋게 40자 안팎으로 유지한다.",
  "recommendedBuildings는 입력 buildings 후보 안에서만 고른다.",
].join("\n");

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "AI 전략 생성에 실패했습니다.";
  const status = typeof (error as { status?: unknown })?.status === "number"
    ? (error as { status: number }).status
    : undefined;

  if (message.includes("OPENAI_API_KEY")) {
    return NextResponse.json(
      { code: "missing_api_key", message: "OPENAI_API_KEY가 설정되지 않았습니다." },
      { status: 401 },
    );
  }

  if (status === 401) {
    return NextResponse.json(
      { code: "invalid_api_key", message: "OpenAI API 키를 확인해주세요." },
      { status: 401 },
    );
  }

  if (status === 429) {
    return NextResponse.json(
      { code: "rate_limited", message: "OpenAI 요청 한도 또는 크레딧을 확인해주세요." },
      { status: 429 },
    );
  }

  if (message.includes("ENOENT") || message.includes("public")) {
    return NextResponse.json(
      { code: "data_load_failed", message: "캠퍼스 데이터 파일을 불러오지 못했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { code: "openai_failed", message: "OpenAI 전략 생성에 실패했습니다." },
    { status: 500 },
  );
}

export async function POST() {
  try {
    const { buildings, monthlyElectricity } = await loadServerCampusData();
    const context = buildCampusRe100Context(buildings, monthlyElectricity);
    const candidateContext = {
      campus: context.campus,
      buildings: context.buildings.slice(0, 12),
    };

    const client = createOpenAIClient();
    const response = await client.responses.create({
      model: getOpenAIModel(),
      instructions: systemInstructions,
      input: [
        {
          role: "user",
          content:
            "캠퍼스 RE100 전환 의사결정용 전략을 작성해줘.\n" +
            JSON.stringify(candidateContext),
        },
      ],
      max_output_tokens: 1600,
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "campus_re100_strategy",
          strict: true,
          schema: campusStrategySchema,
        },
      },
    });

    const aiResult = JSON.parse(response.output_text) as {
      campusSummary: string;
      bottlenecks: string[];
      recommendedBuildings: Array<{
        bNo: string;
        bName: string;
        priority: "상" | "중" | "하";
        reason: string;
        expectedImpact: string;
      }>;
      roadmap: Array<{ phase: string; title: string; actions: string[] }>;
    };

    const contextByNo = new Map(context.buildings.map((building) => [building.bNo, building]));
    const originalByNo = new Map(buildings.map((building) => [building.bNo, building]));

    return NextResponse.json({
      ...aiResult,
      campus: context.campus,
      recommendedBuildings: aiResult.recommendedBuildings.map((building) => {
        const calculated = contextByNo.get(building.bNo);
        const original = originalByNo.get(building.bNo);

        return {
          ...building,
          evidence: calculated && original
            ? {
                annualUsage: calculated.display.annualUsage,
                buildingArea: formatAreaM2(original.bArea_m2),
                paybackYears: calculated.display.paybackYears,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
