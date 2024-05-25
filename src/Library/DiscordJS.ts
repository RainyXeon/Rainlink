// Modded from: https://github.com/shipgirlproject/Shoukaku/blob/396aa531096eda327ade0f473f9807576e9ae9df/src/connectors/libs/DiscordJS.ts
// Special thanks to shipgirlproject team!

import { AbstractLibrary } from './AbstractLibrary';
import { RainlinkNodeOptions } from '../Interface/Manager';

export class DiscordJS extends AbstractLibrary {
	public sendPacket(shardId: number, payload: any, important: boolean): void {
		return this.client.ws.shards.get(shardId)?.send(payload, important);
	}

	public getId(): string {
		return this.client.user.id;
	}

	public getShardCount(): number {
		return this.client.shard && this.client.shard.count ? this.client.shard.count : 1;
	}

	public listen(nodes: RainlinkNodeOptions[]): void {
		this.client.once('ready', () => this.ready(nodes));
		this.client.on('raw', (packet: any) => this.raw(packet));
	}
}
