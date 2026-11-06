import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface RatioItem {
  label: string;
  count: number;
  ratio: number;
}

export function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-2xl font-bold text-bhx-greenDark">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

export function RatioChart({ title, data, sampleSize }: { title: string; data: RatioItem[]; sampleSize: number }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="font-semibold mb-1">{title}</p>
      <p className="text-xs text-gray-400 mb-3">N = {sampleSize} khảo sát hợp lệ · có thể chọn nhiều nên tổng tỷ lệ có thể &gt; 100%</p>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">Chưa có dữ liệu</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(120, data.length * 36)}>
          <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" unit="%" />
            <YAxis type="category" dataKey="label" width={160} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number, _n, p) => [`${v}% (${p.payload.count} lượt)`, "Tỷ lệ"]} />
            <Bar dataKey="ratio" fill="#1a7a3c" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function DailyChart({ data }: { data: { date: string; total: number; valid: number }[] }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="font-semibold mb-3">Số lượt khảo sát theo ngày</p>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">Chưa có dữ liệu</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="total" name="Tất cả" fill="#c9d6cc" radius={[4, 4, 0, 0]} />
            <Bar dataKey="valid" name="Hợp lệ" fill="#1a7a3c" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
