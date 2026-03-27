const FALLBACK_API_URL = 'https://superior-peafowl-andresorganization-15ad7cc7.koyeb.app';

export function getApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!envUrl) return FALLBACK_API_URL;
  return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
}

export type LoginResponse = {
  access_token?: string;
  message?: string;
};

export type Song = {
  _id: string;
  title: string;
  artist: string;
  key: string;
  tags?: string[];
};

export type SongLine = {
  text: string;
  chords: { note: string; index: number }[];
  section?: string;
};

export type SongDetail = Song & {
  youtubeUrl?: string;
  notes?: string;
  lyricsLines: SongLine[];
};

export type SongSearchParams = {
  title?: string;
  artist?: string;
  key?: string;
  tags?: string;
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, init);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText || 'Error no controlado'}`);
  }

  return response.json() as Promise<T>;
}

function buildAuthHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  return requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export async function getSongs(token: string): Promise<Song[]> {
  const data = await requestJson<unknown>('/songs', {
    method: 'GET',
    headers: buildAuthHeaders(token),
  });

  return Array.isArray(data) ? (data as Song[]) : [];
}

export async function searchSongsAdvanced(token: string, params: SongSearchParams): Promise<Song[]> {
  const searchParams = new URLSearchParams();
  if (params.title?.trim()) searchParams.append('title', params.title.trim());
  if (params.artist?.trim()) searchParams.append('artist', params.artist.trim());
  if (params.key?.trim()) searchParams.append('key', params.key.trim());
  if (params.tags?.trim()) searchParams.append('tags', params.tags.trim());
  const query = searchParams.toString();
  const path = query ? `/songs/search/advanced?${query}` : '/songs';

  const data = await requestJson<unknown>(path, {
    method: 'GET',
    headers: buildAuthHeaders(token),
  });

  return Array.isArray(data) ? (data as Song[]) : [];
}

export async function getSongById(token: string, songId: string): Promise<SongDetail> {
  return requestJson<SongDetail>(`/songs/${songId}`, {
    method: 'GET',
    headers: buildAuthHeaders(token),
  });
}

export async function transposeSong(token: string, songId: string, newKey: string): Promise<SongDetail> {
  return requestJson<SongDetail>(`/songs/${songId}/transpose`, {
    method: 'POST',
    headers: buildAuthHeaders(token),
    body: JSON.stringify({ newKey }),
  });
}

export type EventStatus = 'active' | 'archived' | 'draft';

export type SongEvent = {
  _id: string;
  name: string;
  date: string;
  status: EventStatus;
  description?: string;
  directorName?: string;
  setList?: string[];
};

export type SongEventDetail = SongEvent & {
  songs?: SongDetail[];
};

export async function getEvents(token: string): Promise<SongEvent[]> {
  const data = await requestJson<unknown>('/events', {
    method: 'GET',
    headers: buildAuthHeaders(token),
  });
  return Array.isArray(data) ? (data as SongEvent[]) : [];
}

export async function getEventById(token: string, eventId: string): Promise<SongEventDetail> {
  return requestJson<SongEventDetail>(`/events/${eventId}`, {
    method: 'GET',
    headers: buildAuthHeaders(token),
  });
}
