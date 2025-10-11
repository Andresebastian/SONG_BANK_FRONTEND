interface ButtonProps {
    text: string;
    onClick?: () => void;
    type?: "button" | "submit";
    disabled?: boolean;
  }
  
  export const Button = ({ text, onClick, type = "button", disabled = false }: ButtonProps) => (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-3 px-6 rounded-xl font-semibold
                 transition-all duration-200 shadow-lg focus:outline-none focus:ring-4 focus:ring-terracota/30
                 ${disabled 
                   ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                   : 'bg-terracota text-blanco hover:bg-terracota-dark transform hover:scale-[1.02] hover:shadow-xl'
                 }`}
    >
      {text}
    </button>
  );
  