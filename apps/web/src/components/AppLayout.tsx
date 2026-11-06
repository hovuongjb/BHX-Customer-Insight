import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-[#f7f8f5]">
      <header className="bg-bhx-green text-white px-4 py-3 flex items-center justify-between">
        <Link to="/app" className="font-bold">
          BHX Customer Insight
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:inline">{user?.fullName}</span>
          <button onClick={handleLogout} className="underline">
            Đăng xuất
          </button>
        </div>
      </header>
      <nav className="flex gap-4 px-4 py-2 bg-white border-b text-sm overflow-x-auto">
        {(user?.role === "STAFF" || user?.role === "SHOP_MANAGER" || user?.role === "REGION_MANAGER" || user?.role === "ADMIN") && (
          <Link to="/app/survey" className="whitespace-nowrap">
            Khảo sát
          </Link>
        )}
        {(user?.role === "SHOP_MANAGER" || user?.role === "REGION_MANAGER" || user?.role === "ADMIN") && (
          <Link to="/app/dashboard" className="whitespace-nowrap">
            Dashboard
          </Link>
        )}
        {(user?.role === "SHOP_MANAGER" || user?.role === "REGION_MANAGER" || user?.role === "ADMIN") && (
          <Link to="/app/qr" className="whitespace-nowrap">
            Mã QR
          </Link>
        )}
        {user?.role === "ADMIN" && (
          <Link to="/admin" className="whitespace-nowrap font-semibold text-bhx-green">
            Quản trị
          </Link>
        )}
      </nav>
      <main className="px-4 py-5 max-w-5xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
