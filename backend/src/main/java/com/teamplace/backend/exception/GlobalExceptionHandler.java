package com.teamplace.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

/*
 * REST API에서 발생하는 예외를 공통으로 처리하는 클래스.
 *
 * Service에서 잘못된 입력을 발견했을 때
 * IllegalArgumentException을 발생시키면,
 * 그대로 두었을 경우 Spring이 500 Internal Server Error로
 * 응답할 수 있다.
 *
 * 하지만 프로젝트 이름 누락이나 길이 초과처럼
 * 사용자가 잘못된 요청을 보낸 경우는
 * 서버 내부 오류가 아니라 400 Bad Request가 더 적절하다.
 *
 *
 * 처리 흐름:
 *
 * ProjectController
 *      ↓
 * ProjectService
 *      ↓
 * IllegalArgumentException 발생
 *      ↓
 * GlobalExceptionHandler
 *      ↓
 * HTTP 400 응답
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /*
     * IllegalArgumentException이 발생하면
     * 이 메서드가 공통으로 처리한다.
     *
     * 예:
     * - 프로젝트 이름이 비어 있음
     * - 프로젝트 이름이 100자를 초과함
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgumentException(
            IllegalArgumentException e) {

        /*
         * React에 JSON 형태로 전달할 오류 응답을 만든다.
         *
         * 결과 예:
         *
         * {
         * "status": 400,
         * "message": "프로젝트 이름은 100자 이하로 입력해야 합니다."
         * }
         */
        Map<String, Object> response = new HashMap<>();

        response.put("status", HttpStatus.BAD_REQUEST.value());
        response.put("message", e.getMessage());

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(response);
    }

    /*
     * 대단원 삭제가 남아 있는 소단원 때문에 차단되면
     * HTTP 409 Conflict를 반환한다.
     *
     * 기존 IllegalArgumentException의 HTTP 400과 구분한다.
     *
     * 응답 데이터:
     * - status: 409
     * - message: 삭제할 수 없는 이유
     * - remainingTasks: 먼저 삭제해야 할 소단원 목록
     *
     * React에서는 remainingTasks를 이용해
     * 소단원 ID와 제목을 안내창에 표시할 수 있다.
     */
    @ExceptionHandler(TaskDeletionBlockedException.class)
    public ResponseEntity<Map<String, Object>> handleTaskDeletionBlocked(
            TaskDeletionBlockedException e) {

        /*
         * 기존 HTTP 400 오류 응답과 동일하게
         * Map을 이용하여 JSON 응답을 만든다.
         */
        Map<String, Object> response = new HashMap<>();

        response.put("status", HttpStatus.CONFLICT.value());
        response.put("message", e.getMessage());
        response.put("remainingTasks", e.getRemainingTasks());

        /*
         * HTTP 409 상태와 JSON 본문을 함께 반환한다.
         *
         * Spring이 RemainingTask record를
         * taskId, taskTitle 필드가 있는 JSON으로 변환한다.
         */
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(response);
    }

}