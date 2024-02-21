import { EventEmitter } from 'events';
import {
  RainlinkEvents,
  VoiceConnectState,
  VoiceState,
} from '../Interface/Constants';
import { RainlinkManager } from '../Manager/RainlinkManager';
import { VoiceChannelOptions } from '../Interface/Player';
import { Options } from './../../node_modules/prettier/index.d';

/**
 * Represents the payload from a serverUpdate event
 */
export interface ServerUpdate {
  token: string;
  guild_id: string;
  endpoint: string;
}

/**
 * Represents the partial payload from a stateUpdate event
 */
export interface StateUpdatePartial {
  channel_id?: string;
  session_id?: string;
  self_deaf: boolean;
  self_mute: boolean;
}

export class RainlinkConnection extends EventEmitter {
  /**
   * The manager where this connection is on
   */
  public manager: RainlinkManager;
  /**
   * ID of Guild that contains the connected voice channel
   */
  public guildId: string;
  /**
   * ID of the connected voice channel
   */
  public channelId: string | null;
  /**
   * ID of the Shard that contains the guild that contains the connected voice channel
   */
  public shardId: number;
  /**
   * Mute status in connected voice channel
   */
  public muted: boolean;
  /**
   * Deafen status in connected voice channel
   */
  public deafened: boolean;
  /**
   * ID of the last channelId connected to
   */
  public lastChannelId: string | null;
  /**
   * ID of current session
   */
  public sessionId: string | null;
  /**
   * Region of connected voice channel
   */
  public region: string | null;
  /**
   * Last region of the connected voice channel
   */
  public lastRegion: string | null;
  /**
   * Cached serverUpdate event from Lavalink
   */
  public serverUpdate: ServerUpdate | null;
  /**
   * Connection state
   */
  public state: VoiceConnectState;

  /**
   * @param manager The manager of this connection
   * @param options The options to pass in connection creation
   * @param options.guildId GuildId in which voice channel to connect to is located
   * @param options.shardId ShardId in which the guild exists
   * @param options.channelId ChannelId of voice channel to connect to
   * @param options.deaf Optional boolean value to specify whether to deafen the current bot user
   * @param options.mute Optional boolean value to specify whether to mute the current bot user
   * @param options.getNode Optional move function for moving players around
   */
  constructor(manager: RainlinkManager, options: VoiceChannelOptions) {
    super();
    this.manager = manager;
    this.guildId = options.guildId;
    this.channelId = options.channelId;
    this.shardId = options.shardId;
    this.muted = options.mute ?? false;
    this.deafened = options.deaf ?? false;
    this.lastChannelId = null;
    this.sessionId = null;
    this.region = null;
    this.lastRegion = null;
    this.serverUpdate = null;
    this.state = VoiceConnectState.DISCONNECTED;
  }

  /**
   * Connect the current bot user to a voice channel
   * @internal
   */
  public async connect(): Promise<void> {
    if (
      this.state === VoiceConnectState.CONNECTING ||
      this.state === VoiceConnectState.CONNECTED
    )
      return;
    this.state = VoiceConnectState.CONNECTING;
    this.sendVoiceUpdate();
    this.manager.emit(
      RainlinkEvents.Debug,
      `[Voice]: Requesting Connection | Guild: ${this.guildId}`,
    );
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.manager.options.options.voiceConnectionTimeout,
    );
    try {
      const [status] = await RainlinkConnection.once(this, 'connectionUpdate', {
        signal: controller.signal,
      });
      if (status !== VoiceState.SESSION_READY) {
        switch (status) {
          case VoiceState.SESSION_ID_MISSING:
            throw new Error(
              'The voice connection is not established due to missing session id',
            );
          case VoiceState.SESSION_ENDPOINT_MISSING:
            throw new Error(
              'The voice connection is not established due to missing connection endpoint',
            );
        }
      }
      this.state = VoiceConnectState.CONNECTED;
    } catch (error: any) {
      this.manager.emit(
        RainlinkEvents.Debug,
        `[Voice]: Request Connection Failed | Guild: ${this.guildId}`,
      );
      if (error.name === 'AbortError')
        throw new Error(
          `The voice connection is not established in ${this.manager.options.options.voiceConnectionTimeout}ms`,
        );
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  public setServerUpdate(data: ServerUpdate): void {
    if (!data.endpoint) {
      this.emit('connectionUpdate', VoiceState.SESSION_ENDPOINT_MISSING);
      return;
    }
    if (!this.sessionId) {
      this.emit('connectionUpdate', VoiceState.SESSION_ID_MISSING);
      return;
    }

    this.lastRegion = this.region?.repeat(1) || null;
    this.region =
      data.endpoint.split('.').shift()?.replace(/[0-9]/g, '') || null;

    if (this.region && this.lastRegion !== this.region) {
      this.manager.emit(
        RainlinkEvents.Debug,
        `[Voice]: Voice Region Moved | Old Region: ${this.lastRegion} New Region: ${this.region} Guild: ${this.guildId}`,
      );
    }

    this.serverUpdate = data;
    this.emit('connectionUpdate', VoiceState.SESSION_READY);
    this.manager.emit(
      RainlinkEvents.Debug,
      `[Voice]: Server Update Received | Server: ${this.region} Guild: ${this.guildId}`,
    );
  }

  public setStateUpdate({
    session_id,
    channel_id,
    self_deaf,
    self_mute,
  }: StateUpdatePartial): void {
    this.lastChannelId = this.channelId?.repeat(1) || null;
    this.channelId = channel_id || null;

    if (this.channelId && this.lastChannelId !== this.channelId) {
      this.manager.emit(
        RainlinkEvents.Debug,
        `[Voice]: Channel Moved | Old Channel: ${this.channelId} Guild: ${this.guildId}`,
      );
    }

    if (!this.channelId) {
      this.state = VoiceConnectState.DISCONNECTED;
      this.manager.emit(
        RainlinkEvents.Debug,
        `[Voice]: Channel Disconnected | Guild: ${this.guildId}`,
      );
    }

    this.deafened = self_deaf;
    this.muted = self_mute;
    this.sessionId = session_id || null;
    this.manager.emit(
      RainlinkEvents.Debug,
      `[Voice]: State Update Received | Channel: ${this.channelId} Session ID: ${session_id} Guild: ${this.guildId}`,
    );
  }

  /**
   * Send voice data to discord
   * @internal
   */
  private sendVoiceUpdate() {
    this.send({
      guild_id: this.guildId,
      channel_id: this.channelId,
      self_deaf: this.deafened,
      self_mute: this.muted,
    });
  }

  /**
   * Send data to Discord
   * @param data The data to send
   * @internal
   */
  private send(data: any): void {
    this.manager.library.sendPacket(this.shardId, { op: 4, d: data }, false);
  }
}
