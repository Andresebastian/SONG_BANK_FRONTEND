// src/pages/songs/[id].tsx
import React from "react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { getSong, transposeSong, updateSong, updateSongChordPro } from "utils/api";
import LayoutDashboard from "../../components/LayoutDashboard";
import SongModal from "../../components/SongModal";

interface Song {
  _id: string;
  title: string;
  artist: string;
  key: string;
  youtubeUrl?: string;
  lyricsLines: {
    text: string;
    chords: { note: string; index: number }[];
    section?: string;
  }[];
}

/** Extrae el ID de video de una URL de YouTube (watch, youtu.be, embed). */
function getYouTubeVideoId(url: string): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  const watchMatch = trimmed.match(/(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  const shortMatch = trimmed.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  const embedMatch = trimmed.match(/(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  return null;
}

// Función para verificar si el texto necesita corrección de espacios
// Solo aplica correcciones si detecta que el texto está concatenado sin espacios
function fixChordPositions(lyricsLines: Song['lyricsLines']): Song['lyricsLines'] {
  if (!lyricsLines) return [];
  
  return lyricsLines.map(line => {
    // Si la línea está vacía o solo tiene espacios, retornarla tal cual
    if (!line.text || !line.text.trim()) {
      return line;
    }

    // Detectar si el texto ya tiene espacios correctos
    // Un texto con espacios correctos generalmente tiene al menos un espacio cada 15-20 caracteres
    const textLength = line.text.length;
    const spaceCount = (line.text.match(/\s/g) || []).length;
    const hasProperSpacing = textLength === 0 || spaceCount > 0 || textLength < 10;
    
    // Si el texto ya tiene espacios correctos, solo retornarlo sin modificar
    if (hasProperSpacing) {
      return {
        ...line,
        text: line.text,
        chords: line.chords
      };
    }

    // CASO ESPECIAL: Si el texto NO tiene espacios (problema del backend viejo)
    // Intentar reconstruir los espacios basándose en los acordes
    console.warn('Detectado texto sin espacios, aplicando corrección:', line.text);
    
    if (line.chords.length === 0) {
      // Si no hay acordes, intentar agregar espacios basándose en mayúsculas
      const textWithSpaces = line.text
        .replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2')
        .replace(/([a-z])([A-Z])/g, '$1 $2');
      return {
        ...line,
        text: textWithSpaces
      };
    }
    
    // Reconstruir el texto insertando espacios en las posiciones de los acordes
    const sortedChords = [...line.chords].sort((a, b) => a.index - b.index);
    let result = '';
    let lastIndex = 0;
    
    sortedChords.forEach((chord, i) => {
      const textSegment = line.text.substring(lastIndex, chord.index);
      
      if (i === 0) {
        result += textSegment;
      } else {
        result += ' ' + textSegment;
      }
      
      lastIndex = chord.index;
    });
    
    // Agregar el texto restante
    if (lastIndex < line.text.length) {
      const remaining = line.text.substring(lastIndex);
      result += remaining;
    }
    
    // Agregar espacios antes de mayúsculas
    result = result
      .replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Recalcular posiciones de acordes en el texto corregido
    const correctedChords: { note: string; index: number }[] = [];
    let currentPos = 0;
    
    for (const chord of sortedChords) {
      correctedChords.push({
        note: chord.note,
        index: currentPos
      });
      
      // Buscar la siguiente palabra
      const nextSpace = result.indexOf(' ', currentPos);
      if (nextSpace !== -1) {
        currentPos = nextSpace + 1;
      } else {
        currentPos = result.length;
      }
    }
    
    return {
      ...line,
      text: result,
      chords: correctedChords
    };
  });
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
        .then(async (data) => {
          // Corregir las posiciones de los acordes antes de guardar en el estado
          const correctedData = {
            ...data,
            lyricsLines: fixChordPositions(data.lyricsLines)
          };
          setSong(correctedData);
          setLoading(false);
          
          // Si viene desde un evento con una tonalidad específica, aplicarla automáticamente
          if (targetKey && targetKey !== data.key) {
            console.log(`Aplicando tonalidad del evento: ${targetKey} (original: ${data.key})`);
            try {
              setTransposing(true);
              const updatedSong = await transposeSong(id as string, targetKey);
              // También corregir las posiciones en la canción transpuesta
              const correctedTransposedSong = {
                ...updatedSong,
                lyricsLines: fixChordPositions(updatedSong.lyricsLines)
              };
              setSong(correctedTransposedSong);
            } catch (error) {
              console.error('Error al cambiar tonalidad:', error);
            } finally {
              setTransposing(false);
            }
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
      // Corregir las posiciones de los acordes después de transponer
      const correctedSong = {
        ...updatedSong,
        lyricsLines: fixChordPositions(updatedSong.lyricsLines)
      };
      setSong(correctedSong);
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
    tags?: string[];
    youtubeUrl?: string;
    chordProText?: string;
  }) => {
    if (!id) return;
    
    try {
      let updatedSong;
      
      if (songData.chordProText) {
        updatedSong = await updateSongChordPro(id as string, songData.chordProText, {
          tags: songData.tags,
          youtubeUrl: songData.youtubeUrl,
        });
      } else {
        updatedSong = await updateSong(id as string, {
          title: songData.title || '',
          artist: songData.artist || '',
          key: songData.key || '',
          lyricsLines: songData.lyricsLines || [],
          notes: songData.notes || '',
          tags: songData.tags
        });
      }
      
      // Corregir las posiciones de los acordes después de actualizar
      const correctedSong = {
        ...updatedSong,
        lyricsLines: fixChordPositions(updatedSong.lyricsLines)
      };
      setSong(correctedSong);
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
          lineHeight: 'leading-4'
        };
      case 'base':
        return {
          chord: 'text-sm',
          lyric: 'text-lg',
          lineHeight: 'leading-6'
        };
      case 'lg':
        return {
          chord: 'text-base',
          lyric: 'text-xl',
          lineHeight: 'leading-7'
        };
      case 'xl':
        return {
          chord: 'text-lg',
          lyric: 'text-2xl',
          lineHeight: 'leading-8'
        };
      default:
        return {
          chord: 'text-sm',
          lyric: 'text-lg',
          lineHeight: 'leading-6'
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
      <div className="mb-8">
        {/* Navegación superior */}
        <div className="flex items-center mb-4">
          <button
            onClick={handleGoBack}
            className="text-terracota hover:text-terracota-dark mr-4 transition-all duration-200 flex items-center"
          >
            <span className="mr-1">←</span>
            <span className="hidden sm:inline">{returnTo === 'event' ? 'Volver al Evento' : 'Volver'}</span>
          </button>
        </div>

        {/* Título y controles */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-2">{song.title}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-gray-600 gap-2">
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
          
          {/* Controles - Sticky en móvil */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white/90 backdrop-blur-sm lg:bg-transparent p-3 lg:p-0 rounded-xl lg:rounded-none border lg:border-none border-gray-200 lg:border-0 sticky lg:static top-4 z-10">
            {/* Controles de tamaño de fuente */}
            <div className="flex bg-gray-100 rounded-xl p-1 justify-center">
              <button
                onClick={() => setFontSize('sm')}
                className={`px-2 lg:px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 ${
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
                className={`px-2 lg:px-3 py-2 rounded-lg text-sm lg:text-base font-medium transition-all duration-200 ${
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
                className={`px-2 lg:px-3 py-2 rounded-lg text-base lg:text-lg font-medium transition-all duration-200 ${
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
                className={`px-2 lg:px-3 py-2 rounded-lg text-lg lg:text-xl font-medium transition-all duration-200 ${
                  fontSize === 'xl' 
                    ? 'bg-terracota text-blanco' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
                title="Texto muy grande"
              >
                A
              </button>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2 lg:gap-3">
              <button 
                onClick={() => setShowTransposeModal(true)}
                className="bg-blue-500 text-blanco px-3 lg:px-4 py-2 rounded-xl font-medium hover:bg-blue-600 transition-all duration-200 text-sm lg:text-base flex-1 sm:flex-none"
                disabled={transposing}
              >
                <span className="hidden sm:inline">{transposing ? "⏳" : "🎹"} </span>
                <span className="sm:hidden">{transposing ? "⏳" : "🎹"}</span>
                <span className="hidden lg:inline">Cambiar Tonalidad</span>
                <span className="lg:hidden">Tonalidad</span>
              </button>
              <button 
                onClick={() => setShowEditModal(true)}
                className="bg-terracota text-blanco px-3 lg:px-4 py-2 rounded-xl font-medium hover:bg-terracota-dark transition-all duration-200 text-sm lg:text-base"
              >
                <span className="hidden sm:inline">✏️ </span>
                <span className="sm:hidden">✏️</span>
                <span className="hidden lg:inline">Editar</span>
              </button>
            </div>
          </div>
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

      {/* Reproductor de YouTube */}
      {song.youtubeUrl && getYouTubeVideoId(song.youtubeUrl) && (
        <div className="mb-6">
          <div className="bg-blanco rounded-2xl shadow-lg overflow-hidden">
            <div className="aspect-video w-full max-w-2xl mx-auto">
              <iframe
                src={`https://www.youtube.com/embed/${getYouTubeVideoId(song.youtubeUrl)!}?rel=0`}
                title={`Video: ${song.title}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Contenido de la canción */}
      <div className="bg-blanco rounded-2xl shadow-lg p-4 lg:p-8">
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

          const sectionLabel = (name: string) => {
            const map: Record<string, string> = {
              verse: 'Verso', chorus: 'Coro', bridge: 'Puente',
              intro: 'Intro', outro: 'Outro', prechorus: 'Pre-coro',
              instrumental: 'Instrumental', solo: 'Solo', break: 'Break',
            };
            return map[name] ?? name.charAt(0).toUpperCase() + name.slice(1);
          };

          const sectionEntries = Object.entries(sections);

          return (
            <>
              {/* Barra de navegación de secciones */}
              {sectionEntries.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-gray-100">
                  {sectionEntries.map(([name], idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        document.getElementById(`section-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-terracota/10 text-terracota hover:bg-terracota hover:text-white transition-all duration-200"
                    >
                      {sectionLabel(name)}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-6">
                {sectionEntries.map(([sectionName, lines], sectionIndex) => (
                  <div key={sectionIndex} id={`section-${sectionIndex}`} className="space-y-4" style={{ scrollMarginTop: '80px' }}>
                    {/* Título de la sección */}
                    <div className="flex items-center">
                      <h3 className="text-sm font-bold text-terracota bg-terracota/10 px-3 py-1.5 rounded-lg uppercase tracking-wide">
                        {sectionLabel(sectionName)}
                      </h3>
                    </div>

                    {/* Líneas de la sección */}
                    <div className="space-y-4 ml-4">
                      {lines.map((line, lineIndex) => {
                    const fontClasses = getFontSizeClasses();
                    
                    // Renderizado por segmentos: cada acorde queda estructuralmente encima
                    // de su texto correspondiente, sin depender de posicionamiento con espacios.
                    const renderLineWithChords = (text: string, chords: { note: string; index: number }[]) => {
                      if (chords.length === 0) {
                        return (
                          <div className={`${fontClasses.lyric} font-medium text-gray-800 whitespace-pre-wrap`}>
                            {text || '\u00A0'}
                          </div>
                        );
                      }

                      const sortedChords = [...chords].sort((a, b) => a.index - b.index);
                      const textBefore = text.substring(0, sortedChords[0].index);
                      const segments = sortedChords.map((chord, idx) => {
                        const end = idx < sortedChords.length - 1 ? sortedChords[idx + 1].index : text.length;
                        return { chord: chord.note, segText: text.substring(chord.index, end) };
                      });

                      return (
                        <div className="flex flex-wrap items-end">
                          {textBefore ? (
                            <span className="inline-flex flex-col">
                              <span className={`${fontClasses.chord} invisible pointer-events-none select-none`} aria-hidden="true">&nbsp;</span>
                              <span className={`${fontClasses.lyric} text-gray-800 whitespace-pre`}>{textBefore}</span>
                            </span>
                          ) : null}
                          {segments.map((seg, idx) => (
                            <span key={idx} className="inline-flex flex-col">
                              <span className={`${fontClasses.chord} font-bold text-terracota bg-terracota/10 px-1 rounded whitespace-nowrap leading-tight mb-0.5`}>
                                {seg.chord}
                              </span>
                              <span className={`${fontClasses.lyric} text-gray-800 whitespace-pre`}>
                                {seg.segText || '\u00A0'}
                              </span>
                            </span>
                          ))}
                        </div>
                      );
                    };

                    return (
                      <div key={lineIndex} className="border-b border-gray-100 pb-4 last:border-b-0">
                        {renderLineWithChords(line.text, line.chords)}
                      </div>
                    );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          );
        })()}

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-blanco rounded-2xl p-6 lg:p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl lg:text-2xl font-bold text-gray-800 mb-4">🎹 Cambiar Tonalidad</h3>
            <p className="text-sm lg:text-base text-gray-600 mb-6">
              Selecciona la nueva tonalidad para <strong>&ldquo;{song?.title}&rdquo;</strong>
            </p>
            
            <div className="grid grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-3 mb-6">
              {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map((key) => (
                <button
                  key={key}
                  onClick={() => handleTranspose(key)}
                  disabled={transposing}
                  className={`p-2 lg:p-3 rounded-xl font-semibold transition-all duration-200 text-sm lg:text-base ${
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
