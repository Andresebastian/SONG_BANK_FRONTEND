import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import LayoutDashboard from "../../components/LayoutDashboard";
import SongModal from "../../components/SongModal";
import { createSong, createSongChordPro, searchSongsAdvanced } from "../../utils/api";

interface Song {
  _id: string;
  title: string;
  artist: string;
  key: string;
  tags?: string[];
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
  tags?: string[];
  chordProText?: string;
}

export default function SongsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [filterTitle, setFilterTitle] = useState("");
  const [filterArtist, setFilterArtist] = useState("");
  const [filterKey, setFilterKey] = useState("");
  const [filterTags, setFilterTags] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  // Obtener token del localStorage solo en el cliente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem("token"));
    }
  }, []);

  const loadSongs = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/songs`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await res.json();
      const mapped = (Array.isArray(data) ? data : []).map((s: Song) => ({
        _id: s._id,
        title: s.title,
        artist: s.artist,
        key: s.key,
        tags: s.tags,
      }));
      setSongs(mapped);
    } catch (error) {
      console.error("Error loading songs:", error);
    }
  }, [token]);

  const runSearch = useCallback(async () => {
    if (!token) return;
    setSearching(true);
    try {
      const hasFilter = filterTitle.trim() || filterArtist.trim() || filterKey.trim() || filterTags.trim();
      if (!hasFilter) {
        await loadSongs();
      } else {
        const data = await searchSongsAdvanced({
          title: filterTitle.trim() || undefined,
          artist: filterArtist.trim() || undefined,
          key: filterKey.trim() || undefined,
          tags: filterTags.trim() || undefined,
        });
        const list = Array.isArray(data) ? data : [];
        setSongs(list.map((s: Song) => ({
          _id: s._id,
          title: s.title,
          artist: s.artist,
          key: s.key,
          tags: s.tags,
        })));
      }
    } catch (error) {
      console.error("Error searching songs:", error);
    } finally {
      setSearching(false);
    }
  }, [token, filterTitle, filterArtist, filterKey, filterTags, loadSongs]);

  useEffect(() => {
    loadSongs();
  }, [loadSongs]); // Ejecutar cuando el token esté disponible

  const handleCreateSong = async (songData: SongData) => {
    try {
      if (songData.chordProText) {
        await createSongChordPro(songData.chordProText, songData.tags);
      } else {
        if (!songData.title || !songData.artist || !songData.key || !songData.lyricsLines) {
          alert("Por favor completa todos los campos requeridos.");
          return;
        }
        await createSong({
          title: songData.title,
          artist: songData.artist,
          key: songData.key,
          lyricsLines: songData.lyricsLines,
          notes: songData.notes,
          tags: songData.tags,
        });
      }
      await loadSongs();
      alert("¡Canción creada exitosamente!");
    } catch (error) {
      console.error("Error creating song:", error);
      alert("Error al crear la canción. Inténtalo de nuevo.");
    }
  };

  const clearFilters = () => {
    setFilterTitle("");
    setFilterArtist("");
    setFilterKey("");
    setFilterTags("");
    loadSongs();
  };

  const filteredSongs = songs;

  const toggleSong = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  return (
    <LayoutDashboard>
      {/* Header con título y botón de acción */}
      <div className="mb-6 lg:mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-2">Banco de Canciones</h1>
            <p className="text-gray-600 text-sm lg:text-base">Selecciona las canciones para el servicio del domingo</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {songs.length > 0 && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-terracota text-blanco px-4 py-3 lg:px-6 rounded-xl font-semibold shadow-lg hover:bg-terracota-dark transform hover:scale-105 transition-all duration-200 text-sm lg:text-base"
              >
                ➕ Crear Nueva Canción
              </button>
            )}
            {selected.length > 0 && (
              <button
                onClick={() =>
                  alert(`Guardando ${selected.length} canción(es) en el domingo...`)
                }
                className="bg-blue-500 text-blanco px-4 py-3 lg:px-6 rounded-xl font-semibold shadow-lg hover:bg-blue-600 transform hover:scale-105 transition-all duration-200 text-sm lg:text-base"
              >
                🎵 Guardar {selected.length} canción{selected.length > 1 ? 'es' : ''} para domingo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filtros de búsqueda */}
      <div className="bg-blanco p-4 lg:p-6 rounded-2xl shadow-lg mb-6 lg:mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4">
          <input
            type="text"
            placeholder="Título"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-terracota focus:ring-4 focus:ring-terracota/20 transition-all duration-200 text-sm lg:text-base"
            value={filterTitle}
            onChange={(e) => setFilterTitle(e.target.value)}
          />
          <input
            type="text"
            placeholder="Artista"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-terracota focus:ring-4 focus:ring-terracota/20 transition-all duration-200 text-sm lg:text-base"
            value={filterArtist}
            onChange={(e) => setFilterArtist(e.target.value)}
          />
          <input
            type="text"
            placeholder="Tono (ej: G, C)"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-terracota focus:ring-4 focus:ring-terracota/20 transition-all duration-200 text-sm lg:text-base"
            value={filterKey}
            onChange={(e) => setFilterKey(e.target.value)}
          />
          <input
            type="text"
            placeholder="Etiqueta"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-terracota focus:ring-4 focus:ring-terracota/20 transition-all duration-200 text-sm lg:text-base"
            value={filterTags}
            onChange={(e) => setFilterTags(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={runSearch}
            disabled={searching}
            className="bg-terracota text-blanco px-4 py-2 rounded-xl font-semibold hover:bg-terracota-dark transition-all duration-200 disabled:opacity-50 text-sm lg:text-base"
          >
            {searching ? "Buscando..." : "🔍 Buscar"}
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200 text-sm lg:text-base"
          >
            Limpiar filtros
          </button>
          <span className="text-xs lg:text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
            {filteredSongs.length} canciones
          </span>
        </div>
      </div>

      {/* Grid de canciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
        {filteredSongs.map((song) => {
          const isSelected = selected.includes(song._id);
          return (
            <div
              key={song._id}
              className={`bg-blanco rounded-2xl p-4 lg:p-6 shadow-lg transition-all duration-200 transform hover:scale-105 ${
                isSelected 
                  ? "ring-4 ring-green-400 bg-green-50 border-2 border-green-300" 
                  : "hover:shadow-xl hover:ring-2 hover:ring-terracota/20"
              }`}
            >
              <div 
                className="mb-3 lg:mb-4 cursor-pointer"
                onClick={() => router.push(`/songs/${song._id}`)}
              >
                <h2 className="font-bold text-lg lg:text-xl text-gray-800 mb-1 line-clamp-2">{song.title}</h2>
                <p className="text-terracota font-medium text-sm lg:text-base">{song.artist}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-xs">
                    🎹 {song.key}
                  </span>
                  {Array.isArray(song.tags) && song.tags.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {song.tags.slice(0, 3).join(", ")}{song.tags.length > 3 ? "…" : ""}
                    </span>
                  )}
                </div>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSong(song._id);
                }}
                className={`w-full py-2 lg:py-3 px-3 lg:px-4 rounded-xl font-semibold transition-all duration-200 text-sm lg:text-base ${
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
      {filteredSongs.length === 0 && (filterTitle || filterArtist || filterKey || filterTags) && (
        <div className="text-center py-8 lg:py-12">
          <div className="text-4xl lg:text-6xl mb-4">🔍</div>
          <h3 className="text-lg lg:text-xl font-semibold text-gray-600 mb-2">No se encontraron canciones</h3>
          <p className="text-gray-500 text-sm lg:text-base">Intenta con otros términos de búsqueda</p>
        </div>
      )}

      {/* Mensaje cuando no hay canciones */}
      {songs.length === 0 && !filterTitle && !filterArtist && !filterKey && !filterTags && (
        <div className="text-center py-8 lg:py-12">
          <div className="text-4xl lg:text-6xl mb-4">🎵</div>
          <h3 className="text-lg lg:text-xl font-semibold text-gray-600 mb-2">No hay canciones en el banco</h3>
          <p className="text-gray-500 mb-6 text-sm lg:text-base">Crea tu primera canción para comenzar a llenar el banco musical</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-terracota text-blanco px-4 py-3 lg:px-6 rounded-xl font-semibold shadow-lg hover:bg-terracota-dark transform hover:scale-105 transition-all duration-200 text-sm lg:text-base"
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
