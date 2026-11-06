import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "../../api/client";

interface QuestionData {
  questionKey: string;
  editableOptionList: boolean;
  version: number;
  labelText: string;
  options: { optionKey: string; labelText: string; isExclusive: boolean }[];
  history: { version: number; labelText: string; createdAt: string }[];
}

interface ProductGroup {
  id: string;
  code: string;
  name: string;
}

interface CatalogItem {
  id: string;
  productGroupId: string;
  name?: string;
  label?: string;
  displayOrder: number;
  isActive: boolean;
}

type CatalogKind = "brands" | "package-sizes" | "product-types";

const META: Record<string, { title: string; hint: string; catalog?: CatalogKind; renameGroups?: boolean }> = {
  Q1: { title: "Câu 1 — Nhóm hàng mua ở nơi khác", hint: "Tên các nhóm hàng hiển thị ở Câu 1 & Câu 2 sửa ở mục bên dưới.", renameGroups: true },
  Q2: { title: "Câu 2 — Nhóm hàng muốn BHX cải thiện", hint: "Danh sách nhóm hàng lấy từ lựa chọn ở Câu 1." },
  Q3: { title: "Câu 3 — Yếu tố BHX cần thay đổi", hint: "7 yếu tố là cố định theo nghiệp vụ, chỉ sửa được cách diễn đạt." },
  Q4A: { title: "Câu 4A — Giá bán (chọn một)", hint: "Có thể thêm/bớt/đổi thứ tự đáp án." },
  Q4B: { title: "Câu 4B — Khuyến mãi (chọn nhiều)", hint: "Có thể thêm/bớt/đổi thứ tự đáp án." },
  Q4C: { title: "Câu 4C — Nhãn hiệu (chọn nhiều)", hint: "Danh sách nhãn hiệu theo từng nhóm hàng sửa ở mục bên dưới.", catalog: "brands" },
  Q4D: { title: "Câu 4D — Dung tích/quy cách (chọn nhiều)", hint: "Danh sách quy cách theo từng nhóm hàng sửa ở mục bên dưới.", catalog: "package-sizes" },
  Q4E: { title: "Câu 4E — Loại sản phẩm (chọn nhiều)", hint: "Danh sách loại sản phẩm theo từng nhóm hàng sửa ở mục bên dưới.", catalog: "product-types" },
};

const inputCls = "border rounded-lg px-2.5 py-1.5 text-sm w-full bg-white";
const smallBtn = "px-2 py-1 rounded border text-xs text-gray-600 disabled:opacity-30";

function itemName(i: CatalogItem) {
  return i.name ?? i.label ?? "";
}

function ProductGroupNames({ groups, onChanged }: { groups: ProductGroup[]; onChanged: () => void }) {
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold mb-2">Tên nhóm hàng</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {groups.map((g) => (
          <input
            key={`${g.id}:${g.name}`}
            defaultValue={g.name}
            className={inputCls}
            onBlur={async (e) => {
              const name = e.target.value.trim();
              if (name && name !== g.name) {
                await apiFetch(`/catalog/product-groups/${g.id}`, { method: "PATCH", body: JSON.stringify({ name }) });
                onChanged();
              }
            }}
          />
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-1">Đổi xong bấm ra ngoài ô để lưu. Tên mới áp dụng ngay cho khảo sát và báo cáo.</p>
    </div>
  );
}

function CatalogList({ kind, group, items, onChanged }: { kind: CatalogKind; group: ProductGroup; items: CatalogItem[]; onChanged: () => void }) {
  const [newName, setNewName] = useState("");
  const sorted = items.filter((i) => i.productGroupId === group.id).sort((a, b) => a.displayOrder - b.displayOrder);

  async function patch(id: string, body: Record<string, unknown>) {
    await apiFetch(`/catalog/${kind}/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    onChanged();
  }

  async function move(index: number, delta: number) {
    const a = sorted[index];
    const b = sorted[index + delta];
    if (!a || !b) return;
    // Orders can tie after seeding/adds, so assign explicit distinct positions.
    const ordered = [...sorted];
    ordered[index] = b;
    ordered[index + delta] = a;
    await Promise.all(ordered.map((it, pos) => (it.displayOrder === pos ? null : apiFetch(`/catalog/${kind}/${it.id}`, { method: "PATCH", body: JSON.stringify({ displayOrder: pos }) }))));
    onChanged();
  }

  async function add() {
    const label = newName.trim();
    if (!label) return;
    await apiFetch(`/catalog/${kind}`, {
      method: "POST",
      body: JSON.stringify({ productGroupId: group.id, label, displayOrder: sorted.length }),
    });
    setNewName("");
    onChanged();
  }

  return (
    <div className="border rounded-lg p-3">
      <p className="font-semibold text-sm text-bhx-greenDark mb-2">{group.name}</p>
      <div className="space-y-1.5">
        {sorted.map((it, i) => (
          <div key={it.id} className="flex items-center gap-1.5">
            <input
              key={`${it.id}:${itemName(it)}`}
              defaultValue={itemName(it)}
              disabled={!it.isActive}
              className={`${inputCls} ${it.isActive ? "" : "line-through text-gray-400"}`}
              onBlur={(e) => {
                const label = e.target.value.trim();
                if (label && label !== itemName(it)) patch(it.id, { label });
              }}
            />
            <button className={smallBtn} disabled={i === 0} onClick={() => move(i, -1)} title="Lên">
              ▲
            </button>
            <button className={smallBtn} disabled={i === sorted.length - 1} onClick={() => move(i, 1)} title="Xuống">
              ▼
            </button>
            <button className={smallBtn} onClick={() => patch(it.id, { isActive: !it.isActive })}>
              {it.isActive ? "Ẩn" : "Hiện"}
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Thêm mới..." className={inputCls} />
        <button onClick={add} className="px-3 py-1.5 rounded-lg bg-bhx-green text-white text-sm whitespace-nowrap">
          Thêm
        </button>
      </div>
    </div>
  );
}

function QuestionCard({
  q,
  groups,
  catalogItems,
  onSaved,
  onCatalogChanged,
}: {
  q: QuestionData;
  groups: ProductGroup[];
  catalogItems: Record<CatalogKind, CatalogItem[]>;
  onSaved: () => void;
  onCatalogChanged: () => void;
}) {
  const meta = META[q.questionKey];
  const [text, setText] = useState(q.labelText);
  const [options, setOptions] = useState(q.options.map((o) => ({ optionKey: o.optionKey as string | undefined, labelText: o.labelText })));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setText(q.labelText);
    setOptions(q.options.map((o) => ({ optionKey: o.optionKey, labelText: o.labelText })));
  }, [q]);

  const dirty = text !== q.labelText || JSON.stringify(options) !== JSON.stringify(q.options.map((o) => ({ optionKey: o.optionKey, labelText: o.labelText })));

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch<{ version: number }>(`/questions/${q.questionKey}/versions`, {
        method: "POST",
        body: JSON.stringify({ labelText: text, options }),
      });
      setMessage({ ok: true, text: `Đã lưu — phiên bản ${res.version}. Áp dụng ngay cho các khảo sát mới.` });
      onSaved();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : "Không lưu được." });
    } finally {
      setSaving(false);
    }
  }

  const move = (i: number, d: number) =>
    setOptions((o) => {
      const next = [...o];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h2 className="font-bold">{meta.title}</h2>
        <span className="text-xs text-gray-400">Phiên bản hiện tại: v{q.version}</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">{meta.hint}</p>

      <label className="text-xs text-gray-500">Nội dung câu hỏi</label>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className={`${inputCls} mb-3`} />

      {options.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1">{q.editableOptionList ? "Danh sách đáp án" : "Đáp án cố định (chỉ sửa chữ)"}</p>
          <div className="space-y-1.5">
            {options.map((o, i) => (
              <div key={o.optionKey ?? `new-${i}`} className="flex items-center gap-1.5">
                <input value={o.labelText} onChange={(e) => setOptions((all) => all.map((x, j) => (j === i ? { ...x, labelText: e.target.value } : x)))} className={inputCls} />
                {q.editableOptionList && (
                  <>
                    <button className={smallBtn} disabled={i === 0} onClick={() => move(i, -1)}>
                      ▲
                    </button>
                    <button className={smallBtn} disabled={i === options.length - 1} onClick={() => move(i, 1)}>
                      ▼
                    </button>
                    <button className={`${smallBtn} text-red-600`} disabled={options.length <= 1} onClick={() => setOptions((all) => all.filter((_, j) => j !== i))}>
                      Xoá
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          {q.editableOptionList && (
            <button onClick={() => setOptions((all) => [...all, { optionKey: undefined, labelText: "" }])} className="mt-2 px-3 py-1.5 rounded-lg border text-sm">
              + Thêm đáp án
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={save} disabled={!dirty || saving} className="px-4 py-2 rounded-lg bg-bhx-green text-white text-sm font-semibold disabled:opacity-40">
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
        {message && <span className={`text-sm ${message.ok ? "text-green-700" : "text-red-600"}`}>{message.text}</span>}
      </div>

      {meta.renameGroups && <ProductGroupNames groups={groups} onChanged={onCatalogChanged} />}

      {meta.catalog && (
        <div className="mt-4">
          <p className="text-sm font-semibold mb-2">Danh sách theo nhóm hàng (lưu ngay khi sửa)</p>
          <div className="grid md:grid-cols-2 gap-3">
            {groups.map((g) => (
              <CatalogList key={g.id} kind={meta.catalog!} group={g} items={catalogItems[meta.catalog!]} onChanged={onCatalogChanged} />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">Mục "Ẩn" không còn xuất hiện trong khảo sát nhưng vẫn giữ nguyên trong dữ liệu cũ.</p>
        </div>
      )}

      {q.history.length > 1 && (
        <details className="mt-3 text-xs text-gray-500">
          <summary className="cursor-pointer">Lịch sử phiên bản ({q.history.length})</summary>
          <ul className="mt-1 space-y-0.5">
            {q.history.map((h) => (
              <li key={h.version}>
                v{h.version} · {new Date(h.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} · {h.labelText}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<QuestionData[] | null>(null);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [catalog, setCatalog] = useState<Record<CatalogKind, CatalogItem[]>>({ brands: [], "package-sizes": [], "product-types": [] });

  const loadQuestions = useCallback(() => apiFetch<{ data: QuestionData[] }>("/questions").then((r) => setQuestions(r.data)), []);
  const loadCatalog = useCallback(async () => {
    const [g, b, p, t] = await Promise.all([
      apiFetch<{ data: ProductGroup[] }>("/catalog/product-groups"),
      apiFetch<{ data: CatalogItem[] }>("/catalog/brands"),
      apiFetch<{ data: CatalogItem[] }>("/catalog/package-sizes"),
      apiFetch<{ data: CatalogItem[] }>("/catalog/product-types"),
    ]);
    setGroups(g.data);
    setCatalog({ brands: b.data, "package-sizes": p.data, "product-types": t.data });
  }, []);

  useEffect(() => {
    loadQuestions();
    loadCatalog();
  }, [loadQuestions, loadCatalog]);

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-xl font-bold">Câu hỏi & đáp án</h1>
      <p className="text-sm text-gray-600">
        Mỗi lần lưu nội dung câu hỏi/đáp án sẽ tạo một <strong>phiên bản mới</strong>; các khảo sát đã làm giữ nguyên câu trả lời cũ. Thay đổi áp dụng cho khách bắt đầu khảo sát sau đó
        (khách đang làm dở có thể cần tải lại trang).
      </p>
      {!questions && <p className="text-gray-500">Đang tải...</p>}
      {questions?.map((q) => (
        <QuestionCard key={q.questionKey} q={q} groups={groups} catalogItems={catalog} onSaved={loadQuestions} onCatalogChanged={loadCatalog} />
      ))}
    </div>
  );
}
