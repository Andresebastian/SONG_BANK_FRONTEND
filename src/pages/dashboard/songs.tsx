import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import LayoutDashboard from "../../components/LayoutDashboard";
import SongModal from "../../components/SongModal";
import { createSong, createSongChordPro } from "../../utils/api";

interface Song {
  _id: string;
  title: string;
  artist: string;
  key: string;
}

interface SongData {
  title?: string;
  artist?: string;
  key?: string;
  lyricsLines?: {
    text: string;
    chords: { note: string; index: number }[];
    section?: string;
  }[];
  notes?: string;
  chordProText?: string;
}

export default function SongsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Obtener token del localStorage solo en el cliente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem("token"));
    }
  }, []);

  const loadSongs = useCallback(async () => {
    if (!token) return; // No cargar si no hay token
    
    try {
      const res = await fetch(`/api/songs`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      const data = await res.json();
      const mapped = data.map((s: Song) => ({
        _id: s._id,
        title: s.title,
        artist: s.artist,
        key: s.key,
      }));
      setSongs(mapped);
    } catch (error) {
      console.error("Error loading songs:", error);
    }
  }, [token]);

  useEffect(() => {
    loadSongs();
  }, [loadSongs]); // Ejecutar cuando el token esté disponible

  const handleCreateSong = async (songData: SongData) => {
    try {
      // Verificar si es formato ChordPro
      if (songData.chordProText) {
        await createSongChordPro(songData.chordProText);
      } else {
        // Validar que los campos requeridos estén presentes
        if (!songData.title || !songData.artist || !songData.key || !songData.lyricsLines) {
          alert("Por favor completa todos los campos requeridos.");
          return;
        }
        await createSong({
          title: songData.title,
          artist: songData.artist,
          key: songData.key,
          lyricsLines: songData.lyricsLines,
          notes: songData.notes
        });
      }
      await loadSongs(); // Recargar la lista de canciones
      alert("¡Canción creada exitosamente!");
    } catch (error) {
      console.error("Error creating song:", error);
      alert("Error al crear la canción. Inténtalo de nuevo.");
    }
  };

  const filteredSongs = songs.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.artist.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSong = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  return (
    <LayoutDashboard>
      {/* Header con título y botón de acción */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Banco de Canciones</h1>
          <p className="text-gray-600">Selecciona las canciones para el servicio del domingo</p>
        </div>
        <div className="flex gap-3">
          {songs.length > 0 && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-terracota text-blanco px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-terracota-dark transform hover:scale-105 transition-all duration-200"
            >
              ➕ Crear Nueva Canción
            </button>
          )}
          {selected.length > 0 && (
            <button
              onClick={() =>
                alert(`Guardando ${selected.length} canción(es) en el domingo...`)
              }
              className="bg-blue-500 text-blanco px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-blue-600 transform hover:scale-105 transition-all duration-200"
            >
              🎵 Guardar {selected.length} canción{selected.length > 1 ? 'es' : ''} para domingo
            </button>
          )}
        </div>
      </div>

      {/* Barra de búsqueda compacta */}
      <div className="bg-blanco p-6 rounded-2xl shadow-lg mb-8">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="🔍 Buscar canciones por título o artista..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-terracota focus:ring-4 focus:ring-terracota/20 transition-all duration-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
            {filteredSongs.length} canciones encontradas
          </div>
        </div>
      </div>

      {/* Grid de canciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {filteredSongs.map((song) => {
          const isSelected = selected.includes(song._id);
          return (
            <div
              key={song._id}
              className={`bg-blanco rounded-2xl p-6 shadow-lg transition-all duration-200 transform hover:scale-105 ${
                isSelected 
                  ? "ring-4 ring-green-400 bg-green-50 border-2 border-green-300" 
                  : "hover:shadow-xl hover:ring-2 hover:ring-terracota/20"
              }`}
            >
              <div 
                className="mb-4 cursor-pointer"
                onClick={() => router.push(`/songs/${song._id}`)}
              >
                <h2 className="font-bold text-xl text-gray-800 mb-1 line-clamp-2">{song.title}</h2>
                <p className="text-terracota font-medium">{song.artist}</p>
                <div className="mt-2 inline-block bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-xs">
                  🎹 Tono: {song.key}
                </div>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSong(song._id);
                }}
                className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                  isSelected
                    ? "bg-green-500 text-blanco hover:bg-green-600"
                    : "bg-terracota text-blanco hover:bg-terracota-dark"
                }`}
              >
                {isSelected ? "✅ Añadida al domingo" : "➕ Añadir al domingo"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Mensaje cuando no hay resultados */}
      {filteredSongs.length === 0 && search && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No se encontraron canciones</h3>
          <p className="text-gray-500">Intenta con otros términos de búsqueda</p>
        </div>
      )}

      {/* Mensaje cuando no hay canciones */}
      {songs.length === 0 && !search && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎵</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No hay canciones en el banco</h3>
          <p className="text-gray-500 mb-6">Crea tu primera canción para comenzar a llenar el banco musical</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-terracota text-blanco px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-terracota-dark transform hover:scale-105 transition-all duration-200"
          >
            ➕ Crear Primera Canción
          </button>
        </div>
      )}

      {/* Modal para crear canción */}
      <SongModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateSong}
      />
    </LayoutDashboard>
  );
}
