/*
 * ============================================================
 * 파일: frontend/src/components/ProjectInviteForm.jsx
 * 46단계 — PROJECT_MEMBER 초대 입력 화면
 * ============================================================
 *
 * [역할]
 * 프로젝트의 ACTIVE LEADER/VICE_LEADER에게 사용자 ID 기반 초대 폼을 제공한다.
 * 초대 API는 45단계 projectApi.js의 inviteProjectMember()를 재사용한다.
 *
 * [Props — 부모 ProjectDetailPage에서 전달할 값]
 * projectId     : 현재 프로젝트 ID
 * canInvite     : ACTIVE LEADER 또는 VICE_LEADER 여부 (기본 false)
 * currentUserId : 현재 사용자 ID (현재 개발용 값, 추후 인증 연동)
 * onInvited     : 초대 성공 후 부모가 필요 시 실행할 콜백(선택)
 *
 * [중요한 책임 구분]
 * 프론트의 canInvite는 화면 편의용이며 실제 초대 권한은 백엔드가 검증한다.
 * 입력 userId의 존재 여부와 초대 가능 상태 역시 서버에서 검증한다.
 * 초대를 보낸 직후에는 PENDING이며 ACTIVE 멤버 목록에 바로 나타나지 않는다.
 * 실제 호출은 제출 버튼 클릭 또는 입력창 Enter로 제출할 때에만 수행된다.
 * 이 단계에서는 부모 화면에 연결하지 않는다(47단계에서 연결).
 * ============================================================
 */
import { useState } from 'react'
import { inviteProjectMember } from '../services/projectApi'

function ProjectInviteForm({
    projectId,
    canInvite = false,
    currentUserId = null,
    onInvited,
}) {
    // 입력은 문자열로 보관: 빈 입력과 숫자 변환의 차이를 명확히 처리한다.
    const [targetUserId, setTargetUserId] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    async function handleSubmit(event) {
        event.preventDefault()
        if (submitting || !canInvite) return

        setError('')
        setSuccess('')

        const trimmed = targetUserId.trim()
        const userId = Number(trimmed)
        if (!/^\d+$/.test(trimmed) || !Number.isSafeInteger(userId) || userId <= 0) {
            setError('사용자 ID는 1 이상의 정수를 입력해 주세요.')
            return
        }
        if (currentUserId != null && userId === Number(currentUserId)) {
            setError('자기 자신은 초대할 수 없습니다.')
            return
        }

        setSubmitting(true)
        try {
            // POST /api/projects/{projectId}/invitations
            // 요청 JSON: { userId: 정수 }. 상태/역할은 서버에서 결정한다.
            const invitedMember = await inviteProjectMember(projectId, userId)
            setSuccess(`사용자 ID ${userId}번에게 초대 요청을 보냈습니다. (수락 대기)`)
            setTargetUserId('')
            // 후속 화면 연동용 선택 콜백. 오류와 초대 성공을 혼동하지 않도록 분리한다.
            if (typeof onInvited === 'function') {
                try {
                    onInvited(invitedMember)
                } catch (callbackError) {
                    console.error('초대 성공 후 화면 갱신 콜백 오류:', callbackError)
                }
            }
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : '초대 요청 중 오류가 발생했습니다.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        // rounded-xl/border/shadow-sm: 기존 멤버 목록과 같은 카드 모양.
        // p-5/space-y-4: 내부 여백과 세로 요소 간격.
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="프로젝트 멤버 초대">
            <div>
                {/* font-bold / text-* : 제목 강조 및 보조 설명 가독성 설정 */}
                <h2 className="text-lg font-bold text-slate-900">프로젝트 멤버 초대</h2>
                <p className="mt-1 text-sm text-slate-600">
                    초대할 사용자의 ID를 입력하세요. 초대받은 사용자가 수락해야 멤버가 됩니다.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                <label htmlFor="invite-user-id" className="block text-sm font-semibold text-slate-700">
                    초대할 사용자 ID
                </label>
                {/* flex/flex-wrap/gap-2: 좁은 화면에서 입력창과 버튼을 자연스럽게 배치 */}
                <div className="flex flex-wrap gap-2">
                    <input
                        id="invite-user-id"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="예: 2"
                        value={targetUserId}
                        onChange={(event) => {
                            setTargetUserId(event.target.value)
                            setError('')
                            setSuccess('')
                        }}
                        disabled={!canInvite || submitting}
                        aria-describedby="invite-user-help"
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                    <button
                        type="submit"
                        disabled={!canInvite || submitting}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting ? '초대 중...' : '초대 보내기'}
                    </button>
                </div>
                <p id="invite-user-help" className="text-xs text-slate-500">
                    사용자 이름 검색은 아직 연결되지 않았으며, 현재는 숫자 USER_ID를 사용합니다.
                </p>
            </form>

            {!canInvite && (
                <p className="text-sm text-slate-500" role="status">
                    초대는 프로젝트의 리더 또는 부리더만 할 수 있습니다.
                </p>
            )}
            {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
            {success && <p role="status" className="text-sm font-medium text-green-700">{success}</p>}
        </section>
    )
}

export default ProjectInviteForm
