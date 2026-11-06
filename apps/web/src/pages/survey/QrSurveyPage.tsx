import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../../api/client";
import { SurveyFlow } from "../../components/survey/SurveyFlow";
import type { SurveyAnswersPayload, SurveyConfigBundle } from "../../types";

interface QrInfo {
  shopId: string;
  shopCode: string;
  shopName: string;
  campaignId: string | null;
}

const VN_PHONE_REGEX = /^0(3[2-9]|5[25689]|7[06789]|8[1-9]|9[0-9])\d{7}$/;

type Stage = "loading" | "invalid" | "welcome" | "consent" | "survey" | "done";

export function QrSurveyPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("loading");
  const [qrInfo, setQrInfo] = useState<QrInfo | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateNotice, setDuplicateNotice] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [config, setConfig] = useState<SurveyConfigBundle | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<QrInfo>(`/public/qr/${token}`)
      .then((info) => {
        setQrInfo(info);
        setStage("welcome");
      })
      .catch(() => setStage("invalid"));
  }, [token]);

  const phoneValid = VN_PHONE_REGEX.test(phone.replace(/[\s.\-()]/g, ""));

  async function submitConsent() {
    if (!token) return;
    setFormError(null);
    if (!fullName.trim()) return setFormError("Vui lòng nhập họ và tên.");
    if (!phoneValid) return setFormError("Số điện thoại không đúng định dạng Việt Nam.");

    setSubmitting(true);
    try {
      const res = await apiFetch<{ sessionId: string; isDuplicate: boolean }>("/public/sessions", {
        method: "POST",
        body: JSON.stringify({ qrToken: token, respondent: { fullName, phone }, consent: { given: true } }),
      });
      setSessionId(res.sessionId);
      setDuplicateNotice(res.isDuplicate);
      const cfg = await apiFetch<SurveyConfigBundle>("/public/survey-config");
      setConfig(cfg);
      setStage("survey");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Không thể bắt đầu khảo sát. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleComplete(payload: SurveyAnswersPayload, giftId: string) {
    if (!sessionId) return;
    await apiFetch(`/public/sessions/${sessionId}/answers`, { method: "PATCH", body: JSON.stringify(payload) });
    await apiFetch(`/public/sessions/${sessionId}/complete`, { method: "POST", body: JSON.stringify({ giftId }) });
    navigate(`/s/${token}/thank-you`);
  }

  if (stage === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Đang tải...</div>;
  }

  if (stage === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-gray-700">Mã QR không hợp lệ hoặc đã bị vô hiệu hoá. Vui lòng liên hệ nhân viên siêu thị.</p>
      </div>
    );
  }

  if (stage === "welcome" && qrInfo) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-[#f7f8f5] px-6 py-10 max-w-md mx-auto">
        <div>
          <p className="text-3xl font-extrabold text-bhx-green text-center">BÁCH HÓA XANH</p>
          <p className="text-center text-lg font-semibold mt-1">KHẢO SÁT Ý KIẾN KHÁCH HÀNG</p>
          <p className="text-center text-sm italic text-gray-600 mt-2">"Lắng nghe khách hàng – Thay đổi để được lựa chọn."</p>
          <p className="mt-6 text-gray-700 text-sm leading-relaxed">
            BHX mong muốn cải thiện giá bán, khuyến mãi và sản phẩm để phục vụ anh/chị tốt hơn. Rất mong anh/chị dành ít phút chia sẻ ý kiến.
          </p>
          <div className="mt-6 bg-white rounded-xl border px-4 py-3 text-sm">
            <p className="font-semibold text-gray-800">{qrInfo.shopName}</p>
            <p className="text-gray-500">Mã siêu thị: {qrInfo.shopCode}</p>
          </div>
        </div>
        <button onClick={() => setStage("consent")} className="w-full py-4 rounded-xl bg-bhx-green text-white font-bold text-lg">
          BẮT ĐẦU KHẢO SÁT
        </button>
      </div>
    );
  }

  if (stage === "consent") {
    return (
      <div className="min-h-screen bg-[#f7f8f5] px-6 py-8 max-w-md mx-auto">
        <h1 className="text-lg font-bold mb-3">Thông tin của anh/chị</h1>
        <p className="text-sm text-gray-600 mb-5">
          BHX xin phép thu thập họ tên và số điện thoại để gửi phần quà cảm ơn sau khi anh/chị hoàn thành khảo sát.
        </p>

        <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full border rounded-lg px-3 py-2.5 mb-4"
          placeholder="Nguyễn Văn A"
        />

        <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border rounded-lg px-3 py-2.5 mb-1"
          placeholder="09xxxxxxxx"
          inputMode="tel"
        />
        {phone && !phoneValid && <p className="text-xs text-red-600 mb-3">Số điện thoại không đúng định dạng Việt Nam.</p>}

        {formError && <p className="text-sm text-red-600 mt-3">{formError}</p>}

        <button
          onClick={submitConsent}
          disabled={submitting}
          className="w-full mt-6 py-3.5 rounded-xl bg-bhx-green text-white font-bold disabled:opacity-50"
        >
          Tiếp tục
        </button>
      </div>
    );
  }

  if (stage === "survey" && config) {
    return (
      <div>
        {duplicateNotice && (
          <div className="bg-yellow-50 text-yellow-800 text-sm px-4 py-2 text-center">
            Có vẻ anh/chị đã tham gia khảo sát này rồi. Cảm ơn anh/chị đã tiếp tục chia sẻ thêm ý kiến!
          </div>
        )}
        <SurveyFlow config={config} onComplete={handleComplete} />
      </div>
    );
  }

  return null;
}
