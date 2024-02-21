import undici from 'undici';
import { RainlinkNodeOptions } from '../Interface/Manager';
import { RainlinkManager } from '../Manager/RainlinkManager';
import { metadata } from '../manifest';
import { RainlinkEvents } from '../Interface/Constants';
import { FilterOptions } from '../Interface/Player';
import { RainlinkNode } from './RainlinkNode';

export interface RainlinkFetcherOptions {
  endpoint: string;
  params?: string;
  useSessionId: boolean;
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

export class RainlinkRest {
  protected undici: typeof undici;
  public manager: RainlinkManager;
  public node: RainlinkNodeOptions;
  public url: string;
  public nodeManager: RainlinkNode;
  protected sessionId: string | null;

  constructor(
    manager: RainlinkManager,
    node: RainlinkNodeOptions,
    nodeManager: RainlinkNode,
  ) {
    this.manager = manager;
    this.undici = undici;
    this.node = node;
    this.nodeManager = nodeManager;
    this.sessionId = this.nodeManager.sessionId;
    this.url = `${node.secure ? 'https://' : 'http://'}${node.host}:${node.port}/v${metadata.lavalink}`;
  }

  async fetcher<D = any>(
    options: RainlinkFetcherOptions,
  ): Promise<D | undefined> {
    if (options.useSessionId && this.sessionId == null)
      throw new Error(
        'sessionId not initalized! Please wait for lavalink get connected!',
      );
    const url = new URL(`${this.url}${options.endpoint}`);
    if (options.params)
      url.search = new URLSearchParams(options.params).toString();

    const headers = {
      Authorization: this.node.auth,
    };

    const res = await undici.fetch(url, { headers });
    if (res.status !== 200) {
      this.manager.emit(
        RainlinkEvents.Debug,
        '[Rainlink] Something went wrong with lavalink server',
      );
      return undefined;
    }
    return res.json() as D;
  }

  /**
   * Gets all the player with the specified sessionId
   * @returns Promise that resolves to an array of Lavalink players
   */
  public async getPlayers(): Promise<LavalinkPlayer[]> {
    const options = {
      endpoint: `/sessions/${this.sessionId}/players`,
      params: undefined,
      useSessionId: true,
    };
    return (await this.fetcher<LavalinkPlayer[]>(options)) ?? [];
  }
}
