import type { FactorKey, Q4Detail, SurveyAnswersPayload } from "../../types";

export type Phase =
  | { step: "Q1" }
  | { step: "Q2" }
  | { step: "Q3"; groupId: string }
  | { step: "Q4"; groupId: string; factorKey: FactorKey }
  | { step: "GIFT" }
  | { step: "DONE" };

export interface SurveyState {
  q1: { groups: string[]; exclusive: boolean } | null;
  q2: { groups: string[]; exclusive: boolean } | null;
  q3: Record<string, FactorKey[]>;
  q4: Record<string, Record<string, Q4Detail>>;
  groupQueue: string[];
  groupIndex: number;
  factorQueue: FactorKey[];
  factorIndex: number;
  giftId: string | null;
}

export const initialSurveyState: SurveyState = {
  q1: null,
  q2: null,
  q3: {},
  q4: {},
  groupQueue: [],
  groupIndex: 0,
  factorQueue: [],
  factorIndex: 0,
  giftId: null,
};

/**
 * Derives the current step purely from the (already fully-updated) state.
 * apply* functions are responsible for persisting every index advancement,
 * so this never needs to "peek ahead" or recompute indices itself.
 */
export function computePhase(state: SurveyState): Phase {
  if (!state.q1) return { step: "Q1" };
  if (state.q1.exclusive) return state.giftId ? { step: "DONE" } : { step: "GIFT" };
  if (!state.q2) return { step: "Q2" };
  if (state.q2.exclusive) return state.giftId ? { step: "DONE" } : { step: "GIFT" };
  if (state.groupIndex >= state.groupQueue.length) return state.giftId ? { step: "DONE" } : { step: "GIFT" };

  const groupId = state.groupQueue[state.groupIndex];
  if (!state.q3[groupId]) return { step: "Q3", groupId };
  if (state.factorIndex < state.factorQueue.length) {
    return { step: "Q4", groupId, factorKey: state.factorQueue[state.factorIndex] };
  }
  // apply* always advances groupIndex once factorQueue is exhausted, so this
  // branch (same group, no more factors) should never be the resting state.
  return state.giftId ? { step: "DONE" } : { step: "GIFT" };
}

export function applyGift(state: SurveyState, giftId: string): SurveyState {
  return { ...state, giftId };
}

export function applyQ1(state: SurveyState, groups: string[], exclusive: boolean): SurveyState {
  if (exclusive) {
    return { ...initialSurveyState, q1: { groups: [], exclusive: true } };
  }
  // Any (re)answer of Q1 — first time or an edit — resets every downstream answer:
  // the user always re-confirms Q2 next, which is what re-derives valid Q3/Q4 state.
  return { ...initialSurveyState, q1: { groups, exclusive: false } };
}

export function applyQ2(state: SurveyState, groups: string[], exclusive: boolean): SurveyState {
  // Any (re)answer of Q2 resets Q3/Q4: the group queue it drives, and whatever
  // factor queue a preserved-but-stale Q3 answer used to imply, would otherwise
  // go out of sync. Simplest correct behavior: start Q3/Q4 fresh every time.
  if (exclusive) {
    return { ...state, q2: { groups: [], exclusive: true }, q3: {}, q4: {}, groupQueue: [], groupIndex: 0, factorQueue: [], factorIndex: 0 };
  }
  return { ...state, q2: { groups, exclusive: false }, q3: {}, q4: {}, groupQueue: groups, groupIndex: 0, factorQueue: [], factorIndex: 0 };
}

/** Advances past the current group: next groupIndex, fresh factor queue. */
function advanceGroup(state: SurveyState): Pick<SurveyState, "groupIndex" | "factorQueue" | "factorIndex"> {
  return { groupIndex: state.groupIndex + 1, factorQueue: [], factorIndex: 0 };
}

export function applyQ3(state: SurveyState, groupId: string, factors: FactorKey[]): SurveyState {
  const factorQueue = factors.includes("NONE") ? [] : factors.filter((f) => f !== "OTHER" && f !== "NONE");
  const q4 = { ...state.q4 };
  if (q4[groupId]) {
    const kept: Record<string, Q4Detail> = {};
    for (const f of factorQueue) if (q4[groupId][f]) kept[f] = q4[groupId][f];
    q4[groupId] = kept;
  }
  const withAnswer: SurveyState = { ...state, q3: { ...state.q3, [groupId]: factors }, q4, factorQueue, factorIndex: 0 };

  // Nothing to ask in Q4 for this group (NONE selected, or only OTHER) — move straight to the next group.
  if (factorQueue.length === 0) {
    return { ...withAnswer, ...advanceGroup(withAnswer) };
  }
  return withAnswer;
}

export function applyQ4(state: SurveyState, groupId: string, factorKey: FactorKey, detail: Q4Detail): SurveyState {
  const q4 = { ...state.q4, [groupId]: { ...(state.q4[groupId] ?? {}), [factorKey]: detail } };
  const nextFactorIndex = state.factorIndex + 1;
  const withAnswer: SurveyState = { ...state, q4, factorIndex: nextFactorIndex };

  if (nextFactorIndex >= state.factorQueue.length) {
    return { ...withAnswer, ...advanceGroup(withAnswer) };
  }
  return withAnswer;
}

export function buildPayload(state: SurveyState): SurveyAnswersPayload {
  if (!state.q1) throw new Error("Câu 1 chưa được trả lời.");
  const payload: SurveyAnswersPayload = { q1: { productGroupIds: state.q1.groups, exclusive: state.q1.exclusive } };
  if (state.q1.exclusive || !state.q2) return payload;
  payload.q2 = { productGroupIds: state.q2.groups, exclusive: state.q2.exclusive };
  if (state.q2.exclusive) return payload;
  payload.q3 = Object.fromEntries(Object.entries(state.q3).map(([groupId, factors]) => [groupId, { factors }]));
  payload.q4 = state.q4;
  return payload;
}

export function phaseKey(phase: Phase): string {
  switch (phase.step) {
    case "Q3":
      return `Q3:${phase.groupId}`;
    case "Q4":
      return `Q4:${phase.groupId}:${phase.factorKey}`;
    default:
      return phase.step;
  }
}
