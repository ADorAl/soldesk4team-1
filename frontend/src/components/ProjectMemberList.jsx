import { useState } from 'react'

/*
 * ============================================================
 * ProjectMemberList.jsx — 77단계: 멤버 관리 및 리더 전용 강제 제외 UI 준비
 * ============================================================
 * [역할]
 * ProjectDetailPage가 이미 조회한 ACTIVE 멤버 목록을 표시한다.
 * LEADER가 다른 ACTIVE MEMBER / VICE_LEADER의 역할을 변경할 수 있도록
 * 선택 UI를 제공한다. 68단계에서는 LEADER 양도 확인 UI도 추가한다.
 * 73단계에서는 현재 ACTIVE 일반 멤버/부리더의 자진 탈퇴 확인 UI를 추가한다.
 * 77단계에서는 리더의 다른 ACTIVE 멤버 강제 제외 UI를 추가한다.
 * 이 파일은 API를 직접 호출하지 않는다.
 *
 * [Props]
 * members       : 프로젝트 멤버 응답 배열 (부모의 조회 결과)
 * loading/error : 멤버 조회 상태 및 오류 메시지
 * currentUserId : 현재 사용자 ID (개발 중에는 devUser.js 기준 부모 값)
 * canManageRoles: 현재 사용자가 ACTIVE LEADER인지 여부 (기본 false)
 * onRoleChange  : (targetUserId, newPosition) => Promise 등의 부모 콜백.
 *                 65단계에서 부모 연결 완료.
 * changingUserId: 역할 변경 요청 진행 중인 사용자 ID (부모가 전달, 기본 null)
 * roleChangeError : 역할 변경 오류 메시지 (부모가 전달, 기본 null)
 * canTransferLeader : 현재 사용자가 ACTIVE LEADER인지 여부 (기본 false)
 * onTransferLeader : (targetUserId) => Promise 등의 부모 콜백.
 *                    68단계에서는 미연결이므로 양도 버튼이 비활성화된다.
 * transferringLeader : 양도 요청 처리 중 여부 (기본 false)
 * leaderTransferError : 양도 실패 오류 메시지 (기본 null)
 * canLeaveProject : 현재 사용자가 ACTIVE MEMBER/VICE_LEADER인지 여부 (기본 false)
 * onLeaveProject : () => Promise 등의 부모 콜백 (74단계 연결 예정)
 * leavingProject : 탈퇴 처리 중 여부 (기본 false)
 * leaveProjectError : 탈퇴 실패 메시지 (기본 null)
 * canRemoveMembers : ACTIVE LEADER의 강제 제외 UI 권한 (기본 false)
 * onRemoveMember : (targetUserId) => Promise 등의 부모 콜백 (78단계 연결 예정)
 * removingUserId : 제외 처리 중인 사용자 ID (기본 null)
 * removeMemberError : 강제 제외 실패 메시지 (기본 null)
 *
 * [보안]
 * UI의 비활성화는 편의를 위한 처리일 뿐이다.
 * 최종 LEADER 권한, 대상의 ACTIVE 상태, 허용 역할은 백엔드에서 검사한다.
 * 서버 응답에 이름/닉네임이 없으므로 사용자 ID만 표시한다.
 * ============================================================
 */

// DB의 PROJECT_MEMBER.position 값과 화면 문구/색상을 대응시킨다.
// Tailwind: bg-* = 배경색, text-* = 글자색.
const ROLE_DISPLAY = {
    LEADER: { label: 'LEADER (리더)', style: 'bg-blue-100 text-blue-700' },
    VICE_LEADER: { label: 'VICE_LEADER (부리더)', style: 'bg-indigo-100 text-indigo-700' },
    MEMBER: { label: 'MEMBER (일반 멤버)', style: 'bg-slate-100 text-slate-700' },
}

function ProjectMemberList({
    members = [],
    loading = false,
    error = null,
    currentUserId = null,
    canManageRoles = false,
    onRoleChange = null,
    changingUserId = null,
    roleChangeError = null,
    canTransferLeader = false,
    onTransferLeader = null,
    transferringLeader = false,
    leaderTransferError = null,
    canLeaveProject = false,
    onLeaveProject = null,
    leavingProject = false,
    leaveProjectError = null,
    canRemoveMembers = false,
    onRemoveMember = null,
    removingUserId = null,
    removeMemberError = null,
}) {
    /*
     * 선택한 역할을 사용자별로 저장한다.
     * 선택만으로 서버의 역할이 바뀌지는 않으며, 변경 버튼 클릭 시
     * 부모에서 넘겨 준 onRoleChange를 호출한다.
     */
    const [selectedPositions, setSelectedPositions] = useState({})

    /*
     * 리더 양도는 권한이 크게 변하는 작업이므로 다음 두 값을 별도로 관리한다.
     * transferTargetId: 어떤 ACTIVE 멤버에게 넘길지 선택한 사용자 ID
     * transferConfirmation: 잘못 클릭하지 않도록 대상 사용자 ID를 직접 재입력한 값
     * 값의 존재만으로 API가 호출되지는 않는다.
     */
    const [transferTargetId, setTransferTargetId] = useState('')
    const [transferConfirmation, setTransferConfirmation] = useState('')

    // 자진 탈퇴 실수 방지: 현재 로그인(개발) 사용자 ID를 직접 재입력받는다.
    // 선택 상태는 로컬 UI에만 존재하며 실제 서버 요청은 부모 콜백에서 처리한다.
    const [leaveConfirmation, setLeaveConfirmation] = useState('')

    // 77단계: 제외 대상별 확인 문구. 대상 USER_ID를 정확히 입력해야 버튼이 활성화된다.
    // 서버 요청을 직접 보내지 않고, 78단계에서 부모가 전달할 콜백만 사용한다.
    const [removeConfirmations, setRemoveConfirmations] = useState({})

    // 서버는 ACTIVE 목록을 반환하지만 화면에서도 한 번 더 필터링한다.
    const activeMembers = Array.isArray(members)
        ? members.filter((member) => member?.memberStatus === 'ACTIVE')
        : []
    const showList = !loading && !error
    const hasRoleChangeCallback = typeof onRoleChange === 'function'
    const isAnyChangeInProgress = changingUserId != null || transferringLeader || leavingProject || removingUserId != null
    const hasTransferCallback = typeof onTransferLeader === 'function'
    const hasLeaveCallback = typeof onLeaveProject === 'function'
    const hasRemoveCallback = typeof onRemoveMember === 'function'
    // 현재 사용자가 실제 ACTIVE 멤버이며 리더가 아닌지 UI에서도 재확인한다.
    const myActiveMembership = activeMembers.find((member) =>
        member.userId != null && Number(member.userId) === Number(currentUserId)
    )
    const canShowLeave = canLeaveProject &&
        (myActiveMembership?.position === 'MEMBER' || myActiveMembership?.position === 'VICE_LEADER')
    const leaveConfirmed = currentUserId != null &&
        leaveConfirmation.trim() === String(currentUserId)

    // 현재 리더 외의 ACTIVE 참여자만 양도 대상에 나타나야 한다.
    const transferCandidates = activeMembers.filter((member) =>
        member.position !== 'LEADER' &&
        member.userId != null &&
        Number(member.userId) !== Number(currentUserId)
    )
    const canShowTransfer = canTransferLeader && transferCandidates.length > 0
    const targetIsActive = transferCandidates.some((member) =>
        String(member.userId) === transferTargetId
    )
    const transferConfirmed = targetIsActive &&
        transferConfirmation.trim() === transferTargetId

    /*
     * 68단계에서는 부모 콜백이 없어 실행되지 않는다.
     * 69단계 연결 후에는 대상·확인문구·권한을 다시 검사한 뒤 부모 콜백을 실행한다.
     */
    function handleLeaderTransfer() {
        if (!canTransferLeader || !hasTransferCallback || isAnyChangeInProgress) return
        if (!transferConfirmed) return
        onTransferLeader(Number(transferTargetId))
    }

    /*
     * 선택된 역할을 부모에게 전달한다. API 및 목록 재조회는 부모 책임이다.
     * 클릭 직전에 비활성화 조건을 다시 검사해 실수로 요청하지 않게 한다.
     */
    function handleRoleChange(member, newPosition) {
        if (!canManageRoles || !hasRoleChangeCallback || isAnyChangeInProgress) return
        if (member.position === 'LEADER') return
        if (newPosition === member.position) return
        if (newPosition !== 'MEMBER' && newPosition !== 'VICE_LEADER') return
        onRoleChange(member.userId, newPosition)
    }

    /*
     * 73단계에서는 onLeaveProject가 미연결이므로 서버 요청이 발생하지 않는다.
     * 74단계에서 부모를 연결하더라도 사용자 ID를 정확하게 입력해야 실행된다.
     * 최종 ACTIVE 여부/리더 탈퇴 금지는 백엔드가 다시 검사한다.
     */
    function handleLeaveProject() {
        if (!canShowLeave || !hasLeaveCallback || !leaveConfirmed || isAnyChangeInProgress) return
        onLeaveProject()
    }

    /*
     * 리더만 다른 ACTIVE 멤버를 제외할 수 있다.
     * 선택된 행의 사용자 ID를 다시 확인하고 부모 콜백에 전달한다.
     * 화면상 제어와 별도로 백엔드가 LEADER/ACTIVE/타인 여부를 재검증한다.
     */
    function handleRemoveMember(member) {
        if (!canRemoveMembers || !hasRemoveCallback || isAnyChangeInProgress) return
        if (member?.memberStatus !== 'ACTIVE' || member?.position === 'LEADER') return
        if (member?.userId == null || Number(member.userId) === Number(currentUserId)) return
        if ((removeConfirmations[member.userId] ?? '').trim() !== String(member.userId)) return
        onRemoveMember(member.userId)
    }

    return (
        /* rounded-xl = 카드 모서리, border = 테두리,
           bg-white = 배경, p-5 = 안쪽 여백, shadow-sm = 약한 그림자 */
        <section
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            aria-label="프로젝트 멤버 목록"
        >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-900">프로젝트 멤버</h2>
                {showList && (
                    <span className="text-sm text-slate-500">
                        참여 중 {activeMembers.length}명
                    </span>
                )}
            </div>

            {loading && <p role="status" className="text-sm text-slate-500">프로젝트 멤버를 불러오는 중입니다...</p>}
            {!loading && error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            {showList && activeMembers.length === 0 && (
                <p className="text-sm text-slate-500">현재 참여 중인 프로젝트 멤버가 없습니다.</p>
            )}

            {/* 강제 제외 실패는 목록 조회 오류와 별도로 표시한다. */}
            {showList && removeMemberError && (
                <p role="alert" className="mb-3 text-sm text-red-600">{removeMemberError}</p>
            )}

            {/* 역할 변경 실패는 멤버 조회 오류와 분리해서 표시한다. */}
            {showList && roleChangeError && (
                <p role="alert" className="mb-3 text-sm text-red-600">{roleChangeError}</p>
            )}

            {showList && activeMembers.length > 0 && (
                /* space-y-3: 목록 행 사이의 세로 간격 */
                <ul className="space-y-3">
                    {activeMembers.map((member) => {
                        const role = ROLE_DISPLAY[member.position] ?? {
                            label: '알 수 없는 역할',
                            style: 'bg-slate-100 text-slate-600',
                        }
                        const isCurrentUser = currentUserId != null &&
                            member.userId != null &&
                            Number(member.userId) === Number(currentUserId)

                        // LEADER 자신과 다른 LEADER는 이 API로 변경할 수 없다.
                        const canEditThisMember = canManageRoles &&
                            !isCurrentUser &&
                            (member.position === 'MEMBER' || member.position === 'VICE_LEADER')

                        // 선택값이 없거나 오래된 경우 서버의 현재 역할을 기본값으로 사용한다.
                        const chosenPosition = selectedPositions[member.userId] ?? member.position
                        const isRoleDifferent = chosenPosition !== member.position
                        // 강제 제외는 LEADER가 자기 자신을 제외할 수 없으며 ACTIVE 타인만 대상이다.
                        const canRemoveThisMember = canRemoveMembers &&
                            !isCurrentUser && member.position !== 'LEADER'
                        const removeConfirmed = (removeConfirmations[member.userId] ?? '').trim() === String(member.userId)
                        const isRemovingThisMember = removingUserId != null &&
                            String(removingUserId) === String(member.userId)
                        const isChangingThisMember = changingUserId != null &&
                            String(changingUserId) === String(member.userId)

                        return (
                            /* flex-wrap: 작은 화면에서 내용 줄바꿈,
                               gap-3: 항목 간격, px/py: 가로·세로 여백 */
                            <li
                                key={member.projectMemberId ?? member.userId}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-900">
                                        사용자 ID: {member.userId}
                                    </span>
                                    {isCurrentUser && (
                                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">나</span>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${role.style}`}>
                                        {role.label}
                                    </span>

                                    {/*
                                     * 선택 UI는 ACTIVE LEADER에게만 보인다.
                                     * 변경 버튼은 부모 콜백과 실제 역할 차이가 있을 때만 활성화.
                                     */}
                                    {canEditThisMember && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <label className="text-xs text-slate-600" htmlFor={`role-${member.userId}`}>
                                                변경할 역할
                                            </label>
                                            <select
                                                id={`role-${member.userId}`}
                                                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
                                                value={chosenPosition}
                                                disabled={isAnyChangeInProgress}
                                                onChange={(event) => {
                                                    setSelectedPositions((previous) => ({
                                                        ...previous,
                                                        [member.userId]: event.target.value,
                                                    }))
                                                }}
                                            >
                                                <option value="MEMBER">일반 멤버</option>
                                                <option value="VICE_LEADER">부리더</option>
                                            </select>
                                            <button
                                                type="button"
                                                className="rounded-md bg-blue-600 px-3 py-1 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                                                disabled={!hasRoleChangeCallback || !isRoleDifferent || isAnyChangeInProgress}
                                                onClick={() => handleRoleChange(member, chosenPosition)}
                                            >
                                                {isChangingThisMember ? '변경 중...' : '역할 변경'}
                                            </button>
                                        </div>
                                    )}

                                    {/*
                                      * 77단계: 강제 제외 입력 UI.
                                      * flex-wrap/gap-2는 좁은 화면에서 줄바꿈 및 입력 간격을 담당한다.
                                      * 부모 onRemoveMember 미연결 시 버튼은 절대 활성화되지 않는다.
                                      */}
                                    {canRemoveThisMember && (
                                        <div className="flex flex-wrap items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                                            <label htmlFor={`remove-member-${member.userId}`} className="text-xs font-semibold text-red-700">
                                                제외 확인: ID {member.userId} 입력
                                            </label>
                                            <input
                                                id={`remove-member-${member.userId}`}
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="off"
                                                className="w-24 rounded-md border border-red-300 bg-white px-2 py-1 text-sm text-slate-900 disabled:bg-slate-100"
                                                placeholder={String(member.userId)}
                                                value={removeConfirmations[member.userId] ?? ''}
                                                disabled={!hasRemoveCallback || isAnyChangeInProgress}
                                                onChange={(event) => setRemoveConfirmations((previous) => ({
                                                    ...previous,
                                                    [member.userId]: event.target.value,
                                                }))}
                                            />
                                            <button
                                                type="button"
                                                className="rounded-md bg-red-600 px-3 py-1 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                                                disabled={!hasRemoveCallback || !removeConfirmed || isAnyChangeInProgress}
                                                onClick={() => handleRemoveMember(member)}
                                            >
                                                {isRemovingThisMember ? '제외 처리 중...' : '멤버 제외'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}

            {/*
              * [리더 양도 전용 영역]
              * 68단계에서는 UI만 추가한다. 부모가 onTransferLeader를 넘기지 않으므로
              * 실제 요청은 실행할 수 없다. 역할 변경과 리더 양도는 서로 다른 API다.
              * mt-6: 위 멤버 목록과 거리, border-t/pt-5: 시각적 구분.
              */}
            {showList && canShowTransfer && (
                <div className="mt-6 border-t border-slate-200 pt-5">
                    <h3 className="text-base font-bold text-slate-900">프로젝트 리더 양도</h3>
                    <p className="mt-2 text-sm text-slate-600">
                        다른 ACTIVE 멤버에게 리더 권한을 넘깁니다. 양도 후 현재 리더는 일반 멤버가 되고,
                        프로젝트 소유자도 새로운 리더로 변경됩니다.
                    </p>

                    {leaderTransferError && (
                        <p role="alert" className="mt-3 text-sm text-red-600">
                            {leaderTransferError}
                        </p>
                    )}

                    {/* sm:flex-row: 넓은 화면에서는 입력 영역을 가로로 배치한다. */}
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1">
                            <label htmlFor="transfer-leader-target" className="mb-1 block text-sm font-semibold text-slate-700">
                                새 리더 선택
                            </label>
                            <select
                                id="transfer-leader-target"
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                                value={targetIsActive ? transferTargetId : ''}
                                disabled={isAnyChangeInProgress}
                                onChange={(event) => {
                                    setTransferTargetId(event.target.value)
                                    // 대상이 바뀌면 앞서 입력한 확인값은 더 이상 유효하지 않다.
                                    setTransferConfirmation('')
                                }}
                            >
                                <option value="">양도할 멤버를 선택하세요</option>
                                {transferCandidates.map((member) => (
                                    <option key={member.projectMemberId ?? member.userId} value={String(member.userId)}>
                                        사용자 ID: {member.userId} ({ROLE_DISPLAY[member.position]?.label ?? member.position})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label htmlFor="transfer-leader-confirm" className="mb-1 block text-sm font-semibold text-slate-700">
                                확인: 새 리더 사용자 ID 다시 입력
                            </label>
                            <input
                                id="transfer-leader-confirm"
                                type="text"
                                inputMode="numeric"
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                                value={transferConfirmation}
                                placeholder={targetIsActive ? `${transferTargetId} 입력` : '먼저 멤버를 선택하세요'}
                                disabled={!targetIsActive || isAnyChangeInProgress}
                                onChange={(event) => setTransferConfirmation(event.target.value)}
                            />
                        </div>
                    </div>
                    <button
                        type="button"
                        className="mt-3 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                        disabled={!hasTransferCallback || !transferConfirmed || isAnyChangeInProgress}
                        onClick={handleLeaderTransfer}
                    >
                        {transferringLeader ? '리더 양도 처리 중...' : '리더 양도'}
                    </button>
                    {!hasTransferCallback && (
                        <p className="mt-2 text-xs text-slate-500">
                            현재는 화면 준비 단계입니다. 양도 요청은 다음 단계에서 연결합니다.
                        </p>
                    )}
                </div>
            )}
            {/*
              * [자진 탈퇴 전용 영역 - 73단계]
              * 멤버/부리더만 표시하고 LEADER에게는 표시하지 않는다.
              * 프로젝트 탈퇴는 멤버 행의 실제 삭제가 아니라 LEFT 상태 변경이다.
              * 74단계에서 부모 콜백이 연결되었으므로 확인 입력 후 실행 가능하다.
              * mt-6/border-t/pt-5: 다른 관리 기능과 영역을 구분하는 간격과 선.
              */}
            {showList && canShowLeave && (
                <div className="mt-6 border-t border-slate-200 pt-5">
                    <h3 className="text-base font-bold text-slate-900">프로젝트 자진 탈퇴</h3>
                    <p className="mt-2 text-sm text-slate-600">
                        탈퇴하면 해당 프로젝트의 참여 상태가 LEFT로 변경되고,
                        일반 멤버 목록과 내 프로젝트 목록에서 제외됩니다.
                        리더는 먼저 리더 권한을 양도해야 합니다.
                    </p>

                    {leaveProjectError && (
                        <p role="alert" className="mt-3 text-sm text-red-600">{leaveProjectError}</p>
                    )}

                    <div className="mt-4 max-w-md">
                        <label htmlFor="leave-project-confirm" className="mb-1 block text-sm font-semibold text-slate-700">
                            탈퇴 확인: 내 사용자 ID {currentUserId} 다시 입력
                        </label>
                        <input
                            id="leave-project-confirm"
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100"
                            value={leaveConfirmation}
                            placeholder={`${currentUserId} 입력`}
                            disabled={isAnyChangeInProgress || !hasLeaveCallback}
                            onChange={(event) => setLeaveConfirmation(event.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                        disabled={!hasLeaveCallback || !leaveConfirmed || isAnyChangeInProgress}
                        onClick={handleLeaveProject}
                    >
                        {leavingProject ? '탈퇴 처리 중...' : '프로젝트 탈퇴'}
                    </button>
                    {!hasLeaveCallback && (
                        <p className="mt-2 text-xs text-slate-500">
                            현재는 화면 준비 단계입니다. 탈퇴 요청은 다음 단계에서 연결합니다.
                        </p>
                    )}
                </div>
            )}
        </section>
    )
}

export default ProjectMemberList
