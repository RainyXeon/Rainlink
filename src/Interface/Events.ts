export enum RainlinkEvents {
  Debug = 'debug',
  NodeConnect = 'nodeConnect',
  NodeDisconnect = 'nodeDisconnect',
  NodeClosed = 'nodeClosed',
  NodeError = 'nodeError',
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
