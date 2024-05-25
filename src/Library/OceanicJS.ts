import { AbstractLibrary } from './AbstractLibrary';
import { RainlinkNodeOptions } from '../Interface/Manager';

export class OceanicJS extends AbstractLibrary {
	public sendPacket(shardId: number, payload: any, important: boolean): void {
		return this.client.shards.get(shardId)?.send(payload.op, payload.d, important);
	}

	public getId(): string {
		return this.client.user.id;
	}

	public getShardCount(): number {
		return this.client.shards && this.client.shards.size ? this.client.shards.size : 1;
	}

	public listen(nodes: RainlinkNodeOptions[]): void {
		this.client.once('ready', () => this.ready(nodes));
		this.client.on('packet', (packet: any) => this.raw(packet));
	}
}
