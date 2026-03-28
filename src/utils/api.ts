// Función para obtener el token del localStorage
const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Función para obtener los headers con autenticación
const getAuthHeaders = (): Record<string, string> => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

export const registerUser = async (data: { name: string; email: string; password: string; roleId: string }) => {
  const res = await fetch(`/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const loginUser = async (data: { email: string; password: string }) => {
  const res = await fetch(`/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return await res.json();
};

export const getRoles = async () => {
  const res = await fetch(`/api/roles`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  console.log("getRoles response:", data);
  console.log("Response status:", res.status);
  return data;
};

export const getUsers = async () => {
  const res = await fetch(`/api/users`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return await res.json();
};

export const getDirectors = async () => {
  const res = await fetch(`/api/users/directors`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return await res.json();
};

export const getSetLists = async () => {
  const res = await fetch(`/api/sets`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return await res.json();
};

export const createEvent = async (data: {
  name: string;
  date: string;
  status: "active" | "archived" | "draft";
  setList?: string[];
  directorName?: string;
  directorId?: string;
  setId?: string;
  description: string;
}) => {
  const res = await fetch(`/api/events`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return await res.json();
};

export const getEvents = async () => {
  const res = await fetch(`/api/events`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return await res.json();
};

export const getEvent = async (id: string) => {
  const res = await fetch(`/api/events/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return await res.json();
};

export const updateEvent = async (id: string, data: {
  name: string;
  date: string;
  status: "active" | "archived" | "draft";
  setList?: string[];
  directorName?: string;
  directorId?: string;
  setId?: string;
  description: string;
}) => {
  const res = await fetch(`/api/events/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  }).then(res => {
    console.log("updateEvent response:", res);
    return res.json();
  });
  return res;
};

export const getSong = async (id: string) => {
  const res = await fetch(`/api/songs/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return await res.json();
};

export type SearchSongsParams = {
  title?: string;
  artist?: string;
  key?: string;
  tags?: string;
};

export const searchSongsAdvanced = async (params: SearchSongsParams) => {
  const searchParams = new URLSearchParams();
  if (params.title?.trim()) searchParams.append('title', params.title.trim());
  if (params.artist?.trim()) searchParams.append('artist', params.artist.trim());
  if (params.key?.trim()) searchParams.append('key', params.key.trim());
  if (params.tags?.trim()) searchParams.append('tags', params.tags.trim());
  const query = searchParams.toString();
  const url = query ? `/api/songs/search/advanced?${query}` : '/api/songs';
  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return await res.json();
};

export const transposeSong = async (id: string, newKey: string) => {
  const res = await fetch(`/api/songs/${id}/transpose`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ newKey }),
  });
  return await res.json();
};

export const createSong = async (data: {
  title: string;
  artist: string;
  key: string;
  lyricsLines: {
    text: string;
    chords: { note: string; index: number }[];
  }[];
  notes?: string;
  tags?: string[];
}) => {
  const res = await fetch(`/api/songs`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return await res.json();
};

export const updateSong = async (id: string, data: {
  title: string;
  artist: string;
  key: string;
  lyricsLines: {
    text: string;
    chords: { note: string; index: number }[];
  }[];
  notes?: string;
  tags?: string[];
}) => {
  const res = await fetch(`/api/songs/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return await res.json();
};

export const createSongChordPro = async (
  chordProText: string,
  options?: { tags?: string[]; youtubeUrl?: string }
) => {
  const body: { chordProText: string; tags?: string[]; youtubeUrl?: string } = { chordProText };
  if (options?.tags?.length) body.tags = options.tags;
  if (options?.youtubeUrl?.trim()) body.youtubeUrl = options.youtubeUrl.trim();
  const res = await fetch(`/api/songs/chordpro`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return await res.json();
};

export const updateSongChordPro = async (
  id: string,
  chordProText: string,
  options?: { tags?: string[]; youtubeUrl?: string }
) => {
  const body: { chordProText: string; tags?: string[]; youtubeUrl?: string } = { chordProText };
  if (options?.tags?.length) body.tags = options.tags;
  if (options?.youtubeUrl !== undefined) body.youtubeUrl = options.youtubeUrl?.trim() || undefined;
  const res = await fetch(`/api/songs/${id}/chordpro`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return await res.json();
};

// Función para guardar el token en localStorage
export const archiveEvent = async (id: string) => {
  const res = await fetch(`/api/events/${id}/archive`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  return res.json();
};

export const sendPushNotification = async (title: string, body: string) => {
  const res = await fetch(`/api/events/notifications/send`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ title, body }),
  });
  return res.json();
};

export const setToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
};

// Función para limpiar el token (logout)
export const clearToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
};

// Función para verificar si el usuario está autenticado
export const isAuthenticated = (): boolean => {
  return getToken() !== null;
};
