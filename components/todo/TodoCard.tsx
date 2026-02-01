"use client";

import * as React from "react";
import { Calendar, Clock, Tag, Trash2, Edit2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Todo, Priority } from "@/types/todo";

/**
 * 개별 할 일을 표시하는 카드 컴포넌트
 */
interface TodoCardProps {
  /** 표시할 할 일 데이터 */
  todo: Todo;
  /** 완료 상태 변경 핸들러 */
  onToggleComplete?: (id: string, completed: boolean) => void;
  /** 수정 버튼 클릭 핸들러 */
  onEdit?: (todo: Todo) => void;
  /** 삭제 버튼 클릭 핸들러 */
  onDelete?: (id: string) => void;
  /** 로딩 상태 */
  isLoading?: boolean;
}

const TodoCard = ({
  todo,
  onToggleComplete,
  onEdit,
  onDelete,
  isLoading = false,
}: TodoCardProps) => {
  /**
   * 우선순위에 따른 배지 스타일 반환
   */
  const getPriorityBadgeVariant = (priority: Priority | null): "default" | "secondary" | "destructive" => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "secondary";
    }
  };

  /**
   * 우선순위 한글 표시
   */
  const getPriorityLabel = (priority: Priority | null): string => {
    switch (priority) {
      case "high":
        return "높음";
      case "medium":
        return "중간";
      case "low":
        return "낮음";
      default:
        return "미설정";
    }
  };

  /**
   * 날짜 포맷팅
   */
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "미설정";
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 오늘인지 확인
    if (date.toDateString() === today.toDateString()) {
      return `오늘 ${date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
    }
    // 내일인지 확인
    if (date.toDateString() === tomorrow.toDateString()) {
      return `내일 ${date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
    }
    // 과거인지 확인
    if (date < today) {
      return `지연됨: ${date.toLocaleDateString("ko-KR")}`;
    }
    // 일반 날짜
    return date.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /**
   * 지연 여부 확인
   */
  const isOverdue = todo.due_date && new Date(todo.due_date) < new Date() && !todo.completed;

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        todo.completed && "opacity-60",
        isOverdue && "border-destructive/50",
        isLoading && "pointer-events-none opacity-50"
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Checkbox
              checked={todo.completed}
              onCheckedChange={(checked) => {
                onToggleComplete?.(todo.id, checked as boolean);
              }}
              disabled={isLoading}
              className="mt-1"
              aria-label={todo.completed ? "완료 취소" : "완료 처리"}
            />
            <div className="flex-1 min-w-0">
              <CardTitle
                className={cn(
                  "text-lg font-semibold break-words",
                  todo.completed && "line-through text-muted-foreground"
                )}
              >
                {todo.title}
              </CardTitle>
            </div>
          </div>
          <CardAction>
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(todo)}
                  disabled={isLoading}
                  aria-label="수정"
                >
                  <Edit2 className="size-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(todo.id)}
                  disabled={isLoading}
                  aria-label="삭제"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              )}
            </div>
          </CardAction>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 설명 */}
        {todo.description && (
          <p
            className={cn(
              "text-sm text-muted-foreground break-words",
              todo.completed && "line-through"
            )}
          >
            {todo.description}
          </p>
        )}

        {/* 메타 정보 */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {/* 우선순위 */}
          {todo.priority && (
            <Badge variant={getPriorityBadgeVariant(todo.priority)}>
              {getPriorityLabel(todo.priority)}
            </Badge>
          )}

          {/* 마감일 */}
          {todo.due_date && (
            <div
              className={cn(
                "flex items-center gap-1 text-muted-foreground",
                isOverdue && "text-destructive font-medium"
              )}
            >
              <Clock className="size-3.5" />
              <span>{formatDate(todo.due_date)}</span>
            </div>
          )}

          {/* 생성일 */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="size-3.5" />
            <span>{new Date(todo.created_date).toLocaleDateString("ko-KR")}</span>
          </div>
        </div>

        {/* 카테고리 */}
        {todo.category && todo.category.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Tag className="size-4 text-muted-foreground" />
            <div className="flex flex-wrap gap-1.5">
              {todo.category.map((cat) => (
                <Badge key={cat} variant="outline" className="text-xs">
                  {cat}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { TodoCard };
