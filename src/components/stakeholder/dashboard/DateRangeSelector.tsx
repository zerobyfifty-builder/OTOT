import React from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

const options = [
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: '1Y', value: '1Y' },
];

export const DateRangeSelector: React.FC<Props> = ({ value, onChange }) => (
  <div className="flex items-center rounded-md border border-[#E5E7EB] dark:border-gray-600 overflow-hidden">
    {options.map((opt) => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={`px-2.5 py-1 text-[11px] font-medium transition-all duration-200 ${
          value === opt.value
            ? 'bg-[#3B6D11] text-white dark:bg-[#639922]'
            : 'bg-white dark:bg-gray-800 text-[#6B7280] dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);
