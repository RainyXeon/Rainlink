import { PlayEncodedOptions, PlayOptions, VoiceChannelOptions } from '../Interface/Player';
import { Rainlink } from '../Rainlink';
import { RainlinkNode } from '../Node/RainlinkNode';
import { RainlinkQueue } from './RainlinkQueue';
import { RainlinkVoiceManager } from '../Manager/RainlinkVoiceManager';
import { RainlinkEvents, RainlinkLoopMode, RainlinkPlayerState } from '../Interface/Constants';
import { RainlinkTrack } from './RainlinkTrack';
import { UpdatePlayerInfo, UpdatePlayerOptions } from '../Interface/Rest';

export class RainlinkPlayer {
  /**
   * Main manager class
   */
  public manager: Rainlink;
  /**
   * Voice option of player
   */
  public voiceOptions: VoiceChannelOptions;
  /**
   * Player's current using lavalink server
   */
  public node: RainlinkNode;
  /**
   * Player's guild id
   */
  public guildId: string;
  /**
   * Player's voice id
   */
  public voiceId: string;
  /**
   * Player's text id
   */
  public textId: string;
  /**
   * Player's queue
   */
  public readonly queue: RainlinkQueue;
  /**
   * The temporary database of player, u can set any thing here and us like Map class!
   */
  public readonly data: Map<string, any>;
  /**
   * Whether the player is paused or not
   */
  public paused: boolean;
  /**
   * Get the current track's position of the player
   */
  public position: number;
  /**
   * Get the current volume of the player
   */
  public volume: number;
  /**
   * Whether the player is playing or not
   */
  public playing: boolean;
  /**
   * Get the current loop mode of the player
   */
  public loop: RainlinkLoopMode;
  /**
   * Get the current state of the player
   */
  public state: RainlinkPlayerState;

  constructor(manager: Rainlink, voiceOptions: VoiceChannelOptions, node: RainlinkNode) {
    this.manager = manager;
    this.voiceOptions = voiceOptions;
    this.node = node;
    this.guildId = this.voiceOptions.guildId;
    this.voiceId = this.voiceOptions.voiceId;
    this.textId = this.voiceOptions.textId;
    this.queue = new RainlinkQueue(this.manager, this);
    this.data = new Map<string, any>();
    this.paused = false;
    this.position = 0;
    this.volume = 100;
    this.playing = false;
    this.loop = RainlinkLoopMode.NONE;
    this.state = RainlinkPlayerState.DESTROYED;
  }

  /**
   * Sends server update to lavalink
   * @internal
   */
  public async sendServerUpdate(connection: RainlinkVoiceManager): Promise<void> {
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
  public async destroy(): Promise<void> {
    const connection = this.manager.connections.get(this.guildId);
    if (connection) {
      connection.disconnect();
      this.manager.connections.delete(this.guildId);
    }
    await this.node.rest.destroyPlayer(this.guildId);
    this.manager.players.delete(this.guildId);
    this.state = RainlinkPlayerState.DESTROYED;
    this.debug('Player destroyed at ' + this.guildId);
    this.manager.emit(RainlinkEvents.PlayerDestroy, this);
  }

  /**
   * Play a track
   * @param track Track to play
   * @param options Play options
   * @returns RainlinkPlayer
   */
  public async play(track?: RainlinkTrack, options?: PlayOptions): Promise<RainlinkPlayer> {
    this.checkDestroyed();

    if (track && !(track instanceof RainlinkTrack)) throw new Error('track must be a KazagumoTrack');

    if (!track && !this.queue.totalSize) throw new Error('No track is available to play');

    if (!options || typeof options.replaceCurrent !== 'boolean')
      options = { ...options, replaceCurrent: false };

    if (track) {
      if (!options.replaceCurrent && this.queue.current) this.queue.unshift(this.queue.current);
      this.queue.current = track;
    } else if (!this.queue.current) this.queue.current = this.queue.shift();

    if (!this.queue.current) throw new Error('No track is available to play');

    const current = this.queue.current;

    let errorMessage: string | undefined;

    const resolveResult = await current.resolver(this.manager).catch((e: any) => {
      errorMessage = e.message;
      return null;
    });

    if (!resolveResult) {
      this.manager.emit(RainlinkEvents.PlayerResolveError, this, current, errorMessage);
      this.manager.emit(RainlinkEvents.Debug, `Player ${this.guildId} resolve error: ${errorMessage}`);
      this.queue.current = null;
      this.queue.size ? await this.play() : this.manager.emit(RainlinkEvents.PlayerEmpty, this);
      return this;
    }

    const playOptions = { encoded: current.encoded, options: {} };
    if (options) playOptions.options = { ...options, noReplace: false };
    else playOptions.options = { noReplace: false };

    this.playTrackEncoded(playOptions);

    return this;
  }

  /**
   * Set the loop mode of the track
   * @param mode Mode to loop
   * @returns RainlinkPlayer
   */
  public setLoop(mode: RainlinkLoopMode): RainlinkPlayer {
    this.loop = mode;
    return this;
  }

  /**
   * Pause the track
   * @returns RainlinkPlayer
   */
  public async pause(mode: boolean): Promise<RainlinkPlayer> {
    this.checkDestroyed();
    if (mode == this.paused) return this;
    await this.node.rest.updatePlayer({
      guildId: this.guildId,
      playerOptions: {
        paused: true,
      },
    });
    this.paused = true;
    return this;
  }

  /**
   * Play the previous track
   * @returns RainlinkPlayer
   */
  public async previous(): Promise<RainlinkPlayer> {
    this.checkDestroyed();
    const prevoiusData = this.queue.previous;
    const current = this.queue.current;
    const index = prevoiusData.length - 1;
    if (index === -1 || !current) return this;
    await this.play(prevoiusData[index]);
    this.queue.previous.splice(index, 1);
    return this;
  }

  /**
   * Get all previous track
   * @returns RainlinkTrack[]
   */
  public getPrevious(): RainlinkTrack[] {
    return this.queue.previous;
  }

  /**
   * Skip the current track
   * @returns RainlinkPlayer
   */
  public async skip(): Promise<RainlinkPlayer> {
    this.checkDestroyed();
    await this.node.rest.updatePlayer({
      guildId: this.guildId,
      playerOptions: {
        encodedTrack: null,
      },
    });
    return this;
  }

  /**
   * Seek to another position in track
   * @param position Position to seek
   * @returns RainlinkPlayer
   */
  public async seek(position: number): Promise<RainlinkPlayer> {
    this.checkDestroyed();
    if (!this.queue.current) throw new Error("Player has no current track in it's queue");
    if (!this.queue.current.isSeekable) throw new Error("The current track isn't seekable");

    position = Number(position);

    if (isNaN(position)) throw new Error('position must be a number');
    if (position < 0 || position > (this.queue.current.duration ?? 0))
      position = Math.max(Math.min(position, this.queue.current.duration ?? 0), 0);

    await this.node.rest.updatePlayer({
      guildId: this.guildId,
      playerOptions: {
        position: position,
      },
    });
    this.queue.current.position = position;
    return this;
  }

  /**
   * Set another volume in player
   * @param volume Volume to cange
   * @returns RainlinkPlayer
   */
  public async setVolume(volume: number): Promise<RainlinkPlayer> {
    this.checkDestroyed();
    if (isNaN(volume)) throw new Error('volume must be a number');
    await this.node.rest.updatePlayer({
      guildId: this.guildId,
      playerOptions: {
        volume: volume,
      },
    });
    this.volume = volume;
    return this;
  }

  /**
   * Send custom player update data to lavalink server
   * @param data Data to change
   * @returns RainlinkPlayer
   */
  public async send(data: UpdatePlayerInfo): Promise<RainlinkPlayer> {
    await this.node.rest.updatePlayer(data);
    return this;
  }

  protected async playTrackEncoded(playable: PlayEncodedOptions): Promise<void> {
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

  protected checkDestroyed(): void {
    if (this.state == RainlinkPlayerState.DESTROYED) throw new Error('Player is already destroyed');
  }

  private debug(logs: string): void {
    this.manager.emit(RainlinkEvents.Debug, `[Rainlink Player]: ${logs}`);
  }
}
