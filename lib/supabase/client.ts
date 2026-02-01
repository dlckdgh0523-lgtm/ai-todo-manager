"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * 클라이언트 컴포넌트에서 사용할 Supabase 클라이언트 생성
 * 브라우저 환경에서 쿠키를 자동으로 관리합니다.
 */
export const createClient = () => {
  // Next.js 클라이언트 컴포넌트에서는 NEXT_PUBLIC_ 접두사가 필수입니다.
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

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};
