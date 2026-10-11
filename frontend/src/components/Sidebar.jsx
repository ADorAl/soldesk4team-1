
/*
 * ============================================================
 * 파일명: Sidebar.jsx
 * 위치: src/components/Sidebar.jsx
 * ============================================================
 *
 * [파일 목적]
 * TeamPlace의 왼쪽 공통 사이드바를 담당한다.
 *
 * [담당 화면]
 * 1. 대시보드
 * 2. 내 프로젝트
 * 3. 받은 초대
 *
 * [다른 파일과의 관계]
 * - App.jsx에서 Sidebar 컴포넌트를 불러와 사용한다.
 * - 선택된 메뉴 정보는 부모 컴포넌트에서 전달받는다.
 * - 메뉴 클릭 시 부모에게 어떤 메뉴를 눌렀는지 알린다.
 *
 * [팀원 인계 가이드]
 * - 다른 기능을 추가할 때 sidebarMenus 배열을 수정한다.
 * - 공통 사이드바를 다른 페이지마다 복사하지 않는다.
 * - 로그인 기능이 완성되면 하단 사용자 정보를 연동한다.
 * - React Router 도입 시 메뉴 이동 처리를 변경할 예정이다.
 *
 * [주의]
 * 현재는 실제 페이지 이동 기능이 구현되어 있지 않다.
 * 다른 팀원이 담당하는 게시판, 채팅 등은 포함하지 않는다.
 * ============================================================
 */


// ------------------------------------------------------------
// 1. 사이드바 메뉴 데이터
// ------------------------------------------------------------

/*
 * 각 메뉴 객체의 의미
 *
 * id   : 메뉴를 구별하기 위한 고유 식별자
 * name : 사용자에게 표시되는 메뉴 이름
 * icon : 화면에 표시할 임시 아이콘 문자
 *
 * [팀원 인계]
 * 실제 아이콘 라이브러리를 사용하게 되면 icon 값을
 * React 아이콘 컴포넌트로 교체할 수 있다.
 *
 * 메뉴 ID는 다른 컴포넌트에서도 사용하므로
 * 임의로 변경하면 관련 코드를 함께 수정해야 한다.
 */
const sidebarMenus = [
    { id: 'dashboard', name: '대시보드', icon: '▦' },
    { id: 'projects', name: '내 프로젝트', icon: '▣' },
    { id: 'invitations', name: '받은 초대', icon: '✉' },
]


// ------------------------------------------------------------
// 2. Sidebar 컴포넌트
// ------------------------------------------------------------

/*
 * [Props 설명]
 *
 * activeMenu
 * - 현재 선택되어 있는 메뉴의 ID
 * - 예: 'dashboard'
 * - 선택된 메뉴에 파란색 배경을 적용하는 데 사용
 *
 * onMenuClick
 * - 사용자가 메뉴를 클릭했을 때 실행할 함수
 * - 부모 App.jsx에서 전달받는다.
 *
 * [데이터 흐름]
 *
 * App.jsx
 *   ↓ activeMenu, onMenuClick 전달
 * Sidebar.jsx
 *   ↓ 사용자 메뉴 클릭
 * onMenuClick(menu.id) 호출
 *   ↓
 * App.jsx에서 클릭 처리
 */
function Sidebar({ activeMenu, onMenuClick }) {
    return (
        /*
         * [사이드바 전체 영역]
         *
         * flex flex-col : 내부 요소를 세로 방향으로 배치
         * min-h-screen  : 화면 높이 이상으로 영역 확보
         * w-64          : 너비 256px
         * shrink-0      : 주변 요소 때문에 너비가 줄어들지 않음
         * bg-[#1e3452]  : TeamPlace 남색 배경
         * text-white    : 기본 글자색 흰색
         *
         * [팀원 인계]
         * 사이드바 너비를 바꾸면 메인 화면과의 배치를 확인한다.
         */
        <aside
            className="
        flex min-h-screen w-64 shrink-0 flex-col
        bg-[#1e3452] text-white
      "
        >

            {/* ======================================================
          3. 서비스 로고 영역

          border-b : 아래쪽 구분선
          px-6     : 좌우 여백 24px
          py-7     : 상하 여백 28px
         ====================================================== */}
            <div className="border-b border-white/10 px-6 py-7">

                <h1 className="text-2xl font-bold tracking-tight">
                    TeamPlace
                </h1>

                <p className="mt-1 text-xs text-slate-300">
                    프로젝트 협업 서비스
                </p>

            </div>


            {/* ======================================================
          4. 메뉴 출력 영역

          flex-1  : 남은 세로 공간을 차지
          space-y-2 : 메뉴 사이의 간격 8px
          px-3    : 좌우 여백 12px
          py-6    : 상하 여백 24px
         ====================================================== */}
            <nav
                className="flex-1 space-y-2 px-3 py-6"
                aria-label="주 메뉴"
            >

                {/*
          sidebarMenus.map()

          sidebarMenus 배열의 각 메뉴를 반복 출력한다.

          menu.id   : 메뉴 고유 ID
          menu.name : 화면 표시 이름
          menu.icon : 아이콘

          key는 React가 반복 출력한 요소를 구별하기 위해
          사용하는 값이다.
        */}
                {sidebarMenus.map((menu) => (

                    <button
                        key={menu.id}
                        type="button"

                        /*
                         * 메뉴를 클릭하면 부모가 전달한 함수를 호출한다.
                         *
                         * 현재: 대시보드 외 메뉴는 준비 중 안내
                         * 추후: React Router를 이용한 페이지 이동
                         */
                        onClick={() => onMenuClick(menu.id)}

                        /*
                         * [Tailwind CSS]
                         *
                         * flex items-center : 아이콘과 글자를 가로 정렬
                         * w-full            : 메뉴 너비를 사이드바에 맞춤
                         * gap-3             : 아이콘과 글자 사이 간격
                         * rounded-lg        : 메뉴 모서리를 둥글게
                         * px-4 py-3         : 메뉴 내부 여백
                         * text-left         : 글자 왼쪽 정렬
                         * text-sm           : 글자 크기
                         * transition-colors : 색상 변경 시 부드럽게 전환
                         *
                         * activeMenu === menu.id
                         * → 현재 선택된 메뉴인지 확인
                         *
                         * 선택된 메뉴: 파란색 배경
                         * 선택되지 않은 메뉴: 마우스를 올리면 배경 변경
                         */
                        className={`
              flex w-full cursor-pointer items-center gap-3
              rounded-lg px-4 py-3 text-left text-sm
              transition-colors
              ${activeMenu === menu.id
                                ? 'bg-blue-600 font-semibold text-white'
                                : 'text-slate-200 hover:bg-white/10'
                            }
            `}
                    >

                        {/* 현재 아이콘은 임시 문자로 표시한다. */}
                        <span
                            className="w-5 text-center text-lg"
                            aria-hidden="true"
                        >
                            {menu.icon}
                        </span>

                        {/* 메뉴 이름 */}
                        <span>{menu.name}</span>

                    </button>

                ))}

            </nav>


            {/* ======================================================
          5. 사용자 정보 영역

          [현재 상태]
          로그인 기능이 없으므로 임시 텍스트를 표시한다.

          [팀원 인계 / TODO]
          로그인 기능을 구현하는 팀원이 해당 영역에
          로그인한 사용자의 nickname을 연결할 수 있다.

          로그인 정보를 받아오는 방식은
          팀원과 통합할 때 확정해야 한다.

          개발용 X-Dev-User-Id 헤더는 실제 인증이 아니다.
         ====================================================== */}
            <div className="border-t border-white/10 p-5">

                <p className="text-sm font-semibold">
                    사용자
                </p>

                <p className="mt-1 text-xs text-slate-300">
                    로그인 기능 연동 예정
                </p>

            </div>

        </aside>
    )
}


// 다른 컴포넌트에서 Sidebar를 import할 수 있도록 내보낸다.
export default Sidebar
