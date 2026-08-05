interface FilterBtnProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export const FilterBtn = ({ label, active, onClick }: FilterBtnProps) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all whitespace-nowrap ${
      active
        ? 'bg-gold text-ink'
        : 'bg-white/5 text-white/55 hover:bg-white/8 hover:text-white border border-white/8'
    }`}
  >
    {label}
  </button>
);
