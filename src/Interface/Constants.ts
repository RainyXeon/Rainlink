export enum RainlinkEvents {
  Debug = 'debug',
  NodeConnect = 'nodeConnect',
  NodeDisconnect = 'nodeDisconnect',
  NodeClosed = 'nodeClosed',
  NodeError = 'nodeError',
  PlayerCreate = 'playerCreate',
  PlayerDestroy = 'playerCreate',
}

export enum LavalinkEvents {
  Ready = 'ready',
  Status = 'stats',
  PlayerUpdate = 'playerUpdate',
  TrackStartEvent = 'TrackStartEvent',
  TrackEndEvent = 'TrackEndEvent',
  TrackExceptionEvent = 'TrackExceptionEvent',
  TrackStuckEvent = 'TrackStuckEvent',
  WebSocketClosedEvent = 'WebSocketClosedEvent',
}

export enum RainlinkConnectState {
  Connected,
  Disconnected,
  Closed,
}

export enum VoiceState {
  SESSION_READY,
  SESSION_ID_MISSING,
  SESSION_ENDPOINT_MISSING,
  SESSION_FAILED_UPDATE,
}

export enum VoiceConnectState {
  CONNECTING,
  NEARLY,
  CONNECTED,
  RECONNECTING,
  DISCONNECTING,
  DISCONNECTED,
}

export enum LavalinkLoadType {
  TRACK = 'track',
  PLAYLIST = 'playlist',
  SEARCH = 'search',
  EMPTY = 'empty',
  ERROR = 'error',
}

export const SourceIDs = [
  { name: 'youtube', id: 'yt' },
  { name: 'youtubeMusic', id: 'ytm' },
  { name: 'soundcloud', id: 'sc' },
];

export enum RainlinkPluginType {
  Default = 'default',
  SourceResolver = 'sourceResolver',
}
