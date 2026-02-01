"use client";

import * as React from "react";
import { AlertCircle, Inbox } from "lucide-react";
import { TodoCard } from "./TodoCard";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import type { Todo } from "@/types/todo";

/**
 * 할 일 목록을 표시하는 컴포넌트
 */
interface TodoListProps {
  /** 표시할 할 일 목록 */
  todos: Todo[];
  /** 완료 상태 변경 핸들러 */
  onToggleComplete?: (id: string, completed: boolean) => void;
  /** 수정 버튼 클릭 핸들러 */
  onEdit?: (todo: Todo) => void;
  /** 삭제 버튼 클릭 핸들러 */
  onDelete?: (id: string) => void;
  /** 로딩 상태 */
  isLoading?: boolean;
  /** 에러 메시지 */
  error?: string | null;
}

const TodoList = ({
  todos,
  onToggleComplete,
  onEdit,
  onDelete,
  isLoading = false,
  error = null,
}: TodoListProps) => {
  /**
   * 로딩 스켈레톤 UI
   */
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Skeleton className="size-5 rounded" />
              <Skeleton className="h-6 flex-1" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  /**
   * 에러 상태 UI
   */
  if (error) {
    return (
      <div className="py-8">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertCircle className="size-6" />
            </EmptyMedia>
            <EmptyTitle>할 일을 불러올 수 없습니다</EmptyTitle>
            <EmptyDescription>{error}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  /**
   * 로딩 상태 UI
   */
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  /**
   * 빈 상태 UI
   */
  if (todos.length === 0) {
    return (
      <div className="py-8">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox className="size-6" />
            </EmptyMedia>
            <EmptyTitle>할 일이 없습니다</EmptyTitle>
            <EmptyDescription>새로운 할 일을 추가해보세요</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  /**
   * 할 일 목록 렌더링
   */
  return (
    <div className="space-y-4">
      {todos.map((todo) => (
        <TodoCard
          key={todo.id}
          todo={todo}
          onToggleComplete={onToggleComplete}
          onEdit={onEdit}
          onDelete={onDelete}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
};

export { TodoList };
