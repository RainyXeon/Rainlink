import { RainlinkConnectState } from '../Interface/Constants';
import { RainlinkNodeOptions } from '../Interface/Manager';
import { RainlinkNode } from '../Node/RainlinkNode';
import { Rainlink } from '../Rainlink';

export class RainlinkNodeManager extends Map<string, RainlinkNode> {
  manager: Rainlink;
  constructor(manager: Rainlink) {
    super();
    this.manager = manager;
  }

  /**
   * Add a new Node.
   * @returns RainlinkNode
   */
  addNode(node: RainlinkNodeOptions) {
    const newNode = new RainlinkNode(this.manager, node);
    newNode.connect();
    this.set(node.name, newNode);
    return newNode;
  }

  /**
   * Get a least used node.
   * @returns RainlinkNode
   */
  public async getLeastUsedNode(): Promise<RainlinkNode> {
    const nodes: RainlinkNode[] = [...this.values()];

    const onlineNodes = nodes.filter(
      node => node.state === RainlinkConnectState.Connected,
    );
    if (!onlineNodes.length) throw new Error('No nodes are online');

    // .filter((x) => x.manager.node.name === node.node.name)

    const temp = await Promise.all(
      onlineNodes.map(async node => ({
        node,
        players: (await node.rest.getPlayers())
          .filter(x => this.get(x.guildId))
          .map(x => this.get(x.guildId)!).length,
      })),
    );

    return temp.reduce((a, b) => (a.players < b.players ? a : b)).node;
  }
}
