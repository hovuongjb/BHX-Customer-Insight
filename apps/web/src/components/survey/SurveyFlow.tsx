import { useMemo, useState } from "react";
import { SurveyLayout } from "./SurveyLayout";
import { OptionCard } from "./OptionCard";
import {
  applyGift,
  applyQ1,
  applyQ2,
  applyQ3,
  applyQ4,
  buildPayload,
  computePhase,
  initialSurveyState,
  phaseKey,
  type Phase,
  type SurveyState,
} from "./surveyEngine";
import type { FactorKey, GiftOption, Q4Detail, SurveyAnswersPayload, SurveyConfigBundle } from "../../types";
import { FACTOR_LABELS } from "../../types";

const Q1_EXCLUSIVE_LABEL = "Không có – tôi thường mua cả 4 nhóm tại BHX";
const Q2_EXCLUSIVE_LABEL = "Chưa muốn chuyển nhóm nào";
const SELECTABLE_FACTORS: FactorKey[] = ["PRICE", "PROMOTION", "BRAND", "PACKAGE_SIZE", "PRODUCT_TYPE", "OTHER"];

interface SurveyFlowProps {
  config: SurveyConfigBundle;
  onComplete: (payload: SurveyAnswersPayload, giftId: string) => Promise<void>;
}

function optionLabel(config: SurveyConfigBundle, questionKey: string, optionKey: string, fallback: string): string {
  const q = config.questions.find((x) => x.questionKey === questionKey);
  return q?.options.find((o) => o.optionKey === optionKey)?.labelText ?? fallback;
}

function toggle<T>(list: T[], id: T): T[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function SurveyFlow({ config, onComplete }: SurveyFlowProps) {
  const [state, setState] = useState<SurveyState>(initialSurveyState);
  const [history, setHistory] = useState<{ phase: Phase; state: SurveyState }[]>([]);
  const [phase, setPhase] = useState<Phase>({ step: "Q1" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupsById = useMemo(() => Object.fromEntries(config.productGroups.map((g) => [g.id, g])), [config.productGroups]);
  const questionsByKey = useMemo(() => Object.fromEntries(config.questions.map((q) => [q.questionKey, q])), [config.questions]);

  function goForward(newState: SurveyState, next: Phase) {
    // Snapshot both the screen AND the full state so "Quay lại" can restore the
    // exact index counters that were in effect before this step was answered —
    // not just which screen was showing.
    setHistory((h) => [...h, { phase, state }]);
    setState(newState);
    if (next.step === "DONE") {
      finish(newState);
    } else {
      setPhase(next);
    }
  }

  function goBack() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setPhase(prev.phase);
      setState(prev.state);
      return h.slice(0, -1);
    });
  }

  async function finish(finalState: SurveyState) {
    if (!finalState.giftId) return; // guarded by computePhase — GIFT always comes before DONE
    setSubmitting(true);
    setError(null);
    try {
      await onComplete(buildPayload(finalState), finalState.giftId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi khảo sát. Vui lòng thử lại.");
      setSubmitting(false);
    }
  }

  const totalGroups = state.groupQueue.length || state.q2?.groups.length || 1;
  const progressPercent = (() => {
    switch (phase.step) {
      case "Q1":
        return 10;
      case "Q2":
        return 25;
      case "Q3":
        return 40 + (state.groupIndex / totalGroups) * 20;
      case "Q4":
        return 60 + (state.groupIndex / totalGroups) * 35;
      case "GIFT":
        return 95;
      default:
        return 100;
    }
  })();

  if (submitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f8f5] px-6 text-center">
        <p className="text-gray-600">Đang gửi khảo sát...</p>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-2 text-center">{error}</div>}
      {phase.step === "Q1" && (
        <GroupMultiSelectStep
          key={phaseKey(phase)}
          progressLabel="Câu 1/4"
          progressPercent={progressPercent}
          title={questionsByKey.Q1?.labelText ?? "Trong 4 nhóm hàng sau, nhóm nào anh/chị thường mua ở nơi khác thay vì BHX?"}
          groups={config.productGroups}
          exclusiveLabel={optionLabel(config, "Q1", "NONE", Q1_EXCLUSIVE_LABEL)}
          initialGroups={state.q1?.groups ?? []}
          initialExclusive={state.q1?.exclusive ?? false}
          onBack={history.length > 0 ? goBack : undefined}
          onNext={(groups, exclusive) => {
            const newState = applyQ1(state, groups, exclusive);
            goForward(newState, computePhase(newState));
          }}
        />
      )}

      {phase.step === "Q2" && state.q1 && (
        <GroupMultiSelectStep
          key={phaseKey(phase)}
          progressLabel="Câu 2/4"
          progressPercent={progressPercent}
          title={questionsByKey.Q2?.labelText ?? "Trong những nhóm hàng vừa chọn, anh/chị muốn BHX cải thiện nhóm nào để chuyển sang mua tại đây?"}
          groups={config.productGroups.filter((g) => state.q1!.groups.includes(g.id))}
          exclusiveLabel={optionLabel(config, "Q2", "NONE", Q2_EXCLUSIVE_LABEL)}
          initialGroups={state.q2?.groups ?? []}
          initialExclusive={state.q2?.exclusive ?? false}
          onBack={goBack}
          onNext={(groups, exclusive) => {
            const newState = applyQ2(state, groups, exclusive);
            goForward(newState, computePhase(newState));
          }}
        />
      )}

      {phase.step === "Q3" && (
        <Q3Step
          key={phaseKey(phase)}
          progressLabel="Câu 3/4"
          progressPercent={progressPercent}
          groupName={groupsById[phase.groupId]?.name ?? ""}
          title={questionsByKey.Q3?.labelText ?? "BHX cần thay đổi những điều gì để anh/chị chuyển sang mua nhóm hàng này tại BHX?"}
          labels={Object.fromEntries(
            (Object.keys(FACTOR_LABELS) as FactorKey[]).map((k) => [k, optionLabel(config, "Q3", k, FACTOR_LABELS[k])])
          ) as Record<FactorKey, string>}
          initialFactors={state.q3[phase.groupId] ?? []}
          onBack={goBack}
          onNext={(factors) => {
            const newState = applyQ3(state, phase.groupId, factors);
            goForward(newState, computePhase(newState));
          }}
        />
      )}

      {phase.step === "Q4" && phase.factorKey === "PRICE" && (
        <Q4SingleStep
          key={phaseKey(phase)}
          progressLabel="Câu 4/4 — Giá bán"
          progressPercent={progressPercent}
          groupName={groupsById[phase.groupId]?.name ?? ""}
          title={questionsByKey.Q4A?.labelText ?? "Giá tại BHX cần như thế nào so với nơi anh/chị đang mua?"}
          options={questionsByKey.Q4A?.options ?? []}
          initialOptionKey={state.q4[phase.groupId]?.PRICE?.optionKey}
          onBack={goBack}
          onNext={(optionKey) => {
            const detail: Q4Detail = { optionKey };
            const newState = applyQ4(state, phase.groupId, "PRICE", detail);
            goForward(newState, computePhase(newState));
          }}
        />
      )}

      {phase.step === "Q4" && phase.factorKey === "PROMOTION" && (
        <Q4MultiStep
          key={phaseKey(phase)}
          progressLabel="Câu 4/4 — Khuyến mãi"
          progressPercent={progressPercent}
          groupName={groupsById[phase.groupId]?.name ?? ""}
          title={questionsByKey.Q4B?.labelText ?? "Anh/chị thích hình thức khuyến mãi nào?"}
          options={(questionsByKey.Q4B?.options ?? []).map((o) => ({ id: o.optionKey, label: o.labelText }))}
          initialIds={state.q4[phase.groupId]?.PROMOTION?.optionKeys ?? []}
          onBack={goBack}
          onNext={(optionKeys) => {
            const detail: Q4Detail = { optionKeys };
            const newState = applyQ4(state, phase.groupId, "PROMOTION", detail);
            goForward(newState, computePhase(newState));
          }}
        />
      )}

      {phase.step === "Q4" && phase.factorKey === "BRAND" && (
        <Q4BrandStep
          key={phaseKey(phase)}
          progressLabel="Câu 4/4 — Nhãn hiệu"
          progressPercent={progressPercent}
          groupName={groupsById[phase.groupId]?.name ?? ""}
          title={questionsByKey.Q4C?.labelText ?? "Anh/chị muốn BHX có thêm hoặc luôn có sẵn những nhãn hiệu nào?"}
          brands={groupsById[phase.groupId]?.brands ?? []}
          otherLabel={optionLabel(config, "Q4C", "OTHER", "Nhãn hiệu khác")}
          notImportantLabel={optionLabel(config, "Q4C", "NOT_IMPORTANT", "Không quan trọng nhãn hiệu")}
          initial={state.q4[phase.groupId]?.BRAND}
          onBack={goBack}
          onNext={(detail) => {
            const newState = applyQ4(state, phase.groupId, "BRAND", detail);
            goForward(newState, computePhase(newState));
          }}
        />
      )}

      {phase.step === "Q4" && phase.factorKey === "PACKAGE_SIZE" && (
        <Q4MultiStep
          key={phaseKey(phase)}
          progressLabel="Câu 4/4 — Quy cách"
          progressPercent={progressPercent}
          groupName={groupsById[phase.groupId]?.name ?? ""}
          title={questionsByKey.Q4D?.labelText ?? "Gói/chai/bao có quy cách nào phù hợp với anh/chị?"}
          options={(groupsById[phase.groupId]?.packageSizes ?? []).map((s) => ({ id: s.id, label: s.label ?? "" }))}
          initialIds={state.q4[phase.groupId]?.PACKAGE_SIZE?.packageSizeIds ?? []}
          onBack={goBack}
          onNext={(packageSizeIds) => {
            const detail: Q4Detail = { packageSizeIds };
            const newState = applyQ4(state, phase.groupId, "PACKAGE_SIZE", detail);
            goForward(newState, computePhase(newState));
          }}
        />
      )}

      {phase.step === "Q4" && phase.factorKey === "PRODUCT_TYPE" && (
        <Q4MultiStep
          key={phaseKey(phase)}
          progressLabel="Câu 4/4 — Loại sản phẩm"
          progressPercent={progressPercent}
          groupName={groupsById[phase.groupId]?.name ?? ""}
          title={questionsByKey.Q4E?.labelText ?? "Anh/chị muốn BHX có thêm loại sản phẩm nào?"}
          options={(groupsById[phase.groupId]?.productTypes ?? []).map((t) => ({ id: t.id, label: t.name ?? "" }))}
          initialIds={state.q4[phase.groupId]?.PRODUCT_TYPE?.productTypeIds ?? []}
          onBack={goBack}
          onNext={(productTypeIds) => {
            const detail: Q4Detail = { productTypeIds };
            const newState = applyQ4(state, phase.groupId, "PRODUCT_TYPE", detail);
            goForward(newState, computePhase(newState));
          }}
        />
      )}

      {phase.step === "GIFT" && (
        <GiftStep
          key={phaseKey(phase)}
          progressPercent={progressPercent}
          gifts={config.gifts}
          initialGiftId={state.giftId}
          onBack={history.length > 0 ? goBack : undefined}
          onNext={(giftId) => {
            const newState = applyGift(state, giftId);
            goForward(newState, computePhase(newState));
          }}
        />
      )}
    </div>
  );
}

// ---- Step screens ----

function GroupMultiSelectStep(props: {
  progressLabel: string;
  progressPercent: number;
  title: string;
  groups: { id: string; name: string }[];
  exclusiveLabel: string;
  initialGroups: string[];
  initialExclusive: boolean;
  onBack?: () => void;
  onNext: (groups: string[], exclusive: boolean) => void;
}) {
  const [selected, setSelected] = useState<string[]>(props.initialGroups);
  const [exclusive, setExclusive] = useState(props.initialExclusive);

  return (
    <SurveyLayout
      progressLabel={props.progressLabel}
      progressPercent={props.progressPercent}
      title={props.title}
      onBack={props.onBack}
      onNext={() => props.onNext(selected, exclusive)}
      nextDisabled={!exclusive && selected.length === 0}
    >
      {props.groups.map((g) => (
        <OptionCard
          key={g.id}
          label={g.name}
          selected={!exclusive && selected.includes(g.id)}
          onClick={() => {
            setExclusive(false);
            setSelected((s) => toggle(s, g.id));
          }}
        />
      ))}
      <OptionCard
        label={props.exclusiveLabel}
        exclusive
        selected={exclusive}
        onClick={() => {
          setExclusive((e) => !e);
          setSelected([]);
        }}
      />
    </SurveyLayout>
  );
}

function Q3Step(props: {
  progressLabel: string;
  progressPercent: number;
  groupName: string;
  title: string;
  labels: Record<FactorKey, string>;
  initialFactors: FactorKey[];
  onBack: () => void;
  onNext: (factors: FactorKey[]) => void;
}) {
  const [selected, setSelected] = useState<FactorKey[]>(props.initialFactors);
  const isNone = selected.includes("NONE");

  return (
    <SurveyLayout
      progressLabel={props.progressLabel}
      progressPercent={props.progressPercent}
      subtitle={props.groupName}
      title={props.title}
      onBack={props.onBack}
      onNext={() => props.onNext(selected)}
      nextDisabled={selected.length === 0}
    >
      {SELECTABLE_FACTORS.map((f) => (
        <OptionCard
          key={f}
          label={props.labels[f]}
          selected={!isNone && selected.includes(f)}
          onClick={() => setSelected((s) => (s.includes("NONE") ? [f] : toggle(s, f)))}
        />
      ))}
      <OptionCard
        label={props.labels.NONE}
        exclusive
        selected={isNone}
        onClick={() => setSelected((s) => (s.includes("NONE") ? [] : ["NONE"]))}
      />
    </SurveyLayout>
  );
}

function Q4SingleStep(props: {
  progressLabel: string;
  progressPercent: number;
  groupName: string;
  title: string;
  options: { optionKey: string; labelText: string }[];
  initialOptionKey?: string;
  onBack: () => void;
  onNext: (optionKey: string) => void;
}) {
  const [selected, setSelected] = useState<string | undefined>(props.initialOptionKey);
  return (
    <SurveyLayout
      progressLabel={props.progressLabel}
      progressPercent={props.progressPercent}
      subtitle={props.groupName}
      title={props.title}
      onBack={props.onBack}
      onNext={() => selected && props.onNext(selected)}
      nextDisabled={!selected}
    >
      {props.options.map((o) => (
        <OptionCard key={o.optionKey} label={o.labelText} selected={selected === o.optionKey} onClick={() => setSelected(o.optionKey)} />
      ))}
    </SurveyLayout>
  );
}

function Q4MultiStep(props: {
  progressLabel: string;
  progressPercent: number;
  groupName: string;
  title: string;
  options: { id: string; label: string }[];
  initialIds: string[];
  onBack: () => void;
  onNext: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(props.initialIds);
  return (
    <SurveyLayout
      progressLabel={props.progressLabel}
      progressPercent={props.progressPercent}
      subtitle={props.groupName}
      title={props.title}
      onBack={props.onBack}
      onNext={() => props.onNext(selected)}
      nextDisabled={selected.length === 0}
    >
      {props.options.map((o) => (
        <OptionCard key={o.id} label={o.label} selected={selected.includes(o.id)} onClick={() => setSelected((s) => toggle(s, o.id))} />
      ))}
    </SurveyLayout>
  );
}

function Q4BrandStep(props: {
  progressLabel: string;
  progressPercent: number;
  groupName: string;
  title: string;
  brands: { id: string; name?: string }[];
  otherLabel: string;
  notImportantLabel: string;
  initial?: Q4Detail;
  onBack: () => void;
  onNext: (detail: Q4Detail) => void;
}) {
  const initialBrandIds = (props.initial?.brandSelections ?? []).filter((s) => s.brandId).map((s) => s.brandId!);
  const initialOther = (props.initial?.brandSelections ?? []).some((s) => s.optionKey === "OTHER");
  const initialNotImportant = (props.initial?.brandSelections ?? []).some((s) => s.optionKey === "NOT_IMPORTANT");

  const [brandIds, setBrandIds] = useState<string[]>(initialBrandIds);
  const [other, setOther] = useState(initialOther);
  const [notImportant, setNotImportant] = useState(initialNotImportant);

  function next() {
    const brandSelections = notImportant
      ? [{ optionKey: "NOT_IMPORTANT" as const }]
      : [...brandIds.map((id) => ({ brandId: id })), ...(other ? [{ optionKey: "OTHER" as const }] : [])];
    props.onNext({ brandSelections });
  }

  return (
    <SurveyLayout
      progressLabel={props.progressLabel}
      progressPercent={props.progressPercent}
      subtitle={props.groupName}
      title={props.title}
      onBack={props.onBack}
      onNext={next}
      nextDisabled={!notImportant && brandIds.length === 0 && !other}
    >
      {props.brands.map((b) => (
        <OptionCard
          key={b.id}
          label={b.name ?? ""}
          selected={!notImportant && brandIds.includes(b.id)}
          onClick={() => {
            setNotImportant(false);
            setBrandIds((s) => toggle(s, b.id));
          }}
        />
      ))}
      <OptionCard
        label={props.otherLabel}
        selected={!notImportant && other}
        onClick={() => {
          setNotImportant(false);
          setOther((o) => !o);
        }}
      />
      <OptionCard
        label={props.notImportantLabel}
        exclusive
        selected={notImportant}
        onClick={() => {
          setNotImportant((v) => !v);
          setBrandIds([]);
          setOther(false);
        }}
      />
    </SurveyLayout>
  );
}

function GiftStep(props: {
  progressPercent: number;
  gifts: GiftOption[];
  initialGiftId: string | null;
  onBack?: () => void;
  onNext: (giftId: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(props.initialGiftId);

  return (
    <SurveyLayout
      progressLabel="Chọn quà tặng"
      progressPercent={props.progressPercent}
      title="Anh/chị chọn 1 phần quà cảm ơn"
      onBack={props.onBack}
      onNext={() => selected && props.onNext(selected)}
      nextDisabled={!selected}
      nextLabel="Hoàn tất"
    >
      <div className="grid grid-cols-2 gap-3">
        {props.gifts.map((gift) => (
          <button
            key={gift.id}
            type="button"
            onClick={() => setSelected(gift.id)}
            className={[
              "text-left rounded-xl border-2 overflow-hidden bg-white transition-colors",
              selected === gift.id ? "border-bhx-green" : "border-gray-200",
            ].join(" ")}
          >
            <div className="aspect-square bg-white flex items-center justify-center p-2">
              <img src={gift.imageUrl} alt={gift.name} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="px-2.5 pb-2.5">
              <p className="text-sm font-semibold text-gray-800 leading-snug">{gift.name}</p>
            </div>
            {selected === gift.id && (
              <div className="bg-bhx-green text-white text-center text-xs font-semibold py-1">Đã chọn</div>
            )}
          </button>
        ))}
      </div>
    </SurveyLayout>
  );
}
