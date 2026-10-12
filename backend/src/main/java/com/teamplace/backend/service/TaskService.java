
package com.teamplace.backend.service;

import com.teamplace.backend.dto.TaskCreateRequest;
import com.teamplace.backend.entity.Project;
import com.teamplace.backend.entity.ProjectTask;
import com.teamplace.backend.repository.ProjectMemberRepository;
import com.teamplace.backend.repository.ProjectRepository;
import com.teamplace.backend.repository.ProjectTaskRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.util.List;

import com.teamplace.backend.dto.TaskUpdateRequest;
import com.teamplace.backend.entity.ProjectMember;

import com.teamplace.backend.dto.TaskAssigneeUpdateRequest;

import com.teamplace.backend.exception.TaskDeletionBlockedException;

/*
 * PROJECT_TASK 업무 생성 및 검증을 담당하는 Service.
 *
 * Controller에서 전달된 요청 데이터를 검증한 후
 * ProjectTaskRepository를 통해 Oracle에 저장한다.
 *
 * 현재 구현 범위:
 * - 대단원 생성
 * - 소단원 생성
 * - 3단계 이상 중첩 방지
 * - 프로젝트 ACTIVE 멤버 권한 확인
 * - 담당자 ACTIVE 멤버 여부 확인
 *
 * 작업 상태 변경 및 진행률 계산은 이번 범위에서 제외한다.
 */
@Service
@RequiredArgsConstructor
public class TaskService {

        private final ProjectTaskRepository taskRepository;
        private final ProjectRepository projectRepository;
        private final ProjectMemberRepository projectMemberRepository;
        private final CurrentUserService currentUserService;

        /*
         * 새로운 업무를 생성한다.
         *
         * projectId:
         * Controller가 URL에서 전달할 프로젝트 ID.
         *
         * request:
         * React에서 전달한 업무 생성 요청 DTO.
         *
         * 반환값:
         * Oracle에 저장된 ProjectTask 객체.
         */
        @Transactional
        public ProjectTask createTask(
                        Long projectId,
                        TaskCreateRequest request) {

                // 1. 요청 데이터 존재 여부 확인
                if (request == null) {
                        throw new IllegalArgumentException(
                                        "업무 생성 요청이 비어 있습니다.");
                }

                // 2. 프로젝트 존재 및 삭제 여부 확인
                if (projectId == null) {
                        throw new IllegalArgumentException(
                                        "프로젝트 ID가 필요합니다.");
                }

                Project project = projectRepository.findById(projectId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "존재하지 않는 프로젝트입니다."));

                if ("DELETED".equals(project.getStatus())) {
                        throw new IllegalArgumentException(
                                        "삭제된 프로젝트에는 업무를 생성할 수 없습니다.");
                }

                /*
                 * 3. 현재 사용자 확인
                 *
                 * 개발 단계에서는 CurrentUserService가
                 * USER_ID = 1L을 반환한다.
                 *
                 * 다른 Service에서 사용자 ID를
                 * 직접 하드코딩하지 않는다.
                 */
                Long currentUserId = currentUserService.getCurrentUserId();

                /*
                 * 4. 프로젝트 참여 권한 확인
                 *
                 * LEADER, VICE_LEADER, MEMBER 모두
                 * memberStatus가 ACTIVE이면 생성 가능하다.
                 *
                 * position으로 생성 권한을 제한하지 않는다.
                 */
                boolean isActiveMember = projectMemberRepository
                                .existsByProjectIdAndUserIdAndMemberStatus(
                                                projectId,
                                                currentUserId,
                                                "ACTIVE");

                if (!isActiveMember) {
                        throw new IllegalArgumentException(
                                        "프로젝트의 ACTIVE 멤버만 업무를 생성할 수 있습니다.");
                }

                /*
                 * 5. 업무 제목 검증
                 *
                 * DB의 TASK_TITLE은 NOT NULL,
                 * VARCHAR2(200)으로 정의되어 있다.
                 */
                String taskTitle = request.getTaskTitle();

                if (taskTitle == null || taskTitle.isBlank()) {
                        throw new IllegalArgumentException(
                                        "업무 제목은 반드시 입력해야 합니다.");
                }

                taskTitle = taskTitle.trim();

                if (taskTitle.length() > 200) {
                        throw new IllegalArgumentException(
                                        "업무 제목은 200자 이하로 입력해야 합니다.");
                }

                /*
                 * 6. 대단원 / 소단원 구조 검증
                 *
                 * parentTaskId == null이면 대단원.
                 *
                 * 값이 있으면 부모 업무를 조회해서
                 * 다음 조건을 확인한다.
                 *
                 * - 부모가 존재하는가?
                 * - 같은 프로젝트에 속하는가?
                 * - 부모가 대단원인가?
                 *
                 * 소단원 아래 소단원은 생성할 수 없다.
                 */
                Long parentTaskId = request.getParentTaskId();

                /*
                 * 소단원 생성 시 부모 업무를 비관적 쓰기 잠금으로 조회한다.
                 *
                 * 대단원 삭제도 같은 업무 행을 잠그므로,
                 * 생성과 삭제 요청이 동시에 발생하면
                 * 부모 업무에 대한 작업 순서가 조정된다.
                 *
                 * 부모를 잠근 뒤 프로젝트 소속과 계층 구조를
                 * 확인하고 자식 업무를 저장한다.
                 *
                 * 이 잠금은 @Transactional 범위에서 유지된다.
                 */
                if (parentTaskId != null) {

                        ProjectTask parentTask = taskRepository
                                        .findByIdForUpdate(parentTaskId)
                                        .orElseThrow(() -> new IllegalArgumentException(
                                                        "상위 업무가 존재하지 않습니다."));

                        if (!projectId.equals(parentTask.getProjectId())) {
                                throw new IllegalArgumentException(
                                                "다른 프로젝트의 업무를 상위 업무로 지정할 수 없습니다.");
                        }

                        if (parentTask.getParentTaskId() != null) {
                                throw new IllegalArgumentException(
                                                "소단원 아래에는 소단원을 생성할 수 없습니다.");
                        }
                }

                /*
                 * 7. 담당자 검증
                 *
                 * assigneeId가 null이면 미배정으로 허용한다.
                 *
                 * 값이 있으면 해당 프로젝트의
                 * ACTIVE 멤버인지 확인한다.
                 *
                 * assigneeId는 담당자 정보이지,
                 * 업무 조회 권한을 나타내지 않는다.
                 */
                Long assigneeId = request.getAssigneeId();

                if (assigneeId != null) {

                        boolean isActiveAssignee = projectMemberRepository
                                        .existsByProjectIdAndUserIdAndMemberStatus(
                                                        projectId,
                                                        assigneeId,
                                                        "ACTIVE");

                        if (!isActiveAssignee) {
                                throw new IllegalArgumentException(
                                                "담당자는 해당 프로젝트의 ACTIVE 멤버여야 합니다.");
                        }
                }

                /*
                 * 8. DB에 저장할 Entity 생성
                 *
                 * 요청 DTO에서 허용한 값만 옮긴다.
                 *
                 * taskId는 Oracle 시퀀스가 생성한다.
                 * 상태와 진행률은 최초 기본값을 설정한다.
                 */
                ProjectTask task = new ProjectTask();

                task.setProjectId(projectId);
                task.setTaskTitle(taskTitle);
                task.setTaskContent(request.getTaskContent());
                task.setAssigneeId(assigneeId);
                task.setParentTaskId(parentTaskId);

                task.setTaskStatus("TODO");
                task.setProgress(0);

                /*
                 * 9. 업무 저장
                 *
                 * JPA가 PROJECT_TASK INSERT를 수행한다.
                 *
                 * createdAt, updatedAt은 최초 INSERT 시
                 * Oracle의 기본값 SYSTIMESTAMP가 적용된다.
                 *
                 * @Transactional:
                 * 저장 과정에서 실패하면 트랜잭션을 롤백한다.
                 */
                /*
                 * 1. INSERT를 DB에 반영한다.
                 *
                 * 2. Oracle에 저장된 값을 다시 읽는다.
                 *
                 * DB에서 자동 생성한 CREATED_AT,
                 * UPDATED_AT을 Entity에 반영하기 위한 처리다.
                 */
                ProjectTask savedTask = taskRepository.saveAndFlush(task);

                entityManager.refresh(savedTask);

                return savedTask;

        }

        /*
         * JPA 영속성 컨텍스트를 관리하는 객체.
         *
         * INSERT 이후 Oracle에 실제 저장된
         * DEFAULT SYSTIMESTAMP 값을 다시 읽기 위해 사용한다.
         */
        @PersistenceContext
        private EntityManager entityManager;

        /*
         * 특정 프로젝트의 업무 전체 목록을 조회한다.
         *
         * 대단원과 소단원을 모두 반환한다.
         *
         * 업무 담당자(assigneeId)가 누구인지는
         * 조회 권한 판단에 사용하지 않는다.
         *
         * 해당 프로젝트의 ACTIVE 멤버라면
         * 모든 업무를 조회할 수 있다.
         */
        @Transactional(readOnly = true)
        public List<ProjectTask> getTasks(Long projectId) {

                // 1. 프로젝트 ID 검증
                if (projectId == null) {
                        throw new IllegalArgumentException(
                                        "프로젝트 ID가 필요합니다.");
                }

                // 2. 프로젝트 존재 여부 확인
                Project project = projectRepository.findById(projectId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "존재하지 않는 프로젝트입니다."));

                // 3. 삭제된 프로젝트의 업무 조회 차단
                if ("DELETED".equals(project.getStatus())) {
                        throw new IllegalArgumentException(
                                        "삭제된 프로젝트의 업무는 조회할 수 없습니다.");
                }

                /*
                 * 4. 현재 사용자 확인
                 *
                 * 개발 단계에서는 CurrentUserService에서
                 * USER_ID = 1L을 가져온다.
                 */
                Long currentUserId = currentUserService.getCurrentUserId();

                /*
                 * 5. 프로젝트 ACTIVE 멤버 여부 확인
                 *
                 * LEADER / VICE_LEADER / MEMBER 모두 조회 가능.
                 *
                 * 업무의 assigneeId와 관계없이
                 * 프로젝트 참여 상태만 확인한다.
                 */
                boolean isActiveMember = projectMemberRepository
                                .existsByProjectIdAndUserIdAndMemberStatus(
                                                projectId,
                                                currentUserId,
                                                "ACTIVE");

                if (!isActiveMember) {
                        throw new IllegalArgumentException(
                                        "프로젝트의 ACTIVE 멤버만 업무를 조회할 수 있습니다.");
                }

                /*
                 * 6. 해당 프로젝트의 모든 업무 조회
                 *
                 * 대단원과 소단원을 모두 가져온다.
                 *
                 * taskId 오름차순으로 반환한다.
                 *
                 * 프로젝트별 업무 계층 구조는
                 * 이후 프론트엔드 또는 Service에서
                 * parentTaskId를 기준으로 표현할 수 있다.
                 */
                return taskRepository
                                .findByProjectIdOrderByTaskIdAsc(projectId);
        }

        /*
         * 특정 프로젝트의 업무 하나를 상세 조회한다.
         *
         * projectId : URL에서 전달받은 프로젝트 ID
         * taskId : 조회하려는 업무 ID
         *
         * 조회 권한:
         * 해당 프로젝트의 ACTIVE 멤버라면
         * 업무 담당자가 아니어도 조회할 수 있다.
         *
         * 검증 순서:
         * 1. 프로젝트 존재 및 삭제 여부
         * 2. 현재 사용자의 ACTIVE 참여 여부
         * 3. 업무 존재 여부
         * 4. 업무가 요청한 프로젝트에 속하는지
         */
        @Transactional(readOnly = true)
        public ProjectTask getTask(
                        Long projectId,
                        Long taskId) {

                // 1. 입력값 확인
                if (projectId == null || taskId == null) {
                        throw new IllegalArgumentException(
                                        "프로젝트 ID와 업무 ID가 필요합니다.");
                }

                // 2. 프로젝트 확인
                Project project = projectRepository.findById(projectId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "존재하지 않는 프로젝트입니다."));

                if ("DELETED".equals(project.getStatus())) {
                        throw new IllegalArgumentException(
                                        "삭제된 프로젝트의 업무는 조회할 수 없습니다.");
                }

                /*
                 * 3. 현재 사용자 확인
                 *
                 * ASSIGNEE_ID를 확인하는 것이 아니라
                 * PROJECT_MEMBER의 ACTIVE 상태를 확인한다.
                 */
                Long currentUserId = currentUserService.getCurrentUserId();

                boolean isActiveMember = projectMemberRepository
                                .existsByProjectIdAndUserIdAndMemberStatus(
                                                projectId,
                                                currentUserId,
                                                "ACTIVE");

                if (!isActiveMember) {
                        throw new IllegalArgumentException(
                                        "프로젝트의 ACTIVE 멤버만 업무를 조회할 수 있습니다.");
                }

                // 4. 업무 존재 여부 확인
                ProjectTask task = taskRepository.findById(taskId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "존재하지 않는 업무입니다."));

                /*
                 * 5. 프로젝트 소속 검증
                 *
                 * 다른 프로젝트의 업무 ID를 넣어서
                 * 조회하는 것을 방지한다.
                 */
                if (!projectId.equals(task.getProjectId())) {
                        throw new IllegalArgumentException(
                                        "해당 프로젝트에 속한 업무가 아닙니다.");
                }

                // 6. 검증된 업무 반환
                return task;
        }

        /*
         * 기존 업무의 제목과 내용을 수정한다.
         *
         * 수정 대상:
         * - TASK_TITLE
         * - TASK_CONTENT
         * - UPDATED_AT
         *
         * 수정 권한:
         * - ACTIVE LEADER: 모든 업무
         * - ACTIVE VICE_LEADER: 모든 업무
         * - ACTIVE MEMBER: 본인 담당 업무만
         *
         * assigneeId는 업무 담당자를 의미하며,
         * 업무 생성자를 의미하지 않는다.
         *
         * 담당자 변경은 별도의 API에서 처리한다.
         */
        @Transactional
        public ProjectTask updateTask(
                        Long projectId,
                        Long taskId,
                        TaskUpdateRequest request) {

                // 1. 요청 데이터 검증
                if (projectId == null || taskId == null) {
                        throw new IllegalArgumentException(
                                        "프로젝트 ID와 업무 ID가 필요합니다.");
                }

                if (request == null) {
                        throw new IllegalArgumentException(
                                        "업무 수정 요청이 비어 있습니다.");
                }

                // 2. 프로젝트 존재 여부 확인
                Project project = projectRepository.findById(projectId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "존재하지 않는 프로젝트입니다."));

                // 삭제된 프로젝트는 수정할 수 없다.
                if ("DELETED".equals(project.getStatus())) {
                        throw new IllegalArgumentException(
                                        "삭제된 프로젝트의 업무는 수정할 수 없습니다.");
                }

                /*
                 * 3. 현재 사용자 확인
                 *
                 * CurrentUserService에서 사용자 ID를 가져온다.
                 * 개발용 USER_ID를 이곳에 하드코딩하지 않는다.
                 */
                Long currentUserId = currentUserService.getCurrentUserId();

                /*
                 * 4. 현재 사용자의 프로젝트 참여 정보 조회
                 *
                 * ACTIVE 상태인 멤버만 조회한다.
                 *
                 * 단순 참여 여부뿐 아니라 position도
                 * 확인해야 하므로 ProjectMember 객체를 가져온다.
                 */
                ProjectMember member = projectMemberRepository
                                .findByProjectIdAndUserIdAndMemberStatus(
                                                projectId,
                                                currentUserId,
                                                "ACTIVE")
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "프로젝트의 ACTIVE 멤버만 업무를 수정할 수 있습니다."));

                /*
                 * 5. 수정 대상 업무를 비관적 쓰기 잠금으로 조회한다.
                 *
                 * findByIdForUpdate()는 Oracle의 해당 업무 행에
                 * 쓰기 잠금을 요청한다.
                 *
                 * 담당자 변경이나 claim 요청과 충돌할 경우
                 * 잠금이 해제될 때까지 기다릴 수 있다.
                 *
                 * 잠금을 획득한 이후의 담당자 정보를 기준으로
                 * 업무 수정 권한을 검사한다.
                 *
                 * @Transactional 범위에서 잠금이 유지되고,
                 * 트랜잭션이 종료되면 잠금이 해제된다.
                 */
                ProjectTask task = taskRepository.findByIdForUpdate(taskId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "존재하지 않는 업무입니다."));

                /*
                 * 6. 업무가 요청한 프로젝트에 속하는지 확인
                 *
                 * 다른 프로젝트의 taskId를 이용해
                 * 업무를 수정하는 것을 방지한다.
                 */
                if (!projectId.equals(task.getProjectId())) {
                        throw new IllegalArgumentException(
                                        "해당 프로젝트에 속한 업무가 아닙니다.");
                }

                /*
                 * 7. 업무 수정 권한 판단
                 *
                 * LEADER, VICE_LEADER는 모든 업무 수정 가능.
                 *
                 * 일반 MEMBER는 현재 업무의 담당자가
                 * 자기 자신일 때만 수정할 수 있다.
                 */
                String position = member.getPosition();

                boolean isManager = "LEADER".equals(position)
                                || "VICE_LEADER".equals(position);

                boolean isAssignee = currentUserId.equals(task.getAssigneeId());

                if (!isManager && !isAssignee) {
                        throw new IllegalArgumentException(
                                        "본인이 담당한 업무만 수정할 수 있습니다.");
                }

                /*
                 * 8. 업무 제목 검증
                 *
                 * TASK_TITLE은 NOT NULL,
                 * VARCHAR2(200)이다.
                 */
                String taskTitle = request.getTaskTitle();

                if (taskTitle == null || taskTitle.isBlank()) {
                        throw new IllegalArgumentException(
                                        "업무 제목은 반드시 입력해야 합니다.");
                }

                taskTitle = taskTitle.trim();

                if (taskTitle.length() > 200) {
                        throw new IllegalArgumentException(
                                        "업무 제목은 200자 이하로 입력해야 합니다.");
                }

                /*
                 * 9. 수정 가능한 값만 변경
                 *
                 * TASK_TITLE, TASK_CONTENT만 수정한다.
                 *
                 * 담당자, 부모 업무, 진행률, 상태는
                 * 이 메서드에서 변경하지 않는다.
                 */
                task.setTaskTitle(taskTitle);
                task.setTaskContent(request.getTaskContent());

                /*
                 * 10. 수정 시각 갱신
                 *
                 * Oracle UPDATED_AT 컬럼에
                 * 현재 서버 시간을 저장한다.
                 */
                task.setUpdatedAt(
                                java.time.LocalDateTime.now());

                /*
                 * 11. 변경 사항 저장
                 *
                 * JPA가 UPDATE SQL을 실행한다.
                 *
                 * saveAndFlush()로 변경 내용을 DB에 반영한 뒤
                 * refresh()로 실제 저장된 값을 다시 가져온다.
                 *
                 * @Transactional 범위에서 실행되므로
                 * 작업 실패 시 롤백된다.
                 */
                ProjectTask savedTask = taskRepository.saveAndFlush(task);

                entityManager.refresh(savedTask);

                return savedTask;
        }

        /*
         * 업무 담당자를 변경하거나 미배정(NULL)으로 변경한다.
         *
         * PATCH /api/projects/{projectId}/tasks/{taskId}/assignee
         *
         * 담당자 변경 권한:
         * - ACTIVE LEADER: 모든 업무
         * - ACTIVE VICE_LEADER: 모든 업무
         * - ACTIVE MEMBER: 본인이 현재 담당한 업무만
         *
         * 새로운 담당자는 같은 프로젝트의 ACTIVE 멤버여야 한다.
         *
         * assigneeId가 NULL이면 업무를 미배정 상태로 변경한다.
         *
         * 미배정 업무를 일반 MEMBER가 스스로 가져오는 기능은
         * 별도의 claim API에서 처리한다.
         */
        @Transactional
        public ProjectTask updateTaskAssignee(
                        Long projectId,
                        Long taskId,
                        TaskAssigneeUpdateRequest request) {

                // 1. 요청 데이터 검증
                if (projectId == null || taskId == null) {
                        throw new IllegalArgumentException(
                                        "프로젝트 ID와 업무 ID가 필요합니다.");
                }

                if (request == null) {
                        throw new IllegalArgumentException(
                                        "담당자 변경 요청이 비어 있습니다.");
                }

                /*
                 * 2. 프로젝트 존재 여부 및 삭제 상태 확인.
                 *
                 * DELETED 프로젝트에서는 담당자를 변경할 수 없다.
                 */
                Project project = projectRepository.findById(projectId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "존재하지 않는 프로젝트입니다."));

                if ("DELETED".equals(project.getStatus())) {
                        throw new IllegalArgumentException(
                                        "삭제된 프로젝트의 담당자는 변경할 수 없습니다.");
                }

                /*
                 * 3. 현재 사용자의 ACTIVE 프로젝트 멤버 정보 조회.
                 *
                 * memberStatus는 참여 권한,
                 * position은 관리 권한 판단에 사용한다.
                 */
                Long currentUserId = currentUserService.getCurrentUserId();

                ProjectMember member = projectMemberRepository
                                .findByProjectIdAndUserIdAndMemberStatus(
                                                projectId,
                                                currentUserId,
                                                "ACTIVE")
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "프로젝트의 ACTIVE 멤버만 담당자를 변경할 수 있습니다."));

                /*
                 * 4. 업무 존재 여부 및 프로젝트 소속 확인.
                 *
                 * findByIdForUpdate()로 업무 행에 비관적 쓰기 잠금을 요청한다.
                 *
                 * 다른 트랜잭션이 같은 업무를 수정 중이면
                 * 해당 트랜잭션이 종료될 때까지 기다릴 수 있다.
                 *
                 * 잠금 획득 후 현재 담당자 정보를 기준으로
                 * 담당자 변경 권한을 검사한다.
                 *
                 * @Transactional 범위에서 잠금이 유지된다.
                 */
                ProjectTask task = taskRepository.findByIdForUpdate(taskId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "존재하지 않는 업무입니다."));

                /*
                 * 5. 업무가 요청한 프로젝트에 속하는지 확인.
                 *
                 * URL에 다른 프로젝트의 업무 ID를 입력해서
                 * 담당자를 변경하는 것을 방지한다.
                 */
                if (!projectId.equals(task.getProjectId())) {
                        throw new IllegalArgumentException(
                                        "해당 프로젝트에 속한 업무가 아닙니다.");
                }

                /*
                 * 6. 담당자 변경 권한 확인.
                 *
                 * LEADER / VICE_LEADER는 모든 업무의 담당자를 변경할 수 있다.
                 *
                 * 일반 MEMBER는 현재 업무 담당자가
                 * 자기 자신일 때만 담당자를 변경할 수 있다.
                 *
                 * 담당자가 NULL인 업무를 일반 MEMBER가 가져오려면
                 * 별도의 claim API를 사용해야 한다.
                 */
                String position = member.getPosition();

                boolean isManager = "LEADER".equals(position)
                                || "VICE_LEADER".equals(position);

                boolean isCurrentAssignee = currentUserId.equals(task.getAssigneeId());

                if (!isManager && !isCurrentAssignee) {
                        throw new IllegalArgumentException(
                                        "본인이 담당한 업무만 담당자를 변경할 수 있습니다.");
                }

                /*
                 * 7. 새로운 담당자 확인.
                 *
                 * assigneeId가 NULL이면 미배정으로 변경하므로
                 * 새 담당자의 ACTIVE 여부 검증은 생략한다.
                 *
                 * 값이 있다면 반드시 같은 프로젝트의
                 * ACTIVE 멤버여야 한다.
                 */
                Long newAssigneeId = request.getAssigneeId();

                if (newAssigneeId != null) {

                        boolean isActiveAssignee = projectMemberRepository
                                        .existsByProjectIdAndUserIdAndMemberStatus(
                                                        projectId,
                                                        newAssigneeId,
                                                        "ACTIVE");

                        if (!isActiveAssignee) {
                                throw new IllegalArgumentException(
                                                "새 담당자는 해당 프로젝트의 ACTIVE 멤버여야 합니다.");
                        }
                }

                /*
                 * 7. 기존 담당자와 새로운 담당자가 같으면 차단.
                 *
                 * 불필요하게 UPDATED_AT이 변경되거나
                 * 중복 UPDATE가 발생하는 것을 방지한다.
                 */
                if (java.util.Objects.equals(
                                task.getAssigneeId(), newAssigneeId)) {

                        throw new IllegalArgumentException(
                                        "이미 지정된 담당자입니다.");
                }

                /*
                 * 8. 담당자 변경.
                 *
                 * TASK_TITLE, TASK_CONTENT, PARENT_TASK_ID,
                 * TASK_STATUS, PROGRESS는 변경하지 않는다.
                 *
                 * MEMBER가 자신에서 다른 사용자 또는 NULL로
                 * 변경하면 이후 기존 담당자의 수정 권한은 사라진다.
                 */
                task.setAssigneeId(newAssigneeId);

                // 9. 최종 수정 시각 갱신
                task.setUpdatedAt(
                                java.time.LocalDateTime.now());

                /*
                 * 10. 변경 사항 저장.
                 *
                 * saveAndFlush()로 UPDATE SQL을 반영하고,
                 * refresh()로 Oracle에 저장된 값을 다시 읽는다.
                 *
                 * @Transactional 범위에서 처리되므로
                 * 실패 시 전체 변경이 롤백된다.
                 */
                ProjectTask savedTask = taskRepository.saveAndFlush(task);

                entityManager.refresh(savedTask);

                return savedTask;
        }

        /*
         * 미배정 업무를 현재 사용자가 직접 가져온다.
         *
         * POST /api/projects/{projectId}/tasks/{taskId}/claim
         *
         * 요청 Body는 필요하지 않다.
         * 담당자로 지정할 USER_ID는
         * CurrentUserService에서 가져온다.
         *
         * 실행 조건:
         * - 프로젝트가 존재하고 DELETED가 아닐 것
         * - 현재 사용자가 프로젝트의 ACTIVE 멤버일 것
         * - 업무가 존재하고 해당 프로젝트에 속할 것
         * - 업무의 ASSIGNEE_ID가 NULL일 것
         *
         * 실제 배정은 Repository의 조건부 UPDATE를 통해
         * 동시에 여러 요청이 들어오는 상황도 처리한다.
         */
        @Transactional
        public ProjectTask claimTask(Long projectId, Long taskId) {

                // 1. 요청 ID 검증
                if (projectId == null || taskId == null) {
                        throw new IllegalArgumentException(
                                        "프로젝트 ID와 업무 ID가 필요합니다.");
                }

                // 2. 프로젝트 존재 및 삭제 여부 확인
                Project project = projectRepository.findById(projectId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "존재하지 않는 프로젝트입니다."));

                if ("DELETED".equals(project.getStatus())) {
                        throw new IllegalArgumentException(
                                        "삭제된 프로젝트의 업무는 담당할 수 없습니다.");
                }

                /*
                 * 3. 현재 사용자 확인.
                 *
                 * 개발 단계에서는 CurrentUserService가
                 * 설정된 USER_ID를 반환한다.
                 */
                Long currentUserId = currentUserService.getCurrentUserId();

                /*
                 * 4. 프로젝트 ACTIVE 멤버 여부 확인.
                 *
                 * LEADER, VICE_LEADER, MEMBER 모두
                 * ACTIVE 상태라면 미배정 업무를 가져올 수 있다.
                 */
                boolean isActiveMember = projectMemberRepository
                                .existsByProjectIdAndUserIdAndMemberStatus(
                                                projectId,
                                                currentUserId,
                                                "ACTIVE");

                if (!isActiveMember) {
                        throw new IllegalArgumentException(
                                        "프로젝트의 ACTIVE 멤버만 업무를 담당할 수 있습니다.");
                }

                /*
                 * 5. 업무 존재 여부 및 프로젝트 소속 확인.
                 *
                 * findByIdForUpdate()를 사용하여
                 * Oracle PROJECT_TASK의 해당 업무 행에
                 * 비관적 쓰기 잠금을 요청한다.
                 *
                 * 다른 트랜잭션이 같은 업무를 수정 중이라면
                 * 잠금이 해제될 때까지 기다릴 수 있다.
                 *
                 * 잠금을 획득한 뒤 업무의 프로젝트 소속을 확인한다.
                 *
                 * 담당자가 현재 NULL인지 여부는
                 * 이후 Repository의 조건부 UPDATE에서 검사한다.
                 *
                 * @Transactional 범위에서 잠금이 유지된다.
                 */
                ProjectTask task = taskRepository.findByIdForUpdate(taskId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "존재하지 않는 업무입니다."));

                /*
                 * 요청한 프로젝트에 속한 업무인지 확인한다.
                 *
                 * 다른 프로젝트의 업무를 가져오지 못하도록 차단한다.
                 */
                if (!projectId.equals(task.getProjectId())) {
                        throw new IllegalArgumentException(
                                        "해당 프로젝트에 속한 업무가 아닙니다.");
                }

                /*
                 * 6. 미배정 업무 조건부 UPDATE.
                 *
                 * Repository가 다음 조건으로 수정한다.
                 *
                 * TASK_ID = 요청 업무
                 * PROJECT_ID = 요청 프로젝트
                 * ASSIGNEE_ID IS NULL
                 *
                 * 변경된 행 수가 1이면 성공,
                 * 0이면 이미 다른 담당자가 존재한다.
                 */
                int updatedRows = taskRepository.claimUnassignedTask(
                                projectId,
                                taskId,
                                currentUserId);

                if (updatedRows != 1) {
                        throw new IllegalArgumentException(
                                        "이미 담당자가 지정된 업무입니다.");
                }

                /*
                 * 7. 조건부 UPDATE 후 DB의 실제 값을 다시 조회.
                 *
                 * @Modifying의 UPDATE는 JPA 영속성 컨텍스트의
                 * 기존 Entity 값을 자동 갱신하지 않는다.
                 *
                 * 따라서 refresh()로 Oracle에 저장된
                 * ASSIGNEE_ID, UPDATED_AT을 다시 읽는다.
                 */
                entityManager.refresh(task);

                return task;
        }

        /*
         * 기존 업무를 실제 DELETE 방식으로 삭제한다.
         *
         * DELETE /api/projects/{projectId}/tasks/{taskId}
         *
         * 삭제 권한:
         * - ACTIVE LEADER: 모든 업무 삭제 가능
         * - ACTIVE VICE_LEADER: 모든 업무 삭제 가능
         * - ACTIVE MEMBER: 본인이 담당한 업무만 삭제 가능
         *
         * 삭제 규칙:
         * - 소단원은 실제 DELETE
         * - 자식이 없는 대단원은 실제 DELETE
         * - 자식이 남아 있는 대단원은 삭제 차단
         * - 삭제 차단 시 남은 소단원 ID와 제목을 전달
         *
         * PROJECT_TASK에 삭제 상태 컬럼이 없으므로
         * soft delete가 아닌 실제 DELETE를 수행한다.
         */
        @Transactional
        public void deleteTask(Long projectId, Long taskId) {

                // 1. 요청 ID 검증
                if (projectId == null || taskId == null) {
                        throw new IllegalArgumentException(
                                        "프로젝트 ID와 업무 ID가 필요합니다.");
                }

                /*
                 * 2. 프로젝트 존재 여부 및 삭제 상태 확인.
                 *
                 * DELETED 프로젝트에 속한 업무는
                 * 삭제할 수 없다.
                 */
                Project project = projectRepository.findById(projectId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "존재하지 않는 프로젝트입니다."));

                if ("DELETED".equals(project.getStatus())) {
                        throw new IllegalArgumentException(
                                        "삭제된 프로젝트의 업무는 삭제할 수 없습니다.");
                }

                /*
                 * 3. 현재 사용자의 ACTIVE 프로젝트 참여 정보 확인.
                 *
                 * memberStatus는 참여 여부,
                 * position은 삭제 권한을 판단하는 데 사용한다.
                 */
                Long currentUserId = currentUserService.getCurrentUserId();

                ProjectMember member = projectMemberRepository
                                .findByProjectIdAndUserIdAndMemberStatus(
                                                projectId,
                                                currentUserId,
                                                "ACTIVE")
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "프로젝트의 ACTIVE 멤버만 업무를 삭제할 수 있습니다."));

                /*
                 * 4. 삭제 대상 업무를 비관적 쓰기 잠금으로 조회.
                 *
                 * 다른 요청이 같은 업무를 수정 중이라면
                 * 해당 트랜잭션이 종료될 때까지 기다릴 수 있다.
                 *
                 * 잠금을 획득한 뒤 현재 담당자를 확인하고
                 * 삭제 권한을 검증한다.
                 */
                ProjectTask task = taskRepository.findByIdForUpdate(taskId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "존재하지 않는 업무입니다."));

                /*
                 * 5. 삭제 대상 업무의 프로젝트 소속 확인.
                 *
                 * 다른 프로젝트의 업무를 잘못 삭제하는 것을 막는다.
                 */
                if (!projectId.equals(task.getProjectId())) {
                        throw new IllegalArgumentException(
                                        "해당 프로젝트에 속한 업무가 아닙니다.");
                }

                /*
                 * 6. 업무 삭제 권한 확인.
                 *
                 * LEADER / VICE_LEADER는 모든 업무를 삭제할 수 있다.
                 *
                 * MEMBER는 현재 담당자가 본인인 경우에만
                 * 업무를 삭제할 수 있다.
                 */
                String position = member.getPosition();

                boolean isManager = "LEADER".equals(position)
                                || "VICE_LEADER".equals(position);

                boolean isAssignee = currentUserId.equals(task.getAssigneeId());

                if (!isManager && !isAssignee) {
                        throw new IllegalArgumentException(
                                        "본인이 담당한 업무만 삭제할 수 있습니다.");
                }

                /*
                 * 7. 삭제 대상 업무 아래 남아 있는 소단원 조회.
                 *
                 * 소단원에는 자식이 없어야 한다는 기존 구조를
                 * 따르므로, 일반적으로 소단원 삭제 시 빈 목록이다.
                 *
                 * 대단원에 소단원이 존재한다면
                 * 실제 DELETE를 실행하지 않고 차단한다.
                 */
                List<ProjectTask> children = taskRepository
                                .findByProjectIdAndParentTaskIdOrderByTaskIdAsc(
                                                projectId,
                                                taskId);

                if (!children.isEmpty()) {

                        /*
                         * Entity 전체가 아니라
                         * 화면에 필요한 taskId와 taskTitle만 추출한다.
                         */
                        List<TaskDeletionBlockedException.RemainingTask> remainingTasks = children.stream()
                                        .map(child -> new TaskDeletionBlockedException.RemainingTask(
                                                        child.getTaskId(),
                                                        child.getTaskTitle()))
                                        .toList();

                        /*
                         * GlobalExceptionHandler에서 HTTP 409와
                         * remainingTasks 목록을 반환할 예정이다.
                         *
                         * RuntimeException이므로
                         * 현재 트랜잭션은 롤백된다.
                         */
                        throw new TaskDeletionBlockedException(
                                        "소단원이 남아 있어 대단원을 삭제할 수 없습니다.",
                                        remainingTasks);
                }

                /*
                 * 8. 자식 업무가 없다면 실제 DELETE.
                 *
                 * Oracle PROJECT_TASK에서 해당 행을 삭제한다.
                 *
                 * flush()로 DELETE SQL을 DB에 반영한다.
                 * 트랜잭션이 정상 종료되면 COMMIT된다.
                 *
                 * 다른 트랜잭션에서 새로운 소단원을 생성하는 경우
                 * 외래키 제약조건 때문에 삭제가 실패할 수 있으며,
                 * 그 상황은 추후 별도 오류 처리로 점검한다.
                 */
                taskRepository.delete(task);
                taskRepository.flush();
        }

}
