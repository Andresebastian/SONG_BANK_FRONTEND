// Utilidad para transformar canciones del formato original al formato ChordPro

export interface SongMetadata {
  title: string;
  artist: string;
  key: string;
}

export interface SongSection {
  name: string;
  lines: {
    text: string;
    chords: { note: string; index: number }[];
  }[];
}

export interface ParsedSong {
  metadata: SongMetadata;
  sections: SongSection[];
}

/**
 * Transforma una canción del formato original al formato ChordPro
 * @param originalText - Texto de la canción en formato original
 * @returns Texto en formato ChordPro
 */
export function transformToChordPro(originalText: string): string {
  const parsed = parseOriginalFormat(originalText);
  return generateChordPro(parsed);
}

/**
 * Parsea el texto en formato original y extrae metadatos y secciones
 */
function parseOriginalFormat(text: string): ParsedSong {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Extraer metadatos
  const metadata: SongMetadata = {
    title: '',
    artist: '',
    key: 'C'
  };

  // Buscar metadatos en las primeras líneas
  for (const line of lines) {
    if (line.startsWith('title ')) {
      metadata.title = line.substring(6).trim();
    } else if (line.startsWith('artist ')) {
      metadata.artist = line.substring(7).trim();
    } else if (line.startsWith('key ')) {
      metadata.key = line.substring(4).trim();
    }
  }

  // Procesar secciones
  const sections: SongSection[] = [];
  let currentSection: SongSection | null = null;
  let currentLines: { text: string; chords: { note: string; index: number }[] }[] = [];
  let pendingChordLine: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Saltar metadatos
    if (line.startsWith('title ') || line.startsWith('artist ') || line.startsWith('key ')) {
      continue;
    }

    // Detectar inicio de sección
    if (isSectionHeader(line)) {
      // Guardar sección anterior si existe
      if (currentSection && currentLines.length > 0) {
        currentSection.lines = currentLines;
        sections.push(currentSection);
      }

      // Iniciar nueva sección
      const sectionName = extractSectionName(line);
      currentSection = {
        name: sectionName,
        lines: []
      };
      currentLines = [];
      pendingChordLine = null;
      continue;
    }

    // Procesar línea de acordes y letra
    if (currentSection) {
      // Si hay una línea de acordes pendiente, procesarla con la línea actual
      if (pendingChordLine) {
        const processedLine = processChordAndTextLines(pendingChordLine, line);
        if (processedLine) {
          currentLines.push(processedLine);
        }
        pendingChordLine = null;
      } else if (isChordLine(line)) {
        // Esta es una línea de solo acordes, guardarla para la siguiente línea
        pendingChordLine = line;
      } else {
        // Línea normal (sin acordes o con acordes mezclados)
        const processedLine = processLine(line);
        if (processedLine) {
          currentLines.push(processedLine);
        }
      }
    }
  }

  // Guardar última sección
  if (currentSection && currentLines.length > 0) {
    currentSection.lines = currentLines;
    sections.push(currentSection);
  }

  return { metadata, sections };
}

/**
 * Verifica si una línea es un encabezado de sección
 */
function isSectionHeader(line: string): boolean {
  const sectionKeywords = [
    'intro:', 'interlude:', 'estrofa:', 'verso:', 'verse:',
    'coro:', 'chorus:', 'puente:', 'bridge:', 'outro:',
    'instrumental:', 'solo:', 'break:'
  ];
  
  const lowerLine = line.toLowerCase();
  return sectionKeywords.some(keyword => lowerLine.includes(keyword));
}

/**
 * Extrae el nombre de la sección de una línea
 */
function extractSectionName(line: string): string {
  const lowerLine = line.toLowerCase();
  
  if (lowerLine.includes('intro:')) return 'intro';
  if (lowerLine.includes('interlude:')) return 'interlude';
  if (lowerLine.includes('estrofa:') || lowerLine.includes('verso:') || lowerLine.includes('verse:')) return 'verse';
  if (lowerLine.includes('coro:') || lowerLine.includes('chorus:')) return 'chorus';
  if (lowerLine.includes('puente:') || lowerLine.includes('bridge:')) return 'bridge';
  if (lowerLine.includes('outro:')) return 'outro';
  if (lowerLine.includes('instrumental:')) return 'instrumental';
  if (lowerLine.includes('solo:')) return 'solo';
  if (lowerLine.includes('break:')) return 'break';
  
  return 'verse'; // Por defecto
}

/**
 * Procesa una línea de acordes y una línea de texto por separado
 */
function processChordAndTextLines(chordLine: string, textLine: string): { text: string; chords: { note: string; index: number }[] } | null {
  if (!textLine.trim()) return null;

  // Extraer acordes de la línea de acordes
  const chordPattern = /\b[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|7|9|11|13)?\b/g;
  const chordMatches = [...chordLine.matchAll(chordPattern)];
  
  if (chordMatches.length === 0) {
    return {
      text: textLine.trim(),
      chords: []
    };
  }

  // Calcular posiciones de los acordes en el texto
  const chords: { note: string; index: number }[] = [];
  
  for (const match of chordMatches) {
    const chord = match[0];
    const chordIndex = match.index!;
    
    // Calcular la posición aproximada en el texto basada en la posición en la línea de acordes
    // Esto es una aproximación simple - en un caso real podrías necesitar un algoritmo más sofisticado
    const textIndex = Math.min(chordIndex, textLine.length);
    
    chords.push({
      note: chord,
      index: textIndex
    });
  }

  return {
    text: textLine.trim(),
    chords: chords.sort((a, b) => a.index - b.index)
  };
}

/**
 * Procesa una línea que puede contener acordes y letra
 */
function processLine(line: string): { text: string; chords: { note: string; index: number }[] } | null {
  // Si la línea está vacía o solo contiene espacios, saltarla
  if (!line.trim()) return null;

  // Detectar si es una línea de acordes (solo acordes, sin texto)
  if (isChordLine(line)) {
    return null; // Las líneas de solo acordes se procesan con la siguiente línea de texto
  }

  // Buscar acordes en la línea usando una expresión regular más específica
  const chordPattern = /\b[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|7|9|11|13)?\b/g;
  const chordMatches = [...line.matchAll(chordPattern)];
  
  if (chordMatches.length === 0) {
    // Línea sin acordes
    return {
      text: line.trim(),
      chords: []
    };
  }

  // Procesar acordes y texto
  const chords: { note: string; index: number }[] = [];

  // Ordenar acordes por posición de aparición
  chordMatches.sort((a, b) => a.index - b.index);

  for (const match of chordMatches) {
    const chord = match[0];
    const chordIndex = match.index!;
    
    chords.push({
      note: chord,
      index: chordIndex
    });
  }

  // Remover todos los acordes del texto para obtener solo la letra
  let cleanText = line;
  for (const chord of chords) {
    const chordIndex = cleanText.indexOf(chord.note);
    if (chordIndex !== -1) {
      cleanText = cleanText.substring(0, chordIndex) + cleanText.substring(chordIndex + chord.note.length);
    }
  }

  return {
    text: cleanText.trim(),
    chords: chords
  };
}

/**
 * Verifica si una línea contiene solo acordes
 */
function isChordLine(line: string): boolean {
  // Una línea es de solo acordes si contiene principalmente acordes y espacios
  const chordPattern = /^[\s]*[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|7|9|11|13)?[\s\-]*$/;
  const hasOnlyChords = chordPattern.test(line.trim());
  
  // También considerar líneas que tienen solo acordes separados por espacios
  const chordOnlyPattern = /^[\s]*[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|7|9|11|13)?[\s]+[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|7|9|11|13)?[\s\-]*$/;
  const hasMultipleChords = chordOnlyPattern.test(line.trim());
  
  return hasOnlyChords || hasMultipleChords;
}

/**
 * Genera el texto en formato ChordPro
 */
function generateChordPro(parsed: ParsedSong): string {
  let chordPro = '';
  
  // Metadatos
  chordPro += `{title: ${parsed.metadata.title}}\n`;
  chordPro += `{artist: ${parsed.metadata.artist}}\n`;
  chordPro += `{key: ${parsed.metadata.key}}\n\n`;

  // Procesar secciones
  for (const section of parsed.sections) {
    chordPro += `{${section.name}}\n`;
    
    for (const line of section.lines) {
      if (line.text.trim()) {
        let lineText = line.text;
        
        // Insertar acordes en sus posiciones
        line.chords
          .sort((a, b) => b.index - a.index) // Ordenar de mayor a menor índice
          .forEach(chord => {
            lineText = lineText.slice(0, chord.index) + `[${chord.note}]` + lineText.slice(chord.index);
          });
        
        chordPro += lineText + '\n';
      }
    }
    
    chordPro += '\n';
  }

  return chordPro.trim();
}

/**
 * Valida si el texto tiene el formato correcto para ser transformado
 */
export function validateOriginalFormat(text: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!text.trim()) {
    errors.push('El texto está vacío');
    return { isValid: false, errors };
  }

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Verificar que tenga al menos título y artista
  const hasTitle = lines.some(line => line.startsWith('title '));
  const hasArtist = lines.some(line => line.startsWith('artist '));
  
  if (!hasTitle) {
    errors.push('No se encontró el título de la canción (línea que comience con "title ")');
  }
  
  if (!hasArtist) {
    errors.push('No se encontró el artista (línea que comience con "artist ")');
  }

  // Verificar que tenga al menos una sección con contenido
  const hasContent = lines.some(line => 
    !line.startsWith('title ') && 
    !line.startsWith('artist ') && 
    !line.startsWith('key ') &&
    line.trim().length > 0
  );
  
  if (!hasContent) {
    errors.push('No se encontró contenido de la canción (letra o acordes)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
