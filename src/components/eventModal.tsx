// components/EventModal.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import { createEvent, updateEvent, getDirectors, getSetLists } from "../utils/api";

interface SongInSet {
  songId: string | Song;
  order: number;
  transposeKey: string;
  _id: string;
}

interface SetId {
  _id: string;
  date: string;
  songs: SongInSet[];
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface Event {
  _id: string;
  name: string;
  date: string;
  description: string;
  setId: SetId;
  directorName: string;
  directorId?: string; // Nuevo campo para el ID del director
  status: "active" | "archived" | "draft";
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface Song {
  _id: string;
  title: string;
  artist: string;
  key: string;
}

interface Director {
  _id: string;
  name: string;
  email: string;
  roleId: string;
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: {
    name: string;
    date: string;
    status: "active" | "archived" | "draft";
    directorName: string;
    directorId?: string;
    setId?: string;
    description: string;
  }) => void;
  event?: Event | null;
  mode?: "create" | "edit" | "view";
}

export default function EventModal({
  isOpen,
  onClose,
  onSave,
  event,
  mode = "create",
}: Props) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<"active" | "archived" | "draft">(
    "active"
  );
  const [directorName, setDirectorName] = useState("");
  const [directorId, setDirectorId] = useState("");
  const [directors, setDirectors] = useState<Director[]>([]);
  const [setId, setSetId] = useState("");
  const [setLists, setSetLists] = useState<SetList[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [description, setDescription] = useState("");
  const token = localStorage.getItem("token");
  useEffect(() => {
    // Cargar todas las canciones para poder mostrarlas en los setlists
    if (token) {
      fetch("/songs", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((songsData) => {
          // Manejar diferentes formatos de respuesta
          let songsArray = [];
          if (Array.isArray(songsData)) {
            songsArray = songsData;
          } else if (songsData && typeof songsData === 'object') {
            songsArray = songsData.data || songsData.songs || [];
          }
          setSongs(songsArray);
        })
        .catch(console.error);
    }

    // Cargar directores
    getDirectors()
      .then((data) => {
        // Manejar diferentes formatos de respuesta
        let directorsData = [];
        if (Array.isArray(data)) {
          directorsData = data;
        } else if (data && typeof data === 'object') {
          directorsData = data.data || data.directors || data.users || [];
        }
        setDirectors(directorsData);
      })
      .catch((error) => {
        console.error("Error loading directors:", error);
        setDirectors([]);
      });

    // Cargar setlists
    getSetLists()
      .then((data) => {
        // Manejar diferentes formatos de respuesta
        let setListsData = [];
        if (Array.isArray(data)) {
          setListsData = data;
        } else if (data && typeof data === 'object') {
          setListsData = data.data || data.setLists || data.sets || [];
        }
        setSetLists(setListsData);
      })
      .catch((error) => {
        console.error("Error loading setlists:", error);
        setSetLists([]);
      });
  }, [token]);

  // Cargar datos del evento cuando se abre en modo edición o visualización
  useEffect(() => {
    if (event && isOpen) {
      setName(event.name || "");

      // Formatear la fecha para el input de tipo date (YYYY-MM-DD)
      let formattedDate = "";
      if (event.date) {
        const dateObj = new Date(event.date);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().split("T")[0];
        }
      }
      setDate(formattedDate);

      setStatus(event.status || "active");
      setDescription(event.description || "");
      setDirectorName(event.directorName || "");
      setDirectorId(event.directorId || "");
      setSetId(event.setId?._id || "");
    } else if (!event && isOpen) {
      setName("");
      setDate("");
      setStatus("active");
      setDescription("");
      setDirectorName("");
      setDirectorId("");
      setSetId("");
      setError("");
    }
  }, [event, isOpen]);

  // Cargar canciones cuando se selecciona un setlist
  useEffect(() => {
    if (setId && setLists.length > 0) {
      const selectedSetList = setLists.find(sl => sl._id === setId);
      if (selectedSetList && selectedSetList.songs) {
        // Si el setlist ya viene con la información completa de las canciones, no necesitamos hacer nada
        // Si solo viene con IDs, necesitaríamos cargar las canciones, pero por ahora asumimos que viene completo
        console.log("SetList seleccionado:", selectedSetList);
      }
    }
  }, [setId, setLists]);

  const handleDirectorChange = (directorId: string) => {
    setDirectorId(directorId);
    const selectedDirector = directors.find(d => d._id === directorId);
    if (selectedDirector) {
      setDirectorName(selectedDirector.name);
    }
  };

  const handleSetListChange = (setListId: string) => {
    setSetId(setListId);
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!name.trim()) {
      setError("El nombre del evento es obligatorio");
      return;
    }
    if (!date) {
      setError("La fecha del evento es obligatoria");
      return;
    }
    if (!directorId) {
      setError("Debe seleccionar un director");
      return;
    }
    if (!setId) {
      setError("Debe seleccionar un setlist");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const eventData = {
        name: name.trim(),
        date,
        status,
        directorName: directorName.trim(),
        directorId: directorId,
        setId: setId,
        description: description.trim(),
      };

      let result;
      if (mode === "edit") {
        result = await updateEvent(event?._id || "", eventData);
      } else {
        result = await createEvent(eventData);
      }

      if (result.success || result._id) {
        // Limpiar formulario
        setName("");
        setDate("");
        setStatus("active");
        setDirectorName("");
        setDirectorId("");
        setSetId("");
        setDescription("");
        setError("");

        // Notificar éxito y cerrar modal
        onSave(eventData);
        onClose();
      } else {
        setError(result.message || "Error al crear/editar el evento");
      }
    } catch (error) {
      console.error("Error creating/updating event:", error);
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
      <div className="bg-blanco rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header del modal */}
        <div className="terracota-gradient p-6 text-blanco">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {mode === "create"
                  ? "🎵 Nuevo Evento"
                  : mode === "edit"
                  ? "✏️ Editar Evento"
                  : "👁️ Ver Evento"}
              </h2>
              <p className="text-blanco-soft">
                {mode === "create"
                  ? "Crea un nuevo evento para organizar los servicios"
                  : mode === "edit"
                  ? "Modifica los datos del evento"
                  : "Visualiza los detalles del evento"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-blanco hover:text-blanco-soft text-2xl font-bold transition-colors duration-200"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Contenido del modal */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Mensaje de error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
              <div className="flex items-center">
                <span className="mr-2">⚠️</span>
                {error}
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Campos principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-terracota font-semibold mb-2">
                  Nombre del Evento
                </label>
                <input
                  type="text"
                  placeholder="Ej: Servicio Dominical - Enero 2024"
                  className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl transition-all duration-200 ${
                    mode === "view"
                      ? "bg-gray-100 cursor-not-allowed"
                      : "focus:border-terracota focus:ring-4 focus:ring-terracota/20"
                  }`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  readOnly={mode === "view"}
                />
              </div>

              <div>
                <label className="block text-terracota font-semibold mb-2">
                  Fecha del Evento
                </label>
                <input
                  type="date"
                  className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl transition-all duration-200 ${
                    mode === "view"
                      ? "bg-gray-100 cursor-not-allowed"
                      : "focus:border-terracota focus:ring-4 focus:ring-terracota/20"
                  }`}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  readOnly={mode === "view"}
                />
              </div>
            </div>

            {/* Campo Director */}
            <div>
              <label className="block text-terracota font-semibold mb-2">
                Director del Evento
              </label>
              <select
                className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl transition-all duration-200 ${
                  mode === "view"
                    ? "bg-gray-100 cursor-not-allowed"
                    : "focus:border-terracota focus:ring-4 focus:ring-terracota/20"
                }`}
                value={directorId}
                onChange={(e) => handleDirectorChange(e.target.value)}
                disabled={mode === "view"}
              >
                <option value="">Seleccionar director...</option>
                {directors.map((director) => (
                  <option key={director._id} value={director._id}>
                    {director.name}
                  </option>
                ))}
              </select>
              {directors.length === 0 && !isLoading && (
                <p className="text-sm text-gray-500 mt-1">
                  No hay directores disponibles
                </p>
              )}
            </div>

            {/* Campo SetList */}
            <div>
              <label className="block text-terracota font-semibold mb-2">
                SetList del Evento
              </label>
              <select
                className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl transition-all duration-200 ${
                  mode === "view"
                    ? "bg-gray-100 cursor-not-allowed"
                    : "focus:border-terracota focus:ring-4 focus:ring-terracota/20"
                }`}
                value={setId}
                onChange={(e) => handleSetListChange(e.target.value)}
                disabled={mode === "view"}
              >
                <option value="">Seleccionar setlist...</option>
                {setLists.map((setList) => (
                  <option key={setList._id} value={setList._id}>
                    SetList - {new Date(setList.date).toLocaleDateString('es-ES', { 
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })} ({setList.songs?.length || 0} canciones)
                  </option>
                ))}
              </select>
              {setLists.length === 0 && !isLoading && (
                <p className="text-sm text-gray-500 mt-1">
                  No hay setlists disponibles. <Link href="/dashboard/setlists" className="text-terracota hover:underline">Crear setlist</Link>
                </p>
              )}
            </div>

            {/* Estado del evento */}
            <div>
              <label className="block text-terracota font-semibold mb-2">
                Estado del Evento
              </label>
              <select
                className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl transition-all duration-200 ${
                  mode === "view"
                    ? "bg-gray-100 cursor-not-allowed"
                    : "focus:border-terracota focus:ring-4 focus:ring-terracota/20"
                }`}
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "active" | "archived" | "draft")
                }
                disabled={mode === "view"}
              >
                <option value="active">🟢 Activo</option>
                <option value="draft">📝 Borrador</option>
                <option value="archived">📁 Archivado</option>
              </select>
            </div>

            {/* Descripción del evento */}
            <div>
              <label className="block text-terracota font-semibold mb-2">
                Descripción del Evento
              </label>
              <input
                type="text"
                placeholder="Ej: Servicio Dominical - Enero 2024"
                className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl transition-all duration-200 ${
                  mode === "view"
                    ? "bg-gray-100 cursor-not-allowed"
                    : "focus:border-terracota focus:ring-4 focus:ring-terracota/20"
                }`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                readOnly={mode === "view"}
              />
            </div>

            {/* Canciones del SetList */}
            {setId && (
              <div>
                <label className="block text-terracota font-semibold mb-2">
                  Canciones del SetList ({setLists.find(sl => sl._id === setId)?.songs?.length || 0} canciones)
                </label>
                <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 max-h-60 overflow-y-auto">
                  {(() => {
                    const selectedSetList = setLists.find(sl => sl._id === setId);
                    if (!selectedSetList || !selectedSetList.songs || selectedSetList.songs.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-4xl mb-2">🎵</div>
                          <p>No hay canciones en el setlist</p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-3">
                        {selectedSetList.songs
                          .sort((a, b) => a.order - b.order)
                          .map((songInSet) => {
                            // Manejar tanto songId como string o como objeto Song completo
                            let song;
                            if (typeof songInSet.songId === 'string') {
                              // Buscar la canción en el estado songs
                              song = songs.find(s => s._id === songInSet.songId);
                            } else {
                              song = songInSet.songId; // Ya es un objeto Song
                            }
                            
                            if (!song) {
                              return (
                                <div key={songInSet._id} className="block p-3 rounded-lg bg-gray-200 text-gray-600">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-medium">Canción no encontrada</div>
                                      <div className="text-sm opacity-75">
                                        ID: {typeof songInSet.songId === 'string' ? songInSet.songId : 'N/A'}
                                      </div>
                                    </div>
                                    <div className="text-sm opacity-75">
                                      #{songInSet.order}
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            
                            return (
                              <a
                                key={songInSet._id}
                                href={`/songs/${song._id}?key=${encodeURIComponent(songInSet.transposeKey)}&returnTo=event&eventId=${event?._id || ''}`}
                                className="block p-3 rounded-lg bg-terracota text-white hover:bg-terracota-dark transition-all duration-200 transform hover:scale-105"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">{song.title}</div>
                                    <div className="text-sm opacity-75">
                                      🎹 {songInSet.transposeKey} (Original: {song.key})
                                    </div>
                                  </div>
                                  <div className="text-sm opacity-75">
                                    #{songInSet.order}
                                  </div>
                                </div>
                              </a>
                            );
                          })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer con botones */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
          <button
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200"
            onClick={onClose}
          >
            {mode === "view" ? "Cerrar" : "Cancelar"}
          </button>
          {mode !== "view" && (
            <button
              className={`px-6 py-3 bg-terracota text-blanco rounded-xl font-semibold transition-all duration-200 shadow-lg ${
                isLoading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-terracota-dark transform hover:scale-105"
              }`}
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  {mode === "edit" ? "Guardando..." : "Creando..."}
                </>
              ) : (
                <>
                  {mode === "edit" ? "💾 Guardar Cambios" : "💾 Crear Evento"}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
