import { RainlinkEvents, VoiceState } from '../Interface/Constants';
import { VoiceChannelOptions } from '../Interface/Player';
import { RainlinkVoiceManager } from './RainlinkVoiceManager';
import { RainlinkPlayer } from '../Player/RainlinkPlayer';
import { Rainlink } from '../Rainlink';

export class RainlinkPlayerManager extends Map<string, RainlinkPlayer> {
  private connections: Map<string, RainlinkVoiceManager>;
  private manager: Rainlink;

  constructor(manager: Rainlink, connections: Map<string, RainlinkVoiceManager>) {
    super();
    this.connections = connections;
    this.manager = manager;
  }

  async create(options: VoiceChannelOptions): Promise<RainlinkPlayer> {
    if (this.connections.has(options.guildId))
      throw new Error('This guild already have an existing connection');
    const connection = new RainlinkVoiceManager(this.manager, options);
    this.connections.set(connection.guildId, connection);
    try {
      await connection.connect();
    } catch (error) {
      this.connections.delete(options.guildId);
      throw error;
    }
    try {
      const node = await this.manager.nodes.getLeastUsedNode();
      if (!node) throw new Error("Can't find any nodes to connect on");
      const player = new RainlinkPlayer(this.manager, options, node);
      const onUpdate = (state: VoiceState) => {
        if (state !== VoiceState.SESSION_READY) return;
        player.sendServerUpdate(connection);
      };
      await player.sendServerUpdate(connection);
      connection.on('connectionUpdate', onUpdate);
      this.set(player.guildId, player);
      this.debug('Player created at ' + options.guildId);
      this.manager.emit(RainlinkEvents.PlayerCreate, this);
      return player;
    } catch (error) {
      connection.disconnect();
      this.connections.delete(options.guildId);
      throw error;
    }
  }

  /**
   * Leaves a voice channel
   * @param guildId The id of the guild you want to delete
   * @returns The destroyed / disconnected player or undefined if none
   * @internal
   */
  public async destroy(guildId: string = ''): Promise<void> {
    const player = this.get(guildId);
    if (player) player.destroy();
  }

  private debug(logs: string) {
    this.manager.emit(RainlinkEvents.Debug, `[Rainlink Player]: ${logs}`);
  }
}
