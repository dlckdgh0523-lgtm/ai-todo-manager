"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Search,
  LogOut,
  User,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { TodoForm } from "@/components/todo/TodoForm";
import { TodoList } from "@/components/todo/TodoList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Todo, TodoInput, Priority, TodoSort } from "@/types/todo";

/**
 * Mock 데이터 생성 함수
 */
const generateMockTodos = (): Todo[] => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  return [
    {
      id: "1",
      user_id: "user-1",
      title: "팀 회의 준비",
      description: "내일 오전 10시에 있을 팀 회의를 위해 자료 작성하기",
      created_date: now.toISOString(),
      due_date: tomorrow.toISOString(),
      priority: "high",
      category: ["업무"],
      completed: false,
      updated_at: now.toISOString(),
    },
    {
      id: "2",
      user_id: "user-1",
      title: "프로젝트 문서 작성",
      description: "프로젝트 진행 상황을 정리한 문서 작성",
      created_date: now.toISOString(),
      due_date: tomorrow.toISOString(),
      priority: "medium",
      category: ["업무", "문서"],
      completed: false,
      updated_at: now.toISOString(),
    },
    {
      id: "3",
      user_id: "user-1",
      title: "운동하기",
      description: "저녁에 헬스장 가서 운동하기",
      created_date: yesterday.toISOString(),
      due_date: yesterday.toISOString(),
      priority: "low",
      category: ["개인"],
      completed: false,
      updated_at: yesterday.toISOString(),
    },
    {
      id: "4",
      user_id: "user-1",
      title: "React 학습",
      description: "Next.js 15 App Router 공부하기",
      created_date: now.toISOString(),
      due_date: null,
      priority: "medium",
      category: ["학습"],
      completed: true,
      updated_at: now.toISOString(),
    },
    {
      id: "5",
      user_id: "user-1",
      title: "장보기",
      description: "주말에 필요한 식료품 구매",
      created_date: now.toISOString(),
      due_date: null,
      priority: "low",
      category: ["개인"],
      completed: false,
      updated_at: now.toISOString(),
    },
  ];
};

/**
 * 메인 페이지 컴포넌트
 * 할 일 관리의 메인 화면을 구성합니다.
 */
const HomePage = () => {
  const router = useRouter();
  const { user: authUser, isLoading: isAuthLoading } = useAuth();
  const [todos, setTodos] = React.useState<Todo[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<TodoSort>("created_date");
  const [editingTodo, setEditingTodo] = React.useState<Todo | null>(null);
  const [isFormLoading, setIsFormLoading] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [isLoadingTodos, setIsLoadingTodos] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // 사용자 정보를 authUser에서 가져오기
  const user = React.useMemo(() => {
    if (!authUser) return null;
    return {
      email: authUser.email,
      full_name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0],
    };
  }, [authUser]);

  /**
   * 할 일 목록 조회
   */
  const fetchTodos = React.useCallback(async () => {
    if (!authUser) return;

    try {
      setIsLoadingTodos(true);
      setError(null);
      const supabase = createClient();

      // 로그인한 사용자의 할 일만 조회 (user_id 기준)
      const { data, error: fetchError } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", authUser.id)
        .order("created_date", { ascending: false }); // 최근 생성 순으로 기본 정렬

      if (fetchError) {
        throw fetchError;
      }

      setTodos((data as Todo[]) || []);
    } catch (err) {
      console.error("할 일 목록 조회 실패:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "할 일 목록을 불러오는데 실패했습니다.";
      
      // 인증 오류인 경우
      if (err instanceof Error && (err.message.includes("JWT") || err.message.includes("auth"))) {
        setError("인증이 만료되었습니다. 다시 로그인해주세요.");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoadingTodos(false);
    }
  }, [authUser, router]);

  /**
   * 사용자 정보가 로드되면 할 일 목록 조회
   */
  React.useEffect(() => {
    if (authUser && !isAuthLoading) {
      fetchTodos();
    }
  }, [authUser, isAuthLoading, fetchTodos]);

  /**
   * 할 일 추가 핸들러
   */
  const handleAddTodo = async (data: TodoInput) => {
    if (!authUser) {
      setError("로그인이 필요합니다.");
      return;
    }

    setIsFormLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Supabase에 할 일 추가
      const { data: newTodo, error: insertError } = await supabase
        .from("todos")
        .insert({
          user_id: authUser.id,
          title: data.title,
          description: data.description || null,
          due_date: data.due_date || null,
          priority: data.priority || null,
          category: data.category || [],
          completed: data.completed || false,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // 목록 다시 조회하여 최신 상태 반영
      await fetchTodos();
    } catch (err) {
      console.error("할 일 추가 실패:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "할 일 추가에 실패했습니다.";
      
      if (err instanceof Error && (err.message.includes("JWT") || err.message.includes("auth"))) {
        setError("인증이 만료되었습니다. 다시 로그인해주세요.");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsFormLoading(false);
    }
  };

  /**
   * 할 일 수정 핸들러
   */
  const handleUpdateTodo = async (data: TodoInput) => {
    if (!editingTodo || !authUser) {
      setError("로그인이 필요합니다.");
      return;
    }

    // 본인 소유인지 확인
    if (editingTodo.user_id !== authUser.id) {
      setError("본인의 할 일만 수정할 수 있습니다.");
      return;
    }

    setIsFormLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Supabase에서 할 일 수정
      const { error: updateError } = await supabase
        .from("todos")
        .update({
          title: data.title,
          description: data.description || null,
          due_date: data.due_date || null,
          priority: data.priority || null,
          category: data.category || [],
          completed: data.completed !== undefined ? data.completed : editingTodo.completed,
        })
        .eq("id", editingTodo.id)
        .eq("user_id", authUser.id); // 본인 소유인지 다시 확인

      if (updateError) {
        throw updateError;
      }

      // 목록 다시 조회하여 최신 상태 반영
      await fetchTodos();
      setEditingTodo(null);
    } catch (err) {
      console.error("할 일 수정 실패:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "할 일 수정에 실패했습니다.";
      
      if (err instanceof Error && (err.message.includes("JWT") || err.message.includes("auth"))) {
        setError("인증이 만료되었습니다. 다시 로그인해주세요.");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsFormLoading(false);
    }
  };

  /**
   * 할 일 삭제 핸들러
   */
  const handleDeleteTodo = async (id: string) => {
    if (!authUser) {
      setError("로그인이 필요합니다.");
      return;
    }

    // 삭제할 할 일 찾기
    const todoToDelete = todos.find((todo) => todo.id === id);
    if (!todoToDelete) {
      setError("삭제할 할 일을 찾을 수 없습니다.");
      return;
    }

    // 본인 소유인지 확인
    if (todoToDelete.user_id !== authUser.id) {
      setError("본인의 할 일만 삭제할 수 있습니다.");
      return;
    }

    // 확인 창 표시
    if (!confirm(`"${todoToDelete.title}" 할 일을 삭제하시겠습니까?`)) {
      return;
    }

    setError(null);

    try {
      const supabase = createClient();

      // Supabase에서 할 일 삭제
      const { error: deleteError } = await supabase
        .from("todos")
        .delete()
        .eq("id", id)
        .eq("user_id", authUser.id); // 본인 소유인지 다시 확인

      if (deleteError) {
        throw deleteError;
      }

      // 목록 다시 조회하여 최신 상태 반영
      await fetchTodos();
    } catch (err) {
      console.error("할 일 삭제 실패:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "할 일 삭제에 실패했습니다.";
      
      if (err instanceof Error && (err.message.includes("JWT") || err.message.includes("auth"))) {
        setError("인증이 만료되었습니다. 다시 로그인해주세요.");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setError(errorMessage);
      }
    }
  };

  /**
   * 할 일 완료 상태 변경 핸들러
   */
  const handleToggleComplete = async (id: string, completed: boolean) => {
    if (!authUser) {
      setError("로그인이 필요합니다.");
      return;
    }

    // 변경할 할 일 찾기
    const todoToUpdate = todos.find((todo) => todo.id === id);
    if (!todoToUpdate) {
      setError("할 일을 찾을 수 없습니다.");
      return;
    }

    // 본인 소유인지 확인
    if (todoToUpdate.user_id !== authUser.id) {
      setError("본인의 할 일만 수정할 수 있습니다.");
      return;
    }

    setError(null);

    try {
      const supabase = createClient();

      // Supabase에서 완료 상태 업데이트
      const { error: updateError } = await supabase
        .from("todos")
        .update({ completed })
        .eq("id", id)
        .eq("user_id", authUser.id); // 본인 소유인지 다시 확인

      if (updateError) {
        throw updateError;
      }

      // 목록 다시 조회하여 최신 상태 반영
      await fetchTodos();
    } catch (err) {
      console.error("완료 상태 변경 실패:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "완료 상태 변경에 실패했습니다.";
      
      if (err instanceof Error && (err.message.includes("JWT") || err.message.includes("auth"))) {
        setError("인증이 만료되었습니다. 다시 로그인해주세요.");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setError(errorMessage);
      }
    }
  };

  /**
   * 할 일 수정 시작 핸들러
   */
  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
  };

  /**
   * 폼 취소 핸들러
   */
  const handleCancelEdit = () => {
    setEditingTodo(null);
  };

  /**
   * 필터링 및 정렬된 할 일 목록
   */
  const filteredAndSortedTodos = React.useMemo(() => {
    let filtered = [...todos];

    // 검색 필터 (제목 기준)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((todo) =>
        todo.title.toLowerCase().includes(query)
      );
    }

    // 상태 필터
    if (statusFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter((todo) => {
        if (statusFilter === "completed") return todo.completed;
        if (statusFilter === "active") {
          return !todo.completed && (!todo.due_date || new Date(todo.due_date) >= now);
        }
        if (statusFilter === "overdue") {
          return !todo.completed && todo.due_date && new Date(todo.due_date) < now;
        }
        return true;
      });
    }

    // 우선순위 필터
    if (priorityFilter !== "all") {
      filtered = filtered.filter((todo) => todo.priority === priorityFilter);
    }

    // 정렬
    filtered.sort((a, b) => {
      if (sortBy === "priority") {
        const priorityOrder = { high: 3, medium: 2, low: 1, null: 0 };
        const aPriority = priorityOrder[a.priority || "null"];
        const bPriority = priorityOrder[b.priority || "null"];
        return bPriority - aPriority;
      }
      if (sortBy === "due_date") {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (sortBy === "title") {
        return a.title.localeCompare(b.title, "ko");
      }
      // created_date (기본값)
      return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
    });

    return filtered;
  }, [todos, searchQuery, statusFilter, priorityFilter, sortBy]);

  // 인증 상태 로딩 중이면 로딩 화면 표시
  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 사용자가 없으면 아무것도 표시하지 않음 (리다이렉트 중)
  if (!user || !authUser) {
    return null;
  }

  /**
   * 로그아웃 핸들러
   * Supabase Auth를 사용한 로그아웃 처리
   * onAuthStateChange가 자동으로 상태를 업데이트하고 리다이렉트 처리
   */
  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      const supabase = createClient();

      // Supabase 로그아웃
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      // onAuthStateChange가 자동으로 상태를 업데이트하고 리다이렉트 처리
    } catch (err) {
      console.error("로그아웃 실패:", err);
      alert(
        err instanceof Error
          ? `로그아웃에 실패했습니다: ${err.message}`
          : "로그아웃에 실패했습니다. 다시 시도해주세요."
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
              <Sparkles className="size-5 text-primary" />
            </div>
            <span className="text-xl font-bold">AI 할 일 관리</span>
          </Link>

          {/* 사용자 정보 및 로그아웃 */}
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar>
                    <AvatarFallback>
                      {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || <User className="size-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">
                    {user?.full_name || user?.email?.split("@")[0] || "사용자"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.full_name || "사용자"}
                    </p>
                    {user?.email && (
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 size-4" />
                  <span>프로필</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="text-destructive"
                >
                  <LogOut className="mr-2 size-4" />
                  <span>{isLoggingOut ? "로그아웃 중..." : "로그아웃"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container flex-1 px-4 py-6">
        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* 좌측: TodoForm */}
          <aside className="w-full lg:w-96 lg:sticky lg:top-20">
            <TodoForm
              initialData={editingTodo}
              onSubmit={editingTodo ? handleUpdateTodo : handleAddTodo}
              onCancel={editingTodo ? handleCancelEdit : undefined}
              isLoading={isFormLoading}
              error={error}
            />
          </aside>

          {/* 우측: Toolbar 및 TodoList */}
          <div className="flex-1 space-y-6">
            {/* Toolbar */}
            <div className="space-y-4 rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-muted-foreground" />
                <h2 className="font-semibold">필터 및 검색</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* 검색 */}
                <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="search">검색</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="search"
                      placeholder="제목 또는 설명 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* 상태 필터 */}
                <div className="space-y-2">
                  <Label htmlFor="status-filter">상태</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status-filter">
                      <SelectValue placeholder="상태 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="active">진행 중</SelectItem>
                      <SelectItem value="completed">완료</SelectItem>
                      <SelectItem value="overdue">지연</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 우선순위 필터 */}
                <div className="space-y-2">
                  <Label htmlFor="priority-filter">우선순위</Label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger id="priority-filter">
                      <SelectValue placeholder="우선순위 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="high">높음</SelectItem>
                      <SelectItem value="medium">중간</SelectItem>
                      <SelectItem value="low">낮음</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 정렬 */}
                <div className="space-y-2">
                  <Label htmlFor="sort">정렬</Label>
                  <Select
                    value={sortBy}
                    onValueChange={(value) => setSortBy(value as TodoSort)}
                  >
                    <SelectTrigger id="sort">
                      <SelectValue placeholder="정렬 기준" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="priority">
                        <div className="flex items-center gap-2">
                          <ArrowUpDown className="size-4" />
                          <span>우선순위순</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="due_date">마감일순</SelectItem>
                      <SelectItem value="created_date">생성일순</SelectItem>
                      <SelectItem value="title">제목순</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 필터 요약 */}
              {(statusFilter !== "all" ||
                priorityFilter !== "all" ||
                searchQuery.trim()) && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">적용된 필터:</span>
                  {searchQuery.trim() && (
                    <Badge variant="secondary">검색: {searchQuery}</Badge>
                  )}
                  {statusFilter !== "all" && (
                    <Badge variant="secondary">
                      상태:{" "}
                      {statusFilter === "active"
                        ? "진행 중"
                        : statusFilter === "completed"
                        ? "완료"
                        : "지연"}
                    </Badge>
                  )}
                  {priorityFilter !== "all" && (
                    <Badge variant="secondary">
                      우선순위:{" "}
                      {priorityFilter === "high"
                        ? "높음"
                        : priorityFilter === "medium"
                        ? "중간"
                        : "낮음"}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setPriorityFilter("all");
                    }}
                  >
                    필터 초기화
                  </Button>
                </div>
              )}
            </div>

            {/* TodoList */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  할 일 목록
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({filteredAndSortedTodos.length}개)
                  </span>
                </h2>
              </div>
              <TodoList
                todos={filteredAndSortedTodos}
                onToggleComplete={handleToggleComplete}
                onEdit={handleEditTodo}
                onDelete={handleDeleteTodo}
                isLoading={isLoadingTodos}
                error={error}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
