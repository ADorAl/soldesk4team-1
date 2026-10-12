package com.teamplace.backend.service;

import com.teamplace.backend.entity.Project;
import com.teamplace.backend.entity.ProjectMember;
import com.teamplace.backend.repository.ProjectMemberRepository;
import com.teamplace.backend.repository.ProjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.teamplace.backend.repository.UserRepository;

import java.time.LocalDateTime;

import java.util.List;

import java.util.Optional;

/*
 * 프로젝트 관련 핵심 비즈니스 로직을 담당하는 Service.
 *
 * Controller에서 프로젝트 생성 요청을 받으면
 * 실제 DB 저장 규칙을 여기에서 처리한다.
 *
 *
 * 프로젝트 생성 흐름:
 *
 * React
 *     ↓
 * ProjectController
 *     ↓
 * ProjectCreateRequest DTO
 *     ↓
 * ProjectService
 *     ↓
 * CurrentUserService
 *     ↓
 * 현재 사용자 확인
 *
 * ProjectService
 *     ↓
 * PROJECT 저장
 *     ↓
 * PROJECT_MEMBER에 생성자를
 * LEADER + ACTIVE로 저장
 */
@Service
public class ProjectService {

        private final ProjectRepository projectRepository;

        private final ProjectMemberRepository projectMemberRepository;

        private final CurrentUserService currentUserService;

        private final UserRepository userRepository;

        /*
         * ProjectService에서 필요한 객체들을
         * Spring이 생성자를 통해 넣어준다.
         *
         * projectRepository
         * → PROJECT 테이블 저장/조회에 사용
         *
         * projectMemberRepository
         * → PROJECT_MEMBER 테이블 저장/조회에 사용
         *
         * currentUserService
         * → 현재 요청을 수행하는 사용자의 ID를 얻는 데 사용
         * 
         * * userRepository
         * → 초대하려는 사용자가 실제 USERS 테이블에 존재하는지 확인하는 데 사용
         */
        public ProjectService(
                        ProjectRepository projectRepository,
                        ProjectMemberRepository projectMemberRepository,
                        CurrentUserService currentUserService,
                        UserRepository userRepository) {

                this.projectRepository = projectRepository;
                this.projectMemberRepository = projectMemberRepository;
                this.currentUserService = currentUserService;
                this.userRepository = userRepository;
        }

        /*
         * 새로운 프로젝트를 생성한다.
         *
         * ProjectController에서 ProjectCreateRequest DTO로 받은
         * 프로젝트 이름, 설명, 크롤링 키워드를
         * 이 메서드의 매개변수로 전달한다.
         *
         * 프로젝트 생성 시
         * 현재 사용자를 PROJECT.owner_id로 지정하고,
         * 같은 사용자를 PROJECT_MEMBER에도
         * LEADER + ACTIVE 상태로 함께 등록한다.
         *
         * @Transactional을 사용하므로
         * PROJECT 저장과 PROJECT_MEMBER 저장 중
         * 하나라도 실패하면 전체 작업이 롤백된다.
         */
        @Transactional
        public Project createProject(
                        String projectName,
                        String description,
                        String crawlKeyword) {

                /*
                 * 프로젝트 이름은 DB에서 NOT NULL이지만,
                 * 단순히 DB 오류에 맡기지 않고
                 * Service에서 먼저 의미 있는 검증을 수행한다.
                 *
                 * null뿐 아니라
                 * "" 또는 "   " 같은 공백만 입력된 경우도 막는다.
                 *
                 * 검증에 실패하면 예외가 발생하므로
                 * 아래의 PROJECT / PROJECT_MEMBER 저장까지 진행되지 않는다.
                 */
                if (projectName == null || projectName.isBlank()) {
                        throw new IllegalArgumentException(
                                        "프로젝트 이름은 반드시 입력해야 합니다.");
                }

                /*
                 * PROJECT.project_name은 DB에서 VARCHAR2(100)이므로
                 * 프로젝트 이름은 최대 100자까지만 허용한다.
                 *
                 * DB에 INSERT를 시도한 뒤 Oracle 오류를 받는 것보다
                 * Service에서 먼저 잘못된 입력을 차단하는 편이
                 * 사용자에게 명확한 오류를 전달하기 쉽다.
                 */
                if (projectName.length() > 100) {
                        throw new IllegalArgumentException(
                                        "프로젝트 이름은 100자 이하로 입력해야 합니다.");
                }

                /*
                 * 현재 사용자의 ID를 가져온다.
                 *
                 * 다른 Service에서 1L을 직접 사용하지 않고
                 * CurrentUserService를 통해 가져오는 것이 핵심이다.
                 *
                 * 현재 개발 단계에서는 USER_ID = 1이 반환되지만,
                 * 나중에 로그인 기능이 생기면 실제 로그인 사용자 ID가
                 * 반환되도록 CurrentUserService 내부만 변경할 예정이다.
                 */
                Long currentUserId = currentUserService.getCurrentUserId();

                /*
                 * 1. PROJECT에 저장할 객체 생성
                 *
                 * 사용자가 입력한 값:
                 * - projectName
                 * - description
                 * - crawlKeyword
                 *
                 * 서버가 결정하는 값:
                 * - ownerId
                 * - status
                 *
                 * ownerId에는 현재 사용자를 넣는다.
                 * 즉 프로젝트를 만든 사람이 PROJECT.owner_id가 된다.
                 */
                Project project = new Project();

                project.setProjectName(projectName);
                project.setDescription(description);
                project.setOwnerId(currentUserId);
                project.setCrawlKeyword(crawlKeyword);

                /*
                 * DB에서 PROJECT.status에 허용되는 값은
                 *
                 * ACTIVE
                 * COMPLETED
                 * DELETED
                 *
                 * 새 프로젝트는 생성 직후 사용 가능한 상태이므로
                 * ACTIVE로 시작한다.
                 */
                project.setStatus("ACTIVE");

                /*
                 * 2. PROJECT 저장
                 *
                 * save()가 실행되면서 PROJECT 테이블에
                 * 새로운 프로젝트가 저장된다.
                 *
                 * 저장 과정에서 SEQ_PROJECT를 통해
                 * 새 PROJECT_ID가 만들어지고,
                 * 저장이 끝난 savedProject 객체에서
                 * 그 PROJECT_ID를 사용할 수 있다.
                 */
                Project savedProject = projectRepository.save(project);

                /*
                 * 3. 프로젝트 생성자를
                 * PROJECT_MEMBER에도 등록한다.
                 *
                 * 프로젝트 생성자는 누군가에게 초대된 것이 아니므로
                 * invitedBy = null 이다.
                 *
                 * 또한 프로젝트를 만든 순간부터
                 * 프로젝트의 팀장으로 참여 중이므로
                 *
                 * position = LEADER
                 * memberStatus = ACTIVE
                 *
                 * 로 저장한다.
                 */
                ProjectMember leader = new ProjectMember();

                /*
                 * 방금 PROJECT 테이블에 저장된 프로젝트의 ID를
                 * PROJECT_MEMBER.project_id에 연결한다.
                 */
                leader.setProjectId(
                                savedProject.getProjectId());

                /*
                 * 현재 사용자가 프로젝트 생성자이자
                 * 최초 프로젝트 멤버가 된다.
                 */
                leader.setUserId(currentUserId);

                leader.setPosition("LEADER");

                leader.setMemberStatus("ACTIVE");

                /*
                 * 프로젝트 생성자는 초대받아서 들어온 사용자가 아니므로
                 * 초대한 사용자 ID는 존재하지 않는다.
                 */
                leader.setInvitedBy(null);

                /*
                 * PROJECT_MEMBER.joined_at에는
                 * DB 기본값이 없으므로
                 * 실제 프로젝트에 참여한 시각을 Service에서 기록한다.
                 *
                 * 프로젝트 생성자는 생성과 동시에 참여하므로
                 * 현재 시간을 저장한다.
                 */
                leader.setJoinedAt(
                                LocalDateTime.now());

                /*
                 * 4. PROJECT_MEMBER 저장
                 *
                 * 이 저장까지 성공해야
                 *
                 * PROJECT
                 * +
                 * PROJECT_MEMBER의 LEADER
                 *
                 * 구성이 완성된다.
                 *
                 * 여기서 오류가 발생하면 @Transactional에 의해
                 * 앞서 저장한 PROJECT도 함께 롤백된다.
                 */
                projectMemberRepository.save(leader);

                /*
                 * 생성된 프로젝트 정보를 Controller에 반환한다.
                 *
                 * Controller는 이 값을 HTTP 응답으로 전달한다.
                 */
                return savedProject;
        }

        /*
         * 현재 사용자가 ACTIVE 상태로 참여 중인
         * 프로젝트 목록을 조회한다.
         *
         * 여기서 중요한 점은
         * PROJECT.owner_id를 기준으로 조회하지 않는다는 것이다.
         *
         * owner_id만 사용하면
         * 사용자가 직접 만든 프로젝트만 조회되고,
         * 다른 사람에게 초대받아 참여 중인 프로젝트는
         * 목록에서 빠질 수 있다.
         *
         * 따라서 PROJECT_MEMBER를 기준으로
         *
         * - 현재 사용자 ID인지
         * - member_status가 ACTIVE인지
         *
         * 확인한 뒤 해당 프로젝트들을 조회한다.
         *
         *
         * 데이터 흐름:
         *
         * ProjectController
         * ↓
         * ProjectService
         * ↓
         * CurrentUserService
         * ↓
         * 현재 USER_ID
         * ↓
         * ProjectRepository
         * ↓
         * PROJECT_MEMBER 참여 상태 확인
         * ↓
         * PROJECT 목록 조회
         */
        @Transactional(readOnly = true)
        public List<Project> getMyProjects() {

                /*
                 * 현재 사용자의 ID를 가져온다.
                 *
                 * 프로젝트 생성과 마찬가지로
                 * 다른 코드에서 1L을 직접 사용하지 않고
                 * CurrentUserService를 통해 가져온다.
                 */
                Long currentUserId = currentUserService.getCurrentUserId();

                /*
                 * 현재 사용자가 ACTIVE 멤버로 참여 중인
                 * 프로젝트 목록을 조회한다.
                 *
                 * Repository에서
                 * PROJECT.status = DELETED인 프로젝트는 제외한다.
                 */
                return projectRepository.findActiveProjectsByUserId(
                                currentUserId);
        }

        /*
         * 특정 프로젝트 하나를 상세 조회한다.
         *
         * 현재 단계에서는 먼저 PROJECT 자체가
         * 존재하는지 조회한다.
         *
         * 다음 단계에서 PROJECT_MEMBER를 기준으로
         * 현재 사용자의 ACTIVE 참여 여부를 확인하는
         * 조회 권한 검증을 추가할 예정이다.
         */
        /*
         * 특정 프로젝트 하나를 상세 조회한다.
         *
         * 프로젝트 ID가 존재한다고 해서
         * 모든 사용자가 해당 프로젝트를 조회할 수 있는 것은 아니다.
         *
         * 따라서 다음 두 가지를 확인한다.
         *
         * 1. 프로젝트가 실제로 존재하는가?
         * 2. 현재 사용자가 해당 프로젝트의 ACTIVE 멤버인가?
         *
         *
         * 조회 권한 기준:
         *
         * PROJECT_MEMBER.project_id
         * PROJECT_MEMBER.user_id
         * PROJECT_MEMBER.member_status = ACTIVE
         *
         *
         * 중요한 점:
         *
         * 여기서는 "조회 권한"만 확인한다.
         *
         * 프로젝트 수정 권한은 나중에
         * PROJECT_MEMBER.position까지 확인하여
         * 별도의 규칙으로 처리한다.
         *
         * 즉:
         *
         * 조회 권한 ≠ 수정 권한
         *
         *
         * 데이터 흐름:
         *
         * ProjectController
         * ↓
         * ProjectService
         * ↓
         * CurrentUserService
         * ↓
         * 현재 USER_ID
         * ↓
         * ProjectRepository
         * ↓
         * 프로젝트 존재 여부 확인
         * ↓
         * ProjectMemberRepository
         * ↓
         * ACTIVE 멤버 여부 확인
         * ↓
         * 조회 허용 또는 차단
         */
        @Transactional(readOnly = true)
        public Project getProject(Long projectId) {

                /*
                 * 현재 요청을 수행하는 사용자의 ID를 가져온다.
                 *
                 * 현재 개발 단계에서는 USER_ID = 1을 사용하지만,
                 * 나중에는 실제 로그인 사용자 ID가 들어오게 된다.
                 */
                Long currentUserId = currentUserService.getCurrentUserId();

                /*
                 * 먼저 해당 PROJECT가 실제로 존재하는지 확인한다.
                 *
                 * 존재하지 않는 프로젝트라면
                 * 권한 검사를 계속할 필요가 없으므로
                 * 바로 예외를 발생시킨다.
                 */
                Project project = projectRepository.findById(projectId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "존재하지 않는 프로젝트입니다."));

                /*
                 * soft delete 된 프로젝트는
                 * 일반 상세 조회에서 보여주지 않는다.
                 *
                 * PROJECT 행 자체는 기록 보존을 위해 남아 있지만,
                 * status = DELETED인 프로젝트는
                 * 사용자에게 정상 프로젝트처럼 노출되면 안 된다.
                 */
                if ("DELETED".equals(project.getStatus())) {
                        throw new IllegalArgumentException(
                                        "삭제된 프로젝트입니다.");
                }

                /*
                 * 현재 사용자가 이 프로젝트의 ACTIVE 멤버인지 확인한다.
                 *
                 * PROJECT_MEMBER에서
                 *
                 * project_id = 조회하려는 프로젝트
                 * user_id = 현재 사용자
                 * member_status = ACTIVE
                 *
                 * 조건을 모두 만족하는 행이 있으면 true,
                 * 없으면 false가 반환된다.
                 */
                boolean activeMember = projectMemberRepository
                                .existsByProjectIdAndUserIdAndMemberStatus(
                                                projectId,
                                                currentUserId,
                                                "ACTIVE");

                /*
                 * ACTIVE 멤버가 아니라면
                 * 프로젝트의 상세 내용을 조회할 수 없도록 차단한다.
                 *
                 * PENDING
                 * REJECTED
                 * LEFT
                 *
                 * 상태의 사용자는 모두 현재 참여 중인 사용자가 아니므로
                 * 상세 조회를 허용하지 않는다.
                 */
                if (!activeMember) {
                        throw new IllegalArgumentException(
                                        "이 프로젝트를 조회할 권한이 없습니다.");
                }

                /*
                 * 프로젝트가 존재하고,
                 * 현재 사용자가 ACTIVE 멤버인 경우에만
                 * Project Entity를 반환한다.
                 */
                return project;
        }

        /*
         * 프로젝트의 기본 정보를 수정한다.
         *
         * 수정 가능한 항목:
         *
         * - projectName
         * - description
         * - crawlKeyword
         *
         *
         * 수정하지 않는 항목:
         *
         * - projectId
         * - ownerId
         * - status
         * - createdAt
         *
         *
         * 프로젝트 수정 권한:
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
         * 조회 권한과 수정 권한은 서로 다르게 판단한다.
         *
         * 조회는 ACTIVE 멤버라면 가능하지만,
         * 프로젝트 자체의 이름/설명/키워드를 수정하려면
         * 프로젝트 관리 역할이 필요하다.
         *
         *
         * 데이터 흐름:
         *
         * ProjectController
         * ↓
         * ProjectUpdateRequest
         * ↓
         * ProjectService.updateProject()
         * ↓
         * 현재 사용자 확인
         * ↓
         * PROJECT 존재 확인
         * ↓
         * PROJECT_MEMBER에서 ACTIVE 멤버 조회
         * ↓
         * position 확인
         * ↓
         * LEADER / VICE_LEADER
         * ↓
         * Project Entity 수정
         * ↓
         * Oracle PROJECT UPDATE
         */
        @Transactional
        public Project updateProject(
                        Long projectId,
                        String projectName,
                        String description,
                        String crawlKeyword) {

                /*
                 * 프로젝트 이름은 생성 기능과 동일하게
                 * 반드시 값이 있어야 한다.
                 *
                 * null뿐 아니라
                 * 빈 문자열이나 공백만 있는 값도 허용하지 않는다.
                 */
                if (projectName == null || projectName.isBlank()) {
                        throw new IllegalArgumentException(
                                        "프로젝트 이름은 반드시 입력해야 합니다.");
                }

                /*
                 * PROJECT.project_name은 VARCHAR2(100)이므로
                 * 프로젝트 이름은 최대 100자까지만 허용한다.
                 */
                if (projectName.length() > 100) {
                        throw new IllegalArgumentException(
                                        "프로젝트 이름은 100자 이하로 입력해야 합니다.");
                }

                /*
                 * 현재 요청을 수행하고 있는 사용자의 ID를 가져온다.
                 *
                 * 다른 Service에서 1L을 직접 사용하지 않고
                 * CurrentUserService를 통해 현재 사용자를 확인한다.
                 */
                Long currentUserId = currentUserService.getCurrentUserId();

                /*
                 * 수정하려는 프로젝트가 실제로 존재하는지 확인한다.
                 *
                 * 존재하지 않는 프로젝트라면
                 * 이후 권한 검사를 진행할 필요가 없으므로
                 * 바로 예외를 발생시킨다.
                 */
                Project project = projectRepository.findById(projectId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "존재하지 않는 프로젝트입니다."));

                /*
                 * 이미 DELETED 상태인 프로젝트는
                 * 일반 수정 기능을 사용할 수 없도록 막는다.
                 *
                 * 프로젝트 삭제는 나중에
                 * 별도의 DELETE API에서 soft delete 방식으로 처리한다.
                 */
                if ("DELETED".equals(project.getStatus())) {
                        throw new IllegalArgumentException(
                                        "삭제된 프로젝트는 수정할 수 없습니다.");
                }

                /*
                 * 현재 사용자가 해당 프로젝트의 ACTIVE 멤버인지 확인하면서
                 * ProjectMember 객체를 가져온다.
                 *
                 * 단순 조회 권한과 달리
                 * 수정 권한에서는 position까지 확인해야 하므로
                 * ProjectMember 객체 자체가 필요하다.
                 */
                ProjectMember member = projectMemberRepository
                                .findByProjectIdAndUserIdAndMemberStatus(
                                                projectId,
                                                currentUserId,
                                                "ACTIVE")
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "이 프로젝트를 수정할 권한이 없습니다."));

                /*
                 * ACTIVE 멤버라고 해서
                 * 모두 프로젝트 자체를 수정할 수 있는 것은 아니다.
                 *
                 * 수정 허용 역할:
                 *
                 * LEADER
                 * VICE_LEADER
                 *
                 * 일반 MEMBER는 프로젝트 내부 내용을 조회하거나
                 * 이후 업무를 생성할 수는 있지만,
                 * 프로젝트 이름/설명/키워드는 수정하지 못하게 한다.
                 */
                String position = member.getPosition();

                boolean canUpdate = "LEADER".equals(position)
                                || "VICE_LEADER".equals(position);

                if (!canUpdate) {
                        throw new IllegalArgumentException(
                                        "프로젝트 수정 권한이 없습니다.");
                }

                /*
                 * 권한 검증이 끝난 뒤에만
                 * 실제 Project Entity의 값을 변경한다.
                 *
                 * 이 순서가 중요한 이유는
                 * 권한 없는 사용자가 Entity 값을 변경한 뒤
                 * 예외가 발생하는 상황을 피하기 위해서다.
                 */
                project.setProjectName(projectName);
                project.setDescription(description);
                project.setCrawlKeyword(crawlKeyword);

                /*
                 * updated_at은 프로젝트가 수정된 시각을 의미한다.
                 *
                 * 현재 Project Entity에서 UPDATED_AT은
                 * UPDATE 시 값을 넣을 수 있도록 되어 있으므로
                 * Service에서 현재 시각을 기록한다.
                 */
                project.setUpdatedAt(
                                LocalDateTime.now());

                /*
                 * findById()로 조회한 Project는
                 * 현재 @Transactional 범위 안에서
                 * JPA가 관리하는 Entity다.
                 *
                 * 따라서 값을 변경하면 트랜잭션 종료 시점에
                 * Hibernate의 변경 감지(Dirty Checking)에 의해
                 * UPDATE SQL이 실행될 수 있다.
                 *
                 * 이해를 명확하게 하기 위해
                 * 여기서는 save()를 한 번 더 호출해도 되지만,
                 * 꼭 필요한 것은 아니다.
                 */
                return project;
        }

        /*
         * 프로젝트를 삭제 처리한다.
         *
         * 실제 PROJECT 행을 DELETE하는 것이 아니라
         * PROJECT.status를 DELETED로 변경하는
         * soft delete 방식을 사용한다.
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
         * 프로젝트 수정과 삭제 권한도 서로 다르다.
         *
         * 수정:
         * LEADER / VICE_LEADER
         *
         * 삭제:
         * LEADER만 가능
         *
         *
         * soft delete를 사용하는 이유:
         *
         * 프로젝트와 연결된 PROJECT_MEMBER,
         * PROJECT_TASK, 게시글 등의 데이터가 존재할 수 있으므로
         * 프로젝트 행 자체를 바로 제거하지 않고
         * DELETED 상태로 변경해 기록을 남긴다.
         *
         *
         * 데이터 흐름:
         *
         * ProjectController
         * ↓
         * ProjectService.deleteProject()
         * ↓
         * 현재 사용자 확인
         * ↓
         * PROJECT 존재 확인
         * ↓
         * PROJECT_MEMBER에서 ACTIVE 멤버 확인
         * ↓
         * position = LEADER 확인
         * ↓
         * PROJECT.status = DELETED
         * ↓
         * updatedAt 갱신
         * ↓
         * Oracle PROJECT UPDATE
         */
        @Transactional
        public void deleteProject(Long projectId) {

                /*
                 * 현재 요청을 수행하는 사용자 ID를 가져온다.
                 */
                Long currentUserId = currentUserService.getCurrentUserId();

                /*
                 * 삭제하려는 프로젝트가 실제로 존재하는지 확인한다.
                 */
                Project project = projectRepository.findById(projectId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "존재하지 않는 프로젝트입니다."));

                /*
                 * 이미 DELETED 상태라면
                 * 다시 삭제 처리하지 않는다.
                 */
                if ("DELETED".equals(project.getStatus())) {
                        throw new IllegalArgumentException(
                                        "이미 삭제된 프로젝트입니다.");
                }

                /*
                 * 현재 사용자가 해당 프로젝트의
                 * ACTIVE 멤버인지 확인한다.
                 *
                 * 삭제 권한에서는 position까지 확인해야 하므로
                 * ProjectMember 객체 자체를 가져온다.
                 */
                ProjectMember member = projectMemberRepository
                                .findByProjectIdAndUserIdAndMemberStatus(
                                                projectId,
                                                currentUserId,
                                                "ACTIVE")
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "이 프로젝트를 삭제할 권한이 없습니다."));

                /*
                 * 프로젝트 삭제는 LEADER만 가능하다.
                 *
                 * VICE_LEADER는 프로젝트 정보 수정은 가능하지만
                 * 프로젝트 전체 삭제는 할 수 없다.
                 *
                 * MEMBER 역시 삭제할 수 없다.
                 */
                if (!"LEADER".equals(member.getPosition())) {
                        throw new IllegalArgumentException(
                                        "프로젝트 삭제 권한이 없습니다.");
                }

                /*
                 * 실제 DELETE를 실행하지 않고
                 * 상태값만 DELETED로 변경한다.
                 *
                 * 이렇게 하면 PROJECT 행과 관련 기록은 남지만,
                 * 일반 목록 조회에서는 DELETED 프로젝트가 제외된다.
                 */
                project.setStatus("DELETED");

                /*
                 * 프로젝트 상태가 변경된 시각을 기록한다.
                 */
                project.setUpdatedAt(
                                LocalDateTime.now());

                /*
                 * project는 현재 @Transactional 안에서
                 * JPA가 관리하고 있는 Entity이므로
                 * 트랜잭션 종료 시 변경 감지에 의해
                 * UPDATE SQL이 실행된다.
                 */
        }

        /*
         * 프로젝트에 새로운 사용자를 초대한다.
         *
         * 초대 권한:
         *
         * ACTIVE + LEADER
         * → 초대 가능
         *
         * ACTIVE + VICE_LEADER
         * → 초대 가능
         *
         * ACTIVE + MEMBER
         * → 초대 불가
         *
         *
         * 초대받은 사용자는 즉시 ACTIVE가 되는 것이 아니라
         * PROJECT_MEMBER에 MEMBER + PENDING 상태로 저장된다.
         *
         *
         * 데이터 흐름:
         *
         * ProjectController
         * ↓
         * ProjectInviteRequest
         * ↓
         * ProjectService.inviteMember()
         * ↓
         * CurrentUserService
         * ↓
         * 현재 사용자 확인
         * ↓
         * PROJECT 존재 확인
         * ↓
         * 현재 사용자의 PROJECT_MEMBER 확인
         * ↓
         * LEADER / VICE_LEADER 권한 확인
         * ↓
         * 초대 대상 사용자 확인
         * ↓
         * 중복 PROJECT_MEMBER 여부 확인
         * ↓
         * MEMBER + PENDING 저장
         */
        @Transactional
        public ProjectMember inviteMember(
                        Long projectId,
                        Long targetUserId) {

                /*
                 * 요청을 수행하는 현재 사용자 ID.
                 *
                 * invited_by에도 이 값이 들어간다.
                 */
                Long currentUserId = currentUserService.getCurrentUserId();

                /*
                 * 초대하려는 프로젝트가 실제로 존재하는지 확인한다.
                 */
                Project project = projectRepository.findById(projectId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "존재하지 않는 프로젝트입니다."));

                /*
                 * 삭제된 프로젝트에는
                 * 새로운 멤버를 초대할 수 없다.
                 */
                if ("DELETED".equals(project.getStatus())) {
                        throw new IllegalArgumentException(
                                        "삭제된 프로젝트에는 사용자를 초대할 수 없습니다.");
                }

                /*
                 * 현재 사용자가 해당 프로젝트의 ACTIVE 멤버인지 확인한다.
                 *
                 * 초대 권한은 position까지 확인해야 하므로
                 * ProjectMember 객체 자체를 가져온다.
                 */
                ProjectMember currentMember = projectMemberRepository
                                .findByProjectIdAndUserIdAndMemberStatus(
                                                projectId,
                                                currentUserId,
                                                "ACTIVE")
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "프로젝트 멤버 초대 권한이 없습니다."));

                /*
                 * 초대 가능한 역할은
                 * LEADER 또는 VICE_LEADER다.
                 */
                String position = currentMember.getPosition();

                boolean canInvite = "LEADER".equals(position)
                                || "VICE_LEADER".equals(position);

                if (!canInvite) {
                        throw new IllegalArgumentException(
                                        "프로젝트 멤버 초대 권한이 없습니다.");
                }

                /*
                 * 자기 자신을 초대하는 요청은 막는다.
                 *
                 * 프로젝트 생성자는 이미 PROJECT_MEMBER에
                 * 등록되어 있으므로 정상적인 초대가 될 수 없다.
                 */
                if (currentUserId.equals(targetUserId)) {
                        throw new IllegalArgumentException(
                                        "자기 자신을 초대할 수 없습니다.");
                }

                /*
                 * 초대 대상 사용자가 실제 USERS 테이블에 존재하는지 확인한다.
                 *
                 * 존재하지 않는 userId를 그대로 PROJECT_MEMBER에 저장하려 하면
                 * DB의 FK 제약조건에서 오류가 발생할 수 있다.
                 *
                 * 그래서 DB INSERT 전에 Service 계층에서 먼저 확인해서
                 * 의미 있는 400 오류로 차단한다.
                 */
                userRepository.findById(targetUserId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "존재하지 않는 사용자입니다."));

                /*
                 * 같은 프로젝트 + 같은 사용자의
                 * PROJECT_MEMBER 행이 이미 있는지 확인한다.
                 *
                 * DB에 UNIQUE(project_id, user_id) 제약이 있기 때문에
                 * 기존 행이 있다면 새 INSERT를 수행하면 안 된다.
                 */
                /*
                 * 같은 프로젝트 + 같은 사용자의 기존 PROJECT_MEMBER 행이 있는지 확인한다.
                 *
                 * DB에는 UNIQUE(project_id, user_id) 제약이 있으므로
                 * 기존 행이 있으면 새 INSERT를 하면 안 된다.
                 */
                Optional<ProjectMember> existingMember = projectMemberRepository.findByProjectIdAndUserId(
                                projectId,
                                targetUserId);

                /*
                 * 기존 행이 있다면 현재 상태에 따라 처리한다.
                 *
                 * PENDING
                 * → 이미 초대 대기 중이므로 재초대 불가
                 *
                 * ACTIVE
                 * → 이미 프로젝트 참여 중이므로 재초대 불가
                 *
                 * REJECTED / LEFT
                 * → 기존 행을 재사용해서 다시 PENDING 초대로 변경
                 */
                if (existingMember.isPresent()) {

                        ProjectMember member = existingMember.get();

                        if ("PENDING".equals(member.getMemberStatus())) {
                                throw new IllegalArgumentException(
                                                "이미 초대 대기 중인 사용자입니다.");
                        }

                        if ("ACTIVE".equals(member.getMemberStatus())) {
                                throw new IllegalArgumentException(
                                                "이미 프로젝트에 참여 중인 사용자입니다.");
                        }

                        if ("REJECTED".equals(member.getMemberStatus())
                                        || "LEFT".equals(member.getMemberStatus())) {

                                /*
                                 * 기존 행을 재사용해서 다시 초대 상태로 만든다.
                                 */
                                member.setPosition("MEMBER");
                                member.setMemberStatus("PENDING");
                                member.setInvitedBy(currentUserId);

                                /*
                                 * 재초대한 시점을 새 초대 시간으로 기록한다.
                                 */
                                member.setInvitedAt(LocalDateTime.now());

                                /*
                                 * 이전 응답/참여 기록은
                                 * 새 초대가 되었으므로 비워둔다.
                                 */
                                member.setRespondedAt(null);
                                member.setJoinedAt(null);

                                return projectMemberRepository.save(member);
                        }
                }

                /*
                 * 새 초대 정보를 생성한다.
                 *
                 * 초대받은 사용자는 기본 MEMBER이며,
                 * 아직 수락하지 않았으므로 PENDING으로 저장한다.
                 */
                ProjectMember invitation = new ProjectMember();

                invitation.setProjectId(projectId);
                invitation.setUserId(targetUserId);
                invitation.setPosition("MEMBER");
                invitation.setMemberStatus("PENDING");
                invitation.setInvitedBy(currentUserId);

                /*
                 * 누가 초대했는지 기록한다.
                 */
                invitation.setInvitedBy(currentUserId);

                /*
                 * respondedAt / joinedAt은 아직 응답 전이므로
                 * 값을 넣지 않는다.
                 *
                 * invitedAt은 Entity / DB 설정에 따라
                 * DB의 SYSTIMESTAMP 기본값을 사용한다.
                 */
                return projectMemberRepository.save(invitation);
        }

        /*
         * 현재 사용자가 받은 PENDING 프로젝트 초대 목록을 조회한다.
         *
         * 현재 사용자 ID는 직접 1L, 2L로 작성하지 않고
         * CurrentUserService에서 가져온다.
         *
         * 데이터 흐름:
         *
         * Controller
         * ↓
         * ProjectService.getMyPendingInvitations()
         * ↓
         * CurrentUserService
         * ↓
         * 현재 USER_ID
         * ↓
         * ProjectMemberRepository
         * ↓
         * user_id = 현재 사용자
         * member_status = PENDING
         * ↓
         * 받은 초대 목록 반환
         */
        @Transactional(readOnly = true)
        public List<ProjectMember> getMyPendingInvitations() {

                /*
                 * 현재 요청을 수행하는 사용자를 확인한다.
                 *
                 * 이후 실제 로그인 기능이 연결되더라도
                 * 이 Service 코드는 그대로 사용할 수 있다.
                 */
                Long currentUserId = currentUserService.getCurrentUserId();

                /*
                 * 현재 사용자가 아직 수락하거나 거절하지 않은
                 * PENDING 초대만 조회한다.
                 */
                return projectMemberRepository
                                .findByUserIdAndMemberStatus(
                                                currentUserId,
                                                "PENDING");
        }

        /*
         * 현재 사용자가 받은 PENDING 초대를 수락한다.
         *
         * 수락하면:
         *
         * member_status = ACTIVE
         * responded_at = 현재 시간
         * joined_at = 현재 시간
         *
         * 로 변경한다.
         *
         * 현재 사용자 본인에게 온 초대만 수락할 수 있다.
         */
        @Transactional
        public ProjectMember acceptInvitation(Long projectId) {

                Long currentUserId = currentUserService.getCurrentUserId();

                /*
                 * 현재 사용자가 해당 프로젝트에서
                 * PENDING 상태로 받은 초대가 있는지 확인한다.
                 *
                 * 다른 사람의 초대를 대신 수락할 수 없도록
                 * currentUserId까지 함께 조건에 사용한다.
                 */
                ProjectMember invitation = projectMemberRepository
                                .findByProjectIdAndUserIdAndMemberStatus(
                                                projectId,
                                                currentUserId,
                                                "PENDING")
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "수락할 수 있는 초대가 없습니다."));

                LocalDateTime now = LocalDateTime.now();

                /*
                 * 초대를 수락했으므로
                 * 프로젝트의 실제 참여 멤버 상태로 변경한다.
                 */
                invitation.setMemberStatus("ACTIVE");

                /*
                 * 응답한 시각과 실제 참여 시작 시각을 기록한다.
                 */
                invitation.setRespondedAt(now);
                invitation.setJoinedAt(now);

                return projectMemberRepository.save(invitation);
        }

        /*
         * 현재 사용자가 받은 PENDING 초대를 거절한다.
         *
         * 거절하면:
         *
         * member_status = REJECTED
         * responded_at = 현재 시간
         *
         * 으로 변경한다.
         *
         * joined_at은 프로젝트에 참여한 적이 없으므로
         * NULL 상태를 유지한다.
         */
        @Transactional
        public ProjectMember rejectInvitation(Long projectId) {

                Long currentUserId = currentUserService.getCurrentUserId();

                /*
                 * 현재 사용자가 해당 프로젝트에서
                 * 실제로 PENDING 상태의 초대를 받은 적이 있는지 확인한다.
                 *
                 * 다른 사람의 초대를 대신 거절할 수 없도록
                 * projectId + currentUserId + PENDING 조건으로 조회한다.
                 */
                ProjectMember invitation = projectMemberRepository
                                .findByProjectIdAndUserIdAndMemberStatus(
                                                projectId,
                                                currentUserId,
                                                "PENDING")
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "거절할 수 있는 초대가 없습니다."));

                /*
                 * 초대를 거절했으므로 상태를 REJECTED로 변경한다.
                 */
                invitation.setMemberStatus("REJECTED");

                /*
                 * 사용자가 초대에 응답한 시각을 기록한다.
                 *
                 * 거절이므로 joinedAt은 설정하지 않는다.
                 */
                invitation.setRespondedAt(LocalDateTime.now());

                return projectMemberRepository.save(invitation);
        }

        /*
         * 특정 프로젝트의 ACTIVE 멤버 목록을 조회한다.
         *
         * 아무 사용자나 프로젝트 멤버 목록을 볼 수 있게 하지 않고,
         * 현재 사용자가 해당 프로젝트의 ACTIVE 멤버인지 먼저 확인한다.
         *
         * 즉:
         *
         * 현재 사용자 ACTIVE 멤버
         * → 멤버 목록 조회 가능
         *
         * 현재 사용자 비멤버 / PENDING / REJECTED / LEFT
         * → 조회 불가
         *
         *
         * 데이터 흐름:
         *
         * Controller
         * ↓
         * ProjectService.getActiveProjectMembers()
         * ↓
         * CurrentUserService
         * ↓
         * 현재 USER_ID
         * ↓
         * 현재 사용자의 PROJECT_MEMBER 확인
         * ↓
         * ACTIVE이면
         * ↓
         * 해당 프로젝트의 ACTIVE 멤버 전체 조회
         */
        @Transactional(readOnly = true)
        public List<ProjectMember> getActiveProjectMembers(Long projectId) {

                Long currentUserId = currentUserService.getCurrentUserId();

                /*
                 * 프로젝트가 실제로 존재하는지 확인한다.
                 */
                Project project = projectRepository.findById(projectId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "존재하지 않는 프로젝트입니다."));

                /*
                 * 삭제된 프로젝트는 기존 정책대로
                 * 일반 사용자 기능에서 접근할 수 없게 한다.
                 */
                if ("DELETED".equals(project.getStatus())) {
                        throw new IllegalArgumentException(
                                        "삭제된 프로젝트입니다.");
                }

                /*
                 * 현재 사용자가 이 프로젝트의 ACTIVE 멤버인지 확인한다.
                 *
                 * 여기서는 position이 LEADER인지 MEMBER인지가 중요하지 않다.
                 * ACTIVE 멤버라면 프로젝트 구성원 목록을 볼 수 있게 한다.
                 */
                projectMemberRepository
                                .findByProjectIdAndUserIdAndMemberStatus(
                                                projectId,
                                                currentUserId,
                                                "ACTIVE")
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "프로젝트 멤버 조회 권한이 없습니다."));

                /*
                 * 권한 확인이 끝났으면
                 * 현재 프로젝트의 ACTIVE 멤버 전체를 반환한다.
                 */
                return projectMemberRepository
                                .findByProjectIdAndMemberStatus(
                                                projectId,
                                                "ACTIVE");
        }

        /*
         * 프로젝트 멤버의 일반 역할을 변경한다.
         *
         * 권한 정책:
         *
         * LEADER
         * → 역할 변경 가능
         *
         * VICE_LEADER / MEMBER
         * → 역할 변경 불가
         *
         *
         * 변경 가능한 역할:
         *
         * MEMBER <-> VICE_LEADER
         *
         * LEADER 변경은 여기서 처리하지 않는다.
         * LEADER 양도는 별도 기능으로 구현한다.
         */
        @Transactional
        public ProjectMember updateMemberRole(
                        Long projectId,
                        Long targetUserId,
                        String newPosition) {

                Long currentUserId = currentUserService.getCurrentUserId();

                /*
                 * 요청으로 들어온 역할값을 먼저 검증한다.
                 *
                 * 이번 일반 역할 변경 API에서는
                 * MEMBER와 VICE_LEADER만 허용한다.
                 *
                 * LEADER는 별도 리더 양도 기능에서 처리한다.
                 */
                if (!"MEMBER".equals(newPosition)
                                && !"VICE_LEADER".equals(newPosition)) {

                        throw new IllegalArgumentException(
                                        "변경 가능한 역할은 MEMBER 또는 VICE_LEADER입니다.");
                }

                /*
                 * 프로젝트 존재 여부를 확인한다.
                 */
                Project project = projectRepository.findById(projectId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "존재하지 않는 프로젝트입니다."));

                /*
                 * 삭제된 프로젝트는 기존 정책대로
                 * 멤버 관리 기능도 사용할 수 없다.
                 */
                if ("DELETED".equals(project.getStatus())) {
                        throw new IllegalArgumentException(
                                        "삭제된 프로젝트의 멤버 역할은 변경할 수 없습니다.");
                }

                /*
                 * 현재 사용자가 해당 프로젝트의
                 * ACTIVE 멤버인지 확인한다.
                 */
                ProjectMember currentMember = projectMemberRepository
                                .findByProjectIdAndUserIdAndMemberStatus(
                                                projectId,
                                                currentUserId,
                                                "ACTIVE")
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "프로젝트 멤버 역할 변경 권한이 없습니다."));

                /*
                 * 역할 변경 권한은 LEADER에게만 있다.
                 */
                if (!"LEADER".equals(currentMember.getPosition())) {
                        throw new IllegalArgumentException(
                                        "LEADER만 프로젝트 멤버의 역할을 변경할 수 있습니다.");
                }

                /*
                 * 역할을 변경할 대상도 현재 프로젝트의
                 * ACTIVE 멤버여야 한다.
                 */
                ProjectMember targetMember = projectMemberRepository
                                .findByProjectIdAndUserIdAndMemberStatus(
                                                projectId,
                                                targetUserId,
                                                "ACTIVE")
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "역할을 변경할 수 있는 ACTIVE 멤버가 아닙니다."));

                /*
                 * 현재 LEADER의 역할을 이 API에서 변경하면
                 * 프로젝트에 LEADER가 없어질 수 있다.
                 *
                 * 따라서 LEADER 대상은 일반 역할 변경에서 차단하고,
                 * 나중에 별도의 LEADER 양도 기능으로 처리한다.
                 */
                if ("LEADER".equals(targetMember.getPosition())) {
                        throw new IllegalArgumentException(
                                        "LEADER 역할 변경은 리더 양도 기능을 이용해야 합니다.");
                }

                /*
                 * 모든 권한/상태 검증이 끝났으므로
                 * MEMBER 또는 VICE_LEADER로 역할을 변경한다.
                 */
                targetMember.setPosition(newPosition);

                return projectMemberRepository.save(targetMember);
        }

        /*
         * 현재 LEADER가 다른 ACTIVE 멤버에게
         * 프로젝트 LEADER 역할을 양도한다.
         *
         * 양도 성공 시:
         *
         * 기존 LEADER
         * → MEMBER
         *
         * 대상 멤버
         * → LEADER
         *
         * PROJECT.owner_id
         * → 새 LEADER의 userId
         *
         *
         * LEADER 양도는 여러 DB 변경이 함께 일어나므로
         * 하나라도 실패하면 전체가 취소되도록 @Transactional로 묶는다.
         */
        @Transactional
        public ProjectMember transferLeader(
                        Long projectId,
                        Long targetUserId) {

                Long currentUserId = currentUserService.getCurrentUserId();

                /*
                 * 자기 자신에게 LEADER를 양도할 필요는 없다.
                 */
                if (currentUserId.equals(targetUserId)) {
                        throw new IllegalArgumentException(
                                        "자기 자신에게 리더를 양도할 수 없습니다.");
                }

                /*
                 * 프로젝트 존재 여부를 확인한다.
                 */
                Project project = projectRepository.findById(projectId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "존재하지 않는 프로젝트입니다."));

                /*
                 * 삭제된 프로젝트에서는 LEADER 양도를 할 수 없다.
                 */
                if ("DELETED".equals(project.getStatus())) {
                        throw new IllegalArgumentException(
                                        "삭제된 프로젝트에서는 리더를 양도할 수 없습니다.");
                }

                /*
                 * 현재 사용자가 이 프로젝트에서
                 * ACTIVE 상태인지 확인한다.
                 */
                ProjectMember currentLeader = projectMemberRepository
                                .findByProjectIdAndUserIdAndMemberStatus(
                                                projectId,
                                                currentUserId,
                                                "ACTIVE")
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "리더 양도 권한이 없습니다."));

                /*
                 * 실제 LEADER만 양도할 수 있다.
                 */
                if (!"LEADER".equals(currentLeader.getPosition())) {
                        throw new IllegalArgumentException(
                                        "LEADER만 리더를 양도할 수 있습니다.");
                }

                /*
                 * 새 LEADER가 될 사용자도
                 * 현재 프로젝트의 ACTIVE 멤버여야 한다.
                 */
                ProjectMember newLeader = projectMemberRepository
                                .findByProjectIdAndUserIdAndMemberStatus(
                                                projectId,
                                                targetUserId,
                                                "ACTIVE")
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "리더를 양도할 수 있는 ACTIVE 멤버가 아닙니다."));

                /*
                 * DB에는 프로젝트별 ACTIVE LEADER가
                 * 최대 1명만 존재할 수 있다.
                 *
                 * 따라서 기존 LEADER를 먼저 MEMBER로 내린 뒤
                 * DB에 즉시 반영한다.
                 *
                 * 이후 대상 멤버를 LEADER로 올린다.
                 */
                currentLeader.setPosition("MEMBER");

                projectMemberRepository.saveAndFlush(currentLeader);

                /*
                 * 새 리더를 지정한다.
                 */
                newLeader.setPosition("LEADER");

                ProjectMember savedNewLeader = projectMemberRepository.save(newLeader);

                /*
                 * PROJECT.owner_id도 실제 LEADER와 일치하도록
                 * 새 리더의 userId로 변경한다.
                 */
                project.setOwnerId(targetUserId);

                projectRepository.save(project);

                return savedNewLeader;
        }

        /*
         * 현재 사용자가 프로젝트에서 스스로 나간다.
         *
         * MEMBER / VICE_LEADER
         * → 나가기 가능
         *
         * LEADER
         * → 바로 나갈 수 없음
         * → 먼저 다른 ACTIVE 멤버에게 LEADER를 양도해야 한다.
         *
         * 실제 PROJECT_MEMBER 행을 DELETE하지 않고
         * member_status를 LEFT로 변경하여 참여 이력을 남긴다.
         */
        @Transactional
        public ProjectMember leaveProject(Long projectId) {

                Long currentUserId = currentUserService.getCurrentUserId();

                /*
                 * 프로젝트가 실제로 존재하는지 확인한다.
                 */
                Project project = projectRepository.findById(projectId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "존재하지 않는 프로젝트입니다."));

                /*
                 * 삭제된 프로젝트에서는 일반 멤버 기능을 사용할 수 없다.
                 */
                if ("DELETED".equals(project.getStatus())) {
                        throw new IllegalArgumentException(
                                        "삭제된 프로젝트에서는 나갈 수 없습니다.");
                }

                /*
                 * 현재 사용자가 실제로 이 프로젝트의
                 * ACTIVE 멤버인지 확인한다.
                 */
                ProjectMember currentMember = projectMemberRepository
                                .findByProjectIdAndUserIdAndMemberStatus(
                                                projectId,
                                                currentUserId,
                                                "ACTIVE")
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "현재 참여 중인 프로젝트가 아닙니다."));

                /*
                 * LEADER가 바로 나가면 프로젝트에
                 * 리더가 없어질 수 있으므로 차단한다.
                 *
                 * 먼저 transferLeader()를 통해
                 * 다른 ACTIVE 멤버에게 리더를 양도해야 한다.
                 */
                if ("LEADER".equals(currentMember.getPosition())) {
                        throw new IllegalArgumentException(
                                        "LEADER는 먼저 다른 멤버에게 리더를 양도해야 합니다.");
                }

                /*
                 * 프로젝트에서 나간 사용자는
                 * 더 이상 관리 역할을 가지지 않도록 MEMBER로 정리한다.
                 */
                currentMember.setPosition("MEMBER");

                /*
                 * 실제 DB 행은 삭제하지 않고
                 * 참여 상태만 LEFT로 변경한다.
                 */
                currentMember.setMemberStatus("LEFT");

                return projectMemberRepository.save(currentMember);
        }

        /*
         * LEADER가 다른 ACTIVE 멤버를 프로젝트에서 강제로 제외한다.
         *
         * 권한 정책:
         *
         * LEADER
         * → MEMBER / VICE_LEADER 강제 제외 가능
         *
         * VICE_LEADER / MEMBER
         * → 강제 제외 불가
         *
         * LEADER 자신
         * → 강제 제외 불가
         *
         *
         * DB 구조는 변경하지 않고
         * 자진 탈퇴와 강제 제외 모두 member_status = LEFT를 사용한다.
         *
         * 따라서 DB만 보면 둘을 구분할 수 없지만,
         * API와 화면 메시지는 각각 다르게 처리할 수 있다.
         */
        @Transactional
        public ProjectMember removeMember(
                        Long projectId,
                        Long targetUserId) {

                Long currentUserId = currentUserService.getCurrentUserId();

                /*
                 * 자기 자신을 강제 제외하는 요청은 막는다.
                 *
                 * LEADER가 프로젝트에서 나가려면
                 * 리더 양도 후 leaveProject()를 사용해야 한다.
                 */
                if (currentUserId.equals(targetUserId)) {
                        throw new IllegalArgumentException(
                                        "자기 자신을 프로젝트에서 강제 제외할 수 없습니다.");
                }

                /*
                 * 프로젝트 존재 여부 확인.
                 */
                Project project = projectRepository.findById(projectId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "존재하지 않는 프로젝트입니다."));

                /*
                 * 삭제된 프로젝트에서는 멤버 관리 기능을 사용할 수 없다.
                 */
                if ("DELETED".equals(project.getStatus())) {
                        throw new IllegalArgumentException(
                                        "삭제된 프로젝트에서는 멤버를 제외할 수 없습니다.");
                }

                /*
                 * 현재 사용자가 이 프로젝트의 ACTIVE 멤버인지 확인한다.
                 */
                ProjectMember currentMember = projectMemberRepository
                                .findByProjectIdAndUserIdAndMemberStatus(
                                                projectId,
                                                currentUserId,
                                                "ACTIVE")
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "프로젝트 멤버 제외 권한이 없습니다."));

                /*
                 * 강제 제외 권한은 LEADER만 가진다.
                 */
                if (!"LEADER".equals(currentMember.getPosition())) {
                        throw new IllegalArgumentException(
                                        "LEADER만 프로젝트 멤버를 제외할 수 있습니다.");
                }

                /*
                 * 제외 대상도 현재 프로젝트의 ACTIVE 멤버여야 한다.
                 */
                ProjectMember targetMember = projectMemberRepository
                                .findByProjectIdAndUserIdAndMemberStatus(
                                                projectId,
                                                targetUserId,
                                                "ACTIVE")
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "제외할 수 있는 ACTIVE 멤버가 아닙니다."));

                /*
                 * LEADER는 이 기능으로 제외하지 않는다.
                 *
                 * LEADER는 반드시 다른 멤버에게 리더를 양도한 뒤
                 * leaveProject()를 통해 나가야 한다.
                 */
                if ("LEADER".equals(targetMember.getPosition())) {
                        throw new IllegalArgumentException(
                                        "LEADER는 강제 제외할 수 없습니다.");
                }

                /*
                 * 강제 제외되면 관리 역할을 제거하기 위해
                 * position을 MEMBER로 정리하고,
                 * 참여 상태를 LEFT로 변경한다.
                 */
                targetMember.setPosition("MEMBER");
                targetMember.setMemberStatus("LEFT");

                return projectMemberRepository.save(targetMember);
        }
}