import React, { useState } from "react";

interface SongModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (song: any) => void;
  song?: any; // Para modo edición
  mode?: 'create' | 'edit';
}

interface LyricLine {
  text: string;
  chords: { note: string; index: number }[];
  section?: string;
}

export default function SongModal({ isOpen, onClose, onSave, song, mode = 'create' }: SongModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    key: "C",
    notes: "",
  });

  const [lyricsLines, setLyricsLines] = useState<LyricLine[]>([
    { text: "", chords: [] }
  ]);

  const [inputMode, setInputMode] = useState<'manual' | 'chordpro'>('manual');
  const [chordProText, setChordProText] = useState("");

  // Inicializar datos cuando el modal se abre en modo edición
  React.useEffect(() => {
    if (isOpen && mode === 'edit' && song) {
      setFormData({
        title: song.title || "",
        artist: song.artist || "",
        key: song.key || "C",
        notes: song.notes || "",
      });
      setLyricsLines(song.lyricsLines && song.lyricsLines.length > 0 
        ? song.lyricsLines 
        : [{ text: "", chords: [] }]
      );
    } else if (isOpen && mode === 'create') {
      // Resetear para modo creación
      setFormData({
        title: "",
        artist: "",
        key: "C",
        notes: "",
      });
      setLyricsLines([{ text: "", chords: [] }]);
    }
  }, [isOpen, mode, song]);

  const [currentLine, setCurrentLine] = useState(0);
  // Cambiar a un estado que mantenga el acorde actual por línea
  const [currentChords, setCurrentChords] = useState<{ [key: number]: { note: string; index: number } }>({});

  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLyricChange = (lineIndex: number, text: string) => {
    const newLines = [...lyricsLines];
    newLines[lineIndex].text = text;
    setLyricsLines(newLines);
  };

  const addLine = () => {
    // Solo agregar una nueva línea si no hay líneas vacías
    if (!lyricsLines.some(line => line.text.trim() === "")) {
      setLyricsLines([...lyricsLines, { text: "", chords: [] }]);
    }
  };

  // Funciones helper para manejar acordes por línea
  const getCurrentChord = (lineIndex: number) => {
    return currentChords[lineIndex] || { note: "", index: 0 };
  };

  const setCurrentChord = (lineIndex: number, chord: { note: string; index: number }) => {
    setCurrentChords(prev => ({
      ...prev,
      [lineIndex]: chord
    }));
  };

  // Función para convertir canción a formato ChordPro
  const convertToChordPro = () => {
    let chordPro = "";
    
    // Metadatos
    chordPro += `{title: ${formData.title}}\n`;
    chordPro += `{artist: ${formData.artist}}\n`;
    chordPro += `{key: ${formData.key}}\n\n`;
    
    // Agrupar líneas por sección
    const sections: { [key: string]: typeof lyricsLines } = {};
    lyricsLines.forEach(line => {
      const section = (line as any).section || 'verse';
      if (!sections[section]) {
        sections[section] = [];
      }
      sections[section].push(line);
    });

    // Procesar cada sección
    Object.entries(sections).forEach(([sectionName, lines]) => {
      chordPro += `{${sectionName}}\n`;
      lines.forEach(line => {
        if (line.text.trim()) {
          let lineText = line.text;
          
          // Insertar acordes en sus posiciones
          line.chords
            .sort((a, b) => b.index - a.index) // Ordenar de mayor a menor índice
            .forEach(chord => {
              lineText = lineText.slice(0, chord.index) + `[${chord.note}]` + lineText.slice(chord.index);
            });
          
          chordPro += lineText + "\n";
        }
      });
      chordPro += "\n";
    });
    
    if (formData.notes) {
      chordPro += `{notes: ${formData.notes}}\n`;
    }
    
    return chordPro;
  };

  const removeLine = (lineIndex: number) => {
    if (lyricsLines.length > 1) {
      setLyricsLines(lyricsLines.filter((_, index) => index !== lineIndex));
    }
  };

  const addChord = (lineIndex: number) => {
    const currentChord = getCurrentChord(lineIndex);
    if (currentChord.note && currentChord.index >= 0) {
      const newLines = [...lyricsLines];
      newLines[lineIndex].chords.push({ ...currentChord });
      newLines[lineIndex].chords.sort((a, b) => a.index - b.index);
      setLyricsLines(newLines);
      // Limpiar el acorde actual para esta línea específica
      setCurrentChord(lineIndex, { note: "", index: 0 });
    }
  };

  const removeChord = (lineIndex: number, chordIndex: number) => {
    const newLines = [...lyricsLines];
    newLines[lineIndex].chords.splice(chordIndex, 1);
    setLyricsLines(newLines);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputMode === 'chordpro') {
      // Validar que haya texto ChordPro
      if (!chordProText.trim()) {
        alert("Debes ingresar el texto en formato ChordPro");
        return;
      }
      
      onSave({ chordProText: chordProText.trim() });
      handleClose();
    } else {
      // Validar que al menos una línea tenga texto
      const hasContent = lyricsLines.some(line => line.text.trim() !== "");
      if (!hasContent) {
        alert("Debes agregar al menos una línea de letra");
        return;
      }

      const songData = {
        ...formData,
        lyricsLines: lyricsLines.filter(line => line.text.trim() !== "")
      };

      onSave(songData);
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData({
      title: "",
      artist: "",
      key: "C",
      notes: "",
    });
    setLyricsLines([{ text: "", chords: [] }]);
    setCurrentChords({});
    setInputMode('manual');
    setChordProText("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-blanco rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              🎵 {mode === 'edit' ? 'Editar Canción' : 'Crear Nueva Canción'}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selector de modo de entrada */}
            <div className="bg-gray-50 p-4 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Modo de Entrada</h3>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setInputMode('manual')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    inputMode === 'manual'
                      ? 'bg-terracota text-blanco'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  ✏️ Manual
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('chordpro')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    inputMode === 'chordpro'
                      ? 'bg-terracota text-blanco'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  🚀 ChordPro (Rápido)
                </button>
              </div>
              {inputMode === 'chordpro' && mode === 'create' && (
                <p className="text-sm text-gray-600 mt-2">
                  💡 Ingresa la canción completa en formato ChordPro para una creación más rápida
                </p>
              )}
              {inputMode === 'chordpro' && mode === 'edit' && (
                <div className="mt-3 flex items-center gap-3">
                  <p className="text-sm text-gray-600">
                    💡 Edita la canción completa en formato ChordPro
                  </p>
                  <button
                    type="button"
                    onClick={() => setChordProText(convertToChordPro())}
                    className="bg-blue-500 text-blanco px-3 py-1 rounded-lg text-sm hover:bg-blue-600 transition-all duration-200"
                  >
                    🔄 Convertir Actual
                  </button>
                </div>
              )}
            </div>

            {/* Modo ChordPro */}
            {inputMode === 'chordpro' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Texto ChordPro
                </label>
                <textarea
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-terracota focus:ring-4 focus:ring-terracota/20 transition-all duration-200 font-mono text-sm"
                  rows={12}
                  value={chordProText}
                  onChange={(e) => setChordProText(e.target.value)}
                  placeholder={`{title: How Great Thou Art}
{artist: Stuart K. Hine}
{key: C}

{verse}
[C]O Lord my [F]God when [C]I in awesome wonder
[Am]Consider [F]all the [G]worlds thy hands have [C]made
[C]I see the [F]stars I [C]hear the rolling thunder
[Am]Thy power through[F]out the [G]universe dis[C]played

{chorus}
Then sings my [F]soul my [C]savior God to [Am]thee
[F]How great thou [C]art how [G]great thou [C]art`}
                />
                <div className="mt-2 text-sm text-gray-500">
                  <p><strong>Formato:</strong></p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li><code>{`{title: Nombre de la Canción}`}</code> - Título de la canción</li>
                    <li><code>{`{artist: Nombre del Artista}`}</code> - Artista</li>
                    <li><code>{`{key: C}`}</code> - Tonalidad</li>
                    <li><code>{`{verse}`}</code> o <code>{`{chorus}`}</code> - Secciones</li>
                    <li><code>[C]</code> - Acordes entre corchetes</li>
                  </ul>
                </div>
              </div>
            ) : (
              <>
                {/* Información básica */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título de la Canción
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-terracota focus:ring-4 focus:ring-terracota/20 transition-all duration-200"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Ej: Eterno Dios"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Artista
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-terracota focus:ring-4 focus:ring-terracota/20 transition-all duration-200"
                  value={formData.artist}
                  onChange={(e) => handleInputChange("artist", e.target.value)}
                  placeholder="Ej: Marcos Barrientos"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tonalidad
                </label>
                <select
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-terracota focus:ring-4 focus:ring-terracota/20 transition-all duration-200"
                  value={formData.key}
                  onChange={(e) => handleInputChange("key", e.target.value)}
                >
                  {keys.map(key => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notas adicionales */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas Adicionales (Opcional)
              </label>
              <textarea
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-terracota focus:ring-4 focus:ring-terracota/20 transition-all duration-200"
                rows={3}
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Información adicional sobre la canción..."
              />
            </div>

            {/* Letras y acordes */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Letra y Acordes</h3>
                  {lyricsLines.some(line => line.text.trim() === "") && (
                    <p className="text-sm text-orange-600 mt-1">
                      ⚠️ Completa la línea vacía antes de agregar otra
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={addLine}
                  disabled={lyricsLines.some(line => line.text.trim() === "")}
                  className="bg-blue-500 text-blanco px-4 py-2 rounded-xl font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200"
                  title={lyricsLines.some(line => line.text.trim() === "") ? "Completa la línea vacía primero" : "Agregar nueva línea de letra"}
                >
                  ➕ Agregar Línea
                </button>
              </div>

              <div className="space-y-4">
                {lyricsLines.map((line, lineIndex) => (
                  <div key={lineIndex} className="bg-gray-50 p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-600">
                        Línea {lineIndex + 1}
                      </span>
                      {lyricsLines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(lineIndex)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          🗑️ Eliminar
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Texto de la línea
                          {line.text.trim() === "" && (
                            <span className="text-orange-600 text-xs ml-2">⚠️ Línea vacía - completar antes de agregar otra</span>
                          )}
                        </label>
                        <input
                          type="text"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 transition-all duration-200 ${
                            line.text.trim() === "" 
                              ? "border-orange-300 focus:border-orange-500 focus:ring-orange-500/20 bg-orange-50" 
                              : "border-gray-200 focus:border-terracota focus:ring-terracota/20"
                          }`}
                          value={line.text}
                          onChange={(e) => handleLyricChange(lineIndex, e.target.value)}
                          placeholder={line.text.trim() === "" ? "⚠️ Esta línea está vacía - escribe el texto aquí" : "Ej: No es con mis fuerzas"}
                        />
                      </div>

                      {/* Acordes de la línea */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Acordes de esta línea
                        </label>
                        
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            placeholder="Acorde (ej: F#)"
                            className="px-3 py-2 border border-gray-200 rounded-lg focus:border-terracota focus:ring-2 focus:ring-terracota/20 transition-all duration-200"
                            value={getCurrentChord(lineIndex).note}
                            onChange={(e) => setCurrentChord(lineIndex, { ...getCurrentChord(lineIndex), note: e.target.value })}
                          />
                          <input
                            type="number"
                            placeholder="Posición"
                            min="0"
                            className="px-3 py-2 border border-gray-200 rounded-lg focus:border-terracota focus:ring-2 focus:ring-terracota/20 transition-all duration-200"
                            value={getCurrentChord(lineIndex).index}
                            onChange={(e) => setCurrentChord(lineIndex, { ...getCurrentChord(lineIndex), index: parseInt(e.target.value) || 0 })}
                          />
                          <button
                            type="button"
                            onClick={() => addChord(lineIndex)}
                            className="bg-terracota text-blanco px-3 py-2 rounded-lg hover:bg-terracota-dark transition-all duration-200"
                          >
                            ➕ Agregar
                          </button>
                        </div>

                        {/* Lista de acordes agregados */}
                        {line.chords.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {line.chords.map((chord, chordIndex) => (
                              <span
                                key={chordIndex}
                                className="bg-terracota/10 text-terracota px-2 py-1 rounded-lg text-sm font-medium flex items-center gap-1"
                              >
                                {chord.note}@{chord.index}
                                <button
                                  type="button"
                                  onClick={() => removeChord(lineIndex, chordIndex)}
                                  className="text-terracota hover:text-red-500 ml-1"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
              </>
            )}

            {/* Botones de acción */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-terracota text-blanco py-3 rounded-xl font-medium hover:bg-terracota-dark transition-all duration-200"
              >
                🎵 {mode === 'edit' ? 'Actualizar Canción' : (inputMode === 'chordpro' ? 'Crear con ChordPro' : 'Crear Canción')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
