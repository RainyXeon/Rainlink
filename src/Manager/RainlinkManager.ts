import { RainlinkNodeOptions, RainlinkOptions } from '../Interface/Manager';
import { EventEmitter } from 'events';
import { RainlinkNode } from '../Node/RainlinkNode';
import { RainlinkConnection } from '../Player/RainlinkConnection';
import { AbstractLibrary } from '../Library/AbstractLibrary';
import { VoiceChannelOptions } from '../Interface/Player';
import { RainlinkConnectState, VoiceState } from '../Interface/Constants';
import { RainlinkPlayer } from '../Player/RainlinkPlayer';
import { RainlinkPlayerManager } from './RainlinkPlayerManager';
import { RainlinkNodeManager } from './RainlinkNodeManager';

export declare interface RainlinkManager {
  on(event: 'debug', listener: (logs: string) => void): this;
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
}

export class RainlinkManager extends EventEmitter {
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
}
