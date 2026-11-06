import { useEffect, useState } from "react";
import { apiFetch, apiFileUrl } from "../../api/client";
import { emptyFilters, filtersToQuery, ReportFilterBar, type ReportFilters } from "../../components/ReportFilterBar";

interface SessionRow {
  id: string;
  startedAt: string;
  status: string;
  statusLabel: string;
  source: "QR" | "STAFF";
  isDuplicate: boolean;
  shopCode: string;
  shopName: string;
  qltpName: string;
  respondentName: string | null;
  phoneLast4: string | null;
  giftName: string | null;
  buyOutside: string[];
  wantImprovement: string[];
}

interface SessionList {
  total: number;
  page: number;
  pageSize: number;
  data: SessionRow[];
}

interface SessionDetail extends SessionRow {
  q1: { allAtBhx: boolean; groups: string[] };
  q2: { noSwitch: boolean; groups: string[] };
  perGroup: { group: string; factors: string[]; details: { type: string; label: string }[] }[];
}

const PAGE_SIZE = 20;
const fmt = (iso: string) => new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

function DetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [detail, setDetail] = useState<SessionDetail | null>(null);

  useEffect(() => {
    apiFetch<SessionDetail>(`/admin/reports/sessions/${id}`).then(setDetail);
  }, [id]);

  return (
    <div className="fixed inset-0 bg-black/40 z-20 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-3">
          <h2 className="font-bold text-lg">Chi tiết phản hồi</h2>
          <button onClick={onClose} className="text-gray-500 text-xl leading-none">
            ×
          </button>
        </div>
        {!detail ? (
          <p className="text-gray-500">Đang tải...</p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-semibold">
                {detail.shopName} <span className="text-gray-400 font-normal">({detail.shopCode})</span>
              </p>
              <p className="text-gray-500">QLTP: {detail.qltpName}</p>
              <p className="text-gray-500">
                {fmt(detail.startedAt)} · {detail.source === "QR" ? "Khách tự làm qua QR" : "Nhân viên khảo sát"} · {detail.statusLabel}
                {detail.isDuplicate ? " · Trùng" : ""}
              </p>
              {detail.respondentName && (
                <p className="text-gray-500">
                  Khách: {detail.respondentName} (SĐT ****{detail.phoneLast4})
                </p>
              )}
              <p className="mt-1">
                Quà đã chọn: <strong>{detail.giftName ?? "—"}</strong>
              </p>
            </div>

            <div>
              <p className="font-semibold">Câu 1 — Mua ở nơi khác</p>
              <p>{detail.q1.allAtBhx ? "Mua cả 4 nhóm tại BHX" : detail.q1.groups.join(", ") || "—"}</p>
            </div>
            <div>
              <p className="font-semibold">Câu 2 — Muốn BHX cải thiện</p>
              <p>{detail.q2.noSwitch ? "Chưa muốn chuyển nhóm nào" : detail.q2.groups.join(", ") || "—"}</p>
            </div>

            {detail.perGroup.map((g) => (
              <div key={g.group} className="border rounded-lg p-3">
                <p className="font-semibold text-bhx-greenDark">{g.group}</p>
                <p className="mt-1 text-gray-500 text-xs">Câu 3 — yếu tố cần thay đổi</p>
                <p>{g.factors.join("; ") || "—"}</p>
                {g.details.length > 0 && (
                  <>
                    <p className="mt-2 text-gray-500 text-xs">Câu 4 — mong muốn cụ thể</p>
                    <ul className="list-disc pl-5">
                      {g.details.map((d, i) => (
                        <li key={i}>
                          <span className="text-gray-500">{d.type}:</span> {d.label}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminSessionsPage() {
  const [filters, setFilters] = useState<ReportFilters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [list, setList] = useState<SessionList | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setList(null);
    apiFetch<SessionList>(`/admin/reports/sessions${filtersToQuery(filters, { page, pageSize: PAGE_SIZE })}`).then(setList);
  }, [filters, page]);

  const totalPages = list ? Math.max(1, Math.ceil(list.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold">Phản hồi chi tiết</h1>
        <a href={apiFileUrl(`/admin/reports/export.csv${filtersToQuery(filters)}`)} className="px-3 py-2 rounded-lg border border-bhx-green text-bhx-green text-sm font-semibold">
          Xuất CSV
        </a>
      </div>

      <ReportFilterBar
        value={filters}
        onApply={(f) => {
          setPage(1);
          setFilters(f);
        }}
      />

      <p className="text-xs text-gray-400">Danh sách này có tên khách và 4 số cuối SĐT; mỗi lần xem đều được ghi nhật ký truy cập. File CSV không chứa thông tin cá nhân.</p>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b bg-gray-50">
              <th className="py-2 px-3">Thời gian</th>
              <th className="py-2 px-3">Siêu thị</th>
              <th className="py-2 px-3">QLTP</th>
              <th className="py-2 px-3">Nguồn</th>
              <th className="py-2 px-3">Khách</th>
              <th className="py-2 px-3">Trạng thái</th>
              <th className="py-2 px-3">Mua ở nơi khác</th>
              <th className="py-2 px-3">Quà</th>
            </tr>
          </thead>
          <tbody>
            {!list && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-gray-400">
                  Đang tải...
                </td>
              </tr>
            )}
            {list?.data.map((r) => (
              <tr key={r.id} onClick={() => setOpenId(r.id)} className="border-b last:border-0 hover:bg-green-50 cursor-pointer">
                <td className="py-2 px-3 whitespace-nowrap">{fmt(r.startedAt)}</td>
                <td className="py-2 px-3">
                  {r.shopName} <span className="text-gray-400">({r.shopCode})</span>
                </td>
                <td className="py-2 px-3 whitespace-nowrap">{r.qltpName}</td>
                <td className="py-2 px-3">{r.source === "QR" ? "QR" : "Nhân viên"}</td>
                <td className="py-2 px-3 whitespace-nowrap">{r.respondentName ? `${r.respondentName} ****${r.phoneLast4}` : "—"}</td>
                <td className="py-2 px-3 whitespace-nowrap">
                  {r.statusLabel}
                  {r.isDuplicate && <span className="ml-1 text-xs text-orange-600">(trùng)</span>}
                </td>
                <td className="py-2 px-3">{r.buyOutside.join(", ") || "—"}</td>
                <td className="py-2 px-3">{r.giftName ?? "—"}</td>
              </tr>
            ))}
            {list && list.data.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-gray-400">
                  Không có phản hồi nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {list && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{list.total} phản hồi</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">
              Trước
            </button>
            <span>
              {page}/{totalPages}
            </span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">
              Sau
            </button>
          </div>
        </div>
      )}

      {openId && <DetailModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
