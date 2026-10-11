
/*
 * ============================================================
 * 파일명: ProjectRoleInfo.jsx
 * 위치: src/components/ProjectRoleInfo.jsx
 * ============================================================
 *
 * [파일 목적]
 * 현재 사용자의 프로젝트 역할과
 * 프로젝트 정보 수정 가능 여부를 화면에 표시한다.
 *
 * [이번 구조 변경]
 * 기존:
 * - 이 컴포넌트에서 getProjectMembers() 호출
 * - 내부 useEffect / useState로 역할 정보 관리
 *
 * 변경:
 * - 부모 ProjectDetailPage에서 역할 정보를 조회
 * - 이 컴포넌트는 전달받은 정보를 표시만 한다.
 *
 * [변경 이유]
 * 역할 정보는 멤버 관리, 프로젝트 설정 등
 * 여러 화면에서 재사용할 수 있다.
 *
 * 데이터를 부모에서 관리하면:
 * 1. 동일한 멤버 API의 중복 호출을 줄일 수 있다.
 * 2. 여러 컴포넌트가 같은 역할 정보를 사용한다.
 * 3. 프로젝트 정보 수정 권한을 일관되게 표시한다.
 *
 * [Props]
 * myMembership:
 * - 현재 사용자의 ProjectMember 객체
 * - 참여 정보를 찾지 못했다면 null
 *
 * loading:
 * - 역할 정보 조회 중인지 여부
 *
 * error:
 * - 역할 정보 조회 실패 메시지
 *
 * [팀원 인계]
 * - 로그인 기능은 부모 컴포넌트에서 연결한다.
 * - 이 파일에 USER_ID = 1 같은 임시 사용자 값을 넣지 않는다.
 * - 서버 권한 검사는 Spring Boot Service에서 수행한다.
 *
 * [주의]
 * 이 파일은 API 요청을 수행하지 않는다.
 * ============================================================
 */


// ------------------------------------------------------------
// 1. 역할별 화면 표시 설정
// ------------------------------------------------------------

/*
 * position은 PROJECT_MEMBER 테이블의 역할 값이다.
 *
 * LEADER      : 리더
 * VICE_LEADER : 부리더
 * MEMBER      : 일반 멤버
 *
 * [Tailwind CSS]
 * bg-*   : 역할 배지의 배경색
 * text-* : 역할 배지의 글자색
 */
const ROLE_DISPLAY = {
    LEADER: {
        label: 'LEADER (리더)',
        style: 'bg-blue-100 text-blue-700',
    },

    VICE_LEADER: {
        label: 'VICE_LEADER (부리더)',
        style: 'bg-indigo-100 text-indigo-700',
    },

    MEMBER: {
        label: 'MEMBER (일반 멤버)',
        style: 'bg-slate-100 text-slate-700',
    },
}


// ------------------------------------------------------------
// 2. ProjectRoleInfo 컴포넌트
// ------------------------------------------------------------

function ProjectRoleInfo({
    myMembership,
    loading = false,
    error = null,
}) {

    /*
     * [수정 권한 표시]
     *
     * 다음 조건을 모두 만족해야 한다.
     *
     * 1. 프로젝트 멤버 상태가 ACTIVE
     * 2. 역할이 LEADER 또는 VICE_LEADER
     *
     * 이 값은 사용자 인터페이스에서 안내하는 용도다.
     * 실제 PUT 요청 시에는 서버가 다시 권한을 검사한다.
     */
    const canEditProject =
        myMembership?.memberStatus === 'ACTIVE' &&
        ['LEADER', 'VICE_LEADER'].includes(myMembership.position)

    /*
     * [역할 표시 정보]
     *
     * 서버에서 받은 position에 해당하는
     * 색상과 문구를 가져온다.
     *
     * 예상하지 못한 역할 값이라면 기본 표시 사용.
     */
    const roleDisplay = ROLE_DISPLAY[myMembership?.position] ?? {
        label: '알 수 없는 역할',
        style: 'bg-slate-100 text-slate-600',
    }

    return (
        /*
         * [역할 정보 카드]
         *
         * rounded-xl     : 둥근 모서리
         * border         : 테두리 표시
         * border-slate-200 : 연한 회색 테두리
         * bg-white       : 흰색 배경
         * p-5            : 내부 여백 20px
         * shadow-sm      : 약한 그림자
         */
        <section
            className="
        rounded-xl border border-slate-200
        bg-white p-5 shadow-sm
      "
            aria-label="현재 프로젝트 역할"
        >

            <h2 className="mb-3 text-sm font-semibold text-slate-600">
                내 프로젝트 역할
            </h2>

            {/* 부모에서 역할 정보를 조회하는 중 */}
            {loading && (
                <p role="status" className="text-sm text-slate-500">
                    역할 정보를 불러오는 중입니다...
                </p>
            )}

            {/* 역할 정보 조회 실패 */}
            {!loading && error && (
                <p role="alert" className="text-sm text-red-600">
                    {error}
                </p>
            )}

            {/* 정상 조회했지만 현재 사용자의 ACTIVE 멤버가 없는 경우 */}
            {!loading && !error && !myMembership && (
                <p className="text-sm text-amber-700">
                    현재 사용자의 ACTIVE 멤버 정보를 찾지 못했습니다.
                </p>
            )}

            {/* 정상적으로 현재 사용자의 역할을 찾은 경우 */}
            {!loading && !error && myMembership && (
                <div className="flex flex-wrap items-center gap-3">

                    {/*
            [역할 배지]
            rounded-full : 알약 모양
            px-3 py-1    : 내부 여백
            text-xs      : 작은 글씨
          */}
                    <span
                        className={`
              rounded-full px-3 py-1 text-xs font-semibold
              ${roleDisplay.style}
            `}
                    >
                        {roleDisplay.label}
                    </span>

                    {/* 프로젝트 정보 수정 권한 안내 */}
                    <span
                        className={
                            canEditProject
                                ? 'text-sm text-green-700'
                                : 'text-sm text-slate-500'
                        }
                    >
                        {canEditProject
                            ? '프로젝트 정보 수정 가능'
                            : '프로젝트 정보 수정 권한 없음'}
                    </span>

                </div>
            )}

        </section>
    )
}

export default ProjectRoleInfo
