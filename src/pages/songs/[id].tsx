// src/pages/songs/[id].tsx
import React from "react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getSong, transposeSong, updateSong, updateSongChordPro } from "utils/api";
import LayoutDashboard from "../../components/LayoutDashboard";
import SongModal from "../../components/SongModal";

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

export default function SongDetail() {
  const router = useRouter();
  const { id } = router.query; // el id de la canción
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [transposing, setTransposing] = useState(false);
  const [showTransposeModal, setShowTransposeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  
  // Obtener parámetros de navegación
  const returnTo = router.query.returnTo as string;
  const eventId = router.query.eventId as string;
  const targetKey = router.query.key as string;

  useEffect(() => {
    if (id) {
      getSong(id as string)
        .then((data) => {
          setSong(data); // aquí ya tienes la canción
          setLoading(false);
          
          // Si viene desde un evento con una tonalidad específica, aplicarla automáticamente
          if (targetKey && targetKey !== data.key) {
            console.log(`Aplicando tonalidad del evento: ${targetKey} (original: ${data.key})`);
            handleTranspose(targetKey);
          }
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [id, targetKey]);

  const handleGoBack = () => {
    if (returnTo === 'event' && eventId) {
      // Volver al evento específico
      router.push(`/dashboard/events`);
    } else {
      // Navegación por defecto al banco de canciones
      router.push('/dashboard/songs');
    }
  };

  const handleTranspose = async (newKey: string) => {
    if (!song || !id) return;
    
    setTransposing(true);
    try {
      const updatedSong = await transposeSong(id as string, newKey);
      setSong(updatedSong);
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
    if (!id) return;
    
    try {
      let updatedSong;
      
      // Verificar si es formato ChordPro
      if (songData.chordProText) {
        updatedSong = await updateSongChordPro(id as string, songData.chordProText);
      } else {
        updatedSong = await updateSong(id as string, {
          title: songData.title || '',
          artist: songData.artist || '',
          key: songData.key || '',
          lyricsLines: songData.lyricsLines || [],
          notes: songData.notes || ''
        });
      }
      
      setSong(updatedSong);
      setShowEditModal(false);
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

  if (loading) {
    return (
      <LayoutDashboard>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⏳</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Cargando canción...</h3>
          <p className="text-gray-500">Por favor espera un momento</p>
        </div>
      </LayoutDashboard>
    );
  }

  if (!song) {
    return (
      <LayoutDashboard>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Canción no encontrada</h3>
          <p className="text-gray-500 mb-6">La canción que buscas no existe o ha sido eliminada</p>
          <button
            onClick={handleGoBack}
            className="bg-terracota text-blanco px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-terracota-dark transform hover:scale-105 transition-all duration-200"
          >
            🔙 {returnTo === 'event' ? 'Volver al Evento' : 'Volver al Banco de Canciones'}
          </button>
        </div>
      </LayoutDashboard>
    );
  }

  return (
    <LayoutDashboard>
      {/* Header con navegación */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center mb-2">
            <button
              onClick={handleGoBack}
              className="text-terracota hover:text-terracota-dark mr-4 transition-all duration-200"
            >
              ← {returnTo === 'event' ? 'Volver al Evento' : 'Volver'}
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{song.title}</h1>
          <div className="flex items-center space-x-4 text-gray-600">
            <span className="flex items-center">
              <span className="mr-2">🎤</span>
              <span className="font-medium">{song.artist}</span>
            </span>
            <span className="flex items-center">
              <span className="mr-2">🎹</span>
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-sm">
                Tono: {song.key}
              </span>
              {targetKey && targetKey !== song.key && (
                <span className="ml-2 bg-terracota/10 text-terracota px-2 py-1 rounded-lg text-sm">
                  (Tonalidad del evento: {targetKey})
                </span>
              )}
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

      {/* Notificación si viene desde un evento */}
      {returnTo === 'event' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-center">
            <span className="text-blue-600 mr-2">📅</span>
            <span className="text-blue-800 font-medium">
              Vista desde evento - Tonalidad ajustada automáticamente
            </span>
          </div>
        </div>
      )}

      {/* Contenido de la canción */}
      <div className="bg-blanco rounded-2xl shadow-lg p-8">
        <div className="space-y-6">
          {(() => {
            // Agrupar líneas por sección
            const sections: { [key: string]: (typeof song.lyricsLines[0] & { originalIndex: number })[] } = {};
            song.lyricsLines.forEach((line, index) => {
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
        
        {/* Footer de la canción */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>🎵 Canción del Banco Musical</span>
            <span>Última actualización: {new Date().toLocaleDateString('es-ES')}</span>
          </div>
        </div>
      </div>

      {/* Modal para cambiar tonalidad */}
      {showTransposeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-blanco rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">🎹 Cambiar Tonalidad</h3>
            <p className="text-gray-600 mb-6">
              Selecciona la nueva tonalidad para <strong>&ldquo;{song?.title}&rdquo;</strong>
            </p>
            
            <div className="grid grid-cols-4 gap-3 mb-6">
              {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map((key) => (
                <button
                  key={key}
                  onClick={() => handleTranspose(key)}
                  disabled={transposing}
                  className={`p-3 rounded-xl font-semibold transition-all duration-200 ${
                    key === song?.key
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
        song={song}
        mode="edit"
      />
    </LayoutDashboard>
  );
}
