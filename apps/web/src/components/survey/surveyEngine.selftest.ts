import { applyGift, applyQ1, applyQ2, applyQ3, applyQ4, buildPayload, computePhase, initialSurveyState } from "./surveyEngine";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error("FAILED: " + msg);
  console.log("OK:", msg);
}

// Walk: Q1 -> Gạo, Dầu ăn ; Q2 -> Gạo, Dầu ăn ; Q3(Dầu ăn)=[PRICE] -> Q4A ; Q3(Gạo)=[PACKAGE_SIZE,PRODUCT_TYPE] -> Q4D -> Q4E -> DONE
let s = initialSurveyState;
s = applyQ1(s, ["rice", "oil"], false);
assert(computePhase(s).step === "Q2", "after Q1 non-exclusive goes to Q2");

s = applyQ2(s, ["oil", "rice"], false);
let p2 = computePhase(s);
assert(p2.step === "Q3" && (p2 as any).groupId === "oil", "after Q2 goes to Q3 for first group in queue (oil)");

s = applyQ3(s, "oil", ["PRICE"]);
let p3 = computePhase(s);
assert(p3.step === "Q4" && (p3 as any).factorKey === "PRICE" && (p3 as any).groupId === "oil", "Q3(oil)=[PRICE] -> Q4 PRICE for oil");

s = applyQ4(s, "oil", "PRICE", { optionKey: "LOWER_5" });
let p4 = computePhase(s);
assert(p4.step === "Q3" && (p4 as any).groupId === "rice", "after last factor for oil, advance to Q3 for rice");

s = applyQ3(s, "rice", ["PACKAGE_SIZE", "PRODUCT_TYPE"]);
let p3b = computePhase(s);
assert(p3b.step === "Q4" && (p3b as any).factorKey === "PACKAGE_SIZE", "Q3(rice) -> first factor PACKAGE_SIZE");

s = applyQ4(s, "rice", "PACKAGE_SIZE", { packageSizeIds: ["5kg-id"] });
let p4b = computePhase(s);
assert(p4b.step === "Q4" && (p4b as any).factorKey === "PRODUCT_TYPE", "after PACKAGE_SIZE, next factor PRODUCT_TYPE for rice");

s = applyQ4(s, "rice", "PRODUCT_TYPE", { productTypeIds: ["deo-thom-id"] });
let p4c = computePhase(s);
assert(p4c.step === "GIFT", "after last group's last factor, GIFT step (before DONE)");

s = applyGift(s, "gift-1");
assert(computePhase(s).step === "DONE", "after picking a gift, DONE");

const payload = buildPayload(s);
assert(JSON.stringify(payload.q1!.productGroupIds) === JSON.stringify(["rice", "oil"]), "payload q1 groups preserved");
assert(payload.q3!["oil"].factors[0] === "PRICE", "payload q3 oil factors");
assert(payload.q4!["rice"]["PRODUCT_TYPE"].productTypeIds![0] === "deo-thom-id", "payload q4 rice product type");
console.log("payload:", JSON.stringify(payload, null, 2));

// --- Edge case: Q1 exclusive goes straight to the gift step (no questions left) ---
let e = initialSurveyState;
e = applyQ1(e, [], true);
assert(computePhase(e).step === "GIFT", "Q1 exclusive -> GIFT immediately (still need to pick a gift)");

// --- Edge case: Q3 NONE skips Q4 and advances group ---
let n = initialSurveyState;
n = applyQ1(n, ["rice"], false);
n = applyQ2(n, ["rice"], false);
n = applyQ3(n, "rice", ["NONE"]);
assert(computePhase(n).step === "GIFT", "Q3 NONE for only remaining group -> GIFT (no Q4)");

// --- Edge case: NONE for first of two groups still proceeds to the second group's Q3 ---
let n2 = initialSurveyState;
n2 = applyQ1(n2, ["rice", "oil"], false);
n2 = applyQ2(n2, ["rice", "oil"], false);
n2 = applyQ3(n2, "rice", ["NONE"]);
let pn2 = computePhase(n2);
assert(pn2.step === "Q3" && (pn2 as any).groupId === "oil", "Q3 NONE for first group still advances to next group's Q3");

// --- Edge case: only OTHER selected in Q3 also skips Q4 and advances group ---
let o = initialSurveyState;
o = applyQ1(o, ["rice"], false);
o = applyQ2(o, ["rice"], false);
o = applyQ3(o, "rice", ["OTHER"]);
assert(computePhase(o).step === "GIFT", "Q3 with only OTHER selected skips Q4 and goes to GIFT");

// --- Edge case: editing Q1 prunes stale Q2/Q3/Q4 for removed group ---
let edit = initialSurveyState;
edit = applyQ1(edit, ["rice", "oil"], false);
edit = applyQ2(edit, ["rice", "oil"], false);
edit = applyQ3(edit, "oil", ["PRICE"]);
edit = applyQ4(edit, "oil", "PRICE", { optionKey: "SAME" });
// user goes back and edits Q1, removing "oil"
edit = applyQ1(edit, ["rice"], false);
assert(edit.q2 === null, "editing Q1 to drop a group resets q2 so user re-confirms Q2");
assert(Object.keys(edit.q3).length === 0, "editing Q1 prunes q3 answers for removed group");
assert(Object.keys(edit.q4).length === 0, "editing Q1 prunes q4 answers for removed group");

// --- Edge case: Back (restoring a full state snapshot, as SurveyFlow does) then
// re-answering a Q4 step doesn't corrupt factorIndex/groupIndex ---
{
  const snapshots: { phase: string; state: typeof initialSurveyState }[] = [];
  let st = initialSurveyState;
  let ph = computePhase(st);

  function forward(next: typeof st) {
    snapshots.push({ phase: JSON.stringify(ph), state: st }); // snapshot BEFORE transition, like goForward does
    st = next;
    ph = computePhase(st);
  }

  forward(applyQ1(st, ["rice"], false)); // -> Q2
  forward(applyQ2(st, ["rice"], false)); // -> Q3(rice)
  forward(applyQ3(st, "rice", ["PRICE", "PROMOTION"])); // -> Q4(rice, PRICE)
  forward(applyQ4(st, "rice", "PRICE", { optionKey: "SAME" })); // -> Q4(rice, PROMOTION)
  assert((ph as any).step === "Q4" && (ph as any).factorKey === "PROMOTION", "reached Q4 PROMOTION after answering PRICE");

  // Go back to Q4 PRICE and re-answer it differently.
  const prev = snapshots.pop()!;
  st = prev.state;
  ph = JSON.parse(prev.phase);
  assert((ph as any).factorKey === "PRICE", "back restores Q4 PRICE screen");

  forward(applyQ4(st, "rice", "PRICE", { optionKey: "LOWER_5" })); // redo -> should go to Q4 PROMOTION again, not skip past it
  assert((ph as any).step === "Q4" && (ph as any).factorKey === "PROMOTION", "redo after back correctly goes to Q4 PROMOTION, not skipped");

  forward(applyQ4(st, "rice", "PROMOTION", { optionKeys: ["VOUCHER"] }));
  assert((ph as any).step === "GIFT", "after answering both factors (no duplicates from the back+redo), reaches GIFT");

  forward(applyGift(st, "gift-1"));
  assert((ph as any).step === "DONE", "picking a gift finishes the survey");
}

console.log("\nALL SURVEY ENGINE SELF-TESTS PASSED");
