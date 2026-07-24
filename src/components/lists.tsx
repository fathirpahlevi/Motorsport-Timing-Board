import React from 'react';

export interface SelectOption {
  label: string;
  value: string;
}

interface ListSelectInputProps {
  label?: string;
  options: SelectOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  className?: string;
}

export const ListSelectInput: React.FC<ListSelectInputProps> = ({
  label,
  options,
  selectedValue,
  onChange,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-1 text-left ${className}`}>
      {label && (
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        value={selectedValue}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
      >
        <option value="">Select option...</option>
        {options.map((opt) => (
          <option key={opt.value || opt.label} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
