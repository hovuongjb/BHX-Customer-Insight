import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, apiFileUrl, ApiError } from "../../api/client";

interface ShopQrInfo {
  shopId: string;
  shopCode: string;
  shopName: string;
  surveyUrl: string;
}

export function GetQrPage() {
  const [shopCode, setShopCode] = useState("");
  const [info, setInfo] = useState<ShopQrInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shopCode.trim()) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    setCopied(false);
    try {
      const res = await apiFetch<ShopQrInfo>(`/public/shop-qr/${encodeURIComponent(shopCode.trim())}`);
      setInfo(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể lấy mã QR. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8f5] px-6 py-10">
      <div className="max-w-sm mx-auto">
        <p className="text-2xl font-extrabold text-bhx-green text-center mb-1">BHX</p>
        <p className="text-center text-gray-600 mb-6">Lấy mã QR khảo sát khách hàng</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Mã siêu thị</label>
          <div className="flex gap-2">
            <input
              value={shopCode}
              onChange={(e) => setShopCode(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2.5"
              placeholder="VD: 30051"
              inputMode="numeric"
              autoFocus
            />
            <button type="submit" disabled={loading} className="px-4 py-2.5 rounded-lg bg-bhx-green text-white font-semibold disabled:opacity-50">
              Lấy QR
            </button>
          </div>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </form>

        {info && (
          <div className="bg-white rounded-xl border p-4 mt-4 text-center">
            <p className="font-semibold text-gray-800">
              {info.shopName} <span className="text-gray-400 font-normal">({info.shopCode})</span>
            </p>
            <img
              src={apiFileUrl(`/public/shop-qr/${info.shopCode}/image?format=png`)}
              alt="QR khảo sát"
              className="w-56 h-56 mx-auto my-4 border rounded"
            />
            <p className="text-xs text-gray-500 break-all mb-3">{info.surveyUrl}</p>
            <div className="flex gap-2 justify-center text-sm">
              <a
                className="px-3 py-2 rounded-lg border text-bhx-green font-semibold"
                href={apiFileUrl(`/public/shop-qr/${info.shopCode}/image?format=png`)}
                target="_blank"
                rel="noreferrer"
              >
                Tải PNG
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(info.surveyUrl);
                  setCopied(true);
                }}
                className="px-3 py-2 rounded-lg border text-bhx-green font-semibold"
              >
                {copied ? "Đã sao chép" : "Sao chép liên kết"}
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          <Link to="/login" className="underline">
            Đăng nhập quản trị
          </Link>
        </p>
      </div>
    </div>
  );
}
