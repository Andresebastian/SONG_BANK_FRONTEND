import { useState } from "react";
import { Input } from "components/Input";
import { Button } from "components/Button";
import { loginUser, setToken } from "utils/api";
import { useRouter } from "next/router";
import Link from "next/link";

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await loginUser({ email, password });
      console.log(res);
      
      if (res.access_token) {
        setToken(res.access_token);
        router.push("/dashboard/songs");
      } else {
        setError(res.message || "Error al iniciar sesión");
      }
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
    }
  };

  return (
    <div className="min-h-screen terracota-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo o título principal */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blanco mb-2">Ministerio de Alabanza Quitumbe</h1>
          <p className="text-blanco-soft text-lg">Inicia sesión en tu cuenta</p>
        </div>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="bg-blanco p-8 rounded-2xl terracota-shadow"
        >
          <h2 className="text-2xl font-bold text-terracota mb-6 text-center">
            Login
          </h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}
          <Input
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="flex flex-col mb-6">
            <label className="mb-2 text-terracota font-semibold text-sm">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-12 text-gray-700
                           focus:outline-none focus:border-terracota focus:ring-4 focus:ring-terracota/20
                           transition-all duration-200 hover:border-gray-300"
                placeholder="Ingresa tu contraseña"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-terracota transition-colors p-1"
                tabIndex={-1}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>
          <Button type="submit" text="Ingresar" />

          {/* Enlace a registro */}
          <div className="text-center mt-6">
            <p className="text-gray-600">
              ¿No tienes cuenta?{" "}
              <Link
                href="/register"
                className="text-terracota hover:text-terracota-dark font-medium"
              >
                Regístrate aquí
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
