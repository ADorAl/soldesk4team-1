package com.teamplace.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/*
[이 클래스의 역할]

Oracle의 USERS 테이블 한 행을
Java의 User 객체 하나로 표현한다.

예를 들어 DB에

USER_ID = 1
LOGIN_ID = hong123
NAME = 홍길동

이라는 행이 있다면,

Java에서는 대략

User 객체
 ├─ userId = 1
 ├─ loginId = "hong123"
 └─ name = "홍길동"

형태로 다룰 수 있게 된다.


[중요]

현재 DB의 PK는

Oracle SEQUENCE
+
BEFORE INSERT TRIGGER

방식으로 생성된다.

따라서 지금 단계에서는
@GeneratedValue를 임의로 붙이지 않는다.

이번 단계의 목적은 우선
기존 USERS 데이터를 조회할 수 있도록
테이블 구조를 Java에 매핑하는 것이다.
*/

@Entity
@Table(name = "USERS")
public class User {

    /*
     * USER_ID
     * - USERS 테이블의 PK
     * - 한 사용자를 고유하게 구분한다.
     */
    @Id
    @Column(name = "USER_ID")
    private Long userId;

    /*
     * 로그인할 때 사용하는 사용자 ID이다.
     * 
     * LOGIN_ID에는 DB UNIQUE 제약조건이 있으므로
     * 동일한 로그인 ID를 두 사용자가 가질 수 없다.
     */
    @Column(name = "LOGIN_ID", nullable = false, length = 50)
    private String loginId;

    /*
     * 실제 서비스에서는 평문 비밀번호를 저장하면 안 된다.
     * 나중에 로그인 기능 담당 부분과 연결될 때
     * 암호화된 비밀번호 값이 저장되는 영역이다.
     */
    @Column(name = "PASSWORD", nullable = false, length = 255)
    private String password;

    @Column(name = "NAME", nullable = false, length = 50)
    private String name;

    @Column(name = "NICKNAME", nullable = false, length = 50)
    private String nickname;

    @Column(name = "EMAIL", nullable = false, length = 100)
    private String email;

    @Column(name = "PHONE", length = 20)
    private String phone;

    /*
     * 현재 DB에서는
     * 
     * ACTIVE
     * WITHDRAWN
     * 
     * 두 상태만 허용한다.
     */
    @Column(name = "STATUS", nullable = false, length = 20)
    private String status;

    /*
     * Oracle TIMESTAMP를 Java에서는
     * LocalDateTime으로 받을 수 있다.
     */
    @Column(name = "CREATED_AT", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "UPDATED_AT", nullable = false)
    private LocalDateTime updatedAt;

    /*
     * 회원 탈퇴 전에는 NULL일 수 있으므로
     * nullable = false를 지정하지 않는다.
     */
    @Column(name = "WITHDRAWN_AT")
    private LocalDateTime withdrawnAt;

    /*
     * JPA는 DB에서 읽어온 값을 이용해 객체를 만들 때
     * 기본 생성자를 필요로 한다.
     */
    protected User() {
    }

    /*
     * 지금은 조회 기능을 준비하는 단계이므로
     * 우선 Getter만 제공한다.
     * 
     * 나중에 사용자 생성/수정 기능이 실제로 필요해질 때
     * 생성자나 변경 메서드를 목적에 맞게 추가한다.
     */

    public Long getUserId() {
        return userId;
    }

    public String getLoginId() {
        return loginId;
    }

    public String getPassword() {
        return password;
    }

    public String getName() {
        return name;
    }

    public String getNickname() {
        return nickname;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public String getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public LocalDateTime getWithdrawnAt() {
        return withdrawnAt;
    }
}