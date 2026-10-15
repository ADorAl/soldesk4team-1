
/*
 * ============================================================
 * 파일명: ProjectDetailPage.jsx
 * 위치: src/pages/ProjectDetailPage.jsx
 * ============================================================
 *
 * [파일 목적]
 * 사용자가 선택한 프로젝트의 상세 정보를 조회하고,
 * 프로젝트 업무/멤버/설정 기능으로 연결하는 화면이다.
 *
 * [현재 구현]
 * - GET /api/projects/{projectId} 호출
 * - 프로젝트 상세 정보 표시
 * - 로딩, 오류, 재시도 처리
 * - 개요 / 업무 관리 / 멤버 관리 / 프로젝트 설정 탭
 *
 * [관련 파일]
 * - App.jsx : 선택된 projectId 전달 및 화면 이동
 * - projectApi.js : getProjectDetail()
 * - ProjectListPage.jsx : 프로젝트 선택
 *
 * [Props]
 * projectId : 조회할 프로젝트 ID
 * onBack    : 프로젝트 목록으로 돌아가는 함수
 *
 * [팀원 인계 / TODO]
 * - 업무 관리 탭에 PROJECT_TASK API 연결
 * - 멤버 관리 탭은 ACTIVE 멤버 목록 및 사용자 ID 기반 초대 폼 표시 (47단계)
 * - 프로젝트 설정 탭에서 프로젝트 수정/Soft Delete API 연결
 * - 로그인 기능 통합 시 사용자 인증 방식 확인
 *
 * [주의]
 * 프론트엔드의 탭 표시와 서버 접근 권한은 별개다.
 * 프로젝트 조회/수정/삭제 권한은 백엔드에서 검증한다.
 * ============================================================
 */
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
// 53단계의 공통 개발 사용자 ID를 화면의 역할 계산에도 동일하게 적용한다.
// API 요청용 X-Dev-User-Id와 '나'/권한 표시가 서로 다른 사용자를 가리키지 않도록 한다.
import { getDevUserId } from '../config/devUser.js'
// 프로젝트 상세 조회 및 ACTIVE 멤버 목록 조회 API
// API 요청은 services/projectApi.js에 모아 관리한다.
import {
    getProjectDetail,
    getProjectMembers,
    updateProjectMemberRole,
    transferProjectLeader,
    leaveProject,
    removeProjectMember,
} from '../services/projectApi'

// 프로젝트별 현재 사용자 역할을 조회하고 표시하는 공통 컴포넌트
// 내부에서 getProjectMembers()를 호출한다.
//
// [팀원 인계]
// 현재 사용자 판정은 상위 컴포넌트에서 전달받는 공통 개발 사용자 ID를 기준으로 한다.
// 실제 로그인 연동 시 개발용 설정과 인증 사용자 ID를 교체해야 한다.
import ProjectRoleInfo from '../components/ProjectRoleInfo'


/*
 * [프로젝트 설정 수정 폼]
 *
 * 프로젝트명, 설명, 자료 수집 키워드를 수정하는 컴포넌트.
 *
 * [Props]
 * project        : 현재 조회한 프로젝트 정보
 * canEditProject : 현재 사용자의 프로젝트 수정 권한
 *
 * [팀원 인계]
 * - 부모인 ProjectDetailPage가 프로젝트 데이터와 권한을 관리한다.
 * - 자식인 ProjectSettingsForm은 수정 입력 화면을 담당한다.
 * - 실제 PUT API 연결은 다음 단계에서 진행한다.
 */
import ProjectSettingsForm from '../components/ProjectSettingsForm'


/*
 * [프로젝트 삭제 확인 컴포넌트]
 *
 * 프로젝트 설정 탭의 위험 구역을 담당한다.
 *
 * [관련 파일]
 * components/ProjectDeleteSection.jsx
 *
 * [Props]
 * project:
 *   삭제 대상 프로젝트의 정보
 *
 * canDeleteProject:
 *   현재 사용자가 ACTIVE LEADER인지 여부
 *
 * [이번 단계]
 * 삭제 확인 UI만 연결한다.
 * 실제 DELETE API 연결은 다음 단계에서 진행한다.
 */
import ProjectDeleteSection from '../components/ProjectDeleteSection'

/*
 * [43~44단계: 프로젝트 멤버 목록 화면]
 * 부모에서 이미 조회한 ACTIVE 멤버 데이터를 props로 전달한다.
 * 자식 컴포넌트는 API를 다시 호출하지 않는다.
 */
import ProjectMemberList from '../components/ProjectMemberList'

/*
 * [47단계: 프로젝트 멤버 초대 폼]
 * 초대 폼이 POST 요청을 담당하고, 부모는 권한과 프로젝트 ID만 전달한다.
 * 실제 초대 성공 뒤에는 수락 대기(PENDING)이므로 ACTIVE 목록에 바로 추가하지 않는다.
 */
import ProjectInviteForm from '../components/ProjectInviteForm'

// [4-2단계] 기존 업무 관리 탭에서 조회 전용 대단원·소단원 목록 표시
import ProjectTaskList from '../components/ProjectTaskList'


// ------------------------------------------------------------
// 날짜 표시용 함수
// ------------------------------------------------------------

/*
 * Oracle TIMESTAMP가 JSON으로 전달된 값을 표시한다.
 *
 * 날짜가 비어 있으면 '-'를 반환한다.
 * 정상적으로 해석 가능한 날짜면 한국어 형식으로 변환한다.
 *
 * [팀원 인계]
 * 날짜에 시간대 정보가 없는 경우에는
 * 브라우저 환경에 따라 해석이 달라질 수 있다.
 * 실제 API의 날짜 형식을 확인해 필요 시 통일한다.
 */


function formatDate(dateValue) {
    if (!dateValue) return '-'

    const date = new Date(dateValue)

    if (Number.isNaN(date.getTime())) {
        return String(dateValue)
    }

    return date.toLocaleString('ko-KR')
}


// ------------------------------------------------------------
// 프로젝트 상세 페이지
// ------------------------------------------------------------

function ProjectDetailPage({ projectId, onBack }) {

    /*
     * project:
     * 서버에서 조회한 단일 프로젝트 데이터
     *
     * loading:
     * 서버 요청 처리 중인지 여부
     *
     * error:
     * 조회 오류 메시지
     *
     * activeTab:
     * 현재 선택된 프로젝트 상세 탭
     */
    const [project, setProject] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState('overview')

    /*
 * ============================================================
 * [현재 프로젝트의 멤버 정보]
 *
 * members:
 * - 프로젝트에 ACTIVE 상태로 참여 중인 멤버 배열
 *
 * membersLoading:
 * - 멤버 목록 API 요청 진행 여부
 *
 * membersError:
 * - 멤버 조회 실패 시 발생한 메시지
 *
 * [팀원 인계]
 * 이 데이터는 앞으로 다음 기능에서 공유한다.
 *
 * 1. 현재 사용자 역할 표시
 * 2. 프로젝트 수정 버튼 권한 제어
 * 3. 멤버 관리 탭의 참여자 목록
 * 4. 업무 담당자 선택 목록
 *
 * 서버에서 검증하는 실제 권한을 대체하지 않는다.
 * ============================================================
 */
    const [members, setMembers] = useState([])
    const [membersLoading, setMembersLoading] = useState(true)
    const [membersError, setMembersError] = useState(null)

    /*
     * [65단계: 멤버 역할 변경 요청 상태]
     * changingUserId : 변경 중인 멤버의 USER_ID (중복 요청 방지)
     * roleChangeError: 실패 메시지 (기존 멤버 조회 오류와 구분)
     * 역할 변경 성공 후에는 members를 서버에서 다시 가져와
     * 역할 뱃지와 수정·초대·삭제 권한 표시를 함께 동기화한다.
     */
    const [changingUserId, setChangingUserId] = useState(null)
    const [roleChangeError, setRoleChangeError] = useState(null)

    /*
     * [69단계: 리더 양도 처리 상태]
     * transferringLeader : API 요청 중 다른 변경 버튼 중복 실행 방지
     * leaderTransferError: 양도/재조회 과정에서 발생한 오류 안내
     * 성공 후에는 PROJECT.ownerId와 members의 역할이 함께 바뀌므로
     * 프로젝트 상세와 멤버 목록을 모두 새로 조회한다.
     */
    const [transferringLeader, setTransferringLeader] = useState(false)
    const [leaderTransferError, setLeaderTransferError] = useState(null)

    /*
     * [74단계: 자진 탈퇴 처리 상태]
     * leavingProject : 탈퇴 POST 요청 중 중복 클릭/다른 멤버 변경을 차단한다.
     * leaveProjectError : 탈퇴 요청 실패 메시지를 멤버 목록의 탈퇴 영역에 전달한다.
     * 탈퇴 성공 시 현재 사용자는 상세 페이지를 조회할 권한이 없어질 수 있으므로
     * 멤버 목록 재조회 대신 프로젝트 목록으로 이동한다.
     */
    const [leavingProject, setLeavingProject] = useState(false)
    const [leaveProjectError, setLeaveProjectError] = useState(null)

    /*
     * [78단계: 멤버 강제 제외 처리 상태]
     * removingUserId : 제외 요청 중인 대상 사용자 ID. 중복 클릭 차단과 버튼 로딩에 사용한다.
     * removeMemberError : POST 또는 후속 멤버 재조회 오류 메시지.
     * 실제 제외된 사용자는 DB에서 MEMBER_STATUS=LEFT로 기록되며,
     * 목록에는 ACTIVE 멤버만 표시된다. 자진 탈퇴와 같은 LEFT 값이므로
     * DB 상태만으로 두 행위를 구별할 수는 없다.
     */
    const [removingUserId, setRemovingUserId] = useState(null)
    const [removeMemberError, setRemoveMemberError] = useState(null)


    /*
     * [프로젝트 상세 API 호출]
     *
     * projectId가 변경되면 해당 프로젝트를 새로 조회한다.
     *
     * ignore:
     * 화면 이탈 이후 완료된 이전 요청이
     * 현재 화면 상태를 덮어쓰지 않도록 방지한다.
     *
     * 이 방식은 이전 네트워크 요청 자체를 취소하지는 않는다.
     */

    /*
 * ============================================================
 * [프로젝트 삭제 성공 후 페이지 이동]
 * ============================================================
 *
 * useNavigate:
 * React Router가 제공하는 페이지 이동 함수.
 *
 * [사용 목적]
 * 프로젝트 삭제 성공 후 삭제된 상세 페이지에
 * 계속 머무르지 않도록 프로젝트 목록으로 이동한다.
 *
 * [팀원 인계]
 * 삭제 성공 여부는 ProjectDeleteSection에서 확인한다.
 * 이 컴포넌트는 삭제 성공 통보를 받은 후 이동만 담당한다.
 */
    const navigate = useNavigate()
    useEffect(() => {
        let ignore = false

        async function loadProject() {
            setLoading(true)
            setError(null)
            setProject(null)

            try {
                const result = await getProjectDetail(projectId)

                if (!ignore) {
                    setProject(result)
                }
            } catch (err) {
                if (!ignore) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : '프로젝트 정보를 불러오지 못했습니다.'
                    )
                }
            } finally {
                if (!ignore) {
                    setLoading(false)
                }
            }
        }

        loadProject()


        /*
         * ============================================================
         * [현재 사용자 정보 — 개발 단계]
         *
         * 현재 백엔드의 기본 사용자 ID가 1인 환경을 기준으로 한다.
         *
         * [팀원 인계 / TODO]
         * 실제 로그인 기능이 통합되면 이 임시 값을 제거한다.
         *
         * 반드시 API 요청에 사용되는 인증 사용자와
         * 프론트엔드에서 표시하는 사용자 ID가 같아야 한다.
         *
         * 보안 주의:
         * 이 ID는 표시용 비교에 사용하며 인증 수단이 아니다.
         * ============================================================
         */


        return () => {
            ignore = true
        }
    }, [projectId])

    /*
     * [재시도]
     *
     * 페이지를 새로 마운트하지 않고 동일 프로젝트를 다시 조회한다.
     * 실패한 요청을 복구하기 위한 기능이다.
     */
    async function handleRetry() {
        setLoading(true)
        setError(null)

        try {
            const result = await getProjectDetail(projectId)
            setProject(result)
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : '프로젝트 조회에 실패했습니다.'
            )
        } finally {
            setLoading(false)
        }
    }

    /*
     * ============================================================
     * [프로젝트 ACTIVE 멤버 목록 조회]
     *
     * 프로젝트 ID가 변경될 때 실행한다.
     *
     * API:
     * GET /api/projects/{projectId}/members
     *
     * [데이터 흐름]
     * ProjectDetailPage.jsx
     *   ↓
     * getProjectMembers(projectId)
     *   ↓
     * projectApi.js
     *   ↓
     * Spring Boot
     *   ↓
     * Oracle PROJECT_MEMBER
     *   ↓
     * members 상태 저장
     *
     * [ignore 사용 이유]
     * 프로젝트 이동 중 이전 API 응답이 늦게 도착하더라도
     * 현재 프로젝트의 멤버 목록을 덮어쓰지 않도록 한다.
     *
     * [팀원 인계]
     * 프로젝트 멤버 초대·탈퇴·역할 변경 후에는
     * 이 목록을 다시 조회해 최신 상태를 반영해야 한다.
     * ============================================================
     */
    useEffect(() => {
        let ignore = false

        async function loadMembers() {
            setMembersLoading(true)
            setMembersError(null)
            setMembers([])

            try {
                const result = await getProjectMembers(projectId)

                if (!ignore) {
                    setMembers(result)
                }
            } catch (err) {
                if (!ignore) {
                    setMembersError(
                        err instanceof Error
                            ? err.message
                            : '프로젝트 멤버 정보를 불러오지 못했습니다.'
                    )
                }
            } finally {
                if (!ignore) {
                    setMembersLoading(false)
                }
            }
        }

        loadMembers()

        return () => {
            ignore = true
        }
    }, [projectId])


    /*
     * ============================================================
     * [현재 사용자 역할 계산]
     * ============================================================
     *
     * [현재 개발 환경 / 55단계]
     * src/config/devUser.js의 개발용 사용자 ID를 읽어 온다.
     * 54단계에서 projectApi.js도 동일한 설정으로 X-Dev-User-Id 헤더를
     * 전달하므로, 화면의 '나' 표시와 서버 요청의 사용자 기준이 일치한다.
     *
     * [팀원 인계 / TODO]
     * 로그인 기능을 통합하면 getDevUserId() 대신 실제 인증된 사용자 ID를 사용하고,
     * 개발 전용 헤더도 제거해야 한다. 이 값은 버튼과 표시용이며
     * 실제 사용자 인증이나 서버 권한 검증을 대신하지 않는다.
     */
    const currentUserId = getDevUserId()

    /*
     * [현재 사용자의 ACTIVE 멤버 정보 찾기]
     *
     * members:
     * 앞의 useEffect에서 API로 가져온 멤버 배열
     *
     * find():
     * 현재 사용자 ID와 일치하는 ACTIVE 멤버를 찾는다.
     *
     * ?? null:
     * 일치하는 멤버가 없으면 null을 사용한다.
     *
     * 프로젝트가 바뀌면 members도 갱신되므로
     * 현재 사용자의 프로젝트별 역할도 다시 계산된다.
     */
    const myMembership = members.find(
        (member) =>
            Number(member.userId) === currentUserId &&
            member.memberStatus === 'ACTIVE'
    ) ?? null

    /*
     * [프로젝트 정보 수정 권한]
     *
     * ACTIVE LEADER 또는 ACTIVE VICE_LEADER만
     * 프로젝트 정보 수정 UI를 사용할 수 있다.
     *
     * 멤버 조회가 끝나지 않았거나 실패했다면
     * 수정 가능 상태로 판단하지 않는다.
     *
     * [팀원 인계]
     * 프로젝트 설정 폼 구현 시 이 값을 사용한다.
     * 실제 수정 권한은 Spring Boot Service에서 검사한다.
     */
    const canEditProject =
        !membersLoading &&
        !membersError &&
        myMembership != null &&
        ['LEADER', 'VICE_LEADER'].includes(myMembership.position)


    /*
     * ============================================================
     * [프로젝트 삭제 권한]
     * ============================================================
     *
     * [수정 권한과 삭제 권한의 차이]
     *
     * 수정(Update):
     *   ACTIVE LEADER / ACTIVE VICE_LEADER
     *
     * 삭제(Delete):
     *   ACTIVE LEADER만 가능
     *
     * [관련 백엔드]
     * ProjectService.deleteProject()
     *
     * [권한 확인 과정]
     * 1. 멤버 목록 조회가 완료되었는가?
     * 2. 멤버 조회 오류가 없는가?
     * 3. 현재 사용자의 ACTIVE 참여 정보가 존재하는가?
     * 4. 현재 역할이 LEADER인가?
     *
     * [팀원 인계]
     * UI의 canDeleteProject는 삭제 버튼 표시용이다.
     * 실제 DELETE 요청 권한은 Spring Boot에서 재검증한다.
     *
     * ownerId만 비교해 삭제 권한을 판단하지 않는다.
     * 리더 양도 시 ownerId와 역할 정보가 변경될 수 있기 때문이다.
     * ============================================================
     */
    /*
     * [47단계: 프로젝트 멤버 초대 권한]
     * ACTIVE LEADER/VICE_LEADER에게만 초대 입력 기능을 제공한다.
     * 멤버 목록 조회가 완료되지 않았거나 오류가 있으면 권한을 부여하지 않는다.
     * UI 권한 검사는 편의를 위한 것이며 실제 권한은 Spring Boot에서 재검증한다.
     */
    const canInviteProjectMember =
        !membersLoading &&
        !membersError &&
        myMembership != null &&
        ['LEADER', 'VICE_LEADER'].includes(myMembership.position)


    /*
     * [65단계: 역할 변경 권한]
     * MEMBER/VICE_LEADER 변경은 ACTIVE LEADER만 요청할 수 있다.
     * 역할 변경은 프로젝트 수정 권한과 별개이므로 canEditProject를 재사용하지 않는다.
     * 최종 역할 검증은 Spring Boot ProjectService가 수행한다.
     */
    const canManageRoles =
        !membersLoading &&
        !membersError &&
        myMembership?.position === 'LEADER'

    /*
     * [65단계: 역할 변경 실행]
     * 자식 목록에서 사용자 ID와 선택한 역할을 전달받는다.
     * 1) 현재 리더인지와 대상 사용자 상태를 화면에서도 검사한다.
     * 2) PUT 요청 중에는 변경 버튼을 잠가 중복 요청을 막는다.
     * 3) 성공하면 GET members로 서버 최신값을 재조회한다.
     * 4) 실패하면 roleChangeError를 표시하고 기존 목록을 유지한다.
     *
     * [주의] 초대 수락/역할 변경 등의 실제 권한은 백엔드가 최종 판단한다.
     */
    async function handleRoleChange(targetUserId, newPosition) {
        if (!canManageRoles || changingUserId != null || transferringLeader) return

        const target = members.find((member) =>
            Number(member.userId) === Number(targetUserId) &&
            member.memberStatus === 'ACTIVE'
        )
        if (!target || target.position === 'LEADER' ||
            Number(targetUserId) === Number(currentUserId) ||
            !['MEMBER', 'VICE_LEADER'].includes(newPosition) ||
            target.position === newPosition) return

        setChangingUserId(targetUserId)
        setRoleChangeError(null)

        try {
            await updateProjectMemberRole(projectId, targetUserId, newPosition)
            // 변경 결과는 현재 프로젝트의 전체 멤버 목록으로 재조회한다.
            // ProjectRoleInfo, ProjectMemberList, 권한 계산이 같은 members를 사용한다.
            const refreshedMembers = await getProjectMembers(projectId)
            setMembers(refreshedMembers)
            setMembersError(null)
        } catch (err) {
            setRoleChangeError(
                err instanceof Error ? err.message : '역할 변경 또는 멤버 목록 갱신에 실패했습니다.'
            )
        } finally {
            setChangingUserId(null)
        }
    }

    /*
     * [69단계: 리더 양도 권한]
     * 조회/수정 권한과 독립적으로 ACTIVE LEADER만 허용한다.
     * 멤버 조회에 실패했을 때는 안전하게 양도 UI를 숨긴다.
     * 최종 권한·동시성 검증은 백엔드에서 수행한다.
     */
    const canTransferLeader =
        !membersLoading &&
        !membersError &&
        myMembership?.position === 'LEADER'

    /*
     * [69단계: 리더 양도]
     * 1) 선택된 사용자가 본인이 아닌 ACTIVE 멤버인지 확인한다.
     * 2) 사용자 클릭으로 시작된 경우에만 POST 양도 API를 실행한다.
     * 3) 성공하면 PROJECT.ownerId와 PROJECT_MEMBER의 역할을 각각 재조회한다.
     * 4) 실패 시 상태를 임의로 바꾸지 않고 오류를 보여준다.
     *
     * 주의: API 요청 성공 후 재조회만 실패할 수도 있다. 이때 재요청하면
     * 이미 새 리더로 바뀐 상태이므로 무작정 다시 양도하지 않아야 한다.
     * 권한이 달라졌을 수 있으므로 목록 갱신이 실패하면 멤버 목록을 비우고
     * 재조회 오류 상태로 바꿔 오래된 리더 권한 UI를 사용하지 않도록 한다.
     */
    async function handleTransferLeader(targetUserId) {
        if (!canTransferLeader || transferringLeader || changingUserId != null) return

        const target = members.find((member) =>
            Number(member.userId) === Number(targetUserId) &&
            member.memberStatus === 'ACTIVE' &&
            Number(member.userId) !== Number(currentUserId)
        )
        if (!target) return

        setTransferringLeader(true)
        setLeaderTransferError(null)
        setRoleChangeError(null)

        try {
            await transferProjectLeader(projectId, targetUserId)

            // 리더/소유자 정보가 바뀐 후 상세 및 멤버를 동시에 다시 읽는다.
            // 반환 결과는 새로운 서버 상태이므로 프론트에서 역할을 추측하지 않는다.
            const [updatedProject, updatedMembers] = await Promise.all([
                getProjectDetail(projectId),
                getProjectMembers(projectId),
            ])
            setProject(updatedProject)
            setMembers(updatedMembers)
            setMembersError(null)
        } catch (err) {
            // 양도 성공 후의 재조회 오류 가능성이 있으므로 안전하게 화면 권한을 차단한다.
            setMembers([])
            setMembersError('멤버 상태를 확인할 수 없습니다. 페이지를 새로고침해 주세요.')
            setLeaderTransferError(
                err instanceof Error ? err.message : '리더 양도 또는 최신 정보 조회에 실패했습니다.'
            )
        } finally {
            setTransferringLeader(false)
        }
    }

    /*
     * [78단계: 강제 제외 권한]
     * 조회 권한이나 프로젝트 수정 권한과 별개로 ACTIVE LEADER만 사용할 수 있다.
     * 서버에서는 현재 사용자/제외 대상의 권한과 상태를 다시 확인한다.
     */
    const canRemoveMembers =
        !membersLoading &&
        !membersError &&
        myMembership?.position === 'LEADER'

    /*
     * [78단계: 멤버 강제 제외]
     * 1) ProjectMemberList가 확인 입력을 완료하고 버튼을 눌러 targetUserId를 전달한다.
     * 2) 리더 권한 및 대상 ACTIVE 여부를 화면에서도 한 번 더 검증한다.
     * 3) POST /api/projects/{projectId}/members/{userId}/remove 요청을 보낸다.
     * 4) 성공 시 서버의 ACTIVE 멤버 목록을 다시 가져와 화면/권한을 동기화한다.
     * 5) 제외 자체는 성공했지만 재조회가 실패한 경우에도 오래된 권한을 보여주지 않도록
     *    목록과 권한을 초기화하고 새로고침을 안내한다. 동일 요청 재실행은 주의해야 한다.
     *
     * [주의] 버튼 숨김과 ID 확인은 UI 안전장치일 뿐 최종 보안 검증이 아니다.
     */
    async function handleRemoveMember(targetUserId) {
        if (!canRemoveMembers || removingUserId != null ||
            changingUserId != null || transferringLeader || leavingProject) return

        const target = members.find((member) =>
            Number(member.userId) === Number(targetUserId) &&
            member.memberStatus === 'ACTIVE' &&
            member.position !== 'LEADER' &&
            Number(member.userId) !== Number(currentUserId)
        )
        if (!target) return

        setRemovingUserId(targetUserId)
        setRemoveMemberError(null)
        let removalSucceeded = false

        try {
            await removeProjectMember(projectId, targetUserId)
            removalSucceeded = true
            const refreshedMembers = await getProjectMembers(projectId)
            setMembers(refreshedMembers)
            setMembersError(null)
            setRoleChangeError(null)
        } catch (err) {
            if (removalSucceeded) {
                // 재조회 오류 시 낡은 멤버 배열로 역할 변경/양도를 이어가지 않게 차단한다.
                setMembers([])
                setMembersError('멤버 목록을 다시 확인할 수 없습니다. 페이지를 새로고침해 주세요.')
            }
            setRemoveMemberError(
                err instanceof Error ? err.message : '멤버 제외 또는 목록 갱신에 실패했습니다.'
            )
        } finally {
            setRemovingUserId(null)
        }
    }

    /*
     * [74단계: 자진 탈퇴 UI 권한]
     * 현재 요청 사용자가 ACTIVE MEMBER 또는 ACTIVE VICE_LEADER일 때만 표시한다.
     * 멤버 조회 실패/로딩 중에는 안전하게 비활성화한다.
     * LEADER는 먼저 다른 ACTIVE 멤버에게 리더 권한을 양도해야 한다.
     * 실제 권한은 Spring Boot Service에서 반드시 다시 검사한다.
     */
    const canLeaveProject =
        !membersLoading &&
        !membersError &&
        myMembership != null &&
        ['MEMBER', 'VICE_LEADER'].includes(myMembership.position)

    /*
     * [74단계: 자진 탈퇴 요청]
     * 자식 ProjectMemberList가 확인 ID 입력 후 버튼을 눌렀을 때만 호출한다.
     * 1. 권한, 처리 중 상태를 확인한다.
     * 2. POST /api/projects/{projectId}/leave 요청을 보낸다.
     * 3. 정상 응답을 받으면 현재 사용자는 LEFT 상태이므로 목록으로 이동한다.
     * 4. 실패하면 DB 상태를 임의로 변경하지 않고 오류를 표시한다.
     *
     * 참고: 프로젝트 목록은 다른 페이지에서 새로 조회한다.
     * 로그인 통합 시 개발용 사용자 ID는 인증 사용자로 교체해야 한다.
     */
    async function handleLeaveProject() {
        if (!canLeaveProject || leavingProject || transferringLeader || changingUserId != null) return

        setLeavingProject(true)
        setLeaveProjectError(null)
        try {
            await leaveProject(projectId)
            navigate('/projects', { replace: true })
        } catch (err) {
            setLeaveProjectError(
                err instanceof Error ? err.message : '프로젝트 탈퇴에 실패했습니다.'
            )
        } finally {
            setLeavingProject(false)
        }
    }

    const canDeleteProject =
        !membersLoading &&
        !membersError &&
        myMembership != null &&
        myMembership.position === 'LEADER'




    /*
     * [상세 페이지 탭 목록]
     *
     * id: 내부에서 사용할 탭 식별자
     * label: 사용자에게 표시할 이름
     *
     * 업무/멤버/설정 탭은 현재 연결 전 안내만 표시한다.
     */
    const tabs = [
        { id: 'overview', label: '개요' },
        { id: 'tasks', label: '업무 관리' },
        { id: 'members', label: '멤버 관리' },
        { id: 'settings', label: '프로젝트 설정' },
    ]

    return (
        <main className="min-w-0 flex-1 p-8">

            <div className="mx-auto max-w-6xl">

                {/* ====================================================
            1. 목록으로 돌아가기

            [Tailwind]
            text-blue-600 : 파란색 글자
            hover:underline : 마우스를 올리면 밑줄 표시
           ==================================================== */}
                <button
                    type="button"
                    onClick={onBack}
                    className="
            mb-6 cursor-pointer text-sm font-medium
            text-blue-600 hover:underline
          "
                >
                    ← 내 프로젝트로 돌아가기
                </button>

                {/* ====================================================
            2. 로딩 중
           ==================================================== */}
                {loading && (
                    <div
                        role="status"
                        className="
              rounded-xl border border-slate-200
              bg-white p-10 text-center text-slate-600
            "
                    >
                        프로젝트 상세 정보를 불러오는 중입니다...
                    </div>
                )}

                {/* ====================================================
            3. 오류 화면
           ==================================================== */}
                {!loading && error && (
                    <div
                        role="alert"
                        className="
              rounded-xl border border-red-200
              bg-red-50 p-8 text-center
            "
                    >
                        <p className="font-semibold text-red-700">
                            프로젝트 상세 조회 실패
                        </p>

                        <p className="mt-2 text-sm text-red-600">
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={handleRetry}
                            className="
                mt-5 cursor-pointer rounded-lg bg-red-600
                px-5 py-2 text-sm font-semibold text-white
                hover:bg-red-700
              "
                        >
                            다시 시도
                        </button>
                    </div>
                )}

                {/* ====================================================
            4. 프로젝트 상세 화면

            로딩이 끝났고 조회에 성공한 경우에만 표시한다.
           ==================================================== */}
                {!loading && !error && project && (
                    <>
                        {/* 프로젝트 기본 정보 헤더 */}
                        <header className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <p className="mb-2 text-sm font-medium text-blue-600">
                                PROJECT DETAIL
                            </p>

                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <h1 className="text-3xl font-bold text-slate-800">
                                    {project.projectName}
                                </h1>

                                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                    {project.status}
                                </span>
                            </div>

                            <p className="mt-3 text-sm text-slate-500">
                                프로젝트 ID: {project.projectId}
                            </p>
                        </header>


                        {/*
  ============================================================
  [현재 사용자의 프로젝트 역할 표시]
  ============================================================

  [목적]
  현재 사용자가 해당 프로젝트에서
  LEADER / VICE_LEADER / MEMBER 중 어떤 역할인지 표시한다.

  [데이터 흐름]
  ProjectDetailPage.jsx
    ↓ projectId 전달
  ProjectRoleInfo.jsx
    ↓ getProjectMembers(projectId)
  GET /api/projects/{projectId}/members
    ↓
  현재 사용자(USER_ID = 1)의 ACTIVE 멤버 정보 찾기
    ↓
  역할 및 프로젝트 수정 가능 여부 표시

  [Tailwind CSS]
  mb-6 : 역할 카드와 아래 탭 사이에 24px 여백

  [팀원 인계 / TODO]
  - 현재 개발 사용자 ID는 ProjectRoleInfo.jsx에 정의되어 있다.
  - 로그인 통합 후 실제 사용자 정보로 교체한다.
  - 수정 버튼에 권한을 적용할 때 역할 정보 조회가
    중복되지 않도록 상위 컴포넌트와 상태를 공유한다.

  [보안 주의]
  역할 표시 또는 버튼 숨김은 사용자 인터페이스 처리다.
  실제 수정 권한은 Spring Boot Service에서 검증한다.
*/}

                        {/*
 * [프로젝트 역할 정보 표시]
 *
 * 멤버 조회는 부모인 ProjectDetailPage에서 수행한다.
 *
 * myMembership : 현재 사용자 멤버 정보
 * loading      : 멤버 API 조회 중 여부
 * error        : 멤버 조회 오류
 *
 * [팀원 인계]
 * ProjectRoleInfo에서는 API를 다시 호출하지 않는다.
 * 부모에서 조회한 역할 정보를 화면에 표시한다.
 */}
                        <div className="mb-6">
                            <ProjectRoleInfo
                                myMembership={myMembership}
                                loading={membersLoading}
                                error={membersError}
                            />

                        </div>


                        {/* ==================================================
                5. 상세 기능 탭

                [Tailwind]
                flex flex-wrap : 가로 정렬, 공간 부족 시 줄바꿈
                border-b : 아래 구분선
                transition-colors : 색상 전환 효과

                [팀원 인계]
                새 탭을 추가하려면 tabs 배열과
                아래 조건부 렌더링을 함께 수정한다.
               ================================================== */}
                        <nav
                            className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3"
                            aria-label="프로젝트 상세 메뉴"
                        >
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    aria-current={activeTab === tab.id ? 'page' : undefined}
                                    className={`cursor-pointer rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${activeTab === tab.id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>

                        {/* ==================================================
                6. 개요 탭

                [API]
                GET /api/projects/{projectId}

                현재 응답의 ProjectResponse 필드를 표시한다.
               ================================================== */}
                        {activeTab === 'overview' && (
                            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h2 className="mb-6 text-xl font-bold text-slate-800">
                                    프로젝트 개요
                                </h2>

                                <dl className="grid grid-cols-1 gap-6 md:grid-cols-2">

                                    <div>
                                        <dt className="mb-2 text-sm font-semibold text-slate-500">
                                            프로젝트명
                                        </dt>
                                        <dd className="text-slate-800">
                                            {project.projectName}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="mb-2 text-sm font-semibold text-slate-500">
                                            프로젝트 상태
                                        </dt>
                                        <dd className="text-slate-800">
                                            {project.status}
                                        </dd>
                                    </div>

                                    <div className="md:col-span-2">
                                        <dt className="mb-2 text-sm font-semibold text-slate-500">
                                            프로젝트 설명
                                        </dt>
                                        <dd className="whitespace-pre-wrap text-slate-800">
                                            {project.description || '설명이 없습니다.'}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="mb-2 text-sm font-semibold text-slate-500">
                                            생성자 ID
                                        </dt>
                                        <dd className="text-slate-800">
                                            {project.ownerId}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="mb-2 text-sm font-semibold text-slate-500">
                                            자료 수집 키워드
                                        </dt>
                                        <dd className="text-slate-800">
                                            {project.crawlKeyword || '미설정'}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="mb-2 text-sm font-semibold text-slate-500">
                                            생성일
                                        </dt>
                                        <dd className="text-slate-800">
                                            {formatDate(project.createdAt)}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="mb-2 text-sm font-semibold text-slate-500">
                                            수정일
                                        </dt>
                                        <dd className="text-slate-800">
                                            {formatDate(project.updatedAt)}
                                        </dd>
                                    </div>

                                </dl>
                            </section>
                        )}

                        {/*
                          [4-2단계: TASK 목록 조회 연결]
                          프로젝트 상세 탭 구조는 유지하고 목록 컴포넌트만 삽입한다.
                          projectId: 현재 선택한 프로젝트
                          members: 기존에 조회한 ACTIVE 멤버 데이터(담당자 이름 표시용)
                          membersLoading: 멤버 데이터 로딩 안내에 사용
                          실제 업무 접근 권한은 TaskService에서 검증한다.
                          TASK의 생성·수정·삭제·담당자 변경은 후속 단계에서 연결한다.
                        */}
                        {activeTab === 'tasks' && (
                            <ProjectTaskList
                                projectId={projectId}
                                members={members}
                                membersLoading={membersLoading}
                            />
                        )}

                        {/*
                          ============================================================
                          [44단계: 프로젝트 멤버 관리 탭에 목록 컴포넌트 연결]

                          [데이터 흐름]
                          ProjectDetailPage의 getProjectMembers(projectId) 결과
                            → members / membersLoading / membersError 상태
                            → ProjectMemberList props 전달
                            → ACTIVE 멤버 사용자 ID, 역할, 현재 사용자 표시

                          [Props]
                          members       : 서버에서 조회한 프로젝트 멤버 배열
                          loading       : 조회 진행 중 여부
                          error         : 조회 실패 메시지
                          currentUserId : 현재 사용자를 '나'로 구분하기 위한 개발용 ID

                          [주의 및 후속 작업]
                          - 자식에서 API를 재호출하지 않아 중복 요청을 방지한다.
                          - 현재 사용자 ID=1은 임시값이며 인증 연동 시 변경한다.
                          - 초대, 역할 변경, 리더 양도, 탈퇴/제외는 이후 단계에서
                            백엔드 권한 및 응답을 확인한 뒤 별도로 구현한다.
                          - 멤버 목록 표시 자체는 서버 권한 검증을 대신하지 않는다.
                          ============================================================
                        */}
                        {activeTab === 'members' && (
                            /*
                             * [47단계: 멤버 목록 + 초대 폼]
                             * space-y-6: 두 카드 사이의 세로 간격(24px)을 설정한다.
                             *
                             * ProjectMemberList는 부모에서 조회한 ACTIVE 멤버 배열을 받는다.
                             * ProjectInviteForm은 사용자 ID를 입력받아 초대 POST 요청을 보낸다.
                             * 초대 직후 멤버 상태는 PENDING이며, 수락 전까지 목록에는 나타나지 않는다.
                             *
                             * 역할 변경 시 부모 handleRoleChange가 서버 목록을 재조회한다.
                             * 자진 탈퇴 성공 시 상세 접근 권한이 없어질 수 있어 목록 화면으로 이동한다.
                             * 강제 제외 성공 후에는 ACTIVE 멤버 목록을 다시 조회해 목록/권한을 갱신한다.
                             */
                            <div className="space-y-6">
                                <ProjectMemberList
                                    members={members}
                                    loading={membersLoading}
                                    error={membersError}
                                    currentUserId={currentUserId}
                                    canManageRoles={canManageRoles}
                                    onRoleChange={handleRoleChange}
                                    changingUserId={changingUserId}
                                    roleChangeError={roleChangeError}
                                    canTransferLeader={canTransferLeader}
                                    onTransferLeader={handleTransferLeader}
                                    transferringLeader={transferringLeader}
                                    leaderTransferError={leaderTransferError}
                                    canLeaveProject={canLeaveProject}
                                    onLeaveProject={handleLeaveProject}
                                    leavingProject={leavingProject}
                                    leaveProjectError={leaveProjectError}
                                    canRemoveMembers={canRemoveMembers}
                                    onRemoveMember={handleRemoveMember}
                                    removingUserId={removingUserId}
                                    removeMemberError={removeMemberError}
                                />
                                <ProjectInviteForm
                                    projectId={projectId}
                                    canInvite={canInviteProjectMember}
                                    currentUserId={currentUserId}
                                />
                            </div>
                        )}


                        {/*
  ============================================================
  [프로젝트 설정 탭]
  ============================================================

  [목적]
  프로젝트 기본 정보 수정 화면을 표시한다.

  [컴포넌트]
  ProjectSettingsForm.jsx

  [Props]
  project:
    GET /api/projects/{projectId}에서 조회한 데이터

  canEditProject:
    프로젝트 멤버 목록에서 계산한 수정 가능 여부

  [권한]
  ACTIVE + LEADER      : 수정 가능
  ACTIVE + VICE_LEADER : 수정 가능
  ACTIVE + MEMBER      : 수정 불가능

  [데이터 흐름]
  ProjectDetailPage
    ↓ project, canEditProject
  ProjectSettingsForm
    ↓ 사용자 입력
  변경사항 저장 버튼
    ↓ 다음 단계에서 연결
  updateProject()
    ↓
  PUT /api/projects/{projectId}

  [팀원 인계 / TODO]
  - 저장 API 연결 시 성공 응답을 부모에게 전달한다.
  - 부모에서 setProject()로 상세 정보를 갱신한다.
  - 서버에서 권한을 최종 검증해야 한다.
  - 프로젝트 삭제는 별도 위험 구역으로 구현한다.
  ============================================================
*/}

                        {/*
  ============================================================
  [프로젝트 설정 탭 — 수정 결과 반영]
  ============================================================

  [관련 컴포넌트]
  ProjectSettingsForm.jsx

  [Props]
  project:
    현재 서버에서 조회한 프로젝트 상세 데이터

  canEditProject:
    현재 사용자의 프로젝트 수정 가능 여부

  onUpdated:
    자식 컴포넌트에서 수정 API가 성공하면 호출하는 함수

  [데이터 흐름]
  1. 설정 폼에서 사용자가 변경사항 저장 클릭
  2. ProjectSettingsForm에서 updateProject() 호출
  3. Spring Boot가 프로젝트 수정
  4. 수정된 ProjectResponse 응답
  5. onUpdated(updatedProject) 실행
  6. setProject(updatedProject)로 부모 상태 갱신
  7. 상세 헤더, 개요 탭, 설정 폼에 변경 내용 반영

  [React 개념]
  자식 → 부모 데이터 전달은 콜백 Props를 사용한다.

  [팀원 인계]
  - 자식 컴포넌트는 수정 요청을 수행한다.
  - 부모 컴포넌트는 수정 성공 결과를 보관한다.
  - 별도의 상세 GET 요청 없이 서버 응답으로 갱신한다.
  - 수정 가능 여부는 Spring Boot가 최종 검증한다.
  ============================================================
*/}

                        {/*
  ============================================================
  [프로젝트 설정 탭]
  ============================================================

  [구성]
  1. ProjectSettingsForm
     - 프로젝트명, 설명, 자료 수집 키워드 수정
     - LEADER / VICE_LEADER 사용 가능

  2. ProjectDeleteSection
     - 프로젝트 삭제 위험 안내 및 확인 절차
     - LEADER만 사용 가능

  [공통 Props]
  project:
    GET /api/projects/{projectId}에서 조회한 프로젝트 정보

  [수정 기능]
  - onUpdated()로 수정된 ProjectResponse를 받는다.
  - setProject()로 상세 헤더와 개요 화면을 갱신한다.

  [삭제 기능]
  - 현재는 삭제 확인 UI만 표시한다.
  - 삭제 API 호출은 다음 단계에서 연결한다.

  [팀원 인계]
  프로젝트 수정과 삭제는 권한 조건이 다르다.
  삭제 권한에 canEditProject를 재사용하지 않는다.
  ============================================================
*/}
                        {activeTab === 'settings' && (
                            <>
                                {/*
      [프로젝트 기본 정보 수정]

      기존에 완성한 수정 API 연결을 그대로 유지한다.
    */}
                                <ProjectSettingsForm
                                    project={project}
                                    canEditProject={canEditProject}
                                    onUpdated={(updatedProject) => {
                                        setProject(updatedProject)
                                    }}
                                />

                                {/*
      [프로젝트 삭제 위험 구역]

      기존 myMembership을 사용해 판단한
      canDeleteProject를 전달한다.

      프로젝트 멤버 API를 중복 호출하지 않는다.
    */}

                                {/*
  ============================================================
  [프로젝트 삭제 성공 후 이동]
  ============================================================

  [실행 순서]
  1. ProjectDeleteSection에서 삭제 확인
  2. deleteProject() 실행
  3. 백엔드가 Soft Delete 성공 응답 반환
  4. 자식 컴포넌트가 onDeleted() 호출
  5. 부모가 navigate('/projects') 실행

  [replace: true]
  삭제된 프로젝트의 상세 페이지를 브라우저 방문 기록에서
  현재 항목 대신 프로젝트 목록으로 대체한다.

  따라서 삭제 직후 뒤로가기로 해당 상세 페이지에
  다시 진입하는 상황을 줄일 수 있다.

  [팀원 인계]
  실제 삭제 권한은 백엔드에서 검사한다.
  프론트엔드의 canDeleteProject는 UI 제어용이다.
*/}
                                <ProjectDeleteSection
                                    project={project}
                                    canDeleteProject={canDeleteProject}
                                    onDeleted={() => {
                                        navigate('/projects', { replace: true })
                                    }}
                                />

                            </>
                        )}




                    </>
                )}

            </div>
        </main>
    )

}

export default ProjectDetailPage
