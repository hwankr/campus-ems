import { NextRequest, NextResponse } from "next/server";

import {
  buildBuildingInsightEvidence,
  getBuildingInsightPriority,
} from "@/lib/ai/building-insight-evidence";
import { createOpenAIClient, getOpenAIModel } from "@/lib/ai/openai-client";
import { buildCampusRe100Context } from "@/lib/ai/re100-context";
import { loadServerCampusData } from "@/lib/server/campus-data";

const buildingInsightSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "recommendations", "caution"],
  properties: {
    summary: { type: "string" },
    recommendations: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string" },
    },
    caution: { type: "string" },
  },
} as const;

const systemInstructions = [
  "한국어로 짧고 명확하게 작성한다.",
  "근거 수치, 우선순위, 랭킹은 앱이 계산하므로 직접 작성하지 않는다.",
  "연간 사용량, 태양광 잠재량, 전력 자립률, 회수기간을 문장에 반복하지 않는다.",
  "'랭크', '랭킹', 'rank', '순위'라는 표현을 쓰지 않는다.",
  "문장은 '~입니다' 또는 '~합니다'처럼 자연스러운 존댓말로 끝낸다.",
  "같은 음절이나 단어를 반복하지 않는다.",
  "없는 수치는 추정하지 말고 '추가 검증 필요'라고 표현한다.",
  "각 문장은 발표 화면에서 읽기 좋게 40자 안팎으로 유지한다.",
  "summary는 한 줄 결론으로 쓴다.",
].join("\n");

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "AI 인사이트 생성에 실패했습니다.";
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
      { code: "data_load_failed", message: "건물 데이터를 불러오지 못했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { code: "openai_failed", message: "OpenAI 인사이트 생성에 실패했습니다." },
    { status: 500 },
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { bNo?: unknown };
    const bNo = typeof body.bNo === "string" ? body.bNo : "";
    if (!bNo) {
      return NextResponse.json(
        { code: "invalid_request", message: "bNo가 필요합니다." },
        { status: 400 },
      );
    }

    const { buildings, monthlyElectricity } = await loadServerCampusData();
    const context = buildCampusRe100Context(buildings, monthlyElectricity);
    const buildingIndex = context.buildings.findIndex((item) => item.bNo === bNo);
    const building = context.buildings[buildingIndex];
    if (!building) {
      return NextResponse.json(
        { code: "not_found", message: "해당 건물을 찾지 못했습니다." },
        { status: 404 },
      );
    }

    const client = createOpenAIClient();
    const response = await client.responses.create({
      model: getOpenAIModel(),
      instructions: systemInstructions,
      input: [
        {
          role: "user",
          content:
            "선택 건물의 RE100 투자 인사이트를 작성해줘.\n" +
            JSON.stringify({
              campus: {
                display: context.campus.display,
              },
              building: {
                bNo: building.bNo,
                bName: building.bName,
                bUse: building.bUse,
                district: building.district,
              },
              appCalculated: {
                priority: getBuildingInsightPriority(buildingIndex + 1),
                evidence: buildBuildingInsightEvidence(building),
              },
            }),
        },
      ],
      max_output_tokens: 700,
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "building_re100_insight",
          strict: true,
          schema: buildingInsightSchema,
        },
      },
    });

    return NextResponse.json({
      ...JSON.parse(response.output_text),
      priority: getBuildingInsightPriority(buildingIndex + 1),
      evidence: buildBuildingInsightEvidence(building),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
