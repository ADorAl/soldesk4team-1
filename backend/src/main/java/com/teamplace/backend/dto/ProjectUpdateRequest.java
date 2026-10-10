package com.teamplace.backend.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/*
 * 프로젝트 정보 수정 요청을 받기 위한 DTO.
 *
 * 프로젝트 생성 요청인 ProjectCreateRequest와 마찬가지로
 * DB Entity인 Project 자체를 HTTP 요청으로 직접 받지 않고,
 * 사용자가 수정할 수 있는 값만 별도로 정의한다.
 *
 *
 * 수정 가능한 값:
 *
 * - projectName
 * - description
 * - crawlKeyword
 *
 *
 * 여기에는 다음 값들을 넣지 않는다.
 *
 * - projectId
 * - ownerId
 * - status
 * - createdAt
 * - updatedAt
 *
 *
 * projectId
 * → URL 경로에서 전달받는다.
 *
 * ownerId
 * → 프로젝트 생성자를 나타내므로
 *   일반 프로젝트 정보 수정으로 변경하지 않는다.
 *
 * status
 * → ACTIVE / COMPLETED / DELETED의 의미가 있으므로
 *   일반 정보 수정과 섞지 않고 별도 기능으로 다룬다.
 *
 * 특히 DELETED는 프로젝트 삭제(soft delete)에서
 * 별도로 처리할 예정이다.
 *
 * createdAt / updatedAt
 * → 사용자가 직접 결정할 값이 아니다.
 *
 *
 * 데이터 흐름:
 *
 * React
 *      ↓
 * PUT /api/projects/{projectId}
 *      ↓
 * ProjectUpdateRequest
 *      ↓
 * ProjectController
 *      ↓
 * ProjectService
 *      ↓
 * 수정 권한 확인
 *      ↓
 * Project Entity 수정
 *      ↓
 * Oracle PROJECT
 */
@Getter
@Setter
@NoArgsConstructor
public class ProjectUpdateRequest {

    /*
     * 변경할 프로젝트 이름.
     *
     * 생성 기능과 마찬가지로
     * Service에서 빈 값과 최대 길이를 검증할 예정이다.
     */
    private String projectName;

    /*
     * 변경할 프로젝트 설명.
     */
    private String description;

    /*
     * 변경할 자료 수집 키워드.
     */
    private String crawlKeyword;
}