"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Mail, Lock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

/**
 * 회원가입 페이지 컴포넌트
 * 이메일/비밀번호 기반 회원가입을 제공합니다.
 */
const SignupPage = () => {
  const router = useRouter();
  const { isLoading: isAuthLoading } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [requiresEmailConfirmation, setRequiresEmailConfirmation] = React.useState(false);

  /**
   * 비밀번호 강도 검증
   */
  const getPasswordStrength = (pwd: string): { strength: number; label: string } => {
    if (!pwd) return { strength: 0, label: "" };
    if (pwd.length < 6) return { strength: 1, label: "너무 짧음" };
    
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

    const labels = ["", "약함", "보통", "좋음", "강함", "매우 강함"];
    return { strength, label: labels[strength] || "" };
  };

  const passwordStrength = getPasswordStrength(password);

  /**
   * Supabase 에러 메시지를 한글로 변환
   */
  const getErrorMessage = (error: Error): string => {
    const message = error.message.toLowerCase();

    if (message.includes("user already registered") || message.includes("already registered")) {
      return "이미 등록된 이메일입니다. 로그인을 시도해주세요.";
    }
    if (message.includes("invalid email") || message.includes("email")) {
      return "올바른 이메일 형식이 아닙니다.";
    }
    if (message.includes("password") && message.includes("weak")) {
      return "비밀번호가 너무 약합니다. 더 강한 비밀번호를 사용해주세요.";
    }
    if (message.includes("password") && message.includes("length")) {
      return "비밀번호는 최소 6자 이상이어야 합니다.";
    }
    if (message.includes("network") || message.includes("fetch")) {
      return "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.";
    }
    if (message.includes("rate limit") || message.includes("too many")) {
      return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
    }

    // 개발 환경에서는 원본 에러 메시지도 포함
    if (process.env.NODE_ENV === "development") {
      console.error("Supabase 에러:", error);
      return `회원가입에 실패했습니다: ${error.message}`;
    }

    return "회원가입에 실패했습니다. 다시 시도해주세요.";
  };

  /**
   * 폼 제출 핸들러
   * Supabase Auth를 사용한 회원가입 처리
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

    if (!confirmPassword.trim()) {
      setError("비밀번호 확인을 입력해주세요");
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

    // 비밀번호 길이 검사
    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다");
      setIsLoading(false);
      return;
    }

    // 비밀번호 일치 검사
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다");
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      // Supabase 회원가입
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            email: email.trim(),
          },
        },
      });

      if (error) {
        throw error;
      }

      // 회원가입 성공 처리
      if (data.user) {
        // 세션이 있으면 즉시 로그인된 상태 (이메일 확인 불필요)
        if (data.session) {
          // 메인 페이지로 리다이렉트
          router.push("/");
          router.refresh();
        } else {
          // 이메일 확인이 필요한 경우
          setRequiresEmailConfirmation(true);
          setSuccess(true);
        }
      } else {
        throw new Error("회원가입 처리 중 오류가 발생했습니다.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? getErrorMessage(err) : "회원가입에 실패했습니다. 다시 시도해주세요.";
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

        {/* 회원가입 카드 */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">회원가입</CardTitle>
            <CardDescription>
              이메일과 비밀번호를 입력하여 계정을 만드세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              /* 성공 메시지 */
              <div className="space-y-4">
                <div className="rounded-md bg-primary/10 border border-primary/20 p-4 text-center space-y-3">
                  <div className="flex justify-center">
                    <CheckCircle2 className="size-12 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">회원가입이 완료되었습니다!</p>
                    {requiresEmailConfirmation ? (
                      <p className="text-sm text-muted-foreground">
                        이메일 인증 링크를 확인해주세요.
                        <br />
                        <span className="font-medium">{email}</span>로 인증 메일을 보냈습니다.
                        <br />
                        메일함을 확인하고 링크를 클릭해주세요.
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        계정이 성공적으로 생성되었습니다.
                      </p>
                    )}
                  </div>
                </div>
                <Button asChild className="w-full" size="lg">
                  <Link href="/login">로그인하러 가기</Link>
                </Button>
              </div>
            ) : (
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
                  <Label htmlFor="password">비밀번호</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="최소 6자 이상"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="pl-10"
                      aria-required="true"
                      aria-invalid={error ? "true" : "false"}
                    />
                  </div>
                  {/* 비밀번호 강도 표시 */}
                  {password && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">비밀번호 강도</span>
                        <span
                          className={cn(
                            "font-medium",
                            passwordStrength.strength <= 2 && "text-destructive",
                            passwordStrength.strength === 3 && "text-amber-500",
                            passwordStrength.strength >= 4 && "text-primary"
                          )}
                        >
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all",
                            passwordStrength.strength <= 2 && "bg-destructive",
                            passwordStrength.strength === 3 && "bg-amber-500",
                            passwordStrength.strength >= 4 && "bg-primary"
                          )}
                          style={{
                            width: `${(passwordStrength.strength / 5) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 비밀번호 확인 입력 */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="비밀번호를 다시 입력하세요"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className={cn(
                        "pl-10",
                        confirmPassword &&
                          password !== confirmPassword &&
                          "border-destructive"
                      )}
                      aria-required="true"
                      aria-invalid={
                        confirmPassword && password !== confirmPassword
                          ? "true"
                          : "false"
                      }
                    />
                  </div>
                  {/* 비밀번호 일치 여부 표시 */}
                  {confirmPassword && (
                    <p
                      className={cn(
                        "text-xs",
                        password === confirmPassword
                          ? "text-primary"
                          : "text-destructive"
                      )}
                    >
                      {password === confirmPassword
                        ? "✓ 비밀번호가 일치합니다"
                        : "✗ 비밀번호가 일치하지 않습니다"}
                    </p>
                  )}
                </div>

                {/* 회원가입 버튼 */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || password !== confirmPassword}
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Spinner className="size-4" />
                      회원가입 중...
                    </>
                  ) : (
                    "회원가입"
                  )}
                </Button>
              </form>
            )}

            {/* 로그인 링크 */}
            {!success && (
              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">이미 계정이 있으신가요? </span>
                <Link
                  href="/login"
                  className="font-medium text-primary hover:underline"
                >
                  로그인
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 추가 정보 */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>
            회원가입하면 서비스 이용약관 및 개인정보처리방침에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
