/*
 * ============================================================
 * 파일명: ProjectMemberList.jsx
 * 위치: frontend/src/components/ProjectMemberList.jsx
 * ============================================================
 *
 * [목적]
 * 프로젝트에 ACTIVE 상태로 참여 중인 멤버를 목록으로 표시한다.
 *
 * [데이터 흐름]
 * ProjectDetailPage
 *   → getProjectMembers(projectId)  (부모에서 API 호출)
 *   → members / membersLoading / membersError 상태 저장
 *   → ProjectMemberList에 props 전달
 *   → ACTIVE 멤버의 사용자 ID와 역할 표시
 *
 * [Props]
 * members       : ProjectMember 객체 배열 (기본값 [])
 * loading       : 멤버 목록 조회 진행 여부 (기본값 false)
 * error         : 멤버 조회 오류 메시지 (기본값 null)
 * currentUserId : 현재 로그인 사용자 ID. 현재는 부모의 개발용 값 사용.
 *
 * [중요]
 * - 여기서는 API를 직접 호출하지 않는다. 부모의 조회 결과를 재사용한다.
 * - 백엔드 ProjectMember 응답에는 사용자 이름/닉네임이 없다.
 *   따라서 USER_ID만 표시하며 이름을 만들어 내지 않는다.
 * - 이 컴포넌트는 조회 화면이며 멤버 관리 변경 API를 호출하지 않는다.
 * - 로그인 통합 시 currentUserId를 인증 사용자 ID로 교체해야 한다.
 * - 실제 접근 권한은 백엔드 Service가 검증한다.
 * ============================================================
 */

// PROJECT_MEMBER.position별 화면 표시 정보.
// bg-*는 배경색, text-*는 글자색이다.
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

function ProjectMemberList({
    members = [],
    loading = false,
    error = null,
    currentUserId = null,
}) {
    /*
     * 서버 API는 ACTIVE 멤버만 반환하도록 구현되어 있지만,
     * 이 화면에서도 ACTIVE 조건을 명시해 비활성 항목이 보이지 않게 한다.
     * props가 배열이 아닌 경우에도 렌더링 오류를 피한다.
     */
    const activeMembers = Array.isArray(members)
        ? members.filter((member) => member?.memberStatus === 'ACTIVE')
        : []

    // 로딩/오류가 아닌 경우에만 실제 멤버 수를 안내한다.
    const showList = !loading && !error

    return (
        /*
         * [바깥 카드]
         * rounded-xl: 둥근 모서리
         * border / border-slate-200: 연한 테두리
         * bg-white: 흰 배경
         * p-5: 내부 여백
         * shadow-sm: 약한 그림자
         */
        <section
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            aria-label="프로젝트 멤버 목록"
        >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                    프로젝트 멤버
                </h2>
                {showList && (
                    <span className="text-sm text-slate-500">
                        참여 중 {activeMembers.length}명
                    </span>
                )}
            </div>

            {/* 부모의 비동기 조회가 끝날 때까지 안내한다. */}
            {loading && (
                <p role="status" className="text-sm text-slate-500">
                    프로젝트 멤버를 불러오는 중입니다...
                </p>
            )}

            {/* 조회에 실패한 경우, 빈 목록과 혼동되지 않도록 오류를 표시한다. */}
            {!loading && error && (
                <p role="alert" className="text-sm text-red-600">
                    {error}
                </p>
            )}

            {/* 조회 성공했지만 ACTIVE 멤버가 하나도 없는 경우 */}
            {showList && activeMembers.length === 0 && (
                <p className="text-sm text-slate-500">
                    현재 참여 중인 프로젝트 멤버가 없습니다.
                </p>
            )}

            {/*
             * [멤버 목록]
             * space-y-3: 각 멤버 카드 사이의 세로 간격
             * flex / flex-wrap: 좁은 화면에서 역할 배지가 다음 줄로 이동 가능
             * gap-3: 사용자 정보와 역할 배지 사이 간격
             */}
            {showList && activeMembers.length > 0 && (
                <ul className="space-y-3">
                    {activeMembers.map((member) => {
                        const role = ROLE_DISPLAY[member.position] ?? {
                            label: '알 수 없는 역할',
                            style: 'bg-slate-100 text-slate-600',
                        }

                        // 숫자형·문자열형 ID가 섞여도 같은 사용자를 식별한다.
                        // 값이 없으면 현재 사용자라고 판단하지 않는다.
                        const isCurrentUser =
                            currentUserId != null &&
                            member.userId != null &&
                            Number(member.userId) === Number(currentUserId)

                        return (
                            <li
                                key={member.projectMemberId ?? member.userId}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-900">
                                        사용자 ID: {member.userId}
                                    </span>

                                    {/* 현재 사용자에게만 '나' 표시를 덧붙인다. */}
                                    {isCurrentUser && (
                                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                                            나
                                        </span>
                                    )}
                                </div>

                                {/* 역할 표시이며, 역할 변경 버튼은 추후 단계에서 구현한다. */}
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${role.style}`}>
                                    {role.label}
                                </span>
                            </li>
                        )
                    })}
                </ul>
            )}
        </section>
    )
}

export default ProjectMemberList
