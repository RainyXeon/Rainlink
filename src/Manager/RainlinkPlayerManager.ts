import { RainlinkEvents, RainlinkPlayerState, VoiceState } from '../Interface/Constants';
import { VoiceChannelOptions } from '../Interface/Player';
import { RainlinkVoiceManager } from './RainlinkVoiceManager';
import { RainlinkPlayer } from '../Player/RainlinkPlayer';
import { Rainlink } from '../Rainlink';

export class RainlinkPlayerManager extends Map<string, RainlinkPlayer> {
  private voiceManagers: Map<string, RainlinkVoiceManager>;
  private manager: Rainlink;

  constructor(manager: Rainlink, connections: Map<string, RainlinkVoiceManager>) {
    super();
    this.voiceManagers = connections;
    this.manager = manager;
  }

  async create(options: VoiceChannelOptions): Promise<RainlinkPlayer> {
    if (this.voiceManagers.has(options.guildId))
      throw new Error('This guild already have an existing connection');
    const voiceManager = new RainlinkVoiceManager(this.manager, options);
    this.voiceManagers.set(voiceManager.guildId, voiceManager);
    try {
      await voiceManager.connect();
    } catch (error) {
      this.voiceManagers.delete(options.guildId);
      throw error;
    }
    try {
      const getCustomNode = this.manager.nodes.get(String(options.nodeName ? options.nodeName : ''));
      const node = getCustomNode ? getCustomNode : await this.manager.nodes.getLeastUsedNode();
      if (!node) throw new Error("Can't find any nodes to connect on");
      const player = new RainlinkPlayer(this.manager, options, node, voiceManager);
      const onUpdate = (state: VoiceState) => {
        if (state !== VoiceState.SESSION_READY) return;
        player.sendServerUpdate(voiceManager);
      };
      await player.sendServerUpdate(voiceManager);
      voiceManager.on('connectionUpdate', onUpdate);
      this.set(player.guildId, player);
      player.state = RainlinkPlayerState.CONNECTED;
      this.debug('Player created at ' + options.guildId);
      this.manager.emit(RainlinkEvents.PlayerCreate, this);
      return player;
    } catch (error) {
      voiceManager.disconnect();
      this.voiceManagers.delete(options.guildId);
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
