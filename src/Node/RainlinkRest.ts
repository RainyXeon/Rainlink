// Modded from: https://github.com/shipgirlproject/Shoukaku/blob/396aa531096eda327ade0f473f9807576e9ae9df/src/connectors/Connector.ts
// Special thanks to shipgirlproject team!

import undici from 'undici';
import { RainlinkNodeOptions } from '../Interface/Manager';
import { RainlinkManager } from '../Manager/RainlinkManager';
import { metadata } from '../manifest';
import { RainlinkEvents } from '../Interface/Constants';
import { FilterOptions } from '../Interface/Player';
import { RainlinkNode } from './RainlinkNode';
import { UndiciRequestOptions } from '../Interface/UndiciRequestOptions';

export interface RainlinkFetcherOptions {
  endpoint: string;
  params?: string | Record<string, string>;
  useSessionId: boolean;
  requestOptions: UndiciRequestOptions;
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

export interface LavalinkPlayerVoiceOptions
  extends Omit<LavalinkPlayerVoice, 'connected' | 'ping'> {}

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
      ...options.requestOptions.headers,
    };

    const res = await undici.request(url, { headers });
    if (res.statusCode == 204) {
      this.debug('Player now destroyed');
      return undefined;
    }
    if (res.statusCode !== 200) {
      this.debug(
        'Something went wrong with lavalink server.' +
          `Status code: ${res.statusCode}`,
      );
      return undefined;
    }
    return res.body.json() as D;
  }

  /**
   * Gets all the player with the specified sessionId
   * @returns Promise that resolves to an array of Lavalink players
   */
  public async getPlayers(): Promise<LavalinkPlayer[]> {
    const options: RainlinkFetcherOptions = {
      endpoint: `/sessions/${this.sessionId}/players`,
      params: undefined,
      useSessionId: true,
      requestOptions: {
        method: 'GET',
      },
    };
    return (await this.fetcher<LavalinkPlayer[]>(options)) ?? [];
  }

  /**
   * Updates a Lavalink player
   * @param data SessionId from Discord
   * @returns Promise that resolves to a Lavalink player
   */
  public updatePlayer(
    data: UpdatePlayerInfo,
  ): Promise<LavalinkPlayer | undefined> {
    const options: RainlinkFetcherOptions = {
      endpoint: `/sessions/${this.sessionId}/players/${data.guildId}`,
      params: { noReplace: data.noReplace?.toString() || 'false' },
      useSessionId: true,
      requestOptions: {
        method: 'PATCH',
      },
    };
    return this.fetcher<LavalinkPlayer>(options);
  }

  public destroyPlayer(guildId: string) {
    const options: RainlinkFetcherOptions = {
      endpoint: `/sessions/${this.sessionId}/players/${guildId}`,
      params: undefined,
      useSessionId: true,
      requestOptions: {
        method: 'DELETE',
      },
    };
    return this.fetcher(options);
  }

  private debug(logs: string) {
    this.manager.emit(RainlinkEvents.Debug, `[Rainlink Rest] ${logs}`);
  }
}
