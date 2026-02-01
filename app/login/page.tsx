"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Mail, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

/**
 * 로그인 페이지 컴포넌트
 * 이메일/비밀번호 기반 로그인을 제공합니다.
 */
const LoginPage = () => {
  const router = useRouter();
  const { isLoading: isAuthLoading } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  /**
   * Supabase 에러 메시지를 한글로 변환
   */
  const getErrorMessage = (error: Error): string => {
    const message = error.message.toLowerCase();

    if (
      message.includes("invalid login credentials") ||
      message.includes("invalid credentials") ||
      message.includes("email not confirmed")
    ) {
      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    }
    if (message.includes("email not confirmed") || message.includes("email")) {
      return "이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.";
    }
    if (message.includes("network") || message.includes("fetch")) {
      return "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.";
    }
    if (message.includes("rate limit") || message.includes("too many")) {
      return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
    }
    if (message.includes("user not found")) {
      return "등록되지 않은 이메일입니다.";
    }

    // 개발 환경에서는 원본 에러 메시지도 포함
    if (process.env.NODE_ENV === "development") {
      console.error("Supabase 에러:", error);
      return `로그인에 실패했습니다: ${error.message}`;
    }

    return "로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.";
  };

  /**
   * 폼 제출 핸들러
   * Supabase Auth를 사용한 로그인 처리
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // 유효성 검사
    if (!email.trim()) {
      setError("이메일을 입력해주세요");
      setIsLoading(false);
      return;
    }

    if (!password.trim()) {
      setError("비밀번호를 입력해주세요");
      setIsLoading(false);
      return;
    }

    // 이메일 형식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("올바른 이메일 형식이 아닙니다");
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      // Supabase 로그인
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      // 로그인 성공
      // onAuthStateChange가 자동으로 상태를 업데이트하고 리다이렉트 처리
      if (!data.user || !data.session) {
        throw new Error("로그인 세션을 생성할 수 없습니다.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? getErrorMessage(err) : "로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 인증 상태 로딩 중이면 로딩 화면 표시
  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* 로고 및 소개 섹션 */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex items-center justify-center size-16 rounded-2xl bg-primary/10">
              <Sparkles className="size-8 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">AI 할 일 관리</h1>
            <p className="text-muted-foreground">
              AI를 활용한 스마트한 할 일 관리로
              <br />
              생산성을 높여보세요
            </p>
          </div>
        </div>

        {/* 로그인 카드 */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">로그인</CardTitle>
            <CardDescription>
              이메일과 비밀번호를 입력하여 로그인하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 에러 메시지 */}
              {error && (
                <div
                  className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {/* 이메일 입력 */}
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    className="pl-10"
                    aria-required="true"
                    aria-invalid={error ? "true" : "false"}
                  />
                </div>
              </div>

              {/* 비밀번호 입력 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">비밀번호</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    비밀번호 찾기
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="비밀번호를 입력하세요"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className="pl-10"
                    aria-required="true"
                    aria-invalid={error ? "true" : "false"}
                  />
                </div>
              </div>

              {/* 로그인 버튼 */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Spinner className="size-4" />
                    로그인 중...
                  </>
                ) : (
                  "로그인"
                )}
              </Button>
            </form>

            {/* 회원가입 링크 */}
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">계정이 없으신가요? </span>
              <Link
                href="/signup"
                className="font-medium text-primary hover:underline"
              >
                회원가입
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 추가 정보 */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>로그인하면 서비스 이용약관 및 개인정보처리방침에 동의하는 것으로 간주됩니다.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
