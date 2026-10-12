/*
 * ============================================================
 * 파일명: ProjectInvitationList.jsx
 * 경로: frontend/src/components/ProjectInvitationList.jsx
 * 57단계 — 받은 PENDING 초대 목록 + 수락/거절 버튼 UI
 * ============================================================
 *
 * [역할과 책임]
 * - 부모(App.jsx)에서 조회해 전달한 PENDING 초대 목록을 화면에 표시한다.
 * - 수락/거절 버튼의 클릭 이벤트를 부모 콜백으로 전달한다.
 * - 이 컴포넌트는 fetch나 데이터베이스 변경을 직접 수행하지 않는다.
 *
 * [Props]
 * invitations : 서버 응답 ProjectMember 배열
 * loading     : 받은 초대 목록을 조회하는 중인지 여부
 * error       : 받은 초대 목록 조회 실패 메시지
 * onAccept    : (projectId) => Promise | void. 초대 수락 실행 (추후 부모 연결)
 * onReject    : (projectId) => Promise | void. 초대 거절 실행 (추후 부모 연결)
 * processingProjectId : 현재 수락/거절 처리 중인 프로젝트 ID (없으면 null)
 * actionError : 수락/거절 처리 실패 메시지 (추후 부모 연결)
 *
 * [보안 및 데이터 정책]
 * - 사용자 식별은 백엔드 CurrentUserService가 한다.
 * - 버튼 표시나 disabled 처리만으로 권한이 보장되지 않는다.
 * - PENDING → ACTIVE/REJECTED 상태 변경은 Spring Boot Service의 책임이다.
 * - 백엔드 응답에 없는 프로젝트 이름/닉네임은 임의로 표시하지 않는다.
 * - 부모에서 콜백을 아직 연결하지 않았다면 버튼을 비활성화한다.
 *
 * [Tailwind 주요 클래스]
 * rounded-xl/border/shadow-sm : 카드 모서리, 경계선, 그림자
 * p-5 / p-4 / mt-3 / gap-2 : 내부 여백과 요소 간격
 * flex / flex-wrap / items-center / justify-between : 정렬 및 줄바꿈
 * disabled:opacity-50 / disabled:cursor-not-allowed : 비활성 버튼 피드백
 * focus-visible:ring-* : 키보드로 탐색하는 사용자에게 포커스 표시
 * ============================================================
 */

const POSITION_LABELS = {
    LEADER: 'LEADER (리더)',
    VICE_LEADER: 'VICE_LEADER (부리더)',
    MEMBER: 'MEMBER (일반 멤버)',
}

function ProjectInvitationList({
    invitations = [],
    loading = false,
    error = null,
    onAccept,
    onReject,
    processingProjectId = null,
    actionError = null,
}) {
    // 조회 API는 PENDING 항목만 반환하지만, UI에서도 한 번 더 확인한다.
    const pendingInvitations = Array.isArray(invitations)
        ? invitations.filter((invitation) => invitation?.memberStatus === 'PENDING')
        : []

    // 처리 중인 프로젝트가 있으면 다른 초대의 버튼도 잠가 중복 요청을 방지한다.
    // 실제 처리 상태는 부모가 관리하므로 여러 렌더링 사이에도 일관되게 유지된다.
    const isProcessing = processingProjectId !== null

    return (
        <section
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            aria-label="내가 받은 프로젝트 초대 목록"
        >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-900">받은 프로젝트 초대</h2>
                {!loading && !error && (
                    <span className="text-sm text-slate-500">
                        수락 대기 {pendingInvitations.length}건
                    </span>
                )}
            </div>

            {/* 목록 조회 오류와 초대 처리 오류는 원인이 다르므로 각각 별도로 표시한다. */}
            {actionError && !loading && (
                <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
                    {String(actionError)}
                </p>
            )}

            {loading ? (
                <p className="text-sm text-slate-600" role="status">
                    받은 초대를 불러오는 중입니다.
                </p>
            ) : error ? (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
                    {String(error)}
                </p>
            ) : pendingInvitations.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                    현재 수락을 기다리는 프로젝트 초대가 없습니다.
                </p>
            ) : (
                <ul className="space-y-3">
                    {pendingInvitations.map((invitation) => {
                        const currentProcessing = isProcessing &&
                            String(processingProjectId) === String(invitation.projectId)

                        return (
                            <li
                                key={invitation.projectMemberId ?? `${invitation.projectId}-${invitation.userId}`}
                                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-semibold text-slate-900">
                                        프로젝트 ID: {invitation.projectId}
                                    </p>
                                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                                        PENDING (수락 대기)
                                    </span>
                                </div>

                                <div className="mt-3 space-y-1 text-sm text-slate-600">
                                    <p>예정 역할: {POSITION_LABELS[invitation.position] ?? invitation.position ?? '미확인'}</p>
                                    <p>초대한 사용자 ID: {invitation.invitedBy ?? '정보 없음'}</p>
                                    <p>초대받은 사용자 ID: {invitation.userId ?? '정보 없음'}</p>
                                </div>

                                {/*
                                 * 57단계는 버튼 UI까지만 작성한다.
                                 * 부모가 onAccept/onReject를 전달하기 전에는 disabled이다.
                                 * 다음 단계에서 부모가 API를 호출하고, 성공 후 목록을 재조회한다.
                                 */}
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onAccept?.(invitation.projectId)}
                                        disabled={loading || isProcessing || typeof onAccept !== 'function'}
                                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {currentProcessing ? '처리 중...' : '초대 수락'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onReject?.(invitation.projectId)}
                                        disabled={loading || isProcessing || typeof onReject !== 'function'}
                                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {currentProcessing ? '처리 중...' : '초대 거절'}
                                    </button>
                                </div>
                                {typeof onAccept !== 'function' || typeof onReject !== 'function' ? (
                                    <p className="mt-2 text-xs text-slate-500">
                                        수락·거절 기능은 다음 단계에서 연결할 예정입니다.
                                    </p>
                                ) : null}
                            </li>
                        )
                    })}
                </ul>
            )}
        </section>
    )
}

export default ProjectInvitationList
