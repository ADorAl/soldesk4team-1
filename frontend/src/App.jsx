
/*
 * ============================================================
 * 파일명: App.jsx
 * 위치: src/App.jsx
 * ============================================================
 *
 * [파일 목적]
 * TeamPlace 프론트엔드의 페이지 이동과 공통 레이아웃을
 * 관리하는 최상위 컴포넌트이다.
 *
 * [현재 연결된 페이지]
 * /dashboard          : 대시보드
 * /projects           : 프로젝트 목록
 * /projects/new       : 프로젝트 생성
 * /projects/:projectId: 프로젝트 상세
 *
 * [관련 파일]
 * - main.jsx : BrowserRouter 설정
 * - components/Sidebar.jsx : 공통 사이드바
 * - pages/ProjectListPage.jsx : 프로젝트 목록
 * - pages/ProjectCreatePage.jsx : 프로젝트 생성
 * - pages/ProjectDetailPage.jsx : 프로젝트 상세
 *
 * [이번 변경]
 * 기존 useState 기반 화면 전환을
 * React Router 기반 URL 이동으로 변경한다.
 *
 * [팀원 인계]
 * 1. BrowserRouter는 main.jsx에 이미 존재한다.
 *    이 파일에서 중복으로 감싸지 않는다.
 *
 * 2. 새로운 화면을 추가하면 Routes에 Route를 등록한다.
 *
 * 3. 로그인/회원가입 기능을 통합할 때 인증 경로를
 *    추가하고, 필요하면 보호된 라우트를 구성한다.
 *
 * 4. 현재 URL만으로 인증이나 권한이 보장되지 않는다.
 *    백엔드 Service의 권한 검사를 반드시 유지한다.
 *
 * 5. 아직 로그인 기능이 없으므로 개발용 사용자
 *    식별 방식은 기존 백엔드 설정을 따른다.
 * ============================================================
 */

import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'

import Sidebar from './components/Sidebar'
import ProjectListPage from './pages/ProjectListPage'
import ProjectCreatePage from './pages/ProjectCreatePage'
import ProjectDetailPage from './pages/ProjectDetailPage'


// ------------------------------------------------------------
// 1. 대시보드 요약 카드
// ------------------------------------------------------------

/*
 * [현재]
 * API가 연결되지 않은 통계는 '—'로 표시한다.
 *
 * [TODO]
 * 프로젝트/업무/초대 관련 API를 연결해
 * 실제 사용자 기준 통계로 교체한다.
 *
 * [팀원 인계]
 * 전체 업무와 내 담당 업무의 집계 범위를 먼저
 * 결정해야 한다.
 *
 * PROJECT_TASK의 progress 및 TASK_STATUS 변경은
 * 현재 담당 범위에 포함하지 않는다.
 */
const summaryCards = [
  { title: '참여 프로젝트', value: '—', icon: '▣' },
  { title: '전체 업무', value: '—', icon: '☷' },
  { title: '내 담당 업무', value: '—', icon: '✓' },
  { title: '받은 초대', value: '—', icon: '✉' },
]


// ------------------------------------------------------------
// 2. DashboardPage
// ------------------------------------------------------------

/*
 * [파일 내 컴포넌트]
 * 기존 대시보드 디자인을 유지한다.
 *
 * [TODO]
 * 프로젝트가 커지면
 * src/pages/DashboardPage.jsx로 분리할 수 있다.
 *
 * [변경 사항]
 * 이전에는 부모로부터 onNavigate를 전달받았다.
 * 이제 useNavigate()를 직접 사용해 이동한다.
 */
function DashboardPage() {

  /*
   * useNavigate()
   *
   * React Router가 제공하는 페이지 이동 함수.
   *
   * navigate('/projects')
   * → 프로젝트 목록으로 이동
   * → URL 및 브라우저 방문 기록 변경
   */
  const navigate = useNavigate()

  return (
    <main className="min-w-0 flex-1 p-8">

      {/* ======================================================
          대시보드 상단

          [TODO]
          로그인 기능과 통합하면 실제 nickname을 표시한다.
         ====================================================== */}
      <header className="mb-8">
        <p className="mb-2 text-sm font-medium text-blue-600">
          DASHBOARD
        </p>

        <h1 className="text-3xl font-bold tracking-tight">
          안녕하세요, 사용자님!
        </h1>

        <p className="mt-3 text-sm text-slate-500">
          참여 중인 프로젝트와 업무 현황을 확인해 보세요.
        </p>
      </header>


      {/* ======================================================
          프로젝트 및 업무 요약 카드

          [Tailwind CSS]
          grid           : 격자 레이아웃
          grid-cols-1    : 기본 화면에서 한 열
          md:grid-cols-2 : 중간 화면부터 두 열
          xl:grid-cols-4 : 큰 화면부터 네 열
          gap-5          : 카드 사이 간격 20px

          [TODO]
          실제 API 데이터를 받아 표시한다.
         ====================================================== */}
      <section
        className="
          mb-8 grid grid-cols-1 gap-5
          md:grid-cols-2 xl:grid-cols-4
        "
        aria-label="프로젝트 및 업무 요약"
      >
        {summaryCards.map((card) => (
          <article
            key={card.title}
            className="
              rounded-xl border border-slate-200
              bg-white p-6 shadow-sm
            "
          >
            <div className="mb-4 flex items-center justify-between">

              <h2 className="text-sm font-medium text-slate-500">
                {card.title}
              </h2>

              <span
                className="text-xl text-blue-500"
                aria-hidden="true"
              >
                {card.icon}
              </span>

            </div>

            <p className="text-3xl font-bold text-slate-800">
              {card.value}
            </p>

          </article>
        ))}
      </section>


      {/* ======================================================
          내 프로젝트 미리보기

          [현재]
          전체 프로젝트 보기 버튼 제공

          [TODO]
          실제 프로젝트 데이터를 불러와 미리보기를 표시한다.

          [Tailwind CSS]
          rounded-xl : 둥근 모서리
          border     : 테두리
          bg-white   : 흰색 배경
          shadow-sm  : 약한 그림자
         ====================================================== */}
      <section
        className="
          rounded-xl border border-slate-200
          bg-white p-6 shadow-sm
        "
      >

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

          <div>
            <h2 className="text-xl font-bold">
              내 프로젝트
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              참여하고 있는 프로젝트를 확인할 수 있습니다.
            </p>
          </div>

          {/*
            [React Router 이동]

            기존:
            onNavigate('projects')

            변경:
            navigate('/projects')

            URL이 변경되므로 브라우저 뒤로가기와
            앞으로가기에 해당 이동이 기록된다.
          */}
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="
              cursor-pointer rounded-lg bg-blue-600
              px-4 py-2 text-sm font-semibold text-white
              hover:bg-blue-700
            "
          >
            전체 프로젝트 보기 →
          </button>

        </div>

        <div
          className="
            flex min-h-44 flex-col items-center justify-center
            rounded-lg border-2 border-dashed border-slate-200
            bg-slate-50 px-4 text-center
          "
        >
          <p className="font-medium text-slate-600">
            프로젝트 목록 연결 예정
          </p>

          <p className="mt-2 text-sm text-slate-400">
            추후 실제 참여 프로젝트를 이곳에 표시합니다.
          </p>
        </div>

      </section>

    </main>
  )
}


// ------------------------------------------------------------
// 3. ProjectDetailRoute
// ------------------------------------------------------------

/*
 * [파일 내 보조 컴포넌트]
 *
 * URL의 프로젝트 ID를 읽어서
 * 기존 ProjectDetailPage에 전달한다.
 *
 * 예:
 * /projects/5
 *   ↓
 * useParams()
 *   ↓
 * projectId = '5'
 *   ↓
 * ProjectDetailPage
 *
 * [팀원 인계]
 * URL 매개변수는 문자열이다.
 * 실제 유효성 검증은 projectApi.js의
 * getProjectDetail()에서도 수행한다.
 *
 * 이 컴포넌트는 API를 직접 호출하지 않는다.
 */
function ProjectDetailRoute() {

  const { projectId } = useParams()
  const navigate = useNavigate()

  return (
    <ProjectDetailPage
      projectId={projectId}
      onBack={() => navigate('/projects')}
    />
  )
}


// ------------------------------------------------------------
// 4. App 최상위 컴포넌트
// ------------------------------------------------------------

function App() {

  /*
   * [React Router Hook]
   *
   * useNavigate():
   * 코드에서 다른 URL로 이동할 때 사용한다.
   *
   * useLocation():
   * 현재 브라우저 URL 정보를 가져온다.
   *
   * 기존 useState(activeMenu)는 더 이상 필요하지 않다.
   * 현재 활성 메뉴는 URL을 기준으로 판단한다.
   */
  const navigate = useNavigate()
  const location = useLocation()

  /*
   * [사이드바 활성 메뉴]
   *
   * /dashboard → dashboard
   *
   * /projects
   * /projects/new
   * /projects/5
   * → projects
   *
   * [팀원 인계]
   * /projects로 시작하는 하위 화면은
   * 모두 '내 프로젝트' 메뉴를 활성화한다.
   *
   * 추후 다른 기능을 추가할 경우
   * 경로 중복이 발생하지 않도록 확인한다.
   */
  let activeMenu = 'dashboard'

  if (
    location.pathname === '/projects' ||
    location.pathname.startsWith('/projects/')
  ) {
    activeMenu = 'projects'
  }

  /*
   * [사이드바 메뉴 클릭]
   *
   * 기존 Sidebar.jsx는 onMenuClick(menuId)을 호출한다.
   *
   * 따라서 Sidebar.jsx를 이번 단계에서 수정하지 않고,
   * 여기서 메뉴 ID를 URL로 변환한다.
   *
   * [TODO]
   * 나중에 Sidebar.jsx를 NavLink 방식으로 변경하면
   * 아래 함수를 단순화할 수 있다.
   */
  function handleMenuClick(menuId) {

    if (menuId === 'dashboard') {
      navigate('/dashboard')
      return
    }

    if (menuId === 'projects') {
      navigate('/projects')
      return
    }

    /*
     * 받은 초대 화면은 아직 구현하지 않았다.
     * 구현되지 않은 경로로 이동시키지 않는다.
     */
    if (menuId === 'invitations') {
      window.alert('받은 초대 화면은 아직 구현되지 않았습니다.')
      return
    }

    window.alert('해당 화면은 아직 구현되지 않았습니다.')
  }

  return (
    /*
     * [공통 레이아웃]
     *
     * flex         : 사이드바와 메인 화면 가로 배치
     * min-h-screen : 브라우저 화면 높이 확보
     * bg-slate-100 : 연한 회색 배경
     * text-slate-800 : 기본 글자색
     *
     * [팀원 인계]
     * 공통 사이드바는 여기에 한 번만 배치한다.
     * 개별 페이지에서 사이드바를 중복 생성하지 않는다.
     */
    <div className="flex min-h-screen bg-slate-100 text-slate-800">

      {/* ======================================================
          공통 사이드바

          현재 URL을 기준으로 활성 메뉴를 표시한다.
         ====================================================== */}
      <Sidebar
        activeMenu={activeMenu}
        onMenuClick={handleMenuClick}
      />


      {/* ======================================================
          React Router 페이지 연결

          Routes:
          현재 URL에 맞는 Route를 선택한다.

          Route:
          path와 element를 연결한다.

          Navigate:
          특정 주소에서 다른 주소로 이동한다.

          replace:
          리다이렉트 전 주소를 방문 기록에서 대체한다.

          [팀원 인계]
          새 페이지를 추가할 때는 여기에 Route를 등록한다.
          인증 기능 통합 시 보호된 경로를 설정할 수 있다.
         ====================================================== */}
      <Routes>

        {/*
          최초 접속 주소: /

          대시보드 주소로 이동한다.
          replace를 사용해 불필요한 뒤로가기 기록을 줄인다.
        */}
        <Route
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />

        {/* 대시보드 */}
        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />

        {/* ==================================================
            프로젝트 목록

            기존 조회 API 기능을 그대로 유지한다.

            Props:
            onCreate       : 생성 화면 이동
            onSelectProject: 선택 프로젝트 상세 이동
           ================================================== */}
        <Route
          path="/projects"
          element={
            <ProjectListPage
              onCreate={() => navigate('/projects/new')}
              onSelectProject={(projectId) =>
                navigate(`/projects/${projectId}`)
              }
            />
          }
        />

        {/* ==================================================
            프로젝트 생성

            onCancel:
            프로젝트 목록으로 돌아간다.

            onCreated(projectId):
            생성 성공 후 해당 프로젝트 상세 페이지로 이동한다.

            실제 POST 요청은 ProjectCreatePage가 담당한다.
           ================================================== */}
        <Route
          path="/projects/new"
          element={
            <ProjectCreatePage
              onCancel={() => navigate('/projects')}
              onCreated={(projectId) =>
                navigate(`/projects/${projectId}`, {
                  replace: true,
                })
              }
            />
          }
        />

        {/* ==================================================
            프로젝트 상세

            :projectId는 URL 매개변수이다.

            예:
            /projects/5
            /projects/2

            ProjectDetailRoute에서 useParams()로 ID를 읽는다.

            [주의]
            프로젝트 ID를 아는 것과 조회 권한을 가지는 것은
            별개다. 백엔드 권한 검사를 유지한다.
           ================================================== */}
        <Route
          path="/projects/:projectId"
          element={<ProjectDetailRoute />}
        />

        {/*
          [등록되지 않은 URL]

          아직 404 페이지를 만들지 않았으므로
          대시보드로 이동하도록 처리한다.

          [TODO]
          팀원 기능 통합 시 별도 NotFoundPage로 교체할 수 있다.
        */}
        <Route
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />

      </Routes>

    </div>
  )
}

export default App
