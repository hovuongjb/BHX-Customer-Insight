import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const tabs = [
  { to: "/admin/reports", label: "Báo cáo kết quả" },
  { to: "/admin/sessions", label: "Phản hồi chi tiết" },
  { to: "/admin/questions", label: "Câu hỏi & đáp án" },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f7f8f5]">
      <header className="bg-bhx-greenDark text-white px-4 py-3 flex items-center justify-between">
        <span className="font-bold">BHX Customer Insight — Quản trị</span>
        <div className="flex items-center gap-4 text-sm">
          <NavLink to="/app" className="underline">
            Về trang khảo sát
          </NavLink>
          <span className="hidden sm:inline">{user?.fullName}</span>
          <button
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            className="underline"
          >
            Đăng xuất
          </button>
        </div>
      </header>
      <nav className="flex gap-1 px-4 bg-white border-b overflow-x-auto">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `px-3 py-3 text-sm whitespace-nowrap border-b-2 ${isActive ? "border-bhx-green text-bhx-greenDark font-semibold" : "border-transparent text-gray-600"}`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <main className="px-4 py-5 max-w-6xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
