
package com.teamplace.backend.exception;

import java.util.List;

/*
 * 대단원 삭제가 소단원 때문에 차단된 경우에 사용하는 예외.
 *
 * 예:
 * 대단원 TASK_ID = 1을 삭제하려고 했지만
 * TASK_ID = 4, 5, 7인 소단원이 남아 있는 상황.
 *
 * 이 예외는 다음 정보를 전달한다.
 *
 * 1. 삭제할 수 없는 이유 (message)
 * 2. 삭제되지 않은 소단원 목록 (remainingTasks)
 *
 * GlobalExceptionHandler에서 이 예외를 처리하여
 * HTTP 409 Conflict와 JSON 응답으로 변환할 예정이다.
 *
 * 예외가 발생하면 TaskService의 @Transactional 작업은
 * 기본적으로 롤백된다.
 */
public class TaskDeletionBlockedException extends RuntimeException {

    /*
     * 삭제되지 않은 소단원의 ID와 제목을 담는다.
     *
     * 전체 ProjectTask Entity를 전달하지 않고
     * 화면에 필요한 데이터만 보관한다.
     */
    public record RemainingTask(
            Long taskId,
            String taskTitle) {
    }

    private final List<RemainingTask> remainingTasks;

    /*
     * message:
     * 대단원 삭제가 차단된 이유.
     *
     * remainingTasks:
     * 먼저 삭제해야 하는 소단원 목록.
     */
    public TaskDeletionBlockedException(
            String message,
            List<RemainingTask> remainingTasks) {

        super(message);

        this.remainingTasks = List.copyOf(remainingTasks);
    }

    /*
     * GlobalExceptionHandler에서
     * 남아 있는 소단원 목록을 가져올 때 사용한다.
     */
    public List<RemainingTask> getRemainingTasks() {
        return remainingTasks;
    }
}
