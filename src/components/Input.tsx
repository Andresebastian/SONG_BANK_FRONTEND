interface InputProps {
    label: string;
    type?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }
  
  export const Input = ({ label, type = 'text', value, onChange }: InputProps) => (
    <div className="flex flex-col mb-6">
      <label className="mb-2 text-terracota font-semibold text-sm">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-700 
                   focus:outline-none focus:border-terracota focus:ring-4 focus:ring-terracota/20
                   transition-all duration-200 hover:border-gray-300"
        placeholder={`Ingresa tu ${label.toLowerCase()}`}
      />
    </div>
  );
  