export type DrawerParamList = {
  SongsStack: undefined;
  EventsStack: undefined;
};

export type SongsStackParamList = {
  Songs: undefined;
  SongDetail: { songId: string };
};

export type EventsStackParamList = {
  Events: undefined;
  EventDetail: { eventId: string; eventName: string };
};
