import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import type { NextRequest } from "next/server";

/**
 * AI가 생성한 할 일 데이터 타입
 */
const TodoSchema = z.object({
  title: z.string().describe("할 일 제목"),
  description: z.string().nullable().describe("할 일 상세 설명"),
  due_date: z.string().describe("마감일 (YYYY-MM-DD 형식)"),
  due_time: z.string().describe("마감 시간 (HH:mm 형식, 시간이 없으면 '09:00')"),
  priority: z.enum(["high", "medium", "low"]).describe("우선순위 (high, medium, low)"),
  category: z.array(z.string()).describe("카테고리 배열 (예: ['업무', '개인'])"),
});

/**
 * 입력 텍스트 전처리 함수
 */
const preprocessInput = (input: string): string => {
  // 앞뒤 공백 제거
  let processed = input.trim();
  
  // 연속된 공백을 하나로 통합
  processed = processed.replace(/\s+/g, " ");
  
  // 대소문자 정규화 (한글은 그대로 유지)
  // 영문의 경우 첫 글자만 대문자로, 나머지는 소문자로 (단, 고유명사 등은 유지)
  // 실제로는 한글 입력이 대부분이므로 기본적인 정규화만 수행
  
  return processed;
};

/**
 * 입력 검증 함수
 */
const validateInput = (input: string): { valid: boolean; error?: string } => {
  // 빈 문자열 체크
  if (!input || input.trim().length === 0) {
    return { valid: false, error: "입력 텍스트를 입력해주세요." };
  }

  // 최소 길이 제한 (2자)
  if (input.trim().length < 2) {
    return { valid: false, error: "입력은 최소 2자 이상이어야 합니다." };
  }

  // 최대 길이 제한 (500자)
  if (input.length > 500) {
    return { valid: false, error: "입력은 최대 500자까지 가능합니다." };
  }

  // 특수 문자나 이모지 체크 (경고만, 차단하지는 않음)
  // 실제로는 이모지나 특수 문자도 허용하되, 과도한 사용은 경고

  return { valid: true };
};

/**
 * 생성된 데이터 후처리 함수
 */
const postprocessTodo = (data: {
  title: string;
  description: string | null;
  due_date: string;
  due_time: string;
  priority: "high" | "medium" | "low";
  category: string[];
}): {
  title: string;
  description: string | null;
  due_date: string;
  due_time: string;
  priority: "high" | "medium" | "low";
  category: string[];
} => {
  // 제목 길이 자동 조정
  let title = data.title.trim();
  if (title.length > 100) {
    title = title.substring(0, 97) + "...";
  }
  if (title.length < 1) {
    title = "할 일";
  }

  // 설명 정규화
  let description = data.description?.trim() || null;
  if (description && description.length > 1000) {
    description = description.substring(0, 997) + "...";
  }

  // 날짜가 과거인지 확인
  const now = new Date();
  const dueDate = new Date(`${data.due_date}T${data.due_time}:00`);
  
  // 과거 날짜인 경우 오늘 날짜로 조정 (단, 시간은 유지)
  if (dueDate < now) {
    const today = now.toISOString().split("T")[0];
    return {
      ...data,
      title,
      description,
      due_date: today,
      due_time: data.due_time,
    };
  }

  // 필수 필드 기본값 설정
  return {
    title: title || "할 일",
    description: description || null,
    due_date: data.due_date || now.toISOString().split("T")[0],
    due_time: data.due_time || "09:00",
    priority: data.priority || "medium",
    category: Array.isArray(data.category) ? data.category : [],
  };
};

/**
 * 자연어 입력을 구조화된 할 일 데이터로 변환하는 API
 * POST /api/ai/generate-todo
 */
export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json();

    // 입력 타입 검증
    if (!input || typeof input !== "string") {
      return Response.json(
        { error: "입력 텍스트가 필요합니다." },
        { status: 400 }
      );
    }

    // 입력 전처리
    const preprocessedInput = preprocessInput(input);

    // 입력 검증
    const validation = validateInput(preprocessedInput);
    if (!validation.valid) {
      return Response.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // API 키 확인
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error("GOOGLE_GENERATIVE_AI_API_KEY가 설정되지 않았습니다.");
      return Response.json(
        { 
          error: "AI 서비스가 설정되지 않았습니다.",
          details: "GOOGLE_GENERATIVE_AI_API_KEY 환경 변수를 설정해주세요. .env.local 파일에 GOOGLE_GENERATIVE_AI_API_KEY=your_api_key 형식으로 추가하세요."
        },
        { status: 500 }
      );
    }

    // 현재 날짜 정보를 컨텍스트로 제공
    const now = new Date();
    const today = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const currentDayOfWeek = now.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일
    
    // 요일 이름 배열
    const dayNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
    const currentDayName = dayNames[currentDayOfWeek];

    // Gemini API를 사용하여 자연어를 구조화된 데이터로 변환
    let object;
    try {
      const result = await generateObject({
        model: google("gemini-2.0-flash-exp"), // gemini-2.5-flash 또는 gemini-1.5-flash도 사용 가능
        schema: TodoSchema,
        prompt: `다음 자연어 입력을 할 일 데이터로 변환해주세요.

입력: "${input}"

현재 날짜: ${currentYear}년 ${currentMonth}월 ${currentDay}일 ${currentDayName} (${today})

=== 반드시 준수할 변환 규칙 ===

1. 제목(title): 
   - 핵심 작업 내용을 간결하게 추출 (10-30자)
   - 불필요한 시간/날짜 표현은 제거

2. 설명(description): 
   - 전체 입력 내용을 상세 설명으로 사용
   - 제목과 중복되지 않는 추가 정보 포함
   - null 가능

3. 마감일(due_date) - 반드시 다음 규칙을 정확히 따르세요:
   - "오늘" → ${today} (현재 날짜)
   - "내일", "다음날" → ${today}에서 +1일
   - "모레" → ${today}에서 +2일
   - "이번 주 [요일]" → 가장 가까운 해당 요일 (오늘이 해당 요일이면 오늘, 지나갔으면 다음 주)
   - "다음주 [요일]", "다음 주 [요일]" → 다음 주의 해당 요일
   - 구체적인 날짜가 없으면 ${today} 사용
   - 형식: 반드시 YYYY-MM-DD (예: 2026-01-16)

4. 마감 시간(due_time) - 반드시 다음 규칙을 정확히 따르세요:
   - "아침" → 09:00
   - "점심" → 12:00
   - "오후" → 14:00
   - "저녁" → 18:00
   - "밤" → 21:00
   - "오전 [N]시" → [N]:00 (예: "오전 10시" → 10:00)
   - "오후 [N]시", "[N]시" → [N]:00 (예: "오후 3시" → 15:00, "3시" → 15:00)
   - 시간이 명시되지 않으면 09:00 사용
   - 형식: 반드시 HH:mm (예: 09:00, 15:00)

5. 우선순위(priority) - 반드시 다음 키워드를 기준으로 판단:
   - high: "급하게", "중요한", "빨리", "꼭", "반드시" 키워드가 포함된 경우
   - medium: "보통", "적당히" 키워드가 포함된 경우 또는 키워드가 없는 경우
   - low: "여유롭게", "천천히", "언젠가" 키워드가 포함된 경우
   - 반드시 "high", "medium", "low" 중 하나를 선택

6. 카테고리(category) - 반드시 다음 키워드를 기준으로 분류:
   - 업무: "회의", "보고서", "프로젝트", "업무" 키워드가 포함된 경우 → ["업무"]
   - 개인: "쇼핑", "친구", "가족", "개인" 키워드가 포함된 경우 → ["개인"]
   - 건강: "운동", "병원", "건강", "요가" 키워드가 포함된 경우 → ["건강"]
   - 학습: "공부", "책", "강의", "학습" 키워드가 포함된 경우 → ["학습"]
   - 여러 카테고리가 포함되면 배열로 반환 (예: ["업무", "개인"])
   - 카테고리를 추출할 수 없으면 빈 배열 []

=== 출력 형식 ===
- 반드시 JSON 형식을 준수하세요
- 모든 필드는 스키마에 정의된 타입과 형식을 정확히 따라야 합니다
- 날짜는 YYYY-MM-DD, 시간은 HH:mm 형식을 정확히 지켜주세요

한국어 입력을 분석하여 위 규칙을 정확히 적용하여 변환하세요.`,
      });
      object = result.object;
    } catch (aiError: unknown) {
      // API 호출 한도 초과 또는 AI 처리 실패
      if (aiError instanceof Error) {
        // Rate limit 에러 체크
        if (
          aiError.message.includes("rate limit") ||
          aiError.message.includes("429") ||
          aiError.message.includes("quota")
        ) {
          return Response.json(
            { error: "AI 서비스 사용량이 초과되었습니다. 잠시 후 다시 시도해주세요." },
            { status: 429 }
          );
        }
      }

      // 기타 AI 처리 실패
      console.error("AI 처리 실패:", aiError);
      throw aiError;
    }

    // 후처리: 생성된 데이터 검증 및 조정
    const processedData = postprocessTodo(object);

    // 날짜와 시간을 결합하여 ISO 형식으로 변환
    // due_date가 YYYY-MM-DD 형식이고, due_time이 HH:mm 형식인지 확인
    const dueDateStr = processedData.due_date;
    const dueTimeStr = processedData.due_time || "09:00";
    
    // 날짜 형식 검증 및 시간 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;
    
    if (!dateRegex.test(dueDateStr)) {
      // 날짜 형식이 잘못된 경우 오늘 날짜로 대체
      const today = new Date().toISOString().split("T")[0];
      processedData.due_date = today;
    }
    
    if (!timeRegex.test(dueTimeStr)) {
      // 시간 형식이 잘못된 경우 기본값 사용
      processedData.due_time = "09:00";
    }

    // ISO 8601 형식으로 변환 (로컬 타임존 사용)
    const dueDateTime = `${processedData.due_date}T${processedData.due_time}:00`;

    // 변환된 데이터를 todos 테이블 스키마 형식으로 반환
    return Response.json({
      title: processedData.title,
      description: processedData.description,
      due_date: dueDateTime,
      priority: processedData.priority,
      category: processedData.category,
    });
  } catch (error) {
    console.error("AI 할 일 생성 실패:", error);

    // 이미 처리된 에러는 그대로 반환
    if (error instanceof Response) {
      return error;
    }

    // Rate limit 에러 체크
    if (error instanceof Error) {
      if (
        error.message.includes("rate limit") ||
        error.message.includes("429") ||
        error.message.includes("quota")
      ) {
        return Response.json(
          { error: "AI 서비스 사용량이 초과되었습니다. 잠시 후 다시 시도해주세요." },
          { status: 429 }
        );
      }
    }

    // 기타 AI 처리 실패 (500 에러)
    // 개발 환경에서는 상세한 에러 정보 제공
    if (process.env.NODE_ENV === "development") {
      return Response.json(
        {
          error: "AI 할 일 생성에 실패했습니다.",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }

    return Response.json(
      { error: "AI 할 일 생성에 실패했습니다. 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
