interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
}

export const Select = ({ 
  label, 
  value, 
  onChange, 
  options, 
  placeholder = "Selecciona una opción",
  disabled = false 
}: SelectProps) => (
  <div className="flex flex-col mb-6">
    <label className="mb-2 text-terracota font-semibold text-sm">{label}</label>
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-700 
                 focus:outline-none focus:border-terracota focus:ring-4 focus:ring-terracota/20
                 transition-all duration-200 hover:border-gray-300
                 disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);
