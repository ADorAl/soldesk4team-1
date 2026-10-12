
/*
 * ============================================================
 * 파일명: main.jsx
 * 위치: src/main.jsx
 * ============================================================
 *
 * [파일 목적]
 * React 애플리케이션을 브라우저에 실행하는 시작 지점.
 *
 * [현재 적용 기능]
 * 1. React 실행
 * 2. 전역 CSS 및 Tailwind CSS 적용
 * 3. BrowserRouter를 이용한 URL 기반 페이지 이동 준비
 *
 * [관련 파일]
 * - index.html : id="root"가 정의된 HTML
 * - App.jsx    : 실제 TeamPlace 화면 및 페이지 구성
 * - index.css  : Tailwind CSS 및 전역 스타일
 *
 * [팀원 인계]
 * BrowserRouter는 애플리케이션 전체를 감싸야 한다.
 *
 * 추후 로그인/회원가입 페이지를 추가하더라도
 * 이 파일에 BrowserRouter를 중복해서 만들지 않는다.
 *
 * 각 페이지의 URL 및 이동 규칙은
 * App.jsx에서 관리할 예정이다.
 *
 * [주의]
 * BrowserRouter만 추가한다고 뒤로가기 기능이
 * 즉시 완성되는 것은 아니다.
 *
 * App.jsx의 useState 화면 전환을
 * Routes, Route 방식으로 변경해야 한다.
 * ============================================================
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// React Router의 브라우저 주소 관리 컴포넌트
import { BrowserRouter } from 'react-router-dom'

// Tailwind CSS 및 전역 스타일
import './index.css'

// TeamPlace 최상위 컴포넌트
import App from './App.jsx'

/*
 * [React 실행 흐름]
 *
 * index.html
 *   ↓
 * <div id="root">
 *   ↓
 * main.jsx
 *   ↓
 * BrowserRouter
 *   ↓
 * App.jsx
 *   ↓
 * 각 페이지 컴포넌트
 *
 * [BrowserRouter 역할]
 *
 * 브라우저 URL과 방문 기록을 관리한다.
 *
 * 예:
 * /dashboard
 * /projects
 * /projects/new
 * /projects/5
 *
 * 실제 경로별 화면 연결은 다음 단계에서 진행한다.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
