/*
 * ============================================================
 * 파일명: devUser.js
 * 위치: src/config/devUser.js
 * ============================================================
 * [목적]
 * 로그인 기능이 아직 연결되지 않은 개발 단계에서만
 * 프론트엔드가 표시할 사용자 ID와 API 요청용 사용자 ID를
 * 같은 값으로 관리하기 위한 임시 설정 파일이다.
 *
 * [현재 테스트 대상]
 * USER_ID 2는 프로젝트 ID 5의 PENDING 초대를 받은 사용자다.
 * 테스트를 끝낸 뒤 1로 돌릴 수 있다.
 *
 * [중요한 보안/동작 제약]
 * - 이 파일은 실제 인증 수단이 아니다.
 * - Spring Boot의 dev 프로필에서만 X-Dev-User-Id가 적용된다.
 * - 이 설정 파일을 추가하는 것만으로 fetch에 헤더가 자동 첨부되지는 않는다.
 * - 다음 단계에서 API 요청 함수에 getDevUserHeaders()를 연결해야 한다.
 * - 그 다음 화면의 currentUserId도 getDevUserId()로 통일한다.
 * - 실제 로그인 기능 통합 시 이 개발용 설정과 헤더는 제거한다.
 * ============================================================
 */

// 개발 전용 사용자 선택: 현재는 받은 초대 확인을 위해 USER_ID 2 사용.
const DEV_USER_ID = 2

/*
 * 화면에서 현재 사용자 ID를 비교할 때 사용한다.
 * 예: 멤버 목록에서 '나' 표시, 버튼 활성화 권한의 화면 측 계산.
 * 최종 권한 확인은 항상 Spring Boot Service가 담당한다.
 */
export function getDevUserId() {
    return DEV_USER_ID
}

/*
 * 프로젝트 API 요청에 추가할 개발 전용 헤더를 반환한다.
 * 기존 headers와 병합하여 사용해야 한다.
 *
 * 예: headers: { Accept: 'application/json', ...getDevUserHeaders() }
 * 아직 실제 요청에 연결하지 않았으므로 호출만으로는 전송되지 않는다.
 */
export function getDevUserHeaders() {
    return { 'X-Dev-User-Id': String(DEV_USER_ID) }
}
