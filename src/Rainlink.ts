import {
  RainlinkOptions,
  RainlinkSearchResult,
  RainlinkSearchResultType,
} from './Interface/Manager';
import { EventEmitter } from 'events';
import { RainlinkNode } from './Node/RainlinkNode';
import { RainlinkConnection } from './Player/RainlinkConnection';
import { AbstractLibrary } from './Library/AbstractLibrary';
import { VoiceChannelOptions } from './Interface/Player';
import { RainlinkPlayerManager } from './Manager/RainlinkPlayerManager';
import { RainlinkNodeManager } from './Manager/RainlinkNodeManager';
import {
  LavalinkLoadType,
  RainlinkEvents,
  SourceIDs,
} from './Interface/Constants';
import { RainlinkTrack } from './Utilities/RainlinkTrack';
import { RawTrack } from './Interface/Rest';
import { RainlinkPlayer } from './Player/RainlinkPlayer';

export declare interface Rainlink {
  on(event: 'debug', listener: (logs: string) => void): this;
  // Node events
  on(event: 'nodeConnect', listener: (node: RainlinkNode) => void): this;
  on(
    event: 'nodeDisconnect',
    listener: (node: RainlinkNode, code: number, reason: Buffer) => void,
  ): this;
  on(event: 'nodeClosed', listener: (node: RainlinkNode) => void): this;
  on(
    event: 'nodeError',
    listener: (node: RainlinkNode, error: Error) => void,
  ): this;
  // Player events
  on(event: 'playerCreate', listener: (player: RainlinkPlayer) => void): this;
  on(event: 'playerDestroy', listener: (player: RainlinkPlayer) => void): this;
}

export interface RainlinkSearchOptions {
  requester: unknown;
  nodeName?: string;
  engines?: string;
}

export class Rainlink extends EventEmitter {
  /**
   * Discord library connector
   */
  public readonly library: AbstractLibrary;
  /**
   * Voice connections being handled
   */
  public readonly connections: Map<string, RainlinkConnection>;
  /**
   * Lavalink server that has been configured
   */
  public nodes: RainlinkNodeManager;
  /**
   * Rainlink options
   */
  public options: RainlinkOptions;
  /**
   * Bot id
   */
  public id: string | undefined;
  /**
   * Player maps
   */
  public players: RainlinkPlayerManager;
  /**
   * All search engine
   */
  protected searchEngines: Map<string, string>;

  constructor(options: RainlinkOptions) {
    super();
    if (!options.library)
      throw new Error(
        'Please set an new lib to connect, example: \nlibrary: new Library.DiscordJS(client) ',
      );
    this.library = options.library.set(this);
    this.options = options;
    this.connections = new Map();
    this.nodes = new RainlinkNodeManager(this);
    this.library.listen(this.options.nodes);
    this.players = new RainlinkPlayerManager(this, this.connections);
    this.searchEngines = new Map<string, string>();
  }

  protected initialSearchEngines() {
    for (const data of SourceIDs) {
      this.searchEngines.set(data.name, data.id);
    }
  }

  /**
   * Create a new player.
   * @returns RainlinkNode
   */
  async create(options: VoiceChannelOptions) {
    this.players.create(options);
  }

  /**
   * Destroy a specific player.
   * @returns RainlinkNode
   */
  async destroy(guildId: string) {
    this.players.destroy(guildId);
  }

  /**
   * Search a specific track.
   * @returns RainlinkSearchResult
   */
  async search(query: string, options: RainlinkSearchOptions) {
    const node = options?.nodeName
      ? this.nodes.get(options.nodeName) ??
        (await this.nodes.getLeastUsedNode())
      : await this.nodes.getLeastUsedNode();

    if (!node) throw new Error('No node is available');

    const source = options.engines
      ? this.searchEngines.get(options.engines)
      : this.searchEngines.get(
          this.options.options.defaultSearchEngine
            ? this.options.options.defaultSearchEngine
            : 'youtube',
        );

    const isUrl = /^https?:\/\/.*/.test(query);

    const finalQuery = !isUrl ? `${source}search:${query}` : query;

    const result = await node.rest.resolver(finalQuery).catch(_ => null);
    if (!result || result.loadType === LavalinkLoadType.EMPTY)
      return this.buildSearch(undefined, [], RainlinkSearchResultType.SEARCH);

    let loadType: RainlinkSearchResultType;
    let normalizedData: {
      playlistName?: string;
      tracks: RawTrack[];
    } = { tracks: [] };
    switch (result.loadType) {
      case LavalinkLoadType.TRACK: {
        loadType = RainlinkSearchResultType.TRACK;
        normalizedData.tracks = [result.data];
        break;
      }

      case LavalinkLoadType.PLAYLIST: {
        loadType = RainlinkSearchResultType.PLAYLIST;
        normalizedData = {
          playlistName: result.data.info.name,
          tracks: result.data.tracks,
        };
        break;
      }

      case LavalinkLoadType.SEARCH: {
        loadType = RainlinkSearchResultType.SEARCH;
        normalizedData.tracks = result.data;
        break;
      }

      default: {
        loadType = RainlinkSearchResultType.SEARCH;
        normalizedData.tracks = [];
        break;
      }
    }

    this.debug(
      `Searched ${query}; Track results: ${normalizedData.tracks.length}`,
    );

    return this.buildSearch(
      normalizedData.playlistName ?? undefined,
      normalizedData.tracks.map(
        track => new RainlinkTrack(track, options?.requester),
      ),
      loadType,
    );
  }

  private buildSearch(
    playlistName?: string,
    tracks: RainlinkTrack[] = [],
    type?: RainlinkSearchResultType,
  ): RainlinkSearchResult {
    return {
      playlistName,
      tracks,
      type: type ?? RainlinkSearchResultType.SEARCH,
    };
  }

  private debug(logs: string) {
    this.emit(RainlinkEvents.Debug, `[Rainlink]: ${logs}`);
  }
}
