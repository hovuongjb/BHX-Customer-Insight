import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

export interface ReportFilters {
  from: string;
  to: string;
  regionId: string;
  shopCode: string;
  source: string;
  campaignId: string;
}

export const emptyFilters: ReportFilters = { from: "", to: "", regionId: "", shopCode: "", source: "", campaignId: "" };

export function filtersToQuery(f: ReportFilters, extra: Record<string, string | number> = {}): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, ...extra })) if (v !== "" && v != null) params.set(k, String(v));
  const q = params.toString();
  return q ? `?${q}` : "";
}

interface FilterOptions {
  regions: { id: string; name: string }[];
  campaigns: { id: string; name: string }[];
}

const inputCls = "border rounded-lg px-2.5 py-2 text-sm bg-white";

export function ReportFilterBar({ value, onApply }: { value: ReportFilters; onApply: (f: ReportFilters) => void }) {
  const [draft, setDraft] = useState<ReportFilters>(value);
  const [options, setOptions] = useState<FilterOptions>({ regions: [], campaigns: [] });

  useEffect(() => {
    apiFetch<FilterOptions>("/admin/report-filters").then(setOptions);
  }, []);

  const set = (patch: Partial<ReportFilters>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply(draft);
      }}
      className="bg-white rounded-xl border p-3 flex flex-wrap gap-2 items-end"
    >
      <label className="text-xs text-gray-500">
        Từ ngày
        <input type="date" value={draft.from} onChange={(e) => set({ from: e.target.value })} className={`${inputCls} block mt-0.5`} />
      </label>
      <label className="text-xs text-gray-500">
        Đến ngày
        <input type="date" value={draft.to} onChange={(e) => set({ to: e.target.value })} className={`${inputCls} block mt-0.5`} />
      </label>
      <label className="text-xs text-gray-500">
        QLTP
        <select value={draft.regionId} onChange={(e) => set({ regionId: e.target.value })} className={`${inputCls} block mt-0.5`}>
          <option value="">Tất cả</option>
          {options.regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-gray-500">
        Mã siêu thị
        <input value={draft.shopCode} onChange={(e) => set({ shopCode: e.target.value.trim() })} placeholder="VD: 30051" className={`${inputCls} block mt-0.5 w-28`} />
      </label>
      <label className="text-xs text-gray-500">
        Nguồn
        <select value={draft.source} onChange={(e) => set({ source: e.target.value })} className={`${inputCls} block mt-0.5`}>
          <option value="">Tất cả</option>
          <option value="QR">QR khách tự làm</option>
          <option value="STAFF">Nhân viên</option>
        </select>
      </label>
      <label className="text-xs text-gray-500">
        Chiến dịch
        <select value={draft.campaignId} onChange={(e) => set({ campaignId: e.target.value })} className={`${inputCls} block mt-0.5`}>
          <option value="">Tất cả</option>
          {options.campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="px-4 py-2 rounded-lg bg-bhx-green text-white text-sm font-semibold">
        Xem
      </button>
      <button
        type="button"
        onClick={() => {
          setDraft(emptyFilters);
          onApply(emptyFilters);
        }}
        className="px-3 py-2 rounded-lg border text-sm"
      >
        Xoá lọc
      </button>
    </form>
  );
}
