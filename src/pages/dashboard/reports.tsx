import { useCallback, useEffect, useMemo, useState } from "react";
import LayoutDashboard from "../../components/LayoutDashboard";
import { getSongReports } from "../../utils/api";

type ReportSection = "rated" | "most" | "least";
type DatePreset = "all" | "last3m" | "year" | "custom";

interface RatedSong {
  songId: string;
  title: string;
  artist: string;
  key: string;
  averageRating: number;
  ratingCount: number;
  bestRating: number;
  lastRatedAt?: string;
}

interface PlayedSong {
  songId: string;
  title: string;
  artist: string;
  key: string;
  timesPlayed: number;
  lastPlayedAt?: string | null;
}

interface SongReport {
  summary: {
    totalSongs: number;
    totalSetlists: number;
    ratedSongs: number;
    averageRating: number;
  };
  topRated: RatedSong[];
  mostPlayed: PlayedSong[];
  leastPlayed: PlayedSong[];
}

const formatDate = (date?: string | null) => {
  if (!date) return "Sin registros";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Sin registros";
  return parsed.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const renderStars = (rating: number) => {
  const roundedRating = Math.round(rating);
  return [1, 2, 3, 4, 5].map((star) => (
    <span key={star} className={star <= roundedRating ? "text-yellow-400" : "text-gray-300"}>
      ★
    </span>
  ));
};

const getRatingLabel = (rating: number) => {
  if (rating >= 4.5) return "Favorita congregacional";
  if (rating >= 4) return "Muy fuerte";
  if (rating >= 3) return "Funciona bien";
  if (rating > 0) return "Revisar antes de repetir";
  return "Sin calificación";
};

const toDateInputValue = (date: Date) => date.toISOString().split("T")[0];

export default function ReportsPage() {
  const [report, setReport] = useState<SongReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<ReportSection>("rated");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);

    const today = new Date();
    if (preset === "all") {
      setFromDate("");
      setToDate("");
      return;
    }

    if (preset === "last3m") {
      const from = new Date(today);
      from.setMonth(from.getMonth() - 3);
      setFromDate(toDateInputValue(from));
      setToDate(toDateInputValue(today));
      return;
    }

    if (preset === "year") {
      setFromDate(`${today.getFullYear()}-01-01`);
      setToDate(toDateInputValue(today));
    }
  };

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await getSongReports({
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      if (response?.data) {
        setReport(response.data);
      } else {
        setReport(null);
        setError(response?.message || "No se pudo cargar el reporte");
      }
    } catch (err) {
      console.error("Error loading reports:", err);
      setError("Error de conexión al cargar reportes");
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const maxPlayed = useMemo(() => {
    const values = [
      ...(report?.mostPlayed ?? []).map((song) => song.timesPlayed),
      ...(report?.leastPlayed ?? []).map((song) => song.timesPlayed),
    ];
    return Math.max(1, ...values);
  }, [report]);

  const decisionHints = useMemo(() => {
    if (!report) return [];
    const bestRated = report.topRated[0];
    const underusedHighRated = report.topRated.find(
      (rated) =>
        rated.averageRating >= 4 &&
        !report.mostPlayed.some((played) => played.songId === rated.songId),
    );
    const leastPlayed = report.leastPlayed[0];

    return [
      bestRated && {
        icon: "⭐",
        title: "Apuesta segura",
        text: `${bestRated.title} tiene ${bestRated.averageRating.toFixed(1)}/5 de promedio.`,
      },
      underusedHighRated && {
        icon: "💡",
        title: "Buena opción para repetir",
        text: `${underusedHighRated.title} califica alto y no está entre las más tocadas.`,
      },
      leastPlayed && {
        icon: "🔎",
        title: "Canción para rescatar",
        text: `${leastPlayed.title} aparece con ${leastPlayed.timesPlayed} uso${leastPlayed.timesPlayed !== 1 ? "s" : ""}.`,
      },
    ].filter(Boolean) as { icon: string; title: string; text: string }[];
  }, [report]);

  return (
    <LayoutDashboard>
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Reportes de canciones</h1>
            <p className="text-gray-600">
              Datos visuales para decidir mejor qué cantar el próximo domingo.
            </p>
          </div>
          <button
            onClick={loadReport}
            className="bg-terracota text-blanco px-5 py-3 rounded-xl font-semibold shadow-lg hover:bg-terracota-dark transition-all duration-200"
          >
            🔄 Actualizar reportes
          </button>
        </div>
      </div>

      <div className="bg-blanco rounded-2xl p-5 shadow-lg mb-8">
        <div className="flex flex-col xl:flex-row xl:items-end gap-4">
          <div className="flex-1">
            <h2 className="font-bold text-gray-800 mb-1">Rango de análisis</h2>
            <p className="text-sm text-gray-500">Filtra los reportes por temporada para decidir con datos más relevantes.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <PresetButton active={datePreset === "all"} onClick={() => applyDatePreset("all")}>Todo</PresetButton>
            <PresetButton active={datePreset === "last3m"} onClick={() => applyDatePreset("last3m")}>Últimos 3 meses</PresetButton>
            <PresetButton active={datePreset === "year"} onClick={() => applyDatePreset("year")}>Este año</PresetButton>
            <PresetButton active={datePreset === "custom"} onClick={() => setDatePreset("custom")}>Personalizado</PresetButton>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:w-80">
            <label className="text-sm text-gray-600">
              Desde
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setDatePreset("custom"); }}
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-terracota focus:ring-4 focus:ring-terracota/20"
              />
            </label>
            <label className="text-sm text-gray-600">
              Hasta
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setDatePreset("custom"); }}
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-terracota focus:ring-4 focus:ring-terracota/20"
              />
            </label>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-16 bg-blanco rounded-2xl shadow-lg">
          <div className="text-5xl mb-4 animate-spin">⏳</div>
          <p className="text-gray-600">Calculando reportes...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-5 mb-6">
          ⚠️ {error}
        </div>
      )}

      {!isLoading && report && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <SummaryCard icon="🎵" label="Canciones en banco" value={report.summary.totalSongs} />
            <SummaryCard icon="📅" label="Setlists registrados" value={report.summary.totalSetlists} />
            <SummaryCard icon="⭐" label="Canciones calificadas" value={report.summary.ratedSongs} />
            <SummaryCard icon="📊" label="Promedio general" value={`${report.summary.averageRating.toFixed(1)}/5`} />
          </div>

          {decisionHints.length > 0 && (
            <div className="bg-gradient-to-r from-terracota to-terracota-dark text-white rounded-2xl p-6 shadow-lg mb-8">
              <h2 className="text-xl font-bold mb-4">Ideas rápidas para el próximo domingo</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {decisionHints.map((hint) => (
                  <div key={hint.title} className="bg-white/15 rounded-xl p-4 backdrop-blur-sm">
                    <div className="text-2xl mb-2">{hint.icon}</div>
                    <h3 className="font-bold mb-1">{hint.title}</h3>
                    <p className="text-white/85 text-sm">{hint.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-blanco rounded-2xl shadow-lg overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row gap-3">
              <TabButton active={activeSection === "rated"} onClick={() => setActiveSection("rated")}>
                ⭐ Ranking por calificación
              </TabButton>
              <TabButton active={activeSection === "most"} onClick={() => setActiveSection("most")}>
                🔥 Más tocadas
              </TabButton>
              <TabButton active={activeSection === "least"} onClick={() => setActiveSection("least")}>
                🌱 Menos tocadas
              </TabButton>
            </div>

            <div className="p-6">
              {activeSection === "rated" && (
                <RatedRanking songs={report.topRated} />
              )}
              {activeSection === "most" && (
                <PlayedRanking
                  title="Top 5 canciones más tocadas"
                  description="Útiles cuando necesitas canciones conocidas y seguras para la congregación."
                  songs={report.mostPlayed}
                  maxPlayed={maxPlayed}
                  accent="bg-red-500"
                />
              )}
              {activeSection === "least" && (
                <PlayedRanking
                  title="Top 5 canciones menos tocadas"
                  description="Buenas candidatas para refrescar el repertorio o revisar si deben seguir en el banco."
                  songs={report.leastPlayed}
                  maxPlayed={maxPlayed}
                  accent="bg-green-500"
                />
              )}
            </div>
          </div>
        </>
      )}
    </LayoutDashboard>
  );
}

function SummaryCard({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="bg-blanco rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-200">
      <div className="text-3xl mb-3">{icon}</div>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

function TabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 rounded-xl font-semibold transition-all duration-200 text-left ${
        active
          ? "bg-terracota text-white shadow-md"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

function PresetButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
        active
          ? "bg-terracota text-white shadow-md"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

function RatedRanking({ songs }: { songs: RatedSong[] }) {
  if (songs.length === 0) {
    return (
      <EmptyState
        icon="⭐"
        title="Todavía no hay calificaciones"
        text="Abre un setlist y califica cada canción según la respuesta de la congregación."
      />
    );
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-gray-800">Ranking por calificación</h2>
        <p className="text-gray-600 text-sm">Promedio de estrellas acumulado domingo a domingo.</p>
      </div>
      <div className="space-y-4">
        {songs.map((song, index) => (
          <div key={song.songId} className="group bg-gray-50 border border-gray-200 rounded-2xl p-4 hover:border-terracota/40 hover:shadow-md transition-all duration-200">
            <div className="flex flex-col xl:flex-row xl:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <span className="w-10 h-10 rounded-full bg-terracota text-white font-bold flex items-center justify-center">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-bold text-gray-800 group-hover:text-terracota transition-colors">{song.title}</h3>
                  <p className="text-sm text-gray-600">{song.artist} · Tono {song.key}</p>
                  <p className="text-xs text-gray-500">Última calificación: {formatDate(song.lastRatedAt)}</p>
                </div>
              </div>

              <div className="xl:w-80">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xl tracking-tight">{renderStars(song.averageRating)}</span>
                  <span className="font-bold text-terracota">{song.averageRating.toFixed(1)}/5</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-terracota rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (song.averageRating / 5) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                  <span>{song.ratingCount} calificación{song.ratingCount !== 1 ? "es" : ""}</span>
                  <span>{getRatingLabel(song.averageRating)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayedRanking({
  title,
  description,
  songs,
  maxPlayed,
  accent,
}: {
  title: string;
  description: string;
  songs: PlayedSong[];
  maxPlayed: number;
  accent: string;
}) {
  if (songs.length === 0) {
    return (
      <EmptyState
        icon="🎵"
        title="No hay datos de uso todavía"
        text="Cuando existan setlists con canciones, aquí aparecerán los conteos."
      />
    );
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <p className="text-gray-600 text-sm">{description}</p>
      </div>
      <div className="space-y-4">
        {songs.map((song, index) => (
          <div key={song.songId} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-4 mb-3">
              <span className="w-10 h-10 rounded-full bg-gray-800 text-white font-bold flex items-center justify-center">
                {index + 1}
              </span>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800">{song.title}</h3>
                <p className="text-sm text-gray-600">{song.artist} · Tono {song.key}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-800">{song.timesPlayed}</p>
                <p className="text-xs text-gray-500">vez{song.timesPlayed !== 1 ? "es" : ""}</p>
              </div>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${accent} rounded-full transition-all duration-500`}
                style={{ width: `${Math.max(4, Math.min(100, (song.timesPlayed / maxPlayed) * 100))}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Última vez: {formatDate(song.lastPlayedAt)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="text-center py-14">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-gray-700 mb-2">{title}</h3>
      <p className="text-gray-500">{text}</p>
    </div>
  );
}
