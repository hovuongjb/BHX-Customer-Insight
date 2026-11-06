import { useEffect, useState } from "react";
import { apiFetch, apiFileUrl, ApiError } from "../../api/client";

interface ShopInfo {
  shopId: string;
  shopCode: string;
  shopName: string;
  qltpName: string;
}

interface QrCode {
  id: string;
  shopId: string;
  token: string;
  isActive: boolean;
  surveyUrl: string;
  shop: { name: string; code: string };
}

export function QrAdminPage() {
  const [shopCode, setShopCode] = useState("");
  const [checked, setChecked] = useState<ShopInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrCodes, setQrCodes] = useState<QrCode[]>([]);
  const [listSearch, setListSearch] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadQrCodes(search = "") {
    const query = search ? `?shopCode=${encodeURIComponent(search)}` : "";
    const res = await apiFetch<{ data: QrCode[] }>(`/qr${query}`);
    setQrCodes(res.data);
  }

  useEffect(() => {
    loadQrCodes();
  }, []);

  async function checkShop() {
    setError(null);
    setChecked(null);
    try {
      const info = await apiFetch<ShopInfo>("/qr/check-shop", { method: "POST", body: JSON.stringify({ shopCode }) });
      setChecked(info);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể kiểm tra siêu thị.");
    }
  }

  async function createQr() {
    setBusy(true);
    try {
      await apiFetch("/qr", { method: "POST", body: JSON.stringify({ shopCode }) });
      setChecked(null);
      setShopCode("");
      await loadQrCodes();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể tạo mã QR.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    await apiFetch(`/qr/${id}/revoke`, { method: "PATCH" });
    await loadQrCodes();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold mb-4">Tạo mã QR khảo sát</h1>

      <div className="bg-white rounded-xl border p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Mã siêu thị</label>
        <div className="flex gap-2">
          <input value={shopCode} onChange={(e) => setShopCode(e.target.value)} className="flex-1 border rounded-lg px-3 py-2" placeholder="SHOP001" />
          <button onClick={checkShop} className="px-4 py-2 rounded-lg border-2 border-bhx-green text-bhx-green font-semibold">
            Kiểm tra siêu thị
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        {checked && (
          <div className="mt-3 bg-green-50 rounded-lg px-3 py-2">
            <p className="font-semibold">
              {checked.shopName} <span className="text-gray-400 text-sm font-normal">({checked.shopCode})</span>
            </p>
            <p className="text-sm text-gray-600">QLTP: {checked.qltpName}</p>
            <button onClick={createQr} disabled={busy} className="mt-2 px-4 py-2 rounded-lg bg-bhx-green text-white font-semibold disabled:opacity-50">
              Tạo mã QR
            </button>
          </div>
        )}
      </div>

      <h2 className="text-lg font-semibold mb-3">Mã QR hiện có</h2>
      <div className="flex gap-2 mb-4">
        <input
          value={listSearch}
          onChange={(e) => setListSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadQrCodes(listSearch)}
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
          placeholder="Tìm theo mã siêu thị..."
        />
        <button onClick={() => loadQrCodes(listSearch)} className="px-3 py-2 rounded-lg border text-sm">
          Tìm
        </button>
      </div>
      {!listSearch && <p className="text-xs text-gray-400 mb-3">Hiển thị 20 mã QR mới nhất — nhập mã siêu thị ở trên để tìm cụ thể.</p>}
      <div className="space-y-4">
        {qrCodes.map((qr) => (
          <div key={qr.id} className="bg-white rounded-xl border p-4 flex gap-4 items-start">
            {qr.isActive && <img src={apiFileUrl(`/qr/${qr.id}/export?format=png`)} alt="QR" className="w-24 h-24 border rounded" />}
            <div className="flex-1">
              <p className="font-semibold">
                {qr.shop.name} <span className="text-gray-400 text-sm">({qr.shop.code})</span>
              </p>
              <p className="text-xs text-gray-500 break-all">{qr.surveyUrl}</p>
              <p className={`text-xs mt-1 ${qr.isActive ? "text-green-600" : "text-gray-400"}`}>{qr.isActive ? "Đang hoạt động" : "Đã vô hiệu hoá"}</p>
              {qr.isActive && (
                <div className="flex gap-3 mt-2 text-sm">
                  <a className="text-bhx-green underline" href={apiFileUrl(`/qr/${qr.id}/export?format=png`)} target="_blank" rel="noreferrer">
                    Tải PNG
                  </a>
                  <a className="text-bhx-green underline" href={apiFileUrl(`/qr/${qr.id}/export?format=svg`)} target="_blank" rel="noreferrer">
                    Tải SVG
                  </a>
                  <a className="text-bhx-green underline" href={apiFileUrl(`/qr/${qr.id}/export?format=poster`)} target="_blank" rel="noreferrer">
                    In poster A4
                  </a>
                  <button
                    onClick={() => navigator.clipboard.writeText(qr.surveyUrl)}
                    className="text-bhx-green underline"
                  >
                    Sao chép liên kết
                  </button>
                  <button onClick={() => revoke(qr.id)} className="text-red-600 underline">
                    Vô hiệu hoá
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {qrCodes.length === 0 && <p className="text-gray-500 text-sm">Chưa có mã QR nào.</p>}
      </div>
    </div>
  );
}
