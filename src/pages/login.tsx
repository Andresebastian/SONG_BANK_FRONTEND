import { useState } from "react";
import { Input } from "components/Input";
import { Button } from "components/Button";
import { loginUser, setToken } from "utils/api";
import { useRouter } from "next/router";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
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
