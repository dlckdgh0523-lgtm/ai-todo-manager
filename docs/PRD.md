# PRD (Product Requirements Document)
## AI 기반 할 일 관리 웹 애플리케이션

---

## 1. 개요

### 1.1 제품 목적
본 제품은 **AI 기능을 결합한 개인/업무용 할 일(To-do) 관리 웹 애플리케이션**으로,  
사용자가 할 일을 효율적으로 생성·관리하고, AI를 통해 자동 구조화 및 요약/분석 인사이트를 제공받을 수 있도록 한다.

### 1.2 타깃 사용자
- 개인 업무 및 일정 관리를 체계화하고 싶은 직장인
- 학습 계획 및 과제 관리를 원하는 학생
- 간단하지만 확장 가능한 To-do SaaS 예제를 원하는 개발자

### 1.3 핵심 가치
- Supabase 기반의 간편한 인증 및 데이터 관리
- AI를 활용한 자연어 → 구조화 데이터 변환
- 일/주 단위 생산성 요약 및 분석 제공

---

## 2. 주요 기능 정의

### 2.1 사용자 인증 (Supabase Auth)
- 이메일/비밀번호 기반 회원가입 및 로그인
- Supabase Auth 기본 기능 활용
- 인증 상태에 따른 접근 제어 (Protected Route)

**요구사항**
- 로그인 상태가 아닐 경우 메인 페이지 접근 불가
- 회원가입 시 이메일 인증(Optional)

---

### 2.2 할 일 관리 (CRUD)

#### 기능 설명
사용자는 개인 할 일을 생성, 조회, 수정, 삭제할 수 있다.

#### 할 일 필드 정의
| 필드명 | 타입 | 설명 |
|------|------|------|
| id | uuid | 할 일 고유 ID |
| user_id | uuid | 사용자 ID (users 테이블 FK) |
| title | string | 할 일 제목 |
| description | text | 상세 설명 |
| created_date | timestamp | 생성일 |
| due_date | timestamp | 마감일 |
| priority | enum | high / medium / low |
| category | text[] | 업무, 개인, 학습 등 |
| completed | boolean | 완료 여부 |
| updated_at | timestamp | 수정일 |

---

### 2.3 검색 / 필터 / 정렬

#### 검색
- 제목(title) 및 설명(description) 기준 부분 검색

#### 필터
- 우선순위: 높음 / 중간 / 낮음
- 카테고리: 업무 / 개인 / 학습 등 (다중 선택)
- 진행 상태:
  - 진행 중 (completed = false, due_date >= today)
  - 완료 (completed = true)
  - 지연 (completed = false, due_date < today)

#### 정렬
- 우선순위순
- 마감일순
- 생성일순

---

### 2.4 AI 할 일 생성 기능

#### 기능 설명
사용자가 자연어 문장을 입력하면 AI가 이를 분석하여 구조화된 할 일 데이터로 변환한다.

#### 입력 예
```
내일 오전 10시에 팀 회의 준비
```

#### AI 변환 결과 예
```json
{
  "title": "팀 회의 준비",
  "description": "내일 오전 10시에 있을 팀 회의를 위해 자료 작성하기",
  "created_date": "YYYY-MM-DD HH:MM",
  "due_date": "YYYY-MM-DD 10:00",
  "priority": "high",
  "category": ["업무"],
  "completed": false
}
```

#### 기술 요구사항
- Google Gemini API 활용
- Prompt Engineering을 통해 JSON 포맷 강제
- 변환 결과를 사용자에게 미리보기 제공 후 저장

---

### 2.5 AI 요약 및 분석 기능

#### 일일 요약
- 오늘 완료된 할 일 목록
- 오늘 남은 할 일 요약

#### 주간 요약
- 이번 주 전체 할 일 수
- 완료율 (%)
- 카테고리별 작업 분포

#### UI
- 버튼 클릭 시 AI 요약 실행
- 모달 또는 카드 형태로 결과 표시

---

## 3. 화면 구성 (UI/UX)

### 3.1 로그인 / 회원가입 화면
- 이메일, 비밀번호 입력
- 로그인 / 회원가입 전환
- 에러 메시지 및 로딩 상태 표시

---

### 3.2 할 일 관리 메인 화면

#### 구성 요소
- 상단: 검색창, 필터, 정렬 옵션
- 중앙: 할 일 리스트 (Card 또는 Table)
- 하단/우측: 할 일 추가 버튼 (FAB)
- AI 기능:
  - AI 할 일 생성 입력창
  - AI 요약/분석 버튼

---

### 3.3 통계 및 분석 화면 (확장 기능)
- 주간 활동량 차트
- 완료율 Progress Bar
- 카테고리별 Pie Chart

---

### 3.4 UX 요구사항
- Next.js App Router 기반 페이지 전환
- 부드러운 화면 전환 애니메이션 적용
- Skeleton UI 및 Loading State 제공

---

## 4. 기술 스택

### Frontend
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui

### Backend / Infra
- Supabase
  - Auth
  - PostgreSQL
  - Row Level Security (RLS)

### AI
- Google Gemini API
- AI SDK 활용

---

## 5. 데이터 구조 (Supabase)

### 5.1 users
- Supabase Auth 기본 users 테이블 사용
- 추가 프로필 정보는 별도 profiles 테이블로 확장 가능

### 5.2 todos 테이블

```sql
create table todos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text,
  created_date timestamp with time zone default now(),
  due_date timestamp with time zone,
  priority text check (priority in ('high','medium','low')),
  category text[],
  completed boolean default false,
  updated_at timestamp with time zone default now()
);
```

#### RLS 정책
- 사용자 본인의 할 일만 조회/수정/삭제 가능

---

## 6. 비기능 요구사항

- 반응형 웹 지원 (모바일 / 데스크탑)
- Lighthouse 기준 성능 80점 이상
- 기본 접근성(WCAG) 준수

---

## 7. 향후 확장 아이디어

- 캘린더 연동 (Google Calendar)
- 알림 기능 (이메일 / 푸시)
- 팀 단위 협업 기능
- 유료 플랜 (AI 사용량 제한 해제)

---

## 8. 성공 지표 (KPI)

- DAU / MAU
- 할 일 생성 대비 완료율
- AI 기능 사용 비율
