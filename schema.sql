-- ============================================
-- AI 할 일 관리 웹 애플리케이션 - Supabase 스키마
-- ============================================

-- ============================================
-- 1. Extensions 활성화
-- ============================================
-- UUID 생성 및 기타 기능을 위해 필요
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. public.users 테이블 생성
-- ============================================
-- auth.users와 1:1로 연결되는 사용자 프로필 테이블
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. public.todos 테이블 생성
-- ============================================
-- 각 사용자별 할 일 관리 테이블
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  category TEXT[],
  completed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. 인덱스 생성
-- ============================================
-- 성능 최적화를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON public.todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_completed ON public.todos(completed);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON public.todos(due_date);
CREATE INDEX IF NOT EXISTS idx_todos_priority ON public.todos(priority);
CREATE INDEX IF NOT EXISTS idx_todos_created_date ON public.todos(created_date);

-- ============================================
-- 5. updated_at 자동 업데이트 함수
-- ============================================
-- updated_at 컬럼을 자동으로 업데이트하는 함수
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- users 테이블의 updated_at 트리거
CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- todos 테이블의 updated_at 트리거
CREATE TRIGGER set_updated_at_todos
  BEFORE UPDATE ON public.todos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 6. Row Level Security (RLS) 활성화
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. public.users 테이블 RLS 정책
-- ============================================

-- 사용자는 자신의 프로필만 조회 가능
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- 사용자는 자신의 프로필만 수정 가능
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- 사용자는 자신의 프로필만 삽입 가능 (회원가입 시)
CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 8. public.todos 테이블 RLS 정책
-- ============================================

-- 사용자는 자신의 할 일만 조회 가능
CREATE POLICY "Users can view own todos"
  ON public.todos
  FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 할 일만 삽입 가능
CREATE POLICY "Users can insert own todos"
  ON public.todos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 할 일만 수정 가능
CREATE POLICY "Users can update own todos"
  ON public.todos
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 사용자는 자신의 할 일만 삭제 가능
CREATE POLICY "Users can delete own todos"
  ON public.todos
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 9. 사용자 프로필 자동 생성 함수
-- ============================================
-- auth.users에 새 사용자가 생성될 때 자동으로 public.users에 프로필 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users에 트리거 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 10. 완료
-- ============================================
-- 스키마 생성이 완료되었습니다.
-- 이제 Supabase 대시보드의 SQL Editor에서 이 스크립트를 실행하세요.
