import { AbstractLibrary } from './AbstractLibrary';
import { RainlinkNodeOptions } from '../Interface/Manager';

export class DiscordJS extends AbstractLibrary {
  public sendPacket(shardId: number, payload: any, important: boolean): void {
    return this.client.ws.shards.get(shardId)?.send(payload, important);
  }

  public getId(): string {
    return this.client.user.id;
  }

  public listen(nodes: RainlinkNodeOptions[]): void {
    this.client.once('ready', () => this.ready(nodes));
    this.client.on('raw', (packet: any) => this.raw(packet));
  }
}
