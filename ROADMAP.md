# Roadmap — Song Bank ACYM
> Planificación basada en análisis del backend (NestJS + MongoDB), web (Next.js) y app (React Native/Expo).
> Ordenado de menor a mayor esfuerzo. Última revisión: 2026-03-27.

---

## Resumen del estado actual del backend

| Módulo | Endpoints clave | Estado |
|--------|----------------|--------|
| Songs | CRUD + transpose + ChordPro import/export + búsqueda avanzada | ✅ Completo |
| Events | CRUD + estados (active/draft/archived) | ✅ Completo |
| Sets | CRUD + canciones con orden y transposeKey | ✅ Completo |
| Users | CRUD + roles + permisos granulares | ✅ Completo |
| Directions | CRUD de ensayos/reuniones | ✅ Completo (no expuesto en app) |
| Auth | JWT 24h + roles guard | ✅ Completo |

---

## NIVEL 1 — Solo Frontend (sin tocar el backend)

### 1. Búsqueda con debounce
**Esfuerzo:** 1–2 horas | **Impacto:** Medio

El backend ya tiene `GET /songs/search/advanced`. Solo hay que cambiar el trigger.

**Web (`SongsPage`):**
- Agregar `useEffect` con `setTimeout` de 400ms al cambiar los inputs de filtro
- Cancelar el timeout anterior con `clearTimeout` (debounce pattern)

**App (`SongsScreen`):**
- Mismo patrón en los `TextInput` de filtros
- Reemplazar el botón "Buscar" por búsqueda automática al dejar de escribir
- Mantener botón de limpiar

---

### 2. Copiar letra al portapapeles
**Esfuerzo:** 2–3 horas | **Impacto:** Medio

El backend ya retorna `lyricsLines` con `text` y sección.

**Web:** usar `navigator.clipboard.writeText(textoFormateado)`
**App:** usar `expo install expo-clipboard` → `Clipboard.setStringAsync(texto)`

**Formato del texto copiado:**
```
--- CORO ---
Gran es tu fidelidad...

--- ESTROFA 1 ---
Verano e invierno...
```

---

### 3. Modo pantalla completa en el app
**Esfuerzo:** 3–4 horas | **Impacto:** Alto (uso en escenario)

Solo cambios en `SongDetailScreen.tsx`.

**Pasos:**
1. Botón "⛶ Pantalla completa" junto a los controles de fuente
2. Al activar: ocultar barra de navegación inferior con `navigation.setOptions({ tabBarStyle: { display: 'none' } })` + `StatusBar` hidden
3. Mostrar solo letra + acordes en fondo negro total
4. Botón flotante semitransparente para salir del modo

---

### 4. Favoritas (solo cliente)
**Esfuerzo:** 4–6 horas | **Impacto:** Medio

Sin backend — almacenar IDs en `AsyncStorage` (app) y `localStorage` (web).

**App:**
1. En `SongDetailScreen`: botón ⭐ en el header que guarda/quita `songId` en AsyncStorage bajo la key `favorites`
2. En `SongsScreen`: tab o filtro "Favoritas" que filtra la lista local
3. Íconos: ⭐ lleno = favorita, ☆ vacío = no favorita

**Web:** mismo concepto con `localStorage`.

---

### 5. Filtro rápido por tono — pills en el app
**Esfuerzo:** 3–4 horas | **Impacto:** Medio

El backend tiene `GET /songs/search/key?q=C`. Solo UI en el app.

**En `SongsScreen`:**
- Fila horizontal de pills: `C | C# | D | D# | E | F | F# | G | G# | A | A# | B`
- Tap en un tono llama a `searchSongsAdvanced({ key: tono })`
- Tap en el tono activo lo deselecciona (vuelve a todos)
- Puede coexistir con los otros filtros de texto

---

### 6. Modo presentación / proyector (web)
**Esfuerzo:** 1 día | **Impacto:** Alto (uso en culto)

Ruta nueva en Next.js: `/songs/[id]/presentacion`

**Características:**
- Pantalla completa (`document.documentElement.requestFullscreen()`)
- Solo letra, sin chords (toggle opcional)
- Fuente grande configurable (40–72px)
- Fondo negro, texto blanco
- Flechas del teclado para pasar entre secciones
- Botón ESC o clic para salir

**No requiere backend** — usa los mismos datos de `GET /songs/:id`.

---

### 7. Módulo Direcciones visible en el app
**Esfuerzo:** 1 día | **Impacto:** Medio

El backend ya tiene el módulo `directions` completo con filtros por director y rango de fechas.

**Pasos en el app:**
1. Agregar `getDirections()` en `api.ts` → `GET /directions`
2. Nueva pantalla `DirectionsScreen` con lista de ensayos
3. Agregar tercer tab en `AppNavigator` ("Ensayos" 📋)
4. Vista detalle con hora, descripción, evento relacionado

---

### 8. Importar canción desde ChordPro (web)
**Esfuerzo:** 1 día | **Impacto:** Muy Alto ⭐

**El backend YA tiene este endpoint:** `POST /songs/chordpro`

Solo falta la UI en la web. El backend parsea automáticamente:
- `{title: Nombre}` → título
- `{artist: Artista}` → artista
- `{key: C}` → tonalidad
- `{chorus}` / `{verse}` / `{bridge}` → secciones
- `[C]palabra` → acorde posicionado sobre la letra

**Pasos en la web:**
1. En el formulario de crear canción, agregar tab "Importar ChordPro"
2. `<textarea>` para pegar el texto ChordPro
3. Botón "Vista previa" que llama `POST /songs/chordpro` con `preview: true` (o parsearlo en frontend)
4. Botón "Importar" que guarda la canción
5. Mostrar mensaje de ayuda con formato de ejemplo

**Formato de ejemplo para mostrar al usuario:**
```
{title: Gran Es Tu Fidelidad}
{artist: Thomas O. Chisholm}
{key: G}

{chorus}
[G]Gran es tu [C]fidelidad, [G]oh Dios mi [D]padre...

{verse}
[G]No hay sombra de [Em]variación en ti...
```

---

## NIVEL 2 — Cambios menores en backend + frontend

### 9. Campo BPM en canciones
**Esfuerzo:** 1 día | **Impacto:** Medio

**Backend (`songbanck-backend`):**
1. `song.schema.ts` → agregar campo: `bpm: { type: Number, default: null }`
2. `create-song.dto.ts` → agregar: `@IsOptional() @IsNumber() bpm?: number`
3. `update-song.dto.ts` → mismo campo opcional

**Web:** agregar input numérico "BPM" en el formulario de canción
**App:** mostrar BPM en `SongDetailScreen` junto al tono (ej: `♩ 120 bpm`)

---

### 10. Notas por canción dentro del setlist
**Esfuerzo:** 1 día | **Impacto:** Alto (uso en ensayo)

El setlist ya guarda `{ songId, order, transposeKey }` por canción.

**Backend:**
1. `set.schema.ts` → agregar `notes?: string` en el sub-documento de canciones
2. `create-set.dto.ts` y su DTO de canción → campo `notes?: string`
3. `PATCH /sets/:id` ya existe — solo pasa los datos actualizados

**Web:** campo de texto editable inline en cada canción del setlist
**App:** mostrar la nota (si existe) debajo del título de la canción en `EventDetailScreen`

---

### 11. Drag & drop para reordenar el setlist (web)
**Esfuerzo:** 2 días | **Impacto:** Alto

El backend ya tiene `PATCH /sets/:id` que acepta el array `songs[]` actualizado.

**Web:**
1. Instalar `@dnd-kit/core` y `@dnd-kit/sortable`
2. Reemplazar la lista estática del setlist por `<SortableContext>`
3. Al soltar (`onDragEnd`), recalcular el campo `order` de cada canción
4. Llamar `PATCH /sets/:id` con el nuevo array ordenado
5. Feedback visual: íconos de arrastre `⠿` a la izquierda de cada ítem

---

### 12. Link público del setlist (sin login)
**Esfuerzo:** 2–3 días | **Impacto:** Muy Alto ⭐ (compartir con músicos)

Actualmente todos los endpoints de events/sets requieren JWT.

**Backend:**
1. `set.schema.ts` → agregar campo: `publicToken: { type: String, unique: true, sparse: true }`
2. Nuevo endpoint: `GET /sets/public/:token` sin guards — retorna setlist con canciones pobladas
3. En `PATCH /sets/:id` → opción de generar/revocar el token público (`generatePublicLink: boolean`)

**Web:**
1. Botón "Generar link público" en la vista del evento/setlist
2. Mostrar el link copiable: `https://tu-dominio.com/setlist/public/[token]`
3. Ruta `/setlist/public/[token]` → página sin auth que muestra las canciones

**App:** opcional — campo en `EventDetailScreen` para abrir el link público en el navegador

---

### 13. Historial de tonos usados por canción
**Esfuerzo:** 2 días | **Impacto:** Medio

Saber en qué tono se cantó cada vez que apareció en un setlist.

**Backend:**
- Endpoint nuevo: `GET /songs/:id/history` → agrega pipeline de MongoDB:
  ```
  Sets → buscar songId en songs[] → agrupar por transposeKey → contar frecuencia → ordenar por fecha
  ```
- No requiere nuevo schema, solo una query de agregación sobre la colección `sets`

**Web/App:** sección "Historial" en el detalle de canción:
```
D  — hace 1 semana   (último)
G  — hace 3 semanas
C  — hace 2 meses
```

---

## NIVEL 3 — Funcionalidades complejas

### 14. Estadísticas del catálogo (web)
**Esfuerzo:** 3–5 días | **Impacto:** Medio

**Backend — nuevos endpoints de agregación:**
1. `GET /songs/stats/most-used` → canciones que más aparecen en sets (últimos 90 días)
2. `GET /songs/stats/unused` → canciones que NO aparecen en ningún set en X días
3. `GET /songs/stats/by-key` → distribución de canciones por tono
4. `GET /songs/stats/by-tag` → distribución por etiqueta

**Web:** nueva página `/estadisticas` con:
- Gráfico de barras (canciones más usadas) — usar `recharts` o `chart.js`
- Lista de canciones sin usar (con botón de acción)
- Pie chart de tonos
- Filtros por rango de fechas

---

### 15. Caché offline en el app
**Esfuerzo:** 3–4 días | **Impacto:** Alto (uso en escenario sin internet)

**App únicamente:**
1. Al cargar una canción en `SongDetailScreen` → guardar en `AsyncStorage` con key `song_cache_${id}`
2. Al cargar la lista de canciones → guardar snapshot completo en `song_list_cache`
3. Al iniciar la app sin internet → cargar desde caché con banner "Modo sin conexión"
4. Pantalla "Descargas" → lista de canciones guardadas offline con opción de eliminar
5. Indicador visual en cada tarjeta: `📥` si está descargada

---

### 16. Editor visual de chords (web)
**Esfuerzo:** 1–2 semanas | **Impacto:** Muy Alto ⭐ (resuelve carga difícil)

La mayor fricción actual es agregar canciones con acordes posicionados línea a línea.

**Concepto:**
1. Escribir la letra normalmente en un editor de texto
2. Seleccionar una palabra/sílaba y presionar un acorde → el acorde se posiciona automáticamente
3. Vista en tiempo real de cómo se verá la canción (letra + chords encima)

**Stack sugerido:**
- `contenteditable` div con overlay de acordes
- O usar `Draft.js` / `Slate.js` como base del editor enriquecido
- Los acordes se almacenan como `{ note, index }` igual que el schema actual

**Backend:** no requiere cambios — usa `POST /songs` y `PATCH /songs/:id` existentes.

---

### 17. Control remoto entre dispositivos (WebSocket)
**Esfuerzo:** 2–4 semanas | **Impacto:** Alto (uso profesional en servicio)

El director en su tablet controla qué sección ven los músicos en sus celulares en tiempo real.

**Backend:**
1. Instalar `@nestjs/websockets` + `socket.io`
2. Nuevo `SyncGateway` con rooms por setlist/evento
3. Eventos: `join-room`, `navigate-section`, `change-song`

**App:**
1. En `EventDetailScreen` — rol Director: botones de control de sección
2. Rol Músico: escucha eventos y hace scroll automático
3. Conexión con token JWT via WebSocket

---

## Tabla resumen

| # | Feature | Backend | Frontend | Esfuerzo total |
|---|---------|---------|----------|----------------|
| 1 | Búsqueda debounce | ✅ Nada | Web + App | 2h |
| 2 | Copiar letra | ✅ Nada | Web + App | 3h |
| 3 | Pantalla completa app | ✅ Nada | App | 4h |
| 4 | Favoritas | ✅ Nada | Web + App | 6h |
| 5 | Pills de tono app | ✅ Nada | App | 4h |
| 6 | Modo proyector web | ✅ Nada | Web | 1 día |
| 7 | Ensayos en app | ✅ Nada | App | 1 día |
| **8** | **Importar ChordPro** | ✅ **YA EXISTE** | Web | **1 día** ⭐ |
| 9 | Campo BPM | Menor (schema + DTO) | Web + App | 1 día |
| 10 | Notas en setlist | Menor (schema + DTO) | Web + App | 1 día |
| 11 | Drag & drop setlist | ✅ Nada | Web | 2 días |
| 12 | Link público setlist | Medio (token + endpoint) | Web | 3 días |
| 13 | Historial de tonos | Medio (agregación) | Web + App | 2 días |
| 14 | Estadísticas | Medio (agregaciones) | Web | 5 días |
| 15 | Offline app | ✅ Nada | App | 4 días |
| 16 | Editor visual chords | ✅ Nada | Web | 2 semanas |
| 17 | Control remoto WS | Alto (WebSocket nuevo) | App | 4 semanas |

---

## Recomendación de arranque

**Sprint 1 (esta semana) — todo frontend, cero riesgo:**
- [ ] #8 Importar desde ChordPro (el endpoint ya existe, máximo impacto)
- [ ] #1 Búsqueda debounce (web + app)
- [ ] #2 Copiar letra (web + app)
- [ ] #3 Pantalla completa app

**Sprint 2 (semana siguiente) — tocar backend mínimo:**
- [ ] #11 Drag & drop setlist
- [ ] #9 Campo BPM
- [ ] #10 Notas en setlist

**Sprint 3 — features de alto impacto:**
- [ ] #12 Link público setlist
- [ ] #15 Offline app
- [ ] #6 Modo proyector web
