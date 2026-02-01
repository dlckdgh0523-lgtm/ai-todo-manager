import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 서버 컴포넌트 및 서버 액션에서 사용할 Supabase 클라이언트 생성
 * Next.js App Router의 cookies를 활용하여 인증 상태를 관리합니다.
 */
export const createClient = () => {
  const cookieStore = cookies();

  // 서버 컴포넌트에서는 NEXT_PUBLIC_ 접두사가 필요합니다.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const missingVars: string[] = [];
    if (!supabaseUrl) missingVars.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!supabaseAnonKey) missingVars.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

    throw new Error(
      `Supabase 환경변수가 설정되지 않았습니다.\n\n` +
        `누락된 환경변수: ${missingVars.join(", ")}\n\n` +
        `해결 방법:\n` +
        `1. 프로젝트 루트에 .env.local 파일을 생성하세요.\n` +
        `2. 다음 내용을 추가하세요:\n\n` +
        `NEXT_PUBLIC_SUPABASE_URL=your_supabase_url\n` +
        `NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key\n\n` +
        `3. 개발 서버를 재시작하세요 (npm run dev)`
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          // 서버 액션에서 호출되는 경우 setAll이 실패할 수 있습니다.
          // 이는 정상적인 동작이며, 클라이언트에서 자동으로 처리됩니다.
        }
      },
    },
  });
};
