import { RainlinkOptions } from '../Interface/Manager';
import { EventEmitter } from 'events';
import { RainlinkNode } from '../Node/RainlinkNode';

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
  node: Map<string, RainlinkNode>;
  options: RainlinkOptions;

  constructor(options: RainlinkOptions) {
    super();
    this.node = new Map<string, RainlinkNode>();
    this.options = options;
  }

  init(clientId: string) {
    for (const nodeData of this.options.nodes) {
      this.node.set(nodeData.name, new RainlinkNode(this, nodeData, clientId));
    }
  }
}
