import { useEffect, useState } from "react";

interface Song {
  _id: string;
  title: string;
  artist: string;
  key: string;
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (setListData: {
    date: string;
    songs: {
      songId: string;
      transposeKey: string;
      order: number;
    }[];
  }) => void;
  setList?: SetList | null;
  mode?: "create" | "edit" | "view";
}

export default function SetListModal({
  isOpen,
  onClose,
  onSave,
  setList,
  mode = "create",
}: Props) {
  const [date, setDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchArtist, setSearchArtist] = useState("");
  const [searchKey, setSearchKey] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [selectedSongs, setSelectedSongs] = useState<{
    songId: string;
    transposeKey: string;
    order: number;
  }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState<string | null>(null);

  // Obtener token del localStorage solo en el cliente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem("token"));
    }
  }, []);

  // Función helper para formatear fechas de manera segura
  const formatDate = (dateString: string) => {
    try {
      const dateObj = new Date(dateString);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().split("T")[0];
      }
    } catch (error) {
      console.error("Error formatting date:", error);
    }
    return "";
  };

  // Cargar datos del setlist cuando se abre en modo edición o visualización
  useEffect(() => {
    if (setList && isOpen) {
      // Formatear la fecha para el input de tipo date (YYYY-MM-DD)
      setDate(formatDate(setList.date));
      
      // Convertir la estructura del backend a la estructura interna
      const convertedSongs = setList.songs.map(song => ({
        songId: song.songId._id,
        transposeKey: song.transposeKey,
        order: song.order
      }));
      setSelectedSongs(convertedSongs);
    } else if (!setList && isOpen) {
      setDate("");
      setSelectedSongs([]);
      setSearchResults([]);
      setSearchTerm("");
      setSearchArtist("");
      setSearchKey("");
      setError("");
    }
  }, [setList, isOpen]);

  // Función de búsqueda avanzada
  const searchSongs = async () => {
    if (!token) {
      setError("Token no disponible");
      return;
    }
    
    if (!searchTerm && !searchArtist && !searchKey) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('title', searchTerm);
      if (searchArtist) params.append('artist', searchArtist);
      if (searchKey) params.append('key', searchKey);

      const response = await fetch(`/api/songs/search/advanced?${params.toString()}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      } else {
        setError("Error al buscar canciones");
      }
    } catch (error) {
      console.error("Error searching songs:", error);
      setError("Error de conexión al buscar canciones");
    } finally {
      setIsLoading(false);
    }
  };

  // Agregar canción al setlist
  const addSongToSetList = (song: Song) => {
    const newOrder = selectedSongs.length + 1;
    const newSongInSet = {
      songId: song._id,
      transposeKey: song.key,
      order: newOrder,
    };
    setSelectedSongs([...selectedSongs, newSongInSet]);
  };

  // Remover canción del setlist
  const removeSongFromSetList = (songId: string) => {
    const updatedSongs = selectedSongs
      .filter(song => song.songId !== songId)
      .map((song, index) => ({ ...song, order: index + 1 }));
    setSelectedSongs(updatedSongs);
  };

  // Mover canción en el orden (función reservada para futura implementación de drag & drop)
  // const moveSong = (fromIndex: number, toIndex: number) => {
  //   const newSongs = [...selectedSongs];
  //   const [movedSong] = newSongs.splice(fromIndex, 1);
  //   newSongs.splice(toIndex, 0, movedSong);
  //   
  //   // Actualizar el orden
  //   const updatedSongs = newSongs.map((song, index) => ({
  //     ...song,
  //     order: index + 1
  //   }));
  //   setSelectedSongs(updatedSongs);
  // };

  // Cambiar tonalidad de una canción
  const changeTransposeKey = (songId: string, newKey: string) => {
    setSelectedSongs(selectedSongs.map(song => 
      song.songId === songId 
        ? { ...song, transposeKey: newKey }
        : song
    ));
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!token) {
      setError("Token no disponible");
      return;
    }
    if (!date) {
      setError("La fecha del setlist es obligatoria");
      return;
    }
    if (selectedSongs.length === 0) {
      setError("Debes agregar al menos una canción al setlist");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const setListData = {
        date,
        songs: selectedSongs,
      };

      const url = mode === "edit" 
        ? `/api/set/${setList?._id}`
        : `/api/sets`;
      
      const method = mode === "edit" ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(setListData),
      });
      const result = await response.json();

      if (response.ok || result.success || result._id) {
        // Limpiar formulario
        setDate("");
        setSelectedSongs([]);
        setSearchResults([]);
        setSearchTerm("");
        setSearchArtist("");
        setSearchKey("");
        setError("");

        // Notificar éxito y cerrar modal
        console.log("SetList creado/editado exitosamente, llamando onSave...");
        onSave(setListData);
        onClose();
      } else {
        setError(result.message || "Error al crear/editar el setlist");
      }
    } catch (error) {
      console.error("Error creating/updating setlist:", error);
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
      <div className="bg-blanco rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header del modal */}
        <div className="terracota-gradient p-6 text-blanco">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {mode === "create"
                  ? "🎵 Nuevo SetList"
                  : mode === "edit"
                  ? "✏️ Editar SetList"
                  : "👁️ Ver SetList"}
              </h2>
              <p className="text-blanco-soft">
                {mode === "create"
                  ? "Crea un nuevo setlist seleccionando canciones"
                  : mode === "edit"
                  ? "Modifica el setlist existente"
                  : "Visualiza el setlist completo"}
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel izquierdo - Búsqueda y selección */}
            <div className="space-y-6">
              {/* Fecha del setlist */}
              <div>
                <label className="block text-terracota font-semibold mb-2">
                  Fecha del SetList
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

              {/* Búsqueda de canciones */}
              <div>
                <label className="block text-terracota font-semibold mb-2">
                  Buscar Canciones
                </label>
                
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Buscar por título..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl transition-all duration-200 focus:border-terracota focus:ring-4 focus:ring-terracota/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={mode === "view"}
                  />
                  
                  <input
                    type="text"
                    placeholder="Buscar por artista..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl transition-all duration-200 focus:border-terracota focus:ring-4 focus:ring-terracota/20"
                    value={searchArtist}
                    onChange={(e) => setSearchArtist(e.target.value)}
                    disabled={mode === "view"}
                  />
                  
                  <input
                    type="text"
                    placeholder="Buscar por tonalidad (ej: G, C, F)..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl transition-all duration-200 focus:border-terracota focus:ring-4 focus:ring-terracota/20"
                    value={searchKey}
                    onChange={(e) => setSearchKey(e.target.value)}
                    disabled={mode === "view"}
                  />
                  
                  <button
                    onClick={searchSongs}
                    disabled={mode === "view" || isLoading}
                    className="w-full bg-terracota text-blanco py-3 px-4 rounded-xl font-semibold hover:bg-terracota-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "🔍 Buscando..." : "🔍 Buscar Canciones"}
                  </button>
                </div>
              </div>

              {/* Resultados de búsqueda */}
              <div>
                <label className="block text-terracota font-semibold mb-2">
                  Resultados ({searchResults.length})
                </label>
                <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 max-h-60 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">🎵</div>
                      <p>Busca canciones para ver resultados</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {searchResults.map((song) => {
                        const isAlreadyAdded = selectedSongs.some(s => s.songId === song._id);
                        return (
                          <div
                            key={song._id}
                            className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                              isAlreadyAdded
                                ? "bg-green-100 border border-green-200"
                                : "bg-white border border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex-1">
                              <div className="font-medium">{song.title}</div>
                              <div className="text-sm text-gray-600">{song.artist}</div>
                              <div className="text-sm text-gray-500">🎹 {song.key}</div>
                            </div>
                            <button
                              onClick={() => addSongToSetList(song)}
                              disabled={mode === "view" || isAlreadyAdded}
                              className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                                isAlreadyAdded
                                  ? "bg-green-200 text-green-800 cursor-not-allowed"
                                  : "bg-terracota text-white hover:bg-terracota-dark"
                              }`}
                            >
                              {isAlreadyAdded ? "✓ Agregada" : "+ Agregar"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Panel derecho - SetList actual */}
            <div>
              <label className="block text-terracota font-semibold mb-2">
                SetList ({selectedSongs.length} canciones)
              </label>
              <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 max-h-96 overflow-y-auto">
                {selectedSongs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📝</div>
                    <p>No hay canciones en el setlist</p>
                    <p className="text-sm">Busca y agrega canciones desde el panel izquierdo</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedSongs
                      .sort((a, b) => a.order - b.order)
                      .map((songInSet) => {
                        // En modo view/edit, usar la información completa del setList original
                        let song: Song | undefined;
                        if (mode === "view" || mode === "edit") {
                          song = setList?.songs.find(s => s.songId._id === songInSet.songId)?.songId;
                        } else {
                          song = searchResults.find(s => s._id === songInSet.songId);
                        }
                        if (!song) return null;
                        
                        return (
                          <div
                            key={songInSet.songId}
                            className="bg-white border border-gray-200 rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center">
                                <span className="bg-terracota text-white px-2 py-1 rounded-full text-sm font-bold mr-3">
                                  {songInSet.order}
                                </span>
                                <div>
                                  <div className="font-medium">{song.title}</div>
                                  <div className="text-sm text-gray-600">{song.artist}</div>
                                </div>
                              </div>
                              {mode !== "view" && (
                                <button
                                  onClick={() => removeSongFromSetList(songInSet.songId)}
                                  className="text-red-500 hover:text-red-700 text-lg"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            
                            {mode !== "view" && (
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-600">Tonalidad:</span>
                                <select
                                  value={songInSet.transposeKey}
                                  onChange={(e) => changeTransposeKey(songInSet.songId, e.target.value)}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:border-terracota focus:ring-2 focus:ring-terracota/20"
                                >
                                  <option value="C">C</option>
                                  <option value="C#">C#</option>
                                  <option value="D">D</option>
                                  <option value="D#">D#</option>
                                  <option value="E">E</option>
                                  <option value="F">F</option>
                                  <option value="F#">F#</option>
                                  <option value="G">G</option>
                                  <option value="G#">G#</option>
                                  <option value="A">A</option>
                                  <option value="A#">A#</option>
                                  <option value="B">B</option>
                                </select>
                                <span className="text-xs text-gray-500">
                                  (Original: {song.key})
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
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
                  {mode === "edit" ? "💾 Guardar Cambios" : "💾 Crear SetList"}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
