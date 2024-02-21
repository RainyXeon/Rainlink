import { RainlinkNodeOptions, RainlinkOptions } from '../Interface/Manager';
import { EventEmitter } from 'events';
import { RainlinkNode } from '../Node/RainlinkNode';
import { RainlinkConnection } from '../Player/RainlinkConnection';
import { Library } from '../Library/Library';

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
  public readonly library: Library;
  /**
   * Voice connections being handled
   */
  public readonly connections: Map<string, RainlinkConnection>;
  /**
   * Lavalink server that has been configured
   */
  public node: Map<string, RainlinkNode>;
  /**
   * Rainlink options
   */
  public options: RainlinkOptions;
  /**
   * Bot id
   */
  public id: string | undefined;

  constructor(options: RainlinkOptions) {
    super();
    this.options = options;
    this.connections = new Map();
    this.node = new Map<string, RainlinkNode>();
    if (!options.library)
      throw new Error(
        'Please set an new lib to connect, example: \nlibrary: new Library.DiscordJS(client) ',
      );
    this.library = options.library.set(this);
  }

  addNode(node: RainlinkNodeOptions) {
    this.removeAllListeners();
    const newNode = new RainlinkNode(this, node, this.id!);
    this.node.set(node.name, newNode);
    return newNode;
  }
}
