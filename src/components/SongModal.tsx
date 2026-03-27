import React, { useState, useCallback, useMemo } from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

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
  mode?: "create" | "edit";
}

// ─── Parser de ChordPro (cliente, solo para preview) ──────────────────────────

interface ParsedSection {
  name: string;
  lines: Array<{
    text: string;
    chords: Array<{ note: string; pos: number }>;
  }>;
}

interface ParsedSong {
  title: string;
  artist: string;
  key: string;
  sections: ParsedSection[];
}

const SECTION_LABELS: Record<string, string> = {
  verse:      "Estrofa",
  chorus:     "Coro",
  bridge:     "Puente",
  prechorus:  "Pre-coro",
  intro:      "Intro",
  outro:      "Outro",
  instrumental: "Instrumental",
  solo:       "Solo",
  break:      "Break",
};

function sectionDisplayName(name: string): string {
  return SECTION_LABELS[name.toLowerCase()] ?? (name.charAt(0).toUpperCase() + name.slice(1));
}

function parseChordPro(text: string): ParsedSong {
  const result: ParsedSong = { title: "", artist: "", key: "", sections: [] };
  if (!text.trim()) return result;

  const lines = text.split("\n");
  let currentSection: ParsedSection | null = null;

  const flush = () => {
    if (currentSection && currentSection.lines.length > 0) {
      result.sections.push(currentSection);
    }
  };

  for (const raw of lines) {
    const line = raw.trim();

    // Directivas de metadatos
    const meta = line.match(/^\{(\w+):\s*(.+?)\s*\}$/);
    if (meta) {
      const [, key, val] = meta;
      if (key === "title")  { result.title  = val; continue; }
      if (key === "artist") { result.artist = val; continue; }
      if (key === "key")    { result.key    = val; continue; }
      continue; // ignorar otras directivas de meta
    }

    // Marcadores de sección: {chorus}, {verse}, {bridge}, etc.
    const section = line.match(/^\{(\w+)\}$/);
    if (section) {
      flush();
      currentSection = { name: section[1], lines: [] };
      continue;
    }

    // Línea vacía — separador de sección implícito
    if (!line) {
      if (currentSection && currentSection.lines.length > 0) {
        flush();
        currentSection = null;
      }
      continue;
    }

    // Línea con letra y/o acordes
    if (!currentSection) {
      currentSection = { name: "verse", lines: [] };
    }

    const chords: Array<{ note: string; pos: number }> = [];
    let cleanText = "";
    const chordRegex = /\[([^\]]+)\]/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = chordRegex.exec(line)) !== null) {
      cleanText += line.slice(lastIndex, match.index);
      chords.push({ note: match[1], pos: cleanText.length });
      lastIndex = match.index + match[0].length;
    }
    cleanText += line.slice(lastIndex);

    currentSection.lines.push({ text: cleanText, chords });
  }

  flush();
  return result;
}

// ─── Componente de línea con acordes ─────────────────────────────────────────

function PreviewLine({ text, chords }: { text: string; chords: Array<{ note: string; pos: number }> }) {
  if (chords.length === 0) {
    return (
      <div className="font-mono text-sm text-gray-800 leading-6 min-h-[1.5rem]">
        {text || "\u00A0"}
      </div>
    );
  }

  const sorted = [...chords].sort((a, b) => a.pos - b.pos);
  type Segment = { chord?: string; text: string };
  const segments: Segment[] = [];

  if (sorted[0].pos > 0) {
    segments.push({ text: text.slice(0, sorted[0].pos) });
  }

  sorted.forEach((c, i) => {
    const end = i < sorted.length - 1 ? sorted[i + 1].pos : text.length;
    segments.push({ chord: c.note, text: text.slice(c.pos, end) || " " });
  });

  return (
    <div className="flex flex-wrap items-end">
      {segments.map((seg, i) => (
        <div key={i} className="flex flex-col">
          <span className="text-terracota font-bold text-xs font-mono leading-4 min-w-[0.25rem]">
            {seg.chord ?? ""}
          </span>
          <span className="font-mono text-sm text-gray-800 leading-6">
            {seg.text}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function SongModal({ isOpen, onClose, onSave, song, mode = "create" }: SongModalProps) {
  const [chordProText, setChordProText] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const [showGuide, setShowGuide] = useState(false);

  // Convierte la canción existente a ChordPro para modo edición
  const convertToChordPro = useCallback((s: Song): string => {
    let text = "";
    text += `{title: ${s.title}}\n`;
    text += `{artist: ${s.artist}}\n`;
    text += `{key: ${s.key}}\n`;
    if (s.notes) text += `{notes: ${s.notes}}\n`;
    text += "\n";

    const sections: Record<string, LyricLine[]> = {};
    for (const line of s.lyricsLines ?? []) {
      const sec = line.section || "verse";
      if (!sections[sec]) sections[sec] = [];
      sections[sec].push(line);
    }

    for (const [secName, lines] of Object.entries(sections)) {
      text += `{${secName}}\n`;
      for (const line of lines) {
        let lineText = line.text;
        [...line.chords]
          .sort((a, b) => b.index - a.index)
          .forEach(({ note, index }) => {
            lineText = lineText.slice(0, index) + `[${note}]` + lineText.slice(index);
          });
        text += lineText + "\n";
      }
      text += "\n";
    }
    return text;
  }, []);

  // Inicializar cuando se abre
  React.useEffect(() => {
    if (!isOpen) return;
    if (mode === "edit" && song) {
      setChordProText(convertToChordPro(song));
      setYoutubeUrl(song.youtubeUrl ?? "");
      setTagsInput(Array.isArray(song.tags) ? song.tags.join(", ") : "");
    } else {
      setChordProText("");
      setYoutubeUrl("");
      setTagsInput("");
    }
    setActiveTab("editor");
    setShowGuide(false);
  }, [isOpen, mode, song, convertToChordPro]);

  // Preview en tiempo real
  const preview = useMemo(() => parseChordPro(chordProText), [chordProText]);

  const hasContent = chordProText.trim().length > 0;
  const isValid = hasContent && (preview.title || preview.sections.length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasContent) {
      alert("Ingresa el texto de la canción en formato ChordPro.");
      return;
    }
    const tags = tagsInput ? tagsInput.split(",").map((t) => t.trim()).filter(Boolean) : undefined;
    onSave({ chordProText: chordProText.trim(), tags, youtubeUrl: youtubeUrl.trim() || undefined });
    handleClose();
  };

  const handleClose = () => {
    setChordProText("");
    setYoutubeUrl("");
    setTagsInput("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 lg:p-6">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl">

        {/* ── Cabecera ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              🎵 {mode === "edit" ? "Editar canción" : "Nueva canción"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Formato ChordPro — escribe y ve el resultado en tiempo real</p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none p-1">×</button>
        </div>

        {/* ── Tabs móvil ── */}
        <div className="flex lg:hidden border-b border-gray-200 shrink-0">
          {(["editor", "preview"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "text-terracota border-b-2 border-terracota"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "editor" ? "✏️ Editor" : "👁 Vista previa"}
            </button>
          ))}
        </div>

        {/* ── Cuerpo principal ── */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex flex-1 min-h-0">

            {/* Panel izquierdo — Editor */}
            <div className={`flex flex-col w-full lg:w-1/2 border-r border-gray-100 min-h-0 ${activeTab === "preview" ? "hidden lg:flex" : "flex"}`}>

              {/* Guía de formato */}
              <div className="px-4 pt-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowGuide((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-terracota font-semibold hover:underline"
                >
                  {showGuide ? "▼" : "▶"} Guía de formato ChordPro
                </button>
                {showGuide && (
                  <div className="mt-2 mb-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs font-mono leading-5 text-gray-700 space-y-1">
                    <div><span className="text-terracota font-bold">{"{title: Nombre}"}</span> — título de la canción</div>
                    <div><span className="text-terracota font-bold">{"{artist: Artista}"}</span> — artista</div>
                    <div><span className="text-terracota font-bold">{"{key: G}"}</span> — tonalidad (C, D, E, F, G, A, B + # o b)</div>
                    <div className="pt-1 border-t border-amber-200"><span className="text-blue-600 font-bold">{"{verse}"}</span> — inicio de estrofa</div>
                    <div><span className="text-blue-600 font-bold">{"{chorus}"}</span> — inicio de coro</div>
                    <div><span className="text-blue-600 font-bold">{"{bridge}"}</span> — puente</div>
                    <div><span className="text-blue-600 font-bold">{"{prechorus}"}</span> — pre-coro</div>
                    <div className="pt-1 border-t border-amber-200"><span className="text-green-600 font-bold">[C]</span>palabra — acorde sobre esa sílaba</div>
                    <div className="pt-1 border-t border-amber-200 text-gray-500">Línea en blanco = separar bloques</div>
                  </div>
                )}
              </div>

              {/* Textarea principal */}
              <div className="flex-1 px-4 pb-2 min-h-0">
                <textarea
                  className="w-full h-full min-h-[260px] resize-none px-3 py-3 border-2 border-gray-200 rounded-xl focus:border-terracota focus:ring-2 focus:ring-terracota/20 transition-all font-mono text-sm leading-5 text-gray-800 bg-gray-50"
                  value={chordProText}
                  onChange={(e) => setChordProText(e.target.value)}
                  placeholder={`{title: Gran Es Tu Fidelidad}
{artist: Thomas O. Chisholm}
{key: G}

{verse}
[G]Verano e [Em]invierno, [C]cosecha y [G]sol
[G]Cuidado y [D]amor, tú me [G]das

{chorus}
[G]Grande es tu [C]fidelidad
[G]Grande es tu [D]fidelidad`}
                  spellCheck={false}
                />
              </div>

              {/* Campos adicionales */}
              <div className="px-4 pb-4 space-y-3 shrink-0">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Etiquetas <span className="text-gray-400 font-normal">(separadas por coma)</span></label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-terracota focus:ring-2 focus:ring-terracota/20 transition-all text-sm"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="alabanza, adoración, amor"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">URL de YouTube <span className="text-gray-400 font-normal">(opcional)</span></label>
                  <input
                    type="url"
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-terracota focus:ring-2 focus:ring-terracota/20 transition-all text-sm"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
              </div>
            </div>

            {/* Panel derecho — Preview en vivo */}
            <div className={`flex flex-col w-full lg:w-1/2 min-h-0 ${activeTab === "editor" ? "hidden lg:flex" : "flex"}`}>
              <div className="flex items-center justify-between px-5 pt-3 pb-2 shrink-0">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vista previa</span>
                {isValid && (
                  <span className="text-xs text-green-600 font-semibold bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    ✓ Formato válido
                  </span>
                )}
                {hasContent && !isValid && (
                  <span className="text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    ⚠ Agrega {"{title:}"} y secciones
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-4 min-h-0">
                {!hasContent ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-3">
                    <span className="text-5xl">🎼</span>
                    <p className="text-sm text-center">Empieza a escribir en el editor<br/>para ver la vista previa aquí</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* Meta de la canción */}
                    {(preview.title || preview.artist || preview.key) && (
                      <div className="mb-4 pb-3 border-b border-gray-100">
                        {preview.title  && <h3 className="font-bold text-lg text-gray-900 leading-tight">{preview.title}</h3>}
                        {preview.artist && <p className="text-sm text-gray-500">{preview.artist}</p>}
                        {preview.key    && (
                          <span className="inline-block mt-1 text-xs font-bold text-terracota bg-terracota/10 border border-terracota/20 px-2 py-0.5 rounded-lg">
                            Tono: {preview.key}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Secciones */}
                    {preview.sections.length === 0 && (
                      <p className="text-xs text-gray-400 italic">Escribe <code>{"{verse}"}</code> o <code>{"{chorus}"}</code> para ver las secciones</p>
                    )}
                    {preview.sections.map((sec, si) => (
                      <div key={si} className="mb-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm bg-terracota shrink-0" />
                          <span className="text-xs font-bold text-terracota uppercase tracking-widest">
                            {sectionDisplayName(sec.name)}
                          </span>
                        </div>
                        <div className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100 space-y-1">
                          {sec.lines.map((line, li) => (
                            <PreviewLine key={li} text={line.text} chords={line.chords} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Footer con botones ── */}
          <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!hasContent}
              className="flex-1 lg:flex-none lg:min-w-[200px] py-2.5 px-6 rounded-xl text-sm font-bold bg-terracota text-white hover:bg-terracota-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              🎵 {mode === "edit" ? "Guardar cambios" : "Crear canción"}
            </button>
            {/* Indicador de líneas en móvil */}
            {hasContent && (
              <span className="hidden sm:block text-xs text-gray-400 ml-auto">
                {preview.sections.length} sección{preview.sections.length !== 1 ? "es" : ""}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
