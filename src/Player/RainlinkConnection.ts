import { EventEmitter } from 'events';
import {
  RainlinkEvents,
  VoiceConnectState,
  VoiceState,
} from '../Interface/Constants';
import { RainlinkManager } from '../Manager/RainlinkManager';
import { VoiceChannelOptions } from '../Interface/Player';

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
}
