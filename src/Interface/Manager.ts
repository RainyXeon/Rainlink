import { AbstractLibrary } from '../Library/AbstractLibrary';
import { RainlinkPlugin } from '../Plugin/RainlinkPlugin';
import { RainlinkTrack } from '../Player/RainlinkTrack';
import { RainlinkVoiceManager } from '../Manager/RainlinkVoiceManager';
import { RainlinkNodeManager } from '../Manager/RainlinkNodeManager';
import { RainlinkNode } from '../Node/RainlinkNode';
import { RainlinkRest } from '../Node/RainlinkRest';
import { RainlinkPlayer } from '../Player/RainlinkPlayer';

export type Constructor<T> = new (...args: any[]) => T;

export interface Structures {
  /**
   * A custom structure that extends the RainlinkRest class
   */
  rest?: Constructor<RainlinkRest>;
  /**
   * A custom structure that extends the RainlinkPlayer class
   */
  player?: Constructor<RainlinkPlayer>;
}

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
  /** Timeout before trying to reconnect */
  retryTimeout?: number;
  /** Number of times to try and reconnect to Lavalink before giving up */
  retryCount?: number;
  /** The retry timeout for voice manager when dealing connection to discord voice server (ms) */
  voiceConnectionTimeout?: number;
  /** The default search engine like default search from youtube, spotify,... */
  defaultSearchEngine?: string;
  /** The default volume when create a player */
  defaultVolume?: number;
  /** Search track from youtube when track resolve failed */
  searchFallback?: boolean;
  /** Whether to resume a connection on disconnect to Lavalink (Server Side) (Note: DOES NOT RESUME WHEN THE LAVALINK SERVER DIES) */
  resume?: boolean;
  /** User Agent to use when making requests to Lavalink */
  userAgent?: string;
  /** Node Resolver to use if you want to customize it */
  nodeResolver?: (
    nodes: RainlinkNodeManager,
    voiceManager?: RainlinkVoiceManager,
  ) => RainlinkNode | undefined;
  /** Custom structures for rainlink to use */
  structures?: Structures;
  /** Time to wait for a response from the Lavalink REST API before giving up */
  restTimeout?: number;
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
  TRACK = 'TRACK',
  PLAYLIST = 'PLAYLIST',
  SEARCH = 'SEARCH',
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
