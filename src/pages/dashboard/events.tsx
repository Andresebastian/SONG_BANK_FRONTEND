import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import LayoutDashboard from "../../components/LayoutDashboard";
import EventModal from "../../components/eventModal";
import { getEvents, archiveEvent, sendPushNotification } from "../../utils/api";

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

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);

  // Obtener token del localStorage solo en el cliente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem("token"));
    }
  }, []);

  const loadEvents = useCallback(async () => {
    if (!token) return; // No cargar si no hay token
    
    try {
      const data = await getEvents();
      setEvents(data);
    } catch (error) {
      console.error("Error loading events:", error);
      // Fallback to direct fetch if API fails
      fetch(`/api/events`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then(setEvents)
        .catch(console.error);
    }
  }, [token]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const openModal = (mode: "create" | "edit" | "view", event?: Event) => {
    setModalMode(mode);
    setSelectedEvent(event || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
    setModalMode("create");
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

  const handleArchive = async (eventId: string) => {
    if (!confirm('¿Archivar este evento? Quedará inactivo.')) return;
    setArchivingId(eventId);
    try {
      await archiveEvent(eventId);
      await loadEvents();
    } finally {
      setArchivingId(null);
    }
  };

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) return;
    setSendingNotif(true);
    try {
      const res = await sendPushNotification(notifTitle.trim(), notifBody.trim());
      alert(`✅ Notificación enviada a ${res.sent ?? 0} dispositivo(s)`);
      setShowNotifModal(false);
      setNotifTitle('');
      setNotifBody('');
    } catch {
      alert('Error al enviar la notificación');
    } finally {
      setSendingNotif(false);
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

  return (
    <LayoutDashboard>
      {/* Header con título y botón de acción */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Gestión de Eventos</h1>
          <p className="text-gray-600">Organiza y administra los eventos de la iglesia</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            className="bg-gray-100 text-gray-700 px-5 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200 border border-gray-200"
            onClick={() => setShowNotifModal(true)}
          >
            📣 Enviar mensaje
          </button>
          {events.length > 0 && (
            <button
              className="bg-terracota text-blanco px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-terracota-dark transform hover:scale-105 transition-all duration-200"
              onClick={() => openModal("create")}
            >
              ➕ Crear Nuevo Evento
            </button>
          )}
        </div>
      </div>

      {/* Grid de eventos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {events.map((event) => (
          <div
            key={event._id}
            className="bg-blanco rounded-2xl p-6 shadow-lg transition-all duration-200 hover:shadow-xl hover:ring-2 hover:ring-terracota/20 transform hover:scale-105"
          >
            {/* Header del evento */}
            <div className="mb-4">
              <div className="flex items-start justify-between mb-2">
                <h2 className="font-bold text-xl text-gray-800 line-clamp-2">{event.name}</h2>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(event.status)}`}>
                  {getStatusIcon(event.status)} {event.status}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center text-gray-600">
                  <span className="mr-2">📅</span>
                  <span>{new Date(event.date).toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <span className="mr-2">👨‍🎤</span>
                  <span>{event.directorName}</span>
                </div>
                
                <div className="flex items-center text-terracota font-medium">
                  <span className="mr-2">🎵</span>
                  <span>{event.setId?.songs?.length || 0} canción{(event.setId?.songs?.length || 0) !== 1 ? 'es' : ''} en el setlist</span>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2 flex-wrap">
              <button
                className="flex-1 bg-terracota text-blanco py-2 px-4 rounded-xl font-medium hover:bg-terracota-dark transition-all duration-200"
                onClick={() => router.push(`/dashboard/events/${event._id}`)}
              >
                👁️ Ver
              </button>
              <button
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200"
                onClick={() => openModal("edit", event)}
              >
                ✏️ Editar
              </button>
              {event.status !== 'archived' && (
                <button
                  className="bg-gray-100 text-gray-500 py-2 px-3 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200 disabled:opacity-50"
                  onClick={() => handleArchive(event._id)}
                  disabled={archivingId === event._id}
                  title="Archivar evento"
                >
                  {archivingId === event._id ? '⏳' : '📁'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Mensaje cuando no hay eventos */}
      {events.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No hay eventos creados</h3>
          <p className="text-gray-500 mb-6">Crea tu primer evento para comenzar a organizar los servicios</p>
          <button
            className="bg-terracota text-blanco px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-terracota-dark transform hover:scale-105 transition-all duration-200"
            onClick={() => openModal("create")}
          >
            ➕ Crear Primer Evento
          </button>
        </div>
      )}

      {/* Modal de notificación personalizada */}
      {showNotifModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-1">📣 Enviar mensaje push</h3>
            <p className="text-sm text-gray-500 mb-5">Se enviará a todos los músicos con la app instalada</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="Ej: Recordatorio de ensayo"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-terracota/30"
                  maxLength={60}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{notifTitle.length}/60</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Mensaje</label>
                <textarea
                  value={notifBody}
                  onChange={(e) => setNotifBody(e.target.value)}
                  placeholder="Ej: El ensayo de hoy es a las 7pm. ¡No faltes!"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-terracota/30 resize-none"
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{notifBody.length}/200</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowNotifModal(false); setNotifTitle(''); setNotifBody(''); }}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-all"
                disabled={sendingNotif}
              >
                Cancelar
              </button>
              <button
                onClick={handleSendNotification}
                disabled={sendingNotif || !notifTitle.trim() || !notifBody.trim()}
                className="flex-1 bg-terracota text-white py-2.5 rounded-xl font-semibold hover:bg-terracota-dark transition-all disabled:opacity-50"
              >
                {sendingNotif ? '⏳ Enviando...' : '📤 Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <EventModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={() => {
          loadEvents();
        }}
        event={selectedEvent}
        mode={modalMode}
      />
    </LayoutDashboard>
  );
}
