package com.teamplace.backend.controller;

import com.teamplace.backend.dto.ProjectCreateRequest;
import com.teamplace.backend.dto.ProjectResponse;
import com.teamplace.backend.entity.Project;
import com.teamplace.backend.service.ProjectService;
import org.springframework.web.bind.annotation.*;

import com.teamplace.backend.dto.ProjectUpdateRequest;

import java.util.List;

import com.teamplace.backend.dto.ProjectInviteRequest;
import com.teamplace.backend.entity.ProjectMember;

import com.teamplace.backend.dto.ProjectMemberRoleUpdateRequest;

/*
 * 프로젝트 관련 REST API의 진입점.
 *
 * React에서 HTTP 요청을 보내면
 * 가장 먼저 이 Controller가 요청을 받는다.
 *
 *
 * 데이터 흐름:
 *
 * React
 *   ↓ HTTP 요청
 * ProjectCreateRequest
 *   ↓
 * ProjectController
 *   ↓
 * ProjectService
 *   ↓
 * Repository
 *   ↓
 * Oracle
 *
 *
 * 응답 흐름:
 *
 * Oracle
 *   ↓
 * Project Entity
 *   ↓
 * ProjectResponse
 *   ↓
 * ProjectController
 *   ↓
 * React
 */
@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;

    /*
     * ProjectController가 ProjectService를 사용하기 위해
     * Spring이 생성자를 통해 Service 객체를 넣어준다.
     */
    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    /*
     * 프로젝트 생성 API.
     *
     * 요청 주소:
     *
     * POST /api/projects
     *
     *
     * 요청 데이터는 ProjectCreateRequest DTO로 받는다.
     *
     * React에서 전달 가능한 값:
     *
     * - projectName
     * - description
     * - crawlKeyword
     *
     *
     * 다음 값들은 사용자가 직접 보내서 결정하지 않는다.
     *
     * - projectId
     * - ownerId
     * - status
     * - createdAt
     * - updatedAt
     *
     * projectId / 생성·수정 시각
     * → DB와 JPA가 관리
     *
     * ownerId
     * → CurrentUserService를 통해 현재 사용자로 결정
     *
     * status
     * → ProjectService에서 ACTIVE로 결정
     */
    @PostMapping
    public ProjectResponse createProject(
            @RequestBody ProjectCreateRequest request) {

        /*
         * 요청 DTO에서 사용자가 입력한 값만 꺼내서
         * Service에 전달한다.
         *
         * Service에서는 실제 PROJECT와
         * PROJECT_MEMBER 데이터를 생성하고 저장한다.
         */
        Project savedProject = projectService.createProject(
                request.getProjectName(),
                request.getDescription(),
                request.getCrawlKeyword());

        /*
         * Service에서 반환된 Project Entity를
         * 그대로 외부에 노출하지 않고
         * API 응답 전용 DTO로 변환한다.
         *
         * Project Entity
         * ↓
         * ProjectResponse
         * ↓
         * JSON 응답
         */
        return ProjectResponse.from(savedProject);
    }

    /*
     * 현재 사용자가 ACTIVE 상태로 참여 중인
     * 프로젝트 목록을 조회하는 API.
     *
     * 요청 주소:
     *
     * GET /api/projects
     *
     *
     * 현재 사용자는 Controller에서 직접 정하지 않고
     * ProjectService 내부에서 CurrentUserService를 통해 확인한다.
     *
     * 따라서 Controller는 단순히
     * "내 프로젝트 목록을 조회해줘"라고
     * Service에 요청하는 역할만 한다.
     *
     *
     * 조회 흐름:
     *
     * React
     * ↓
     * GET /api/projects
     * ↓
     * ProjectController
     * ↓
     * ProjectService.getMyProjects()
     * ↓
     * CurrentUserService
     * ↓
     * 현재 USER_ID
     * ↓
     * ProjectRepository
     * ↓
     * PROJECT_MEMBER에서 ACTIVE 참여 확인
     * ↓
     * PROJECT 목록 조회
     *
     *
     * Service에서는 List<Project>를 반환하지만
     * Controller에서는 Entity를 그대로 외부에 반환하지 않고
     * ProjectResponse DTO 목록으로 변환한다.
     */
    @GetMapping
    public List<ProjectResponse> getMyProjects() {

        /*
         * 현재 사용자가 참여 중인 프로젝트들을
         * Service를 통해 조회한다.
         */
        List<Project> projects = projectService.getMyProjects();

        /*
         * 조회된 Project Entity 목록을
         * ProjectResponse DTO 목록으로 변환한다.
         *
         * projects.stream()
         * → 프로젝트들을 하나씩 꺼냄
         *
         * map(ProjectResponse::from)
         * → 각각의 Project를 ProjectResponse로 변환
         *
         * toList()
         * → 변환된 결과들을 다시 List로 묶음
         */
        return projects.stream()
                .map(ProjectResponse::from)
                .toList();
    }

    /*
     * 특정 프로젝트 하나의 상세 정보를 조회하는 API.
     *
     * 요청 주소:
     *
     * GET /api/projects/{projectId}
     *
     * 예:
     *
     * GET /api/projects/4
     *
     *
     * projectId는 URL 경로에서 전달받는다.
     *
     * Controller에서는 단순히 projectId를 Service에 전달하고,
     * 실제 조회 가능 여부 판단은 ProjectService에서 처리한다.
     *
     *
     * 조회 권한 기준:
     *
     * 현재 사용자가 해당 프로젝트의
     * PROJECT_MEMBER에서 ACTIVE 상태인지 확인한다.
     *
     * 따라서 프로젝트 ID를 알고 있더라도
     * ACTIVE 멤버가 아니면 상세 조회가 차단된다.
     *
     *
     * 데이터 흐름:
     *
     * React
     * ↓
     * GET /api/projects/{projectId}
     * ↓
     * ProjectController
     * ↓
     * ProjectService.getProject(projectId)
     * ↓
     * 프로젝트 존재 여부 확인
     * ↓
     * 현재 사용자 ACTIVE 멤버 여부 확인
     * ↓
     * Project Entity
     * ↓
     * ProjectResponse
     * ↓
     * JSON 응답
     */
    @GetMapping("/{projectId}")
    public ProjectResponse getProject(
            @PathVariable Long projectId) {

        /*
         * Service에서
         * 프로젝트 존재 여부와 조회 권한을 확인한다.
         *
         * 조회 가능하면 Project를 반환하고,
         * 조회 불가능하면 예외가 발생한다.
         */
        Project project = projectService.getProject(projectId);

        /*
         * DB Entity를 그대로 반환하지 않고
         * API 응답 DTO인 ProjectResponse로 변환한다.
         */
        return ProjectResponse.from(project);
    }

    /*
     * 프로젝트 기본 정보를 수정하는 API.
     *
     * 요청 주소:
     *
     * PUT /api/projects/{projectId}
     *
     * 예:
     *
     * PUT /api/projects/4
     *
     *
     * 요청 JSON 예:
     *
     * {
     * "projectName": "수정된 프로젝트 이름",
     * "description": "수정된 프로젝트 설명",
     * "crawlKeyword": "수정된 키워드"
     * }
     *
     *
     * 수정 가능한 값:
     *
     * - projectName
     * - description
     * - crawlKeyword
     *
     *
     * 수정 권한:
     *
     * ACTIVE + LEADER
     * → 수정 가능
     *
     * ACTIVE + VICE_LEADER
     * → 수정 가능
     *
     * ACTIVE + MEMBER
     * → 수정 불가
     *
     *
     * Controller에서는 요청 데이터를 DTO로 받고,
     * 실제 수정 가능 여부와 DB 변경은
     * ProjectService에서 처리한다.
     *
     *
     * 데이터 흐름:
     *
     * React
     * ↓
     * PUT /api/projects/{projectId}
     * ↓
     * ProjectUpdateRequest
     * ↓
     * ProjectController
     * ↓
     * ProjectService.updateProject()
     * ↓
     * 수정 권한 확인
     * ↓
     * Project Entity 변경
     * ↓
     * Oracle PROJECT UPDATE
     * ↓
     * ProjectResponse
     * ↓
     * JSON 응답
     */
    @PutMapping("/{projectId}")
    public ProjectResponse updateProject(
            @PathVariable Long projectId,
            @RequestBody ProjectUpdateRequest request) {

        /*
         * URL 경로에서 받은 projectId와
         * 요청 DTO에서 받은 수정 값을
         * Service에 전달한다.
         */
        Project updatedProject = projectService.updateProject(
                projectId,
                request.getProjectName(),
                request.getDescription(),
                request.getCrawlKeyword());

        /*
         * 수정된 Project Entity를
         * 그대로 외부에 반환하지 않고
         * ProjectResponse DTO로 변환해서 반환한다.
         */
        return ProjectResponse.from(updatedProject);
    }

    /*
     * 프로젝트를 삭제 처리하는 API.
     *
     * 요청 주소:
     *
     * DELETE /api/projects/{projectId}
     *
     * 예:
     *
     * DELETE /api/projects/4
     *
     *
     * 실제 DB 행을 DELETE하는 것이 아니라
     * ProjectService에서 PROJECT.status를
     * DELETED로 변경하는 soft delete 방식으로 처리한다.
     *
     *
     * 삭제 권한:
     *
     * ACTIVE + LEADER
     * → 삭제 가능
     *
     * ACTIVE + VICE_LEADER
     * → 삭제 불가
     *
     * ACTIVE + MEMBER
     * → 삭제 불가
     *
     *
     * 데이터 흐름:
     *
     * React
     * ↓
     * DELETE /api/projects/{projectId}
     * ↓
     * ProjectController
     * ↓
     * ProjectService.deleteProject()
     * ↓
     * 현재 사용자 확인
     * ↓
     * PROJECT 존재 확인
     * ↓
     * PROJECT_MEMBER에서
     * ACTIVE + LEADER 여부 확인
     * ↓
     * PROJECT.status = DELETED
     * ↓
     * Oracle PROJECT UPDATE
     */
    @DeleteMapping("/{projectId}")
    public void deleteProject(
            @PathVariable Long projectId) {

        /*
         * Controller에서는 projectId만 Service에 전달한다.
         *
         * 실제 삭제 권한 검사와
         * soft delete 처리는 ProjectService에서 담당한다.
         */
        projectService.deleteProject(projectId);
    }

    /*
     * 프로젝트 멤버 초대 API.
     *
     * 요청 예:
     *
     * POST /api/projects/4/invitations
     *
     * Body:
     * {
     * "userId": 2
     * }
     *
     *
     * projectId
     * → URL 경로에서 받음
     *
     * target userId
     * → 요청 JSON에서 받음
     *
     * 실제 권한 검증과 초대 생성은
     * ProjectService가 담당한다.
     */
    @PostMapping("/{projectId}/invitations")
    public ProjectMember inviteMember(
            @PathVariable Long projectId,
            @RequestBody ProjectInviteRequest request) {

        return projectService.inviteMember(
                projectId,
                request.getUserId());
    }

    /*
     * 현재 사용자가 받은 PENDING 프로젝트 초대 목록을 조회한다.
     *
     * GET /api/projects/invitations
     *
     * 현재 사용자 ID는 Controller에서 직접 받지 않는다.
     * CurrentUserService를 사용하는 ProjectService가 내부에서 결정한다.
     *
     * 데이터 흐름:
     *
     * GET /api/projects/invitations
     * ↓
     * ProjectController
     * ↓
     * ProjectService.getMyPendingInvitations()
     * ↓
     * PROJECT_MEMBER에서
     * 현재 사용자 + PENDING 조회
     * ↓
     * 받은 초대 목록 반환
     */
    @GetMapping("/invitations")
    public List<ProjectMember> getMyPendingInvitations() {

        return projectService.getMyPendingInvitations();
    }

    /*
     * 현재 사용자가 받은 프로젝트 초대를 수락한다.
     *
     * POST /api/projects/{projectId}/invitations/accept
     *
     * 현재 사용자 ID는 요청으로 받지 않는다.
     * ProjectService 내부에서 CurrentUserService를 통해 확인한다.
     *
     * 데이터 흐름:
     *
     * POST /api/projects/{projectId}/invitations/accept
     * ↓
     * ProjectController
     * ↓
     * ProjectService.acceptInvitation()
     * ↓
     * 현재 사용자 + projectId + PENDING 초대 조회
     * ↓
     * member_status = ACTIVE
     * responded_at = 현재 시간
     * joined_at = 현재 시간
     */
    @PostMapping("/{projectId}/invitations/accept")
    public ProjectMember acceptInvitation(
            @PathVariable Long projectId) {

        return projectService.acceptInvitation(projectId);
    }

    /*
     * 현재 사용자가 받은 프로젝트 초대를 거절한다.
     *
     * POST /api/projects/{projectId}/invitations/reject
     *
     * 현재 사용자 ID는 요청으로 받지 않고
     * ProjectService 내부에서 CurrentUserService를 통해 확인한다.
     *
     * 데이터 흐름:
     *
     * POST /api/projects/{projectId}/invitations/reject
     * ↓
     * ProjectController
     * ↓
     * ProjectService.rejectInvitation()
     * ↓
     * 현재 사용자 + projectId + PENDING 초대 조회
     * ↓
     * member_status = REJECTED
     * responded_at = 현재 시간
     */
    @PostMapping("/{projectId}/invitations/reject")
    public ProjectMember rejectInvitation(
            @PathVariable Long projectId) {

        return projectService.rejectInvitation(projectId);
    }

    /*
     * 특정 프로젝트의 ACTIVE 멤버 목록을 조회한다.
     *
     * GET /api/projects/{projectId}/members
     *
     * 현재 사용자가 해당 프로젝트의 ACTIVE 멤버인지
     * ProjectService에서 먼저 확인한 뒤,
     * ACTIVE 상태의 전체 프로젝트 멤버를 반환한다.
     *
     * 데이터 흐름:
     *
     * GET /api/projects/{projectId}/members
     * ↓
     * ProjectController
     * ↓
     * ProjectService.getActiveProjectMembers()
     * ↓
     * 현재 사용자 ACTIVE 여부 확인
     * ↓
     * PROJECT_MEMBER에서 ACTIVE 멤버 전체 조회
     */
    @GetMapping("/{projectId}/members")
    public List<ProjectMember> getActiveProjectMembers(
            @PathVariable Long projectId) {

        return projectService.getActiveProjectMembers(projectId);
    }

    /*
     * 프로젝트 멤버의 역할을 변경한다.
     *
     * PUT /api/projects/{projectId}/members/{userId}/role
     *
     * 요청 Body 예:
     *
     * {
     * "position": "VICE_LEADER"
     * }
     *
     * 또는
     *
     * {
     * "position": "MEMBER"
     * }
     *
     *
     * 권한/검증은 ProjectService에서 처리한다.
     *
     * - 현재 사용자는 ACTIVE + LEADER여야 함
     * - 대상 사용자는 ACTIVE 멤버여야 함
     * - LEADER 자체는 이 API에서 변경하지 않음
     * - MEMBER / VICE_LEADER만 허용
     */
    @PutMapping("/{projectId}/members/{userId}/role")
    public ProjectMember updateMemberRole(
            @PathVariable Long projectId,
            @PathVariable Long userId,
            @RequestBody ProjectMemberRoleUpdateRequest request) {

        return projectService.updateMemberRole(
                projectId,
                userId,
                request.getPosition());
    }

    /*
     * 현재 LEADER가 다른 ACTIVE 멤버에게
     * 프로젝트 LEADER 역할을 양도한다.
     *
     * POST /api/projects/{projectId}/leader/{userId}
     *
     * projectId
     * → 어떤 프로젝트의 리더를 바꿀지
     *
     * userId
     * → 새 LEADER가 될 사용자
     *
     * 실제 권한 검증과 역할 변경,
     * PROJECT.owner_id 갱신은 ProjectService에서 처리한다.
     */
    @PostMapping("/{projectId}/leader/{userId}")
    public ProjectMember transferLeader(
            @PathVariable Long projectId,
            @PathVariable Long userId) {

        return projectService.transferLeader(
                projectId,
                userId);
    }

    /*
     * 현재 사용자가 프로젝트에서 스스로 나간다.
     *
     * POST /api/projects/{projectId}/leave
     *
     * 실제 PROJECT_MEMBER 행을 삭제하지 않고
     * ProjectService에서 member_status를 LEFT로 변경한다.
     *
     * LEADER는 바로 나갈 수 없고,
     * 먼저 다른 ACTIVE 멤버에게 리더를 양도해야 한다.
     */
    @PostMapping("/{projectId}/leave")
    public ProjectMember leaveProject(
            @PathVariable Long projectId) {

        return projectService.leaveProject(projectId);
    }

    /*
     * LEADER가 프로젝트의 다른 ACTIVE 멤버를 강제로 제외한다.
     *
     * POST /api/projects/{projectId}/members/{userId}/remove
     *
     * DB에서는 자진 탈퇴와 동일하게
     * PROJECT_MEMBER.member_status = LEFT로 처리한다.
     *
     * 다만 이 API는 "리더가 멤버를 제외"하는 기능이므로
     * 프론트에서는 자진 탈퇴와 다른 안내 메시지를 보여줄 수 있다.
     */
    @PostMapping("/{projectId}/members/{userId}/remove")
    public ProjectMember removeMember(
            @PathVariable Long projectId,
            @PathVariable Long userId) {

        return projectService.removeMember(
                projectId,
                userId);
    }

}