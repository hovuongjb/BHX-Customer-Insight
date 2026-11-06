import type { ReactNode } from "react";

interface SurveyLayoutProps {
  progressLabel: string;
  progressPercent: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}

export function SurveyLayout({ progressLabel, progressPercent, title, subtitle, children, onBack, onNext, nextDisabled, nextLabel }: SurveyLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#f7f8f5]">
      <div className="h-1.5 bg-gray-200">
        <div className="h-1.5 bg-bhx-green transition-all" style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-28 max-w-md w-full mx-auto">
        <p className="text-xs font-medium text-gray-500 mb-2">{progressLabel}</p>
        {subtitle && <p className="text-sm font-semibold text-bhx-green mb-1">{subtitle}</p>}
        <h1 className="text-xl font-bold text-gray-900 mb-4">{title}</h1>
        <div className="space-y-2.5">{children}</div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 flex gap-3 max-w-md mx-auto w-full">
        {onBack ? (
          <button type="button" onClick={onBack} className="flex-1 py-3 rounded-xl border-2 border-gray-300 font-semibold text-gray-700">
            Quay lại
          </button>
        ) : null}
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="flex-1 py-3 rounded-xl bg-bhx-green text-white font-semibold disabled:opacity-40"
        >
          {nextLabel ?? "Tiếp tục"}
        </button>
      </div>
    </div>
  );
}
