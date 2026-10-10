package com.teamplace.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/*
 * PROJECT 테이블과 연결되는 JPA Entity.
 *
 * 프로젝트 이름, 설명, 소유자, 크롤링 키워드,
 * 프로젝트 상태 등을 Java 객체로 다루기 위해 사용한다.
 *
 * 앞으로 데이터 흐름은 대략 다음과 같다.
 *
 * React
 *   ↓
 * ProjectController
 *   ↓
 * ProjectService
 *   ↓
 * Project Entity
 *   ↓
 * ProjectRepository
 *   ↓
 * Oracle PROJECT 테이블
 */
@Entity
@Table(name = "PROJECT")
@Getter
@Setter
@NoArgsConstructor
public class Project {

    /*
     * PROJECT의 기본키.
     *
     * DB에는 SEQ_PROJECT 시퀀스와
     * TRG_PROJECT_ID 트리거가 존재한다.
     *
     * 여기서는 JPA가 같은 SEQ_PROJECT 시퀀스에서
     * 다음 번호를 미리 받아 INSERT하도록 설정한다.
     *
     * JPA가 project_id를 넣어서 INSERT하면
     * DB 트리거는
     *
     * WHEN (NEW.project_id IS NULL)
     *
     * 조건에 걸리지 않으므로 중복으로 번호를 만들지 않는다.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "project_seq_generator")
    @SequenceGenerator(name = "project_seq_generator", sequenceName = "SEQ_PROJECT", allocationSize = 1)
    @Column(name = "PROJECT_ID")
    private Long projectId;

    /*
     * 사용자가 입력하는 프로젝트 이름.
     *
     * DB에서 NOT NULL이므로
     * 프로젝트 생성 기능을 만들 때 반드시 값이 필요하다.
     */
    @Column(name = "PROJECT_NAME", nullable = false, length = 100)
    private String projectName;

    /*
     * 프로젝트에 대한 상세 설명.
     *
     * Oracle에서는 CLOB 컬럼이므로
     * 
     * @Lob을 사용한다.
     */
    @Lob
    @Column(name = "DESCRIPTION")
    private String description;

    /*
     * 프로젝트 생성자의 USERS.user_id.
     *
     * DB에서는 USERS 테이블을 참조하는 FK다.
     *
     * 이후 프로젝트 생성 Service에서
     *
     * currentUserService.getCurrentUserId()
     *
     * 로 받은 현재 사용자 ID를 여기에 넣을 예정이다.
     */
    @Column(name = "OWNER_ID", nullable = false)
    private Long ownerId;

    /*
     * 프로젝트 자료 수집에 사용할 검색 키워드.
     *
     * 아직 크롤링 기능을 구현하는 단계는 아니므로
     * 지금은 DB 컬럼과의 매핑만 준비한다.
     */
    @Column(name = "CRAWL_KEYWORD", length = 500)
    private String crawlKeyword;

    /*
     * PROJECT.status에서 허용되는 값:
     *
     * ACTIVE
     * COMPLETED
     * DELETED
     *
     * 실제 프로젝트 생성 시에는 ACTIVE를 사용할 예정이다.
     */
    @Column(name = "STATUS", nullable = false, length = 20)
    private String status;

    /*
     * DB에서 DEFAULT SYSTIMESTAMP가 설정되어 있다.
     *
     * insertable = false로 두면
     * INSERT SQL에서 이 컬럼을 JPA가 직접 넣지 않고
     * Oracle의 DEFAULT 값을 사용하게 된다.
     */
    @Column(name = "CREATED_AT", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    /*
     * 최초 INSERT 시에는 DB의 DEFAULT SYSTIMESTAMP를 사용한다.
     *
     * 프로젝트 수정 기능을 만들 때
     * updated_at을 어떻게 갱신할지는
     * Service 구현 단계에서 별도로 처리한다.
     */
    @Column(name = "UPDATED_AT", insertable = false)
    private LocalDateTime updatedAt;
}