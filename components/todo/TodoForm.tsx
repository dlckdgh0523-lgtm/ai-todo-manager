"use client";

import * as React from "react";
import { Calendar as CalendarIcon, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Todo, TodoInput, Priority } from "@/types/todo";

/**
 * 할 일 추가/편집을 위한 폼 컴포넌트
 */
interface TodoFormProps {
  /** 초기 할 일 데이터 (편집 모드) */
  initialData?: Todo | null;
  /** 폼 제출 핸들러 */
  onSubmit: (data: TodoInput) => Promise<void> | void;
  /** 취소 핸들러 */
  onCancel?: () => void;
  /** 로딩 상태 */
  isLoading?: boolean;
  /** 에러 메시지 */
  error?: string | null;
}

const TodoForm = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
}: TodoFormProps) => {
  const [formData, setFormData] = React.useState<TodoInput>({
    title: initialData?.title || "",
    description: initialData?.description || "",
    due_date: initialData?.due_date
      ? new Date(initialData.due_date).toISOString().slice(0, 16)
      : "",
    priority: initialData?.priority || "medium",
    category: initialData?.category || [],
    completed: initialData?.completed || false,
  });

  const [categoryInput, setCategoryInput] = React.useState("");
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [aiInput, setAiInput] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);

  /**
   * 폼 필드 업데이트
   */
  const updateField = <K extends keyof TodoInput>(
    field: K,
    value: TodoInput[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setLocalError(null);
  };

  /**
   * 카테고리 추가
   */
  const addCategory = () => {
    if (!categoryInput.trim()) return;
    if (formData.category?.includes(categoryInput.trim())) {
      setLocalError("이미 추가된 카테고리입니다");
      return;
    }
    updateField("category", [...(formData.category || []), categoryInput.trim()]);
    setCategoryInput("");
    setLocalError(null);
  };

  /**
   * 카테고리 제거
   */
  const removeCategory = (category: string) => {
    updateField(
      "category",
      formData.category?.filter((cat) => cat !== category) || []
    );
  };

  /**
   * AI 기반 할 일 생성
   */
  const handleGenerateWithAI = async () => {
    if (!aiInput.trim()) {
      setLocalError("자연어 입력을 입력해주세요");
      return;
    }

    setIsGenerating(true);
    setLocalError(null);

    try {
      const response = await fetch("/api/ai/generate-todo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: aiInput.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "AI 할 일 생성에 실패했습니다";
        const errorDetails = errorData.details;
        
        // 환경 변수 관련 에러인 경우 더 명확한 메시지
        if (errorMessage.includes("설정되지 않았습니다") || errorMessage.includes("설정 오류")) {
          throw new Error(
            `${errorMessage}\n\n${errorDetails || "GOOGLE_GENERATIVE_AI_API_KEY 환경 변수를 확인해주세요."}`
          );
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // AI가 생성한 데이터를 폼에 채우기
      setFormData({
        title: data.title || "",
        description: data.description || "",
        due_date: data.due_date
          ? new Date(data.due_date).toISOString().slice(0, 16)
          : "",
        priority: data.priority || "medium",
        category: data.category || [],
        completed: false,
      });

      // AI 입력 필드 초기화
      setAiInput("");
    } catch (err) {
      console.error("AI 할 일 생성 실패:", err);
      setLocalError(
        err instanceof Error
          ? err.message
          : "AI 할 일 생성에 실패했습니다. 다시 시도해주세요."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * 폼 제출 처리
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // 유효성 검사
    if (!formData.title?.trim()) {
      setLocalError("제목을 입력해주세요");
      return;
    }

    try {
      await onSubmit(formData);
      // 성공 시 폼 초기화 (새로 추가하는 경우)
      if (!initialData) {
        setFormData({
          title: "",
          description: "",
          due_date: "",
          priority: "medium",
          category: [],
          completed: false,
        });
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "오류가 발생했습니다");
    }
  };

  /**
   * 우선순위 옵션
   */
  const priorityOptions: { value: Priority; label: string }[] = [
    { value: "high", label: "높음" },
    { value: "medium", label: "중간" },
    { value: "low", label: "낮음" },
  ];

  const displayError = error || localError;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? "할 일 수정" : "새 할 일 추가"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 에러 메시지 */}
          {displayError && (
            <div
              className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive"
              role="alert"
            >
              {displayError}
            </div>
          )}

          {/* AI 기반 할 일 생성 (편집 모드가 아닐 때만 표시) */}
          {!initialData && (
            <>
              <div className="space-y-2">
                <Label htmlFor="ai-input" className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  AI로 할 일 생성
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="ai-input"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleGenerateWithAI();
                      }
                    }}
                    placeholder="예: 내일 오후 3시까지 중요한 팀 회의 준비하기"
                    disabled={isLoading || isGenerating}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleGenerateWithAI}
                    disabled={isLoading || isGenerating || !aiInput.trim()}
                    variant="default"
                  >
                    {isGenerating ? (
                      <>
                        <Spinner className="size-4" />
                        생성 중...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        생성
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  자연어로 할 일을 입력하면 자동으로 제목, 마감일, 우선순위, 카테고리를 추출합니다.
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* 제목 */}
          <div className="space-y-2">
            <Label htmlFor="title">
              제목 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="할 일 제목을 입력하세요"
              disabled={isLoading}
              required
              aria-required="true"
            />
          </div>

          {/* 설명 */}
          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="상세 설명을 입력하세요 (선택사항)"
              disabled={isLoading}
              rows={4}
            />
          </div>

          {/* 마감일 */}
          <div className="space-y-2">
            <Label htmlFor="due_date">마감일</Label>
            <div className="relative">
              <Input
                id="due_date"
                type="datetime-local"
                value={formData.due_date || ""}
                onChange={(e) => updateField("due_date", e.target.value)}
                disabled={isLoading}
                className="pl-10"
              />
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* 우선순위 */}
          <div className="space-y-2">
            <Label htmlFor="priority">우선순위</Label>
            <Select
              value={formData.priority || "medium"}
              onValueChange={(value) => updateField("priority", value as Priority)}
              disabled={isLoading}
            >
              <SelectTrigger id="priority" className="w-full">
                <SelectValue placeholder="우선순위를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 카테고리 */}
          <div className="space-y-2">
            <Label htmlFor="category">카테고리</Label>
            <div className="flex gap-2">
              <Input
                id="category"
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCategory();
                  }
                }}
                placeholder="카테고리 입력 후 Enter"
                disabled={isLoading}
              />
              <Button
                type="button"
                onClick={addCategory}
                disabled={isLoading || !categoryInput.trim()}
                variant="outline"
              >
                추가
              </Button>
            </div>
            {formData.category && formData.category.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.category.map((cat) => (
                  <Badge
                    key={cat}
                    variant="secondary"
                    className="flex items-center gap-1.5"
                  >
                    {cat}
                    <button
                      type="button"
                      onClick={() => removeCategory(cat)}
                      disabled={isLoading}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                      aria-label={`${cat} 카테고리 제거`}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-3 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                취소
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner className="size-4" />
                  처리 중...
                </>
              ) : initialData ? (
                "수정하기"
              ) : (
                "추가하기"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export { TodoForm };
