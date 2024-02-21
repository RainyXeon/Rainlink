import { RainlinkNodeOptions, RainlinkOptions } from '../Interface/Manager';
import { EventEmitter } from 'events';
import { RainlinkNode } from '../Node/RainlinkNode';
import { RainlinkConnection } from '../Player/RainlinkConnection';
import { AbstractLibrary } from '../Library/AbstractLibrary';
import { VoiceChannelOptions } from '../Interface/Player';
import { RainlinkConnectState } from '../Interface/Constants';
import { RainlinkPlayer } from '../Player/RainlinkPlayer';

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
  public nodes: Map<string, RainlinkNode>;
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
  public players: Map<string, RainlinkPlayer>;

  constructor(options: RainlinkOptions) {
    super();
    if (!options.library)
      throw new Error(
        'Please set an new lib to connect, example: \nlibrary: new Library.DiscordJS(client) ',
      );
    this.library = options.library.set(this);
    this.options = options;
    this.connections = new Map();
    this.nodes = new Map<string, RainlinkNode>();
    this.library.listen(this.options.nodes);
    this.players = new Map<string, RainlinkPlayer>();
  }

  addNode(node: RainlinkNodeOptions) {
    const newNode = new RainlinkNode(this, node);
    newNode.connect();
    this.nodes.set(node.name, newNode);
    return newNode;
  }

  async create(options: VoiceChannelOptions) {
    if (this.connections.has(options.guildId))
      throw new Error('This guild already have an existing connection');
    const connection = new RainlinkConnection(this, options);
    this.connections.set(connection.guildId, connection);
    try {
      await connection.connect();
    } catch (error) {
      this.connections.delete(options.guildId);
      throw error;
    }
  }

  /**
   * Get a least used node.
   * @returns Node
   */
  public async getLeastUsedNode(): Promise<RainlinkNode> {
    const nodes: RainlinkNode[] = [...this.nodes.values()];

    const onlineNodes = nodes.filter(
      node => node.state === RainlinkConnectState.Connected,
    );
    if (!onlineNodes.length) throw new Error('No nodes are online');

    // .filter((x) => x.manager.node.name === node.node.name)

    const temp = await Promise.all(
      onlineNodes.map(async node => ({
        node,
        players: (await node.rest.getPlayers())
          .filter(x => this.players.get(x.guildId))
          .map(x => this.players.get(x.guildId)!).length,
      })),
    );

    return temp.reduce((a, b) => (a.players < b.players ? a : b)).node;
  }
}
