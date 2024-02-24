import { RawTrack } from './Rest';

/**
 * Lavalink events enum
 */
export enum LavalinkEventsEnum {
  Ready = 'ready',
  Status = 'stats',
  Event = 'event',
  PlayerUpdate = 'playerUpdate',
}

/**
 * Lavalink player events enum
 */
export enum LavalinkPlayerEventsEnum {
  TrackStartEvent = 'TrackStartEvent',
  TrackEndEvent = 'TrackEndEvent',
  TrackExceptionEvent = 'TrackExceptionEvent',
  TrackStuckEvent = 'TrackStuckEvent',
  WebSocketClosedEvent = 'WebSocketClosedEvent',
}

/**
 * Reason why track end
 */
export type TrackEndReason = 'finished' | 'loadFailed' | 'stopped' | 'replaced' | 'cleanup';

/**
 * Main interface of player events
 */
export interface PlayerEvent {
  op: LavalinkEventsEnum.Event;
  type: LavalinkPlayerEventsEnum;
  guildId: string;
}

/**
 * Whenever lavalink player start
 */
export interface TrackStartEvent extends PlayerEvent {
  type: LavalinkPlayerEventsEnum.TrackStartEvent;
  track: RawTrack;
}

/**
 * Whenever lavalink player end
 */
export interface TrackEndEvent extends PlayerEvent {
  type: LavalinkPlayerEventsEnum.TrackEndEvent;
  track: RawTrack;
  reason: TrackEndReason;
}

/**
 * Whenever lavalink player stuck
 */
export interface TrackStuckEvent extends PlayerEvent {
  type: LavalinkPlayerEventsEnum.TrackStuckEvent;
  track: RawTrack;
  thresholdMs: number;
}

/**
 * Whenever lavalink player have exception
 */
export interface TrackExceptionEvent extends PlayerEvent {
  type: LavalinkPlayerEventsEnum.TrackExceptionEvent;
  exception: Exception;
}

/**
 * Whenever lavalink player closed the websocket
 */
export interface WebSocketClosedEvent extends PlayerEvent {
  type: LavalinkPlayerEventsEnum.WebSocketClosedEvent;
  code: number;
  byRemote: boolean;
  reason: string;
}

/**
 * Whenever lavalink player update some info
 */
export interface PlayerUpdate {
  op: LavalinkEventsEnum.PlayerUpdate;
  state: {
    connected: boolean;
    position?: number;
    time: number;
  };
  guildId: string;
}

/**
 * Exception interface
 */
export interface Exception {
  message: string;
  severity: Severity;
  cause: string;
}

/**
 * Exception severity interface
 */
export type Severity = 'common' | 'suspicious' | 'fault';
