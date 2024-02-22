import { VoiceChannelOptions } from '../Interface/Player';
import { Rainlink } from '../Rainlink';
import { RainlinkNode } from '../Node/RainlinkNode';
import { RainlinkQueue } from '../Utilities/RainlinkQueue';
import { RainlinkConnection } from './RainlinkConnection';
import { RainlinkEvents } from '../Interface/Constants';

export class RainlinkPlayer {
  public manager: Rainlink;
  public voiceOptions: VoiceChannelOptions;
  public node: RainlinkNode;
  public guildId: string;
  public queue: RainlinkQueue;

  constructor(
    manager: Rainlink,
    voiceOptions: VoiceChannelOptions,
    node: RainlinkNode,
  ) {
    this.manager = manager;
    this.voiceOptions = voiceOptions;
    this.node = node;
    this.guildId = this.voiceOptions.guildId;
    this.queue = new RainlinkQueue();
  }

  /**
   * Sends server update to lavalink
   * @internal
   */
  public async sendServerUpdate(connection: RainlinkConnection): Promise<void> {
    const playerUpdate = {
      guildId: this.guildId,
      playerOptions: {
        voice: {
          token: connection.serverUpdate!.token,
          endpoint: connection.serverUpdate!.endpoint,
          sessionId: connection.sessionId!,
        },
      },
    };
    await this.node.rest.updatePlayer(playerUpdate);
  }

  /**
   * Destroy the player
   * @internal
   */
  public async destroy() {
    const connection = this.manager.connections.get(this.guildId);
    if (connection) {
      connection.disconnect();
      this.manager.connections.delete(this.guildId);
    }
    await this.node.rest.destroyPlayer(this.guildId);
    this.manager.players.delete(this.guildId);
    this.debug('Player destroyed at ' + this.guildId);
    this.manager.emit(RainlinkEvents.PlayerDestroy, this);
  }

  private debug(logs: string) {
    this.manager.emit(RainlinkEvents.Debug, `[Rainlink Player]: ${logs}`);
  }
}
