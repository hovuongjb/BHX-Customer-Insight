import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiFetch } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

interface Shop {
  id: string;
  name: string;
  code: string;
}

interface RatioItem {
  label: string;
  count: number;
  ratio: number;
}

interface ShopSummary {
  sampleSize: number;
  totalSessions: number;
  completedCount: number;
  qrCount: number;
  staffCount: number;
  completionRate: number;
  avgDurationSeconds: number | null;
  buyOutsideByGroup: RatioItem[];
  wantImprovementByGroup: RatioItem[];
  topFactors: RatioItem[];
  topBrands: RatioItem[];
  topPackageSizes: RatioItem[];
  topProductTypes: RatioItem[];
  topPromotions: RatioItem[];
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-2xl font-bold text-bhx-greenDark">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function RatioChart({ title, data, sampleSize }: { title: string; data: RatioItem[]; sampleSize: number }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="font-semibold mb-1">{title}</p>
      <p className="text-xs text-gray-400 mb-3">N = {sampleSize} khảo sát hợp lệ · có thể chọn nhiều nên tổng tỷ lệ có thể &gt; 100%</p>
      <ResponsiveContainer width="100%" height={Math.max(120, data.length * 36)}>
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" unit="%" />
          <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v: number, _n, p) => [`${v}% (${p.payload.count})`, "Tỷ lệ"]} />
          <Bar dataKey="ratio" fill="#1a7a3c" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ShopDashboardPage() {
  const { user } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState<string>("");
  const [summary, setSummary] = useState<ShopSummary | null>(null);

  useEffect(() => {
    apiFetch<{ data: Shop[] }>("/shops").then((res) => {
      setShops(res.data);
      setShopId(user?.shopId ?? res.data[0]?.id ?? "");
    });
  }, [user?.shopId]);

  useEffect(() => {
    if (!shopId) return;
    apiFetch<ShopSummary>(`/analytics/shop/${shopId}/summary`).then(setSummary);
  }, [shopId]);

  const avgDuration = useMemo(() => {
    if (!summary?.avgDurationSeconds) return "—";
    const m = Math.floor(summary.avgDurationSeconds / 60);
    const s = summary.avgDurationSeconds % 60;
    return `${m} phút ${s} giây`;
  }, [summary]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Dashboard siêu thị</h1>
        {shops.length > 1 && (
          <select value={shopId} onChange={(e) => setShopId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {!summary ? (
        <p className="text-gray-500">Đang tải...</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Tổng số khảo sát" value={summary.totalSessions} />
            <StatTile label="Khảo sát hợp lệ" value={summary.sampleSize} />
            <StatTile label="Qua QR" value={summary.qrCount} />
            <StatTile label="Nhân viên khảo sát" value={summary.staffCount} />
            <StatTile label="Tỷ lệ hoàn tất" value={`${summary.completionRate}%`} />
            <StatTile label="Thời gian khảo sát TB" value={avgDuration} />
          </div>

          <RatioChart title="Tỷ lệ mua nhóm hàng ở nơi khác" data={summary.buyOutsideByGroup} sampleSize={summary.sampleSize} />
          <RatioChart title="Nhóm hàng muốn BHX cải thiện" data={summary.wantImprovementByGroup} sampleSize={summary.sampleSize} />
          <RatioChart title="Top yếu tố cần thay đổi" data={summary.topFactors} sampleSize={summary.sampleSize} />
          <RatioChart title="Top nhãn hiệu được yêu cầu" data={summary.topBrands} sampleSize={summary.sampleSize} />
          <RatioChart title="Top quy cách được yêu cầu" data={summary.topPackageSizes} sampleSize={summary.sampleSize} />
          <RatioChart title="Top loại sản phẩm được yêu cầu" data={summary.topProductTypes} sampleSize={summary.sampleSize} />
          <RatioChart title="Top hình thức khuyến mãi" data={summary.topPromotions} sampleSize={summary.sampleSize} />
        </div>
      )}
    </div>
  );
}
