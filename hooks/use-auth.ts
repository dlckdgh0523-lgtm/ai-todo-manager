"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

/**
 * 인증 상태를 관리하는 커스텀 훅
 * Supabase 인증 상태를 실시간으로 감지하고 관리합니다.
 */
export const useAuth = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const supabase = createClient();

    /**
     * 초기 사용자 정보 가져오기
     */
    const getInitialUser = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        setUser(authUser);
      } catch (error) {
        console.error("사용자 정보 로드 실패:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialUser();

    /**
     * 인증 상태 변경 감지
     * 로그인/로그아웃 시 실시간으로 상태 업데이트
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setUser(session?.user ?? null);
        // 로그인 성공 시 로그인 페이지에 있으면 메인 페이지로 리다이렉트
        if (pathname === "/login" || pathname === "/signup") {
          router.push("/");
          router.refresh();
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        // 로그아웃 시 메인 페이지에 있으면 로그인 페이지로 리다이렉트
        if (pathname === "/") {
          router.push("/login");
          router.refresh();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, pathname]);

  /**
   * 로그인된 사용자가 로그인 페이지에 접근하는 경우 메인 페이지로 리다이렉트
   */
  React.useEffect(() => {
    if (!isLoading && user && (pathname === "/login" || pathname === "/signup")) {
      router.push("/");
      router.refresh();
    }
  }, [user, isLoading, pathname, router]);

  /**
   * 로그인하지 않은 사용자가 보호된 페이지에 접근하는 경우 로그인 페이지로 리다이렉트
   */
  React.useEffect(() => {
    if (!isLoading && !user && pathname === "/") {
      router.push("/login");
      router.refresh();
    }
  }, [user, isLoading, pathname, router]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
};
