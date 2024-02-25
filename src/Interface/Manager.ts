import { AbstractLibrary } from '../Library/AbstractLibrary';
import { RainlinkPlugin } from '../Plugin/RainlinkPlugin';
import { RainlinkTrack } from '../Player/RainlinkTrack';

/**
 * Rainlink node option interface
 */
export interface RainlinkNodeOptions {
  /** Name for get the lavalink server info in rainlink */
  name: string;
  /** The ip address or domain of lavalink server */
  host: string;
  /** The port that lavalink server exposed */
  port: number;
  /** The password of lavalink server */
  auth: string;
  /** Whenever lavalink user ssl or not */
  secure: boolean;
}

/**
 * Some rainlink additional config option
 */
export interface RainlinkAdditionalOptions {
  /** The retry timeout for websocket when dealing connection to lavalink websocket server (ms) */
  retryTimeout: number;
  /** Number of retries for websocket when dealing connection to lavalink websocket server */
  retryCount: number;
  /** The retry timeout for voice mânger when dealing connection to discord voice server (ms) */
  voiceConnectionTimeout: number;
  /** The default search engine like default search from youtube, spotify,... */
  defaultSearchEngine?: string;
  /** The default volume when create a player */
  defaultVolume?: number;
  /** Search track from youtube when track resolve failed */
  searchFallback?: boolean;
}

/**
 * Rainlink config interface
 */
export interface RainlinkOptions {
  /** The lavalink server credentials array*/
  nodes: RainlinkNodeOptions[];
  /** Rainlink additional options  */
  options: RainlinkAdditionalOptions;
  /** The discord library for using voice manager, example: discordjs, erisjs */
  library: AbstractLibrary;
  /** The rainlink plugins arrray */
  plugins: RainlinkPlugin[];
}

/**
 * The type enum of rainlink search function result
 */
export enum RainlinkSearchResultType {
  TRACK,
  PLAYLIST,
  SEARCH,
}

/**
 * The rainlink search function result interface
 */
export interface RainlinkSearchResult {
  type: RainlinkSearchResultType;
  playlistName?: string;
  tracks: RainlinkTrack[];
}

/**
 * The rainlink search function options interface
 */
export interface RainlinkSearchOptions {
  /** User info of who request the song */
  requester?: unknown;
  /** Which node do user want to use (get using node name) */
  nodeName?: string;
  /** Which search engine do user want to use (get using search engine name) */
  engine?: string;
}
