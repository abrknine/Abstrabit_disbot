export const Toggle = ({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) => (
  <button
    role="switch"
    aria-checked={on}
    onClick={() => onChange(!on)}
    className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
      on ? "bg-dgreen" : "bg-[#80848e]"
    }`}
  >
    <span
      className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all ${
        on ? "left-[19px]" : "left-[3px]"
      }`}
    />
  </button>
);
