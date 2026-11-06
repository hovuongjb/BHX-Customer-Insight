interface OptionCardProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  exclusive?: boolean;
}

export function OptionCard({ label, selected, onClick, exclusive }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left px-4 py-3 rounded-xl border-2 text-base transition-colors",
        selected ? "border-bhx-green bg-green-50 font-semibold text-bhx-greenDark" : "border-gray-200 bg-white text-gray-800",
        exclusive ? "mt-3 border-dashed" : "",
      ].join(" ")}
    >
      <span className="flex items-center gap-2">
        <span
          className={[
            "inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2",
            selected ? "border-bhx-green bg-bhx-green text-white" : "border-gray-300",
          ].join(" ")}
        >
          {selected ? "✓" : ""}
        </span>
        {label}
      </span>
    </button>
  );
}
