// Get from: https://github.com/shipgirlproject/Shoukaku/blob/396aa531096eda327ade0f473f9807576e9ae9df/src/connectors/Connector.ts
// Special thanks to shipgirlproject team!

import { RainlinkNodeOptions } from '../Interface/Manager';
import { Rainlink } from '../Rainlink';
export const AllowedPackets = ['VOICE_STATE_UPDATE', 'VOICE_SERVER_UPDATE'];

export abstract class AbstractLibrary {
  protected readonly client: any;
  protected manager: Rainlink | null;
  constructor(client: any) {
    this.client = client;
    this.manager = null;
  }

  protected ready(nodes: RainlinkNodeOptions[]): void {
    this.manager!.id = this.getId();
    for (const node of nodes) this.manager?.nodes.addNode(node);
  }

  public set(manager: Rainlink): AbstractLibrary {
    this.manager = manager;
    return this;
  }

  abstract getId(): string;

  abstract sendPacket(shardId: number, payload: any, important: boolean): void;

  abstract listen(nodes: RainlinkNodeOptions[]): void;

  protected raw(packet: any): void {
    if (!AllowedPackets.includes(packet.t)) return;
    const guildId = packet.d.guild_id;
    const connection = this.manager!.connections.get(guildId);
    if (!connection) return;
    if (packet.t === 'VOICE_SERVER_UPDATE')
      return connection.setServerUpdate(packet.d);
    const userId = packet.d.user_id;
    if (userId !== this.manager!.id) return;
    connection.setStateUpdate(packet.d);
  }
}
