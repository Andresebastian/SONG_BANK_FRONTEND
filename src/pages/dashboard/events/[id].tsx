import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import LayoutDashboard from "../../../components/LayoutDashboard";
import { getEvent, getSong, transposeSong, updateSong, updateSongChordPro } from "../../../utils/api";
import SongModal from "../../../components/SongModal";

interface SongInSet {
  songId: string;
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
  directorId?: string;
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
  lyricsLines: {
    text: string;
    chords: { note: string; index: number }[];
    section?: string;
  }[];
}

export default function EventDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [loadingSong, setLoadingSong] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [showTransposeModal, setShowTransposeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [transposing, setTransposing] = useState(false);
  const [songDetails, setSongDetails] = useState<{[key: string]: {title: string, artist: string}}>({});

  const loadEvent = useCallback(async () => {
    try {
      const data = await getEvent(id as string);
      setEvent(data);
      
      // Cargar información básica de todas las canciones
      if (data.setId?.songs) {
        const songPromises = data.setId.songs.map(async (songInSet: SongInSet) => {
          try {
            const song = await getSong(songInSet.songId);
            return { id: songInSet.songId, title: song.title, artist: song.artist };
          } catch (error) {
            console.error(`Error loading song ${songInSet.songId}:`, error);
            return { id: songInSet.songId, title: 'Canción sin título', artist: 'Desconocido' };
          }
        });
        
        const songsInfo = await Promise.all(songPromises);
        const songDetailsMap: {[key: string]: {title: string, artist: string}} = {};
        songsInfo.forEach(info => {
          songDetailsMap[info.id] = { title: info.title, artist: info.artist };
        });
        setSongDetails(songDetailsMap);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading event:", error);
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadEvent();
    }
  }, [id, loadEvent]);

  const handleSelectSong = async (songId: string, transposeKey: string) => {
    // Si se hace click en la misma canción, colapsar (cerrar)
    if (selectedSongId === songId) {
      setSelectedSongId(null);
      setSelectedSong(null);
      return;
    }
    
    setSelectedSongId(songId);
    setLoadingSong(true);
    
    try {
      const songData = await getSong(songId);
      
      // Si la tonalidad del setlist es diferente a la original, transponer
      if (transposeKey && transposeKey !== songData.key) {
        const transposedSong = await transposeSong(songId, transposeKey);
        setSelectedSong(transposedSong);
      } else {
        setSelectedSong(songData);
      }
    } catch (error) {
      console.error("Error loading song:", error);
      alert("Error al cargar la canción");
    } finally {
      setLoadingSong(false);
    }
  };

  const handleTranspose = async (newKey: string) => {
    if (!selectedSong || !selectedSongId) return;
    
    setTransposing(true);
    try {
      const updatedSong = await transposeSong(selectedSongId, newKey);
      setSelectedSong(updatedSong);
      setShowTransposeModal(false);
    } catch (error) {
      console.error('Error al cambiar tonalidad:', error);
      alert('Error al cambiar la tonalidad. Inténtalo de nuevo.');
    } finally {
      setTransposing(false);
    }
  };

  const handleUpdateSong = async (songData: {
    title?: string;
    artist?: string;
    key?: string;
    lyricsLines?: {
      text: string;
      chords: { note: string; index: number }[];
    }[];
    notes?: string;
    chordProText?: string;
  }) => {
    if (!selectedSongId) return;
    
    try {
      let updatedSong;
      
      if (songData.chordProText) {
        updatedSong = await updateSongChordPro(selectedSongId, songData.chordProText);
      } else {
        updatedSong = await updateSong(selectedSongId, {
          title: songData.title || '',
          artist: songData.artist || '',
          key: songData.key || '',
          lyricsLines: songData.lyricsLines || [],
          notes: songData.notes || ''
        });
      }
      
      setSelectedSong(updatedSong);
      setShowEditModal(false);
      
      // Actualizar el título en la lista
      setSongDetails(prev => ({
        ...prev,
        [selectedSongId]: { 
          title: updatedSong.title, 
          artist: updatedSong.artist 
        }
      }));
      
      alert('¡Canción actualizada exitosamente!');
    } catch (error) {
      console.error('Error al actualizar canción:', error);
      alert('Error al actualizar la canción. Inténtalo de nuevo.');
    }
  };

  const getFontSizeClasses = () => {
    switch (fontSize) {
      case 'sm':
        return {
          chord: 'text-xs',
          lyric: 'text-sm',
          chordSpacing: 0.5
        };
      case 'base':
        return {
          chord: 'text-sm',
          lyric: 'text-lg',
          chordSpacing: 0.6
        };
      case 'lg':
        return {
          chord: 'text-base',
          lyric: 'text-xl',
          chordSpacing: 0.7
        };
      case 'xl':
        return {
          chord: 'text-lg',
          lyric: 'text-2xl',
          chordSpacing: 0.8
        };
      default:
        return {
          chord: 'text-sm',
          lyric: 'text-lg',
          chordSpacing: 0.6
        };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "archived":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "draft":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return "🟢";
      case "archived":
        return "📁";
      case "draft":
        return "📝";
      default:
        return "❓";
    }
  };

  if (loading) {
    return (
      <LayoutDashboard>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⏳</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Cargando evento...</h3>
          <p className="text-gray-500">Por favor espera un momento</p>
        </div>
      </LayoutDashboard>
    );
  }

  if (!event) {
    return (
      <LayoutDashboard>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Evento no encontrado</h3>
          <p className="text-gray-500 mb-6">El evento que buscas no existe o ha sido eliminado</p>
          <button
            onClick={() => router.push('/dashboard/events')}
            className="bg-terracota text-blanco px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-terracota-dark transform hover:scale-105 transition-all duration-200"
          >
            🔙 Volver a Eventos
          </button>
        </div>
      </LayoutDashboard>
    );
  }

  return (
    <LayoutDashboard>
      {/* Header con navegación */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex-1">
          <button
            onClick={() => router.push('/dashboard/events')}
            className="text-terracota hover:text-terracota-dark mb-4 transition-all duration-200 flex items-center"
          >
            ← Volver a Eventos
          </button>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{event.name}</h1>
          <div className="flex items-center space-x-4 text-gray-600">
            <span className="flex items-center">
              <span className="mr-2">📅</span>
              <span>{new Date(event.date).toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </span>
            <span className="flex items-center">
              <span className="mr-2">👨‍🎤</span>
              <span>{event.directorName}</span>
            </span>
            <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(event.status)}`}>
              {getStatusIcon(event.status)} {event.status}
            </span>
          </div>
          {event.description && (
            <p className="text-gray-600 mt-2">{event.description}</p>
          )}
        </div>
      </div>

      {/* Lista de canciones del setlist */}
      <div className="bg-blanco rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">🎵</span>
          Setlist del Evento
        </h2>
        
        {event.setId?.songs && event.setId.songs.length > 0 ? (
          <div className="space-y-3">
            {event.setId.songs
              .sort((a, b) => a.order - b.order)
              .map((songInSet) => {
                const songInfo = songDetails[songInSet.songId];
                const isSelected = selectedSongId === songInSet.songId;
                
                return (
                  <div
                    key={songInSet._id}
                    onClick={() => handleSelectSong(songInSet.songId, songInSet.transposeKey)}
                    className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                      isSelected 
                        ? 'bg-terracota text-blanco shadow-lg ring-2 ring-terracota' 
                        : 'bg-gray-50 hover:bg-gray-100 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <span className={`font-bold text-lg ${isSelected ? 'text-blanco' : 'text-terracota'}`}>
                        #{songInSet.order}
                      </span>
                      <div>
                        <h3 className={`font-semibold text-lg ${isSelected ? 'text-blanco' : 'text-gray-800'}`}>
                          {songInfo?.title || 'Cargando...'}
                        </h3>
                        <p className={`text-sm ${isSelected ? 'text-blanco/80' : 'text-gray-600'}`}>
                          {songInfo?.artist || ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {songInSet.transposeKey && (
                        <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                          isSelected 
                            ? 'bg-blanco/20 text-blanco' 
                            : 'bg-terracota/10 text-terracota'
                        }`}>
                          🎹 {songInSet.transposeKey}
                        </span>
                      )}
                      <span className={isSelected ? 'text-blanco' : 'text-terracota'}>
                        {isSelected ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🎵</div>
            <p>No hay canciones en este setlist</p>
          </div>
        )}
      </div>

      {/* Detalles de la canción seleccionada */}
      {selectedSongId && (
        <div className="bg-blanco rounded-2xl shadow-lg p-6">
          {loadingSong ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-gray-600">Cargando canción...</p>
            </div>
          ) : selectedSong ? (
            <>
              {/* Header de la canción */}
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedSong.title}</h2>
                  <div className="flex items-center space-x-4 text-gray-600">
                    <span className="flex items-center">
                      <span className="mr-2">🎤</span>
                      <span className="font-medium">{selectedSong.artist}</span>
                    </span>
                    <span className="flex items-center">
                      <span className="mr-2">🎹</span>
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-sm">
                        Tono: {selectedSong.key}
                      </span>
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  {/* Controles de tamaño de fuente */}
                  <div className="flex bg-gray-100 rounded-xl p-1">
                    <button
                      onClick={() => setFontSize('sm')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        fontSize === 'sm' 
                          ? 'bg-terracota text-blanco' 
                          : 'text-gray-600 hover:bg-gray-200'
                      }`}
                      title="Texto pequeño"
                    >
                      A
                    </button>
                    <button
                      onClick={() => setFontSize('base')}
                      className={`px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
                        fontSize === 'base' 
                          ? 'bg-terracota text-blanco' 
                          : 'text-gray-600 hover:bg-gray-200'
                      }`}
                      title="Texto normal"
                    >
                      A
                    </button>
                    <button
                      onClick={() => setFontSize('lg')}
                      className={`px-3 py-2 rounded-lg text-lg font-medium transition-all duration-200 ${
                        fontSize === 'lg' 
                          ? 'bg-terracota text-blanco' 
                          : 'text-gray-600 hover:bg-gray-200'
                      }`}
                      title="Texto grande"
                    >
                      A
                    </button>
                    <button
                      onClick={() => setFontSize('xl')}
                      className={`px-3 py-2 rounded-lg text-xl font-medium transition-all duration-200 ${
                        fontSize === 'xl' 
                          ? 'bg-terracota text-blanco' 
                          : 'text-gray-600 hover:bg-gray-200'
                      }`}
                      title="Texto muy grande"
                    >
                      A
                    </button>
                  </div>

                  <button 
                    onClick={() => setShowTransposeModal(true)}
                    className="bg-blue-500 text-blanco px-4 py-2 rounded-xl font-medium hover:bg-blue-600 transition-all duration-200"
                    disabled={transposing}
                  >
                    {transposing ? "⏳" : "🎹"} Cambiar Tonalidad
                  </button>
                  <button 
                    onClick={() => setShowEditModal(true)}
                    className="bg-terracota text-blanco px-4 py-2 rounded-xl font-medium hover:bg-terracota-dark transition-all duration-200"
                  >
                    ✏️ Editar
                  </button>
                </div>
              </div>

              {/* Contenido de la canción con acordes y letra */}
              <div className="space-y-6">
                {(() => {
                  // Agrupar líneas por sección
                  const sections: { [key: string]: (typeof selectedSong.lyricsLines[0] & { originalIndex: number })[] } = {};
                  selectedSong.lyricsLines.forEach((line, index) => {
                    const section = line.section || 'verse';
                    if (!sections[section]) {
                      sections[section] = [];
                    }
                    sections[section].push({ ...line, originalIndex: index });
                  });

                  return Object.entries(sections).map(([sectionName, lines], sectionIndex) => (
                    <div key={sectionIndex} className="space-y-4">
                      {/* Título de la sección */}
                      <div className="flex items-center">
                        <h3 className="text-lg font-semibold text-terracota bg-terracota/10 px-4 py-2 rounded-lg">
                          {sectionName === 'verse' ? '📝 Verso' : 
                           sectionName === 'chorus' ? '🎵 Coro' :
                           sectionName === 'bridge' ? '🌉 Puente' :
                           sectionName === 'intro' ? '🎼 Intro' :
                           sectionName === 'outro' ? '🎼 Outro' :
                           `📋 ${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}`}
                        </h3>
                      </div>

                      {/* Líneas de la sección */}
                      <div className="space-y-4 ml-4">
                        {lines.map((line, lineIndex) => {
                          // Función para crear la línea de acordes posicionados arriba del texto
                          const renderChordLine = (text: string, chords: { note: string; index: number }[]) => {
                            if (chords.length === 0) {
                              return <div className="h-4"></div>; // Espacio vacío si no hay acordes
                            }

                            const fontClasses = getFontSizeClasses();
                            
                            // Ordenar acordes por índice
                            const sortedChords = [...chords].sort((a, b) => a.index - b.index);
                            
                            const chordElements: React.ReactElement[] = [];
                            let lastIndex = 0;

                            sortedChords.forEach((chord, chordIndex) => {
                              // Agregar espacios antes del acorde para posicionarlo correctamente
                              if (chord.index > lastIndex) {
                                const spacesBefore = chord.index - lastIndex;
                                chordElements.push(
                                  <span key={`space-${chordIndex}`} className="inline-block" style={{ width: `${spacesBefore * fontClasses.chordSpacing}em` }}></span>
                                );
                              }

                              // Agregar el acorde
                              chordElements.push(
                                <span
                                  key={`chord-${chordIndex}`}
                                  className={`bg-terracota/10 text-terracota px-1 py-0.5 rounded font-semibold inline-block ${fontClasses.chord}`}
                                >
                                  {chord.note}
                                </span>
                              );

                              lastIndex = chord.index;
                            });

                            return (
                              <div className={`font-mono text-terracota mb-1 leading-tight ${fontClasses.chord}`}>
                                {chordElements}
                              </div>
                            );
                          };

                          return (
                            <div key={lineIndex} className="border-b border-gray-100 pb-4 last:border-b-0">
                              {/* Línea de acordes arriba */}
                              {renderChordLine(line.text, line.chords)}
                              
                              {/* Línea de letra */}
                              <div className={`${getFontSizeClasses().lyric} font-medium text-gray-800 leading-relaxed`}>
                                {line.text}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Modal para cambiar tonalidad */}
      {showTransposeModal && selectedSong && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-blanco rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">🎹 Cambiar Tonalidad</h3>
            <p className="text-gray-600 mb-6">
              Selecciona la nueva tonalidad para <strong>&ldquo;{selectedSong?.title}&rdquo;</strong>
            </p>
            
            <div className="grid grid-cols-4 gap-3 mb-6">
              {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map((key) => (
                <button
                  key={key}
                  onClick={() => handleTranspose(key)}
                  disabled={transposing}
                  className={`p-3 rounded-xl font-semibold transition-all duration-200 ${
                    key === selectedSong?.key
                      ? 'bg-terracota text-blanco ring-2 ring-terracota'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } ${transposing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {key}
                </button>
              ))}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowTransposeModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200"
                disabled={transposing}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar canción */}
      <SongModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleUpdateSong}
        song={selectedSong || undefined}
        mode="edit"
      />
    </LayoutDashboard>
  );
}

