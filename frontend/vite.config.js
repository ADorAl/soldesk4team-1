
/*
 * ============================================================
 * 파일명: vite.config.js
 * 위치: frontend/vite.config.js
 * ============================================================
 *
 * [파일 목적]
 * React 개발 서버인 Vite의 실행 환경을 설정한다.
 *
 * [현재 설정]
 * 1. React 플러그인 사용
 * 2. Tailwind CSS v4 플러그인 사용
 * 3. Spring Boot 백엔드 API로 요청 전달
 *
 * [팀원 인계]
 * 프론트엔드에서 /api로 시작하는 요청은
 * 개발 중 Vite Proxy를 통해 Spring Boot로 전달된다.
 *
 * 프론트엔드: http://localhost:5173
 * 백엔드:     http://localhost:8080
 *
 * 백엔드 포트가 변경되면 target 주소도 변경해야 한다.
 *
 * 주의:
 * 이 Proxy는 Vite 개발 서버에서 사용하는 설정이다.
 * 실제 배포 환경에서는 별도 API 주소 또는
 * 배포 서버의 Reverse Proxy 설정이 필요하다.
 * ============================================================
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({

  /*
   * [Vite 플러그인]
   *
   * react()
   * - React JSX 변환 및 개발 환경 지원
   *
   * tailwindcss()
   * - Tailwind CSS v4 처리
   */
  plugins: [
    react(),
    tailwindcss(),
  ],

  /*
   * [개발 서버 설정]
   *
   * server.proxy
   * - 브라우저의 특정 요청을 다른 서버에 전달한다.
   *
   * '/api'
   * - /api로 시작하는 요청에 적용
   *
   * target
   * - 실제 Spring Boot 서버 주소
   *
   * changeOrigin
   * - 프록시가 백엔드에 전달하는 요청의
   *   Origin/Host 관련 헤더를 대상 서버에 맞게 변경
   *
   * [예시]
   * React에서 fetch('/api/projects') 호출
   *   ↓
   * Vite가 요청을 받음
   *   ↓
   * http://localhost:8080/api/projects 로 전달
   *   ↓
   * Spring Boot ProjectController에서 처리
   *
   * [주의]
   * Proxy는 인증 기능이 아니다.
   * 백엔드에서 사용자 확인과 권한 검증을 수행해야 한다.
   */
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },

})
