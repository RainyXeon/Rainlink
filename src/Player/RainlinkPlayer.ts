import {
  PlayEncodedOptions,
  PlayOptions,
  VoiceChannelOptions,
} from '../Interface/Player';
import { Rainlink } from '../Rainlink';
import { RainlinkNode } from '../Node/RainlinkNode';
import { RainlinkQueue } from './RainlinkQueue';
import { RainlinkVoiceManager } from '../Manager/RainlinkVoiceManager';
import { RainlinkEvents, RainlinkPlayerState } from '../Interface/Constants';
import { RainlinkTrack } from './RainlinkTrack';
import { UpdatePlayerOptions } from '../Interface/Rest';

export class RainlinkPlayer {
  public manager: Rainlink;
  public voiceOptions: VoiceChannelOptions;
  public node: RainlinkNode;
  public guildId: string;
  public readonly queue: RainlinkQueue;
  public data: Map<string, any>;
  public paused: boolean;
  public position: number;
  public volume: number;
  public playing: boolean;
  /**
   * Get the current state of the player
   */
  public state: RainlinkPlayerState = RainlinkPlayerState.CONNECTING;

  constructor(
    manager: Rainlink,
    voiceOptions: VoiceChannelOptions,
    node: RainlinkNode,
  ) {
    this.manager = manager;
    this.voiceOptions = voiceOptions;
    this.node = node;
    this.guildId = this.voiceOptions.guildId;
    this.queue = new RainlinkQueue(this.manager, this);
    this.data = new Map<string, any>();
    this.paused = false;
    this.position = 0;
    this.volume = 100;
    this.playing = false;
  }

  /**
   * Sends server update to lavalink
   * @internal
   */
  public async sendServerUpdate(
    connection: RainlinkVoiceManager,
  ): Promise<void> {
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

  /**
   * Play a track
   * @param track Track to play
   * @param options Play options
   * @returns KazagumoPlayer
   */
  public async play(
    track?: RainlinkTrack,
    options?: PlayOptions,
  ): Promise<RainlinkPlayer> {
    if (this.state === RainlinkPlayerState.DESTROYED)
      throw new Error('Player is already destroyed');

    if (track && !(track instanceof RainlinkTrack))
      throw new Error('track must be a KazagumoTrack');

    if (!track && !this.queue.totalSize)
      throw new Error('No track is available to play');

    if (!options || typeof options.replaceCurrent !== 'boolean')
      options = { ...options, replaceCurrent: false };

    if (track) {
      if (!options.replaceCurrent && this.queue.current)
        this.queue.unshift(this.queue.current);
      this.queue.current = track;
    } else if (!this.queue.current) this.queue.current = this.queue.shift();

    if (!this.queue.current) throw new Error('No track is available to play');

    const current = this.queue.current;

    let errorMessage: string | undefined;

    const resolveResult = await current
      .resolver(this.manager)
      .catch((e: any) => {
        errorMessage = e.message;
        return null;
      });

    if (!resolveResult) {
      this.manager.emit(
        RainlinkEvents.PlayerResolveError,
        this,
        current,
        errorMessage,
      );
      this.manager.emit(
        RainlinkEvents.Debug,
        `Player ${this.guildId} resolve error: ${errorMessage}`,
      );
      this.queue.current = null;
      this.queue.size
        ? await this.play()
        : this.manager.emit(RainlinkEvents.PlayerEmpty, this);
      return this;
    }

    const playOptions = { encoded: current.encoded, options: {} };
    if (options) playOptions.options = { ...options, noReplace: false };
    else playOptions.options = { noReplace: false };

    this.playTrackEncoded(playOptions);

    return this;
  }

  protected async playTrackEncoded(playable: PlayEncodedOptions) {
    const playerOptions: UpdatePlayerOptions = {
      encodedTrack: playable.encoded,
    };
    if (playable.options) {
      const { pause, startTime, endTime, volume } = playable.options;
      if (pause) playerOptions.paused = pause;
      if (startTime) playerOptions.position = startTime;
      if (endTime) playerOptions.endTime = endTime;
      if (volume) playerOptions.volume = volume;
    }
    if (playerOptions.paused) this.paused = playerOptions.paused;
    if (playerOptions.position) this.position = playerOptions.position;
    if (playerOptions.volume) this.volume = playerOptions.volume;
    await this.node.rest.updatePlayer({
      guildId: this.guildId,
      noReplace: playable.options?.noReplace ?? false,
      playerOptions,
    });
  }

  setPlaying(mode: boolean) {
    this.playing = mode;
  }

  private debug(logs: string) {
    this.manager.emit(RainlinkEvents.Debug, `[Rainlink Player]: ${logs}`);
  }
}
