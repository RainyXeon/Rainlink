import { ServerUpdate, StateUpdatePartial } from '../Interface/Connection'
import { RainlinkEvents, VoiceConnectState, VoiceState } from '../Interface/Constants'
import { VoiceChannelOptions } from '../Interface/Player'
import { Rainlink } from '../Rainlink'
import { EventEmitter } from 'node:events'

export class RainlinkVoice extends EventEmitter {
	/**
   * Main manager class
   */
	public manager: Rainlink
	/**
   * Player's guild id
   */
	public guildId: string
	/**
   * Player's voice id
   */
	public voiceId: string | null = null
	/**
   * Connection state
   */
	public state: VoiceConnectState = VoiceConnectState.DISCONNECTED
	/**
   * Whether the player is deafened or not
   */
	public deaf: boolean
	/**
   * Whether the player is muted or not
   */
	public mute: boolean
	/**
   * ID of the Shard that contains the guild that contains the connected voice channel
   */
	public shardId: number
	/**
   * ID of the last voiceId connected to
   */
	public lastvoiceId: string | null = null
	/**
   * Region of connected voice channel
   */
	public region: string | null = null
	/**
   * Last region of the connected voice channel
   */
	public lastRegion: string | null = null
	/**
   * Cached serverUpdate event from Lavalink
   */
	public serverUpdate: ServerUpdate | null = null
	/**
   * ID of current session
   */
	public sessionId: string | null = null
	/**
   * Voice Options
   */
	public options: VoiceChannelOptions

	/**
   * Rainlink voice handler class
   * @param manager Rainlink manager
   * @param voiceOptions
   */
	constructor(manager: Rainlink, voiceOptions: VoiceChannelOptions) {
		super()
		this.options = voiceOptions
		this.manager = manager
		this.guildId = this.options.guildId
		this.voiceId = this.options.voiceId
		this.deaf = this.options.deaf ?? false
		this.mute = this.options.mute ?? false
		this.shardId = this.options.shardId
	}

	/**
   * Connect from the voice channel
   * @returns RainlinkPlayer
   */
	public async connect(): Promise<RainlinkVoice> {
		// if (this.player.state === RainlinkPlayerState.CONNECTED || !this.voiceId) return this
		if (this.state === VoiceConnectState.CONNECTING || this.state === VoiceConnectState.CONNECTED)
			return this
		this.state = VoiceConnectState.CONNECTING
		this.sendVoiceUpdate()
		this.debugDiscord('Requesting Connection')
		const controller = new AbortController()
		const timeout = setTimeout(
			() => controller.abort(),
      this.manager.rainlinkOptions.options!.voiceConnectionTimeout
		)
		try {
			const [status] = await RainlinkVoice.once(this, 'connectionUpdate', {
				signal: controller.signal,
			})
			if (status !== VoiceState.SESSION_READY) {
				switch (status) {
				case VoiceState.SESSION_ID_MISSING:
					throw new Error('The voice connection is not established due to missing session id')
				case VoiceState.SESSION_ENDPOINT_MISSING:
					throw new Error(
						'The voice connection is not established due to missing connection endpoint'
					)
				}
			}
			this.state = VoiceConnectState.CONNECTED
		} catch (error: any) {
			this.debugDiscord('Request Connection Failed')
			if (error.name === 'AbortError')
				throw new Error(
					`The voice connection is not established in ${this.manager.rainlinkOptions.options!.voiceConnectionTimeout}ms`
				)
			throw error
		} finally {
			clearTimeout(timeout)
		}
		return this
	}

	/**
   * Send voice data to discord
   * @internal
   */
	public sendVoiceUpdate() {
		this.sendDiscord({
			guild_id: this.guildId,
			channel_id: this.voiceId,
			self_deaf: this.deaf,
			self_mute: this.mute,
		})
	}

	/**
   * Send data to Discord
   * @param data The data to send
   * @internal
   */
	public sendDiscord(data: any): void {
		this.manager.library.sendPacket(this.shardId, { op: 4, d: data }, false)
	}

	/**
   * Sets the server update data for this connection
   * @internal
   */
	public setServerUpdate(data: ServerUpdate): void {
		if (!data.endpoint) {
			this.emit('connectionUpdate', VoiceState.SESSION_ENDPOINT_MISSING)
			return
		}
		if (!this.sessionId) {
			this.emit('connectionUpdate', VoiceState.SESSION_ID_MISSING)
			return
		}

		this.lastRegion = this.region?.repeat(1) || null
		this.region = data.endpoint.split('.').shift()?.replace(/[0-9]/g, '') || null

		if (this.region && this.lastRegion !== this.region) {
			this.debugDiscord(
				`Voice Region Moved | Old Region: ${this.lastRegion} New Region: ${this.region}`
			)
		}

		this.serverUpdate = data
		this.emit('connectionUpdate', VoiceState.SESSION_READY)
		this.debugDiscord(`Server Update Received | Server: ${this.region}`)
	}

	/**
   * Update Session ID, Channel ID, Deafen status and Mute status of this instance
   * @internal
   */
	public setStateUpdate({
		session_id,
		channel_id,
		self_deaf,
		self_mute,
	}: StateUpdatePartial): void {
		this.lastvoiceId = this.voiceId?.repeat(1) || null
		this.voiceId = channel_id || null

		if (this.voiceId && this.lastvoiceId !== this.voiceId) {
			this.debugDiscord(`Channel Moved | Old Channel: ${this.voiceId}`)
		}

		if (!this.voiceId) {
			this.state = VoiceConnectState.DISCONNECTED
			this.debugDiscord('Channel Disconnected')
		}

		this.deaf = self_deaf
		this.mute = self_mute
		this.sessionId = session_id || null
		this.debugDiscord(`State Update Received | Channel: ${this.voiceId} Session ID: ${session_id}`)
	}

	/**
   * Disconnect from the voice channel
   * @returns RainlinkPlayer
   */
	public disconnect() {
		this.voiceId = null
		this.deaf = false
		this.mute = false
		this.removeAllListeners()
		this.sendVoiceUpdate()
		this.state = VoiceConnectState.DISCONNECTED
		this.debugDiscord('Voice disconnected')
	}

	protected debugDiscord(logs: string): void {
		this.manager.emit(
			RainlinkEvents.Debug,
			`[Rainlink] / [Player @ ${this.guildId}] / [Voice] | ${logs}`
		)
	}
}
