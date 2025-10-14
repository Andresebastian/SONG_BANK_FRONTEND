import { useEffect, useState, useCallback } from "react";
import LayoutDashboard from "../../components/LayoutDashboard";
import SetListModal from "../../components/SetListModal";

interface Song {
  _id: string;
  title: string;
  artist: string;
  key: string;
  lyricsLines: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  notes: string;
  isBank: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface SongInSet {
  songId: Song;
  transposeKey: string;
  order: number;
  _id: string;
}

interface SetList {
  _id: string;
  date: string;
  songs: SongInSet[];
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export default function SetListsPage() {
  const [setLists, setSetLists] = useState<SetList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create");
  const [selectedSetList, setSelectedSetList] = useState<SetList | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Función helper para formatear fechas de manera segura
  const formatDate = (dateString: string, options?: Intl.DateTimeFormatOptions) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Fecha no disponible';
      }
      return date.toLocaleDateString('es-ES', options);
    } catch {
      return 'Fecha no disponible';
    }
  };

  // Obtener token del localStorage solo en el cliente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem("token"));
    }
  }, []);

  const loadSetLists = useCallback(async () => {
    console.log("loadSetLists ejecutándose...");
    if (!token) {
      console.log("No hay token, no se cargan setlists");
      setIsLoading(false);
      return; // No cargar si no hay token
    }
    
    setIsLoading(true);
    console.log("Cargando setlists desde:", `/sets`);
    
    try {
      const response = await fetch(`/api/sets`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        console.error("Error response:", response.status, response.statusText);
        setSetLists([]);
        return;
      }
      
      const data = await response.json();
      console.log("Datos recibidos del backend:", data); // Para debug
      console.log("Es array?", Array.isArray(data));
      console.log("Tipo de data:", typeof data);
      console.log("Keys de data:", Object.keys(data));
      
      let setListsToSet = [];
      
      if (Array.isArray(data)) {
        // Si es un array, usarlo directamente
        setListsToSet = data;
      } else if (data && typeof data === 'object') {
        // Si es un objeto, verificar si tiene una propiedad que contenga los setlists
        if (data.setLists && Array.isArray(data.setLists)) {
          setListsToSet = data.setLists;
        } else if (data.data && Array.isArray(data.data)) {
          setListsToSet = data.data;
        } else if (data.sets && Array.isArray(data.sets)) {
          setListsToSet = data.sets;
        } else {
          // Si es un objeto único (no un array), convertirlo a array
          setListsToSet = [data];
        }
      }
      
      console.log("SetLists procesados:", setListsToSet);
      console.log("Cantidad de setlists:", setListsToSet.length);
      
      setSetLists(setListsToSet);
      console.log("SetLists actualizados en estado:", setListsToSet);
    } catch (error) {
      console.error("Error loading setlists:", error);
      setSetLists([]); // Fallback a array vacío en caso de error
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSetLists();
  }, [loadSetLists]);

  const openModal = (mode: "create" | "edit" | "view", setList?: SetList) => {
    setModalMode(mode);
    setSelectedSetList(setList || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedSetList(null);
    setModalMode("create");
  };

  const getStatusColor = (active: boolean) => {
    return active 
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusIcon = (active: boolean) => {
    return active ? "🟢" : "🔴";
  };

  return (
    <LayoutDashboard>
      {/* Header con título y botón de acción */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Gestión de SetLists</h1>
          <p className="text-gray-600">Crea y organiza los setlists para los eventos</p>
        </div>
        {/* Solo mostrar el botón de arriba cuando hay setlists */}
        {!isLoading && setLists.length > 0 && (
          <button
            className="bg-terracota text-blanco px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-terracota-dark transform hover:scale-105 transition-all duration-200"
            onClick={() => openModal("create")}
          >
            ➕ Crear Nuevo SetList
          </button>
        )}
      </div>

      {/* Indicador de carga */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-spin">⏳</div>
          <p className="text-gray-600">Cargando setlists...</p>
        </div>
      )}

      {/* Grid de setlists */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {setLists.map((setList) => (
          <div
            key={setList._id}
            className="bg-blanco rounded-2xl p-6 shadow-lg transition-all duration-200 hover:shadow-xl hover:ring-2 hover:ring-terracota/20 transform hover:scale-105"
          >
            {/* Header del setlist */}
            <div className="mb-4">
              <div className="flex items-start justify-between mb-2">
                <h2 className="font-bold text-xl text-gray-800">
                  SetList - {formatDate(setList.date, { 
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </h2>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(setList.active)}`}>
                  {getStatusIcon(setList.active)} {setList.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center text-gray-600">
                  <span className="mr-2">📅</span>
                  <span><strong>Evento:</strong> {formatDate(setList.date, { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
                
                <div className="flex items-center text-terracota font-medium">
                  <span className="mr-2">🎵</span>
                  <span>{setList.songs?.length || 0} canción{(setList.songs?.length || 0) !== 1 ? 'es' : ''} en el setlist</span>
                </div>

                <div className="flex items-center text-gray-600 text-sm">
                  <span className="mr-2">👤</span>
                  <span><strong>Creado/Actualizado:</strong> {formatDate(setList.updatedAt)}</span>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2">
              <button
                className="flex-1 bg-terracota text-blanco py-2 px-4 rounded-xl font-medium hover:bg-terracota-dark transition-all duration-200"
                onClick={() => openModal("view", setList)}
              >
                👁️ Ver SetList
              </button>
              <button
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200"
                onClick={() => openModal("edit", setList)}
              >
                ✏️ Editar
              </button>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Mensaje cuando no hay setlists */}
      {!isLoading && setLists.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎵</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No existen setlists activos</h3>
          <p className="text-gray-500 mb-6">Crea uno para comenzar a organizar las canciones de tus eventos</p>
          <button
            className="bg-terracota text-blanco px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-terracota-dark transform hover:scale-105 transition-all duration-200"
            onClick={() => openModal("create")}
          >
            ➕ Crear Primer SetList
          </button>
        </div>
      )}

      <SetListModal 
        isOpen={isModalOpen} 
        onClose={closeModal}
        onSave={() => {
          // Recargar la lista de setlists después de crear/editar uno
          console.log("Recargando setlists después de crear/editar...");
          loadSetLists();
        }}
        setList={selectedSetList}
        mode={modalMode}
      />
    </LayoutDashboard>
  );
}
