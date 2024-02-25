import {
  RainlinkOptions,
  RainlinkSearchOptions,
  RainlinkSearchResult,
  RainlinkSearchResultType,
} from './Interface/Manager';
import { EventEmitter } from 'events';
import { RainlinkNode } from './Node/RainlinkNode';
import { RainlinkVoiceManager } from './Manager/RainlinkVoiceManager';
import { AbstractLibrary } from './Library/AbstractLibrary';
import { VoiceChannelOptions } from './Interface/Player';
import { RainlinkPlayerManager } from './Manager/RainlinkPlayerManager';
import { RainlinkNodeManager } from './Manager/RainlinkNodeManager';
import { LavalinkLoadType, RainlinkEvents, RainlinkPluginType, SourceIDs } from './Interface/Constants';
import { RainlinkTrack } from './Player/RainlinkTrack';
import { RawTrack } from './Interface/Rest';
import { RainlinkPlayer } from './Player/RainlinkPlayer';
import { SourceRainlinkPlugin } from './Plugin/SourceRainlinkPlugin';
import { RainlinkQueue } from './Player/RainlinkQueue';
import {
  PlayerUpdate,
  TrackExceptionEvent,
  TrackStuckEvent,
  WebSocketClosedEvent,
} from './Interface/LavalinkEvents';

export declare interface Rainlink {
  /* tslint:disable:unified-signatures */
  // ------------------------- ON EVENT ------------------------- //
  /**
   * Emitted when rainlink have a debug log.
   * @event Kazagumo#playerCreate
   */
  on(event: 'debug', listener: (logs: string) => void): this;
  /**
   * Emitted when a lavalink server is connected.
   * @event Kazagumo#playerCreate
   */
  on(event: 'nodeConnect', listener: (node: RainlinkNode) => void): this;
  /**
   * Emitted when a lavalink server is disconnected.
   * @event Kazagumo#playerCreate
   */
  on(event: 'nodeDisconnect', listener: (node: RainlinkNode, code: number, reason: Buffer) => void): this;
  /**
   * Emitted when a lavalink server is closed.
   * @event Kazagumo#playerCreate
   */
  on(event: 'nodeClosed', listener: (node: RainlinkNode) => void): this;
  /**
   * Emitted when a lavalink server is errored.
   * @event Kazagumo#playerCreate
   */
  on(event: 'nodeError', listener: (node: RainlinkNode, error: Error) => void): this;
  /**
   * Emitted when a player is created.
   * @event Kazagumo#playerCreate
   */
  on(event: 'playerCreate', listener: (player: RainlinkPlayer, track: RainlinkTrack) => void): this;
  /**
   * Emitted when a track is going to end.
   * @event Kazagumo#playerEnd
   */
  on(event: 'playerEnd', listener: (player: RainlinkPlayer) => void): this;
  /**
   * Emitted when a track is going to play.
   * @event Kazagumo#playerStart
   */
  on(event: 'playerStart', listener: (player: RainlinkPlayer, track: RainlinkTrack) => void): this;
  /**
   * Emitted when a player is going to destroyed.
   * @event Kazagumo#playerDestroy
   */
  on(event: 'playerDestroy', listener: (player: RainlinkPlayer) => void): this;
  /**
   * Emitted when a track is failed to resolve using fallback search engine.
   * @event Kazagumo#playerResolveError
   */
  on(
    event: 'playerResolveError',
    listener: (player: RainlinkPlayer, track: RainlinkTrack, message: string) => void,
  ): this;
  /**
   * Emitted when a player have an empty queue.
   * @event Kazagumo#playerEmpty
   */
  on(event: 'playerEmpty', listener: (player: RainlinkPlayer) => void): this;
  /**
   * Emitted when a player have an exception.
   * @event Kazagumo#playerException
   */
  on(event: 'playerException', listener: (player: RainlinkPlayer, data: TrackExceptionEvent) => void): this;
  /**
   * Emitted when a player updated info.
   * @event Kazagumo#playerUpdate
   */
  on(event: 'playerUpdate', listener: (player: RainlinkPlayer, data: PlayerUpdate) => void): this;
  /**
   * Emitted when a track stucked.
   * @event Kazagumo#playerStuck
   */
  on(event: 'playerStuck', listener: (player: RainlinkPlayer, data: TrackStuckEvent) => void): this;
  /**
   * Emitted when a player's websocket closed.
   * @event Kazagumo#playerWebsocketClosed
   */
  on(
    event: 'playerWebsocketClosed',
    listener: (player: RainlinkPlayer, data: WebSocketClosedEvent) => void,
  ): this;
  /**
   * Emitted when a queue updated.
   * @event Kazagumo#queueUpdate
   */
  on(event: 'queueUpdate', listener: (player: RainlinkPlayer, queue: RainlinkQueue) => void): this;
  // ------------------------- ON EVENT ------------------------- //

  // ------------------------- ONCE EVENT ------------------------- //
  once(event: 'debug', listener: (logs: string) => void): this;
  once(event: 'nodeConnect', listener: (node: RainlinkNode) => void): this;
  once(event: 'nodeDisconnect', listener: (node: RainlinkNode, code: number, reason: Buffer) => void): this;
  once(event: 'nodeClosed', listener: (node: RainlinkNode) => void): this;
  once(event: 'nodeError', listener: (node: RainlinkNode, error: Error) => void): this;
  once(event: 'playerCreate', listener: (player: RainlinkPlayer, track: RainlinkTrack) => void): this;
  once(event: 'playerEnd', listener: (player: RainlinkPlayer) => void): this;
  once(event: 'playerStart', listener: (player: RainlinkPlayer, track: RainlinkTrack) => void): this;
  once(event: 'playerDestroy', listener: (player: RainlinkPlayer) => void): this;
  once(
    event: 'playerResolveError',
    listener: (player: RainlinkPlayer, track: RainlinkTrack, message: string) => void,
  ): this;
  once(event: 'playerEmpty', listener: (player: RainlinkPlayer) => void): this;
  once(event: 'playerException', listener: (player: RainlinkPlayer, data: TrackExceptionEvent) => void): this;
  once(event: 'playerUpdate', listener: (player: RainlinkPlayer, data: PlayerUpdate) => void): this;
  once(event: 'playerStuck', listener: (player: RainlinkPlayer, data: TrackStuckEvent) => void): this;
  once(
    event: 'playerWebsocketClosed',
    listener: (player: RainlinkPlayer, data: WebSocketClosedEvent) => void,
  ): this;
  once(event: 'queueUpdate', listener: (player: RainlinkPlayer, queue: RainlinkQueue) => void): this;
  // ------------------------- ONCE EVENT ------------------------- //

  // ------------------------- OFF EVENT ------------------------- //
  off(event: 'debug', listener: (logs: string) => void): this;
  off(event: 'nodeConnect', listener: (node: RainlinkNode) => void): this;
  off(event: 'nodeDisconnect', listener: (node: RainlinkNode, code: number, reason: Buffer) => void): this;
  off(event: 'nodeClosed', listener: (node: RainlinkNode) => void): this;
  off(event: 'nodeError', listener: (node: RainlinkNode, error: Error) => void): this;
  off(event: 'playerCreate', listener: (player: RainlinkPlayer, track: RainlinkTrack) => void): this;
  off(event: 'playerEnd', listener: (player: RainlinkPlayer) => void): this;
  off(event: 'playerStart', listener: (player: RainlinkPlayer, track: RainlinkTrack) => void): this;
  off(event: 'playerDestroy', listener: (player: RainlinkPlayer) => void): this;
  off(
    event: 'playerResolveError',
    listener: (player: RainlinkPlayer, track: RainlinkTrack, message: string) => void,
  ): this;
  off(event: 'playerEmpty', listener: (player: RainlinkPlayer) => void): this;
  off(event: 'playerException', listener: (player: RainlinkPlayer, data: TrackExceptionEvent) => void): this;
  off(event: 'playerUpdate', listener: (player: RainlinkPlayer, data: PlayerUpdate) => void): this;
  off(event: 'playerStuck', listener: (player: RainlinkPlayer, data: TrackStuckEvent) => void): this;
  off(
    event: 'playerWebsocketClosed',
    listener: (player: RainlinkPlayer, data: WebSocketClosedEvent) => void,
  ): this;
  off(event: 'queueUpdate', listener: (player: RainlinkPlayer, queue: RainlinkQueue) => void): this;
  // ------------------------- OFF EVENT ------------------------- //
}

export class Rainlink extends EventEmitter {
  /**
   * Discord library connector
   */
  public readonly library: AbstractLibrary;
  /**
   * Voice voice managers being handled
   */
  public readonly voiceManagers: Map<string, RainlinkVoiceManager>;
  /**
   * Lavalink server that has been configured
   */
  public nodes: RainlinkNodeManager;
  /**
   * Rainlink options
   */
  public rainlinkOptions: RainlinkOptions;
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
  public searchEngines: Map<string, string>;
  /**
   * All search plugins (resolver plugins)
   */
  public searchPlugins: Map<string, SourceRainlinkPlugin>;

  constructor(options: RainlinkOptions) {
    super();
    this.debug('Start the client.');
    if (!options.library)
      throw new Error('Please set an new lib to connect, example: \nlibrary: new Library.DiscordJS(client) ');
    this.library = options.library.set(this);
    this.rainlinkOptions = options;
    this.voiceManagers = new Map();
    this.nodes = new RainlinkNodeManager(this);
    this.library.listen(this.rainlinkOptions.nodes);
    this.players = new RainlinkPlayerManager(this, this.voiceManagers);
    this.searchEngines = new Map<string, string>();
    this.searchPlugins = new Map<string, SourceRainlinkPlugin>();
    this.initialSearchEngines();
    if (
      !this.rainlinkOptions.options.defaultSearchEngine ||
      this.rainlinkOptions.options.defaultSearchEngine.length == 0
    )
      this.rainlinkOptions.options.defaultSearchEngine == 'youtube';

    if (this.rainlinkOptions.plugins) {
      for (const [, plugin] of this.rainlinkOptions.plugins.entries()) {
        if (plugin.constructor.name !== 'RainlinkPlugin')
          throw new Error('Plugin must be an instance of RainlinkPlugin');
        plugin.load(this);

        if (plugin.type() == RainlinkPluginType.SourceResolver) {
          const newPlugin = plugin as SourceRainlinkPlugin;
          const sourceName = newPlugin.sourceName();
          const sourceIdentify = newPlugin.sourceIdentify();
          this.searchEngines.set(sourceName, sourceIdentify);
          this.searchPlugins.set(sourceName, newPlugin);
        }
      }
      this.debug(
        `Registered ${this.rainlinkOptions.plugins.length} plugins, including ${this.searchPlugins.size}`,
      );
    }
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
  async search(query: string, options?: RainlinkSearchOptions) {
    const node = options?.nodeName
      ? this.nodes.get(options.nodeName) ?? (await this.nodes.getLeastUsedNode())
      : await this.nodes.getLeastUsedNode();

    if (!node) throw new Error('No node is available');

    let pluginData: RainlinkSearchResult;

    const directSearchRegex = /directSearch=(.*)/;
    const isDirectSearch = directSearchRegex.exec(query);
    const isUrl = /^https?:\/\/.*/.test(query);

    const pluginSearch = this.searchPlugins.get(String(options?.engine));

    if (pluginSearch && isDirectSearch == null) {
      pluginData = await pluginSearch.searchDirect(query, options);
      if (pluginData.tracks.length !== 0) return pluginData;
    }

    const source = options?.engine
      ? this.searchEngines.get(options.engine)
      : this.searchEngines.get(
          this.rainlinkOptions.options.defaultSearchEngine
            ? this.rainlinkOptions.options.defaultSearchEngine
            : 'youtube',
        );

    const finalQuery =
      isDirectSearch !== null ? isDirectSearch[1] : !isUrl ? `${source}search:${query}` : query;

    const result = await node.rest.resolver(finalQuery).catch(_ => null);
    if (!result || result.loadType === LavalinkLoadType.EMPTY) {
      return this.buildSearch(undefined, [], RainlinkSearchResultType.SEARCH);
    }

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

    this.debug(`Searched ${query}; Track results: ${normalizedData.tracks.length}`);

    return this.buildSearch(
      normalizedData.playlistName ?? undefined,
      normalizedData.tracks.map(track => new RainlinkTrack(track, options?.requester)),
      loadType,
    );
  }

  protected buildSearch(
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

  protected debug(logs: string) {
    this.emit(RainlinkEvents.Debug, `[Rainlink]: ${logs}`);
  }
}
