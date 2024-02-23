import { AxiosRequestConfig } from 'axios';
import { FilterOptions } from './Player';
import { LavalinkLoadType } from './Constants';
import { Exception } from './LavalinkEvents';

export interface RainlinkFetcherOptions {
  endpoint: string;
  params?: string | Record<string, string>;
  useSessionId?: boolean;
  requestOptions: AxiosRequestConfig;
}

export interface LavalinkPlayer {
  guildId: string;
  track?: RawTrack;
  volume: number;
  paused: boolean;
  voice: LavalinkPlayerVoice;
  filters: FilterOptions;
}

export interface RawTrack {
  encoded: string;
  info: {
    identifier: string;
    isSeekable: boolean;
    author: string;
    length: number;
    isStream: boolean;
    position: number;
    title: string;
    uri?: string;
    artworkUrl?: string;
    isrc?: string;
    sourceName: string;
  };
  pluginInfo: unknown;
}

export interface LavalinkPlayerVoice {
  token: string;
  endpoint: string;
  sessionId: string;
  connected?: boolean;
  ping?: number;
}

export interface LavalinkPlayerVoiceOptions extends Omit<LavalinkPlayerVoice, 'connected' | 'ping'> {}

export interface LavalinkPlayer {
  guildId: string;
  track?: RawTrack;
  volume: number;
  paused: boolean;
  voice: LavalinkPlayerVoice;
  filters: FilterOptions;
}

export interface UpdatePlayerOptions {
  encodedTrack?: string | null;
  identifier?: string;
  position?: number;
  endTime?: number;
  volume?: number;
  paused?: boolean;
  filters?: FilterOptions;
  voice?: LavalinkPlayerVoiceOptions;
}

export interface UpdatePlayerInfo {
  guildId: string;
  playerOptions: UpdatePlayerOptions;
  noReplace?: boolean;
}

export interface TrackResult {
  loadType: LavalinkLoadType.TRACK;
  data: RawTrack;
}

export interface PlaylistResult {
  loadType: LavalinkLoadType.PLAYLIST;
  data: Playlist;
}

export interface SearchResult {
  loadType: LavalinkLoadType.SEARCH;
  data: RawTrack[];
}

export interface EmptyResult {
  loadType: LavalinkLoadType.EMPTY;
  data: {};
}

export interface ErrorResult {
  loadType: LavalinkLoadType.ERROR;
  data: Exception;
}

export interface Playlist {
  encoded: string;
  info: {
    name: string;
    selectedTrack: number;
  };
  pluginInfo: unknown;
  tracks: RawTrack[];
}

export type LavalinkResponse = TrackResult | PlaylistResult | SearchResult | EmptyResult | ErrorResult;
