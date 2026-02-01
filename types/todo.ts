/**
 * 할 일 관련 타입 정의
 */

/**
 * 우선순위 레벨
 */
export type Priority = "high" | "medium" | "low";

/**
 * 할 일 데이터 타입
 */
export type Todo = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_date: string;
  due_date: string | null;
  priority: Priority | null;
  category: string[];
  completed: boolean;
  updated_at: string;
};

/**
 * 할 일 생성/수정을 위한 입력 데이터 타입
 */
export type TodoInput = {
  title: string;
  description?: string;
  due_date?: string;
  priority?: Priority;
  category?: string[];
  completed?: boolean;
};

/**
 * 할 일 필터 옵션
 */
export type TodoFilter = {
  priority?: Priority[];
  category?: string[];
  status?: "active" | "completed" | "overdue";
};

/**
 * 할 일 정렬 옵션
 */
export type TodoSort = "priority" | "due_date" | "created_date" | "title";
