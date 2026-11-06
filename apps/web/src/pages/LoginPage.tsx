import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const user = await login(email, password);
      navigate(user.role === "ADMIN" ? "/admin" : "/app");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Đăng nhập thất bại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f8f5] px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-xl border p-6">
        <p className="text-2xl font-extrabold text-bhx-green text-center mb-1">BHX</p>
        <p className="text-center text-gray-600 mb-6">Customer Insight — Đăng nhập</p>

        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded-lg px-3 py-2.5 mb-4" type="email" required />

        <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2.5 mb-4" type="password" required />

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl bg-bhx-green text-white font-semibold disabled:opacity-50">
          Đăng nhập
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          Chỉ cần lấy mã QR khảo sát?{" "}
          <Link to="/lay-qr" className="underline">
            Không cần đăng nhập
          </Link>
        </p>
      </form>
    </div>
  );
}
