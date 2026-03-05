import React, { useState, useCallback } from "react";

interface LyricLine {
  text: string;
  chords: { note: string; index: number }[];
  section?: string;
}

interface Song {
  _id?: string;
  title: string;
  artist: string;
  key: string;
  notes?: string;
  tags?: string[];
  youtubeUrl?: string;
  lyricsLines?: LyricLine[];
}

interface SongData {
  title?: string;
  artist?: string;
  key?: string;
  lyricsLines?: LyricLine[];
  notes?: string;
  tags?: string[];
  youtubeUrl?: string;
  chordProText?: string;
}

interface SongModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (song: SongData) => void;
  song?: Song;
  mode?: 'create' | 'edit';
}

export default function SongModal({ isOpen, onClose, onSave, song, mode = 'create' }: SongModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    key: "C",
    notes: "",
    tagsInput: "",
    youtubeUrl: "",
  });

  const [lyricsLines, setLyricsLines] = useState<LyricLine[]>([{ text: "", chords: [] }]);
  const [chordProText, setChordProText] = useState("");

  // Convertir datos actuales (formData + lyricsLines) a ChordPro (solo para modo edición)
  const convertToChordPro = useCallback(() => {
    let chordPro = "";
    chordPro += `{title: ${formData.title}}\n`;
    chordPro += `{artist: ${formData.artist}}\n`;
    chordPro += `{key: ${formData.key}}\n\n`;
    const sections: { [key: string]: typeof lyricsLines } = {};
    lyricsLines.forEach(line => {
      const section = line.section || 'verse';
      if (!sections[section]) sections[section] = [];
      sections[section].push(line);
    });
    Object.entries(sections).forEach(([sectionName, lines]) => {
      chordPro += `{${sectionName}}\n`;
      lines.forEach(line => {
        if (line.text.trim()) {
          let lineText = line.text;
          line.chords
            .sort((a, b) => b.index - a.index)
            .forEach(chord => {
              lineText = lineText.slice(0, chord.index) + `[${chord.note}]` + lineText.slice(chord.index);
            });
          chordPro += lineText + "\n";
        }
      });
      chordPro += "\n";
    });
    if (formData.notes) chordPro += `{notes: ${formData.notes}}\n`;
    return chordPro;
  }, [formData, lyricsLines]);

  // Inicializar cuando se abre el modal
  React.useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && song) {
      setFormData({
        title: song.title || "",
        artist: song.artist || "",
        key: song.key || "C",
        notes: song.notes || "",
        tagsInput: Array.isArray(song.tags) ? song.tags.join(", ") : "",
        youtubeUrl: song.youtubeUrl || "",
      });
      setLyricsLines(song.lyricsLines?.length ? song.lyricsLines : [{ text: "", chords: [] }]);
      // ChordPro se rellenará en el efecto siguiente
    } else {
      setFormData({
        title: "",
        artist: "",
        key: "C",
        notes: "",
        tagsInput: "",
        youtubeUrl: "",
      });
      setLyricsLines([{ text: "", chords: [] }]);
      setChordProText("");
    }
  }, [isOpen, mode, song]);

  // En edición, rellenar chordProText desde la canción cargada (una vez tenemos formData y lyricsLines)
  React.useEffect(() => {
    if (!isOpen || mode !== 'edit' || !song || !formData.title) return;
    setChordProText(convertToChordPro());
  }, [isOpen, mode, song?._id, formData.title, convertToChordPro]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chordProText.trim()) {
      alert("Debes ingresar el texto en formato ChordPro");
      return;
    }
    const tags = formData.tagsInput
      ? formData.tagsInput.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined;
    const youtubeUrl = formData.youtubeUrl?.trim() || undefined;
    onSave({ chordProText: chordProText.trim(), tags, youtubeUrl });
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      title: "",
      artist: "",
      key: "C",
      notes: "",
      tagsInput: "",
      youtubeUrl: "",
    });
    setLyricsLines([{ text: "", chords: [] }]);
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
            <p className="text-sm text-gray-600">
              Ingresa la canción en formato ChordPro. Puedes incluir <code className="bg-gray-100 px-1 rounded">{`{title}`}</code>, <code className="bg-gray-100 px-1 rounded">{`{artist}`}</code>, <code className="bg-gray-100 px-1 rounded">{`{key}`}</code>, <code className="bg-gray-100 px-1 rounded">{`{verse}`}</code>, <code className="bg-gray-100 px-1 rounded">{`{chorus}`}</code> y acordes entre corchetes <code className="bg-gray-100 px-1 rounded">[C]</code>.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Texto ChordPro <span className="text-red-500">*</span>
              </label>
              {mode === 'edit' && (
                <div className="mb-2">
                  <button
                    type="button"
                    onClick={() => setChordProText(convertToChordPro())}
                    className="bg-blue-500 text-blanco px-3 py-1 rounded-lg text-sm hover:bg-blue-600 transition-all duration-200"
                  >
                    🔄 Rellenar desde datos actuales
                  </button>
                </div>
              )}
              <textarea
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-terracota focus:ring-4 focus:ring-terracota/20 transition-all duration-200 font-mono text-sm"
                rows={14}
                value={chordProText}
                onChange={(e) => setChordProText(e.target.value)}
                placeholder={`{title: How Great Thou Art}
{artist: Stuart K. Hine}
{key: C}

{verse}
[C]O Lord my [F]God when [C]I in awesome wonder
[Am]Consider [F]all the [G]worlds thy hands have [C]made

{chorus}
Then sings my [F]soul my [C]savior God to [Am]thee
[F]How great thou [C]art how [G]great thou [C]art`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL del video (opcional)
              </label>
              <input
                type="url"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-terracota focus:ring-4 focus:ring-terracota/20 transition-all duration-200"
                value={formData.youtubeUrl}
                onChange={(e) => handleInputChange("youtubeUrl", e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Etiquetas (opcional)
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-terracota focus:ring-4 focus:ring-terracota/20 transition-all duration-200"
                value={formData.tagsInput}
                onChange={(e) => handleInputChange("tagsInput", e.target.value)}
                placeholder="Ej: alabanza, adoración, amor (separados por coma)"
              />
            </div>

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
                🎵 {mode === 'edit' ? 'Actualizar canción' : 'Crear canción'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
