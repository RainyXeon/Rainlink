import { RainlinkNodeOptions } from '../Interface/Manager';
import { VoiceChannelOptions } from '../Interface/Player';
import { RainlinkManager } from '../Manager/RainlinkManager';
import { RainlinkNode } from '../Node/RainlinkNode';
import { RainlinkConnection } from './RainlinkConnection';
import { metadata } from './../manifest';

export class RainlinkPlayer {
  manager: RainlinkManager;
  voiceOptions: VoiceChannelOptions;
  node: RainlinkNode;
  guildId: string;

  constructor(
    manager: RainlinkManager,
    voiceOptions: VoiceChannelOptions,
    node: RainlinkNode,
  ) {
    this.manager = manager;
    this.voiceOptions = voiceOptions;
    this.node = node;
    this.guildId = this.voiceOptions.guildId;
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
  }
}
