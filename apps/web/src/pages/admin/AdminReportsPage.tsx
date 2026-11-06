import { useEffect, useState } from "react";
import { apiFetch, apiFileUrl } from "../../api/client";
import { DailyChart, RatioChart, StatTile, type RatioItem } from "../../components/charts";
import { emptyFilters, filtersToQuery, ReportFilterBar, type ReportFilters } from "../../components/ReportFilterBar";

interface Summary {
  sampleSize: number;
  totalSessions: number;
  completedCount: number;
  duplicateCount: number;
  inProgressCount: number;
  qrCount: number;
  staffCount: number;
  completionRate: number;
  avgDurationSeconds: number | null;
  allAtBhxCount: number;
  noSwitchCount: number;
  buyOutsideByGroup: RatioItem[];
  wantImprovementByGroup: RatioItem[];
  topFactors: RatioItem[];
  topOpportunities: { group: string; factor: string; count: number; ratio: number }[];
  priceExpectations: RatioItem[];
  topPromotions: RatioItem[];
  topBrands: RatioItem[];
  topPackageSizes: RatioItem[];
  topProductTypes: RatioItem[];
  gifts: RatioItem[];
  byRegion: { regionId: string; regionName: string; total: number; valid: number; completionRate: number }[];
  byDay: { date: string; total: number; valid: number }[];
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  return `${Math.floor(seconds / 60)} phút ${seconds % 60} giây`;
}

export function AdminReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>(emptyFilters);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSummary(null);
    setError(null);
    apiFetch<Summary>(`/admin/reports/summary${filtersToQuery(filters)}`)
      .then(setSummary)
      .catch(() => setError("Không tải được báo cáo."));
  }, [filters]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold">Báo cáo kết quả khảo sát</h1>
        <a
          href={apiFileUrl(`/admin/reports/export.csv${filtersToQuery(filters)}`)}
          className="px-3 py-2 rounded-lg border border-bhx-green text-bhx-green text-sm font-semibold"
        >
          Xuất CSV (mở được bằng Excel)
        </a>
      </div>

      <ReportFilterBar value={filters} onApply={setFilters} />

      <p className="text-xs text-gray-500">
        Lưu ý: số liệu chỉ phản ánh khách đến BHX/quét QR tại siêu thị, <strong>không đại diện cho toàn bộ thị trường</strong> và không phải thị phần. Tỷ lệ tính trên số khảo sát hợp lệ (đã hoàn tất, không trùng).
      </p>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {!summary && !error && <p className="text-gray-500">Đang tải...</p>}

      {summary && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Tổng lượt khảo sát" value={summary.totalSessions} />
            <StatTile label="Khảo sát hợp lệ" value={summary.sampleSize} />
            <StatTile label="Tỷ lệ hoàn tất" value={`${summary.completionRate}%`} />
            <StatTile label="Thời gian TB" value={formatDuration(summary.avgDurationSeconds)} />
            <StatTile label="Qua QR" value={summary.qrCount} />
            <StatTile label="Nhân viên khảo sát" value={summary.staffCount} />
            <StatTile label="Lượt trùng" value={summary.duplicateCount} />
            <StatTile label="Chưa hoàn tất / bỏ dở" value={summary.inProgressCount} />
            <StatTile label="Mua đủ 4 nhóm tại BHX" value={summary.allAtBhxCount} />
            <StatTile label="Không muốn chuyển nhóm nào" value={summary.noSwitchCount} />
          </div>

          <DailyChart data={summary.byDay} />

          <div className="bg-white rounded-xl border p-4">
            <p className="font-semibold mb-1">Cơ hội cải thiện (nhóm hàng × yếu tố cần thay đổi)</p>
            <p className="text-xs text-gray-400 mb-3">Xếp theo số khách yêu cầu; % trên {summary.sampleSize} khảo sát hợp lệ.</p>
            {summary.topOpportunities.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Chưa có dữ liệu</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b">
                      <th className="py-2 pr-3">#</th>
                      <th className="py-2 pr-3">Nhóm hàng</th>
                      <th className="py-2 pr-3">Yếu tố cần thay đổi</th>
                      <th className="py-2 pr-3 text-right">Số khách</th>
                      <th className="py-2 text-right">Tỷ lệ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.topOpportunities.map((o, i) => (
                      <tr key={`${o.group}-${o.factor}`} className="border-b last:border-0">
                        <td className="py-2 pr-3 text-gray-400">{i + 1}</td>
                        <td className="py-2 pr-3 font-medium">{o.group}</td>
                        <td className="py-2 pr-3">{o.factor}</td>
                        <td className="py-2 pr-3 text-right">{o.count}</td>
                        <td className="py-2 text-right">{o.ratio}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <RatioChart title="Nhóm hàng khách mua ở nơi khác" data={summary.buyOutsideByGroup} sampleSize={summary.sampleSize} />
            <RatioChart title="Nhóm hàng muốn BHX cải thiện" data={summary.wantImprovementByGroup} sampleSize={summary.sampleSize} />
            <RatioChart title="Yếu tố cần thay đổi" data={summary.topFactors} sampleSize={summary.sampleSize} />
            <RatioChart title="Mức giá mong muốn so với nơi đang mua" data={summary.priceExpectations} sampleSize={summary.sampleSize} />
            <RatioChart title="Hình thức khuyến mãi ưa thích" data={summary.topPromotions} sampleSize={summary.sampleSize} />
            <RatioChart title="Nhãn hiệu được yêu cầu" data={summary.topBrands.slice(0, 12)} sampleSize={summary.sampleSize} />
            <RatioChart title="Quy cách được yêu cầu" data={summary.topPackageSizes.slice(0, 12)} sampleSize={summary.sampleSize} />
            <RatioChart title="Loại sản phẩm được yêu cầu" data={summary.topProductTypes.slice(0, 12)} sampleSize={summary.sampleSize} />
            <RatioChart title="Quà tặng khách đã chọn" data={summary.gifts} sampleSize={summary.sampleSize} />
          </div>

          <div className="bg-white rounded-xl border p-4">
            <p className="font-semibold mb-3">So sánh theo QLTP</p>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="py-2 pr-3">QLTP</th>
                    <th className="py-2 pr-3 text-right">Tổng lượt</th>
                    <th className="py-2 pr-3 text-right">Hợp lệ</th>
                    <th className="py-2 text-right">Tỷ lệ hoàn tất</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byRegion.map((r) => (
                    <tr key={r.regionId} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{r.regionName}</td>
                      <td className="py-2 pr-3 text-right">{r.total}</td>
                      <td className="py-2 pr-3 text-right">{r.valid}</td>
                      <td className="py-2 text-right">{r.completionRate}%</td>
                    </tr>
                  ))}
                  {summary.byRegion.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-400">
                        Chưa có dữ liệu
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
