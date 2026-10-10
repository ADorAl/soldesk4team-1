package com.teamplace.backend.dto;

import com.teamplace.backend.entity.Project;
import lombok.Getter;

import java.time.LocalDateTime;

/*
 * 프로젝트 정보를 REST API 응답으로 전달하기 위한 DTO.
 *
 * 현재까지는 Project Entity 자체를 Controller에서 반환했지만,
 * 앞으로는 DB Entity와 외부 API 응답 형식을 분리한다.
 *
 *
 * 데이터 흐름:
 *
 * Oracle PROJECT
 *      ↓
 * Project Entity
 *      ↓
 * ProjectResponse
 *      ↓
 * ProjectController
 *      ↓
 * JSON 응답
 *
 *
 * 이렇게 분리하면
 * DB Entity의 구조가 변경되더라도
 * API 응답 형식을 별도로 관리하기 쉬워진다.
 */
@Getter
public class ProjectResponse {

    /*
     * 프로젝트를 식별하는 PK.
     */
    private final Long projectId;

    /*
     * 사용자에게 보여줄 프로젝트 이름.
     */
    private final String projectName;

    /*
     * 프로젝트 상세 설명.
     */
    private final String description;

    /*
     * 프로젝트 소유자 USER_ID.
     *
     * 현재는 ID만 응답하지만,
     * 이후 필요하면 사용자 닉네임 등의 정보는
     * 별도 응답 DTO 구조로 확장할 수 있다.
     */
    private final Long ownerId;

    /*
     * 프로젝트 자료 수집에 사용할 검색 키워드.
     */
    private final String crawlKeyword;

    /*
     * 프로젝트 상태.
     *
     * 현재 DB에서 허용되는 값:
     * ACTIVE
     * COMPLETED
     * DELETED
     */
    private final String status;

    /*
     * 프로젝트 생성 시각.
     */
    private final LocalDateTime createdAt;

    /*
     * 프로젝트 최종 수정 시각.
     */
    private final LocalDateTime updatedAt;

    /*
     * Project Entity의 데이터를
     * API 응답용 ProjectResponse로 변환한다.
     *
     * Controller에서 필드를 하나씩 복사하지 않고
     * 변환 책임을 이 DTO 내부에 모아두기 위한 메서드다.
     */
    public static ProjectResponse from(Project project) {

        return new ProjectResponse(
                project.getProjectId(),
                project.getProjectName(),
                project.getDescription(),
                project.getOwnerId(),
                project.getCrawlKeyword(),
                project.getStatus(),
                project.getCreatedAt(),
                project.getUpdatedAt());
    }

    /*
     * from() 메서드에서 전달한 값을
     * 각 응답 필드에 저장한다.
     */
    public ProjectResponse(
            Long projectId,
            String projectName,
            String description,
            Long ownerId,
            String crawlKeyword,
            String status,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {

        this.projectId = projectId;
        this.projectName = projectName;
        this.description = description;
        this.ownerId = ownerId;
        this.crawlKeyword = crawlKeyword;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}