import { RawTrack } from './Rest';

export enum LavalinkEventsEnum {
  Ready = 'ready',
  Status = 'stats',
  Event = 'event',
  PlayerUpdate = 'playerUpdate',
}

export enum LavalinkPlayerEventsEnum {
  TrackStartEvent = 'TrackStartEvent',
  TrackEndEvent = 'TrackEndEvent',
  TrackExceptionEvent = 'TrackExceptionEvent',
  TrackStuckEvent = 'TrackStuckEvent',
  WebSocketClosedEvent = 'WebSocketClosedEvent',
}

export type TrackEndReason = 'finished' | 'loadFailed' | 'stopped' | 'replaced' | 'cleanup';

export interface PlayerEvent {
  op: LavalinkEventsEnum.Event;
  type: LavalinkPlayerEventsEnum;
  guildId: string;
}

export interface TrackStartEvent extends PlayerEvent {
  type: LavalinkPlayerEventsEnum.TrackStartEvent;
  track: RawTrack;
}

export interface TrackEndEvent extends PlayerEvent {
  type: LavalinkPlayerEventsEnum.TrackEndEvent;
  track: RawTrack;
  reason: TrackEndReason;
}

export interface TrackStuckEvent extends PlayerEvent {
  type: LavalinkPlayerEventsEnum.TrackStuckEvent;
  track: RawTrack;
  thresholdMs: number;
}

export interface TrackExceptionEvent extends PlayerEvent {
  type: LavalinkPlayerEventsEnum.TrackExceptionEvent;
  exception: Exception;
}

export interface TrackStuckEvent extends PlayerEvent {
  type: LavalinkPlayerEventsEnum.TrackStuckEvent;
  thresholdMs: number;
}

export interface WebSocketClosedEvent extends PlayerEvent {
  type: LavalinkPlayerEventsEnum.WebSocketClosedEvent;
  code: number;
  byRemote: boolean;
  reason: string;
}

export interface PlayerUpdate {
  op: LavalinkEventsEnum.PlayerUpdate;
  state: {
    connected: boolean;
    position?: number;
    time: number;
  };
  guildId: string;
}

export interface Exception {
  message: string;
  severity: Severity;
  cause: string;
}

export type Severity = 'common' | 'suspicious' | 'fault';
