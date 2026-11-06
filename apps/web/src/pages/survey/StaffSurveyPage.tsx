import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import { SurveyFlow } from "../../components/survey/SurveyFlow";
import { ThankYouPage } from "./ThankYouPage";
import { useAuth } from "../../context/AuthContext";
import type { SurveyAnswersPayload, SurveyConfigBundle } from "../../types";

export function StaffSurveyPage() {
  const { user } = useAuth();
  const [config, setConfig] = useState<SurveyConfigBundle | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function startNewSession() {
    setDone(false);
    const cfg = await apiFetch<SurveyConfigBundle>("/survey/survey-config");
    setConfig(cfg);
    const res = await apiFetch<{ sessionId: string }>("/survey/sessions", { method: "POST" });
    setSessionId(res.sessionId);
  }

  useEffect(() => {
    if (!user?.shopId) return;
    startNewSession().catch(() => {
      // Account/shop errors are surfaced via the guard below; nothing else to do here.
    });
  }, [user?.shopId]);

  async function handleComplete(payload: SurveyAnswersPayload, giftId: string) {
    if (!sessionId) return;
    await apiFetch(`/survey/sessions/${sessionId}/answers`, { method: "PATCH", body: JSON.stringify(payload) });
    await apiFetch(`/survey/sessions/${sessionId}/complete`, { method: "POST", body: JSON.stringify({ giftId }) });
    setDone(true);
  }

  if (!user?.shopId) {
    return <div className="min-h-screen flex items-center justify-center px-6 text-center text-gray-600">Tài khoản của bạn chưa được gán siêu thị.</div>;
  }

  if (done) {
    return (
      <div>
        <ThankYouPage />
        <div className="fixed bottom-6 left-0 right-0 flex justify-center">
          <button onClick={startNewSession} className="px-6 py-3 rounded-xl bg-bhx-green text-white font-semibold">
            Khảo sát khách tiếp theo
          </button>
        </div>
      </div>
    );
  }

  if (!config || !sessionId) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Đang tải...</div>;
  }

  return <SurveyFlow key={sessionId} config={config} onComplete={handleComplete} />;
}
