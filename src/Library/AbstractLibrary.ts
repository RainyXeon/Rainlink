// Get from: https://github.com/shipgirlproject/Shoukaku/blob/396aa531096eda327ade0f473f9807576e9ae9df/src/connectors/Connector.ts
// Special thanks to shipgirlproject team!

import { RainlinkNodeOptions } from '../Interface/Manager';
import { Rainlink } from '../Rainlink';
export const AllowedPackets = ['VOICE_STATE_UPDATE', 'VOICE_SERVER_UPDATE'];

/**
 * The abstract class for developing library
 */
export abstract class AbstractLibrary {
	protected readonly client: any;
	protected manager: Rainlink | null;
	constructor(client: any) {
		this.client = client;
		this.manager = null;
	}

	protected ready(nodes: RainlinkNodeOptions[]): void {
    this.manager!.id = this.getId();
    this.manager!.shardCount = this.getShardCount();
    this.manager!.emit(
    	'debug',
    	`[Rainlink] | Finished the initialization process | Registered ${this.manager!.plugins.size} plugins | Now connect all current nodes`,
    );
    for (const node of nodes) this.manager?.nodes.add(node);
	}

	/** @ignore */
	public set(manager: Rainlink): AbstractLibrary {
		this.manager = manager;
		return this;
	}

  /**
   * A getter where the lib stores the client user (the one logged in as a bot) id
   * @returns string
   */
  abstract getId(): string;

  /**
   * For dealing ws with lavalink server
   * @returns number
   */
  abstract getShardCount(): number;

  /**
   * Where your library send packets to Discord Gateway
   * @param shardId The current shard Id
   * @param payload The payload data to request with discord gateway
   * @param important If this payload important or not
   */
  abstract sendPacket(shardId: number, payload: any, important: boolean): void;

  /**
   * Listen attaches the event listener to the library you are using
   * @param nodes All current nodes in the array
   */
  abstract listen(nodes: RainlinkNodeOptions[]): void;

  protected raw(packet: any): void {
  	if (!AllowedPackets.includes(packet.t)) return;
  	const guildId = packet.d.guild_id;
  	const players = this.manager!.players.get(guildId);
  	if (!players) return;
  	if (packet.t === 'VOICE_SERVER_UPDATE') return players.setServerUpdate(packet.d);
  	const userId = packet.d.user_id;
  	if (userId !== this.manager!.id) return;
  	players.setStateUpdate(packet.d);
  }
}
