import { useState, useEffect } from "react";
import { Input } from "components/Input";
import { Select } from "components/Select";
import { Button } from "components/Button";
import { registerUser, getRoles } from "utils/api";
import { useRouter } from "next/router";
import Link from "next/link";

interface Role {
  id?: string;
  _id?: string;
  value?: string;
  name?: string;
  label?: string;
}

interface RoleResponse {
  data?: Role[];
  roles?: Role[];
  message?: string;
}

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const response = await getRoles();
        console.log("Respuesta completa del backend:", response);
        
        // Extraer los roles de diferentes posibles estructuras de respuesta
        let rolesData: (Role | string)[] = [];
        
        if (Array.isArray(response)) {
          // Si la respuesta es directamente un array
          rolesData = response;
        } else if (response && typeof response === 'object') {
          // Si la respuesta es un objeto con propiedades como data, roles, etc.
          rolesData = (response as RoleResponse).data || 
                     (response as RoleResponse).roles || 
                     Object.values(response).find(val => Array.isArray(val)) as Role[] || [];
        }
        
        console.log("Datos de roles extraídos:", rolesData);
        console.log("Tipo de datos:", typeof rolesData, Array.isArray(rolesData));
        
        // Formatear los roles
        const formattedRoles = rolesData.map((role: Role | string) => {
          if (typeof role === 'string') {
            return { value: role, label: role };
          }
          
          return {
            value: role._id || role.value || '', // No usar index como fallback
            label: role.name || role.label || '', // No usar label genérico como fallback
          };
        });
        
        console.log("Roles formateados:", formattedRoles);
        
        // Filtrar roles sin ID válido y duplicados
        const validRoles = formattedRoles.filter(role => {
          return role.value && role.value !== '' && role.label && role.label !== '';
        });
        
        console.log("Roles válidos:", validRoles);
        
        // Filtrar duplicados
        const uniqueRoles = validRoles.filter((role, index, self) => {
          return index === self.findIndex(r => r.value === role.value);
        });
        
        console.log("Roles únicos finales:", uniqueRoles);
        console.log("Cantidad de roles finales:", uniqueRoles.length);
        
        // Solo establecer roles si hay roles válidos
        setRoles(uniqueRoles);
      } catch (error) {
        console.error("Error al cargar roles:", error);
        setError("Error al cargar los roles disponibles");
        
        // No establecer roles en caso de error, dejar el array vacío
        setRoles([]);
      } finally {
        setLoadingRoles(false);
      }
    };

    loadRoles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log("Datos a enviar al backend:", { name, email, password, role });
      console.log("Rol seleccionado:", role);
      
      const res = await registerUser({ name, email, password, roleId: role });
      if (res.access_token) {
        // No guardar el token, mostrar mensaje de éxito y redirigir al login
        setError(""); // Limpiar errores
        setSuccess("Usuario registrado exitosamente. Redirigiendo al login...");
        
        // Redirigir después de 2 segundos
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setError(res.message || "Error al registrar usuario");
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
          <p className="text-blanco-soft text-lg">Crea tu cuenta</p>
        </div>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="bg-blanco p-8 rounded-2xl terracota-shadow"
        >
          <h2 className="text-2xl font-bold text-terracota mb-6 text-center">
            Registro
          </h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
              {success}
            </div>
          )}
          <Input
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
          <Select
            label="Rol"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={roles}
            placeholder={
              loadingRoles 
                ? "Cargando roles..." 
                : roles.length === 0 
                  ? "No hay roles disponibles" 
                  : "Selecciona tu rol"
            }
            disabled={loadingRoles || roles.length === 0}
          />
          <Button 
            type="submit" 
            text={success ? "Redirigiendo..." : "Registrar"}
            disabled={!!success}
          />

          {/* Enlace a login */}
          <div className="text-center mt-6">
            <p className="text-gray-600">
              ¿Ya tienes cuenta?{" "}
              <Link
                href="/login"
                className="text-terracota hover:text-terracota-dark font-medium"
              >
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
