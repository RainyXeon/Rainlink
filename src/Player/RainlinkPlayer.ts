import { PlayOptions } from '../Interface/Player.js'
import { Rainlink } from '../Rainlink.js'
import { RainlinkNode } from '../Node/RainlinkNode.js'
import { RainlinkQueue } from './RainlinkQueue.js'
import {
	RainlinkEvents,
	RainlinkLoopMode,
	RainlinkPlayerState,
	VoiceConnectState,
} from '../Interface/Constants.js'
import { RainlinkTrack } from './RainlinkTrack.js'
import { UpdatePlayerInfo, UpdatePlayerOptions } from '../Interface/Rest.js'
import { RainlinkSearchOptions, RainlinkSearchResult } from '../Interface/Manager.js'
import { RainlinkDatabase } from '../Utilities/RainlinkDatabase.js'
import { RainlinkFilter } from './RainlinkFilter.js'
import { RainlinkVoice } from './RainlinkVoice.js'

/**
 * A class for managing player action.
 */
export class RainlinkPlayer {
	/**
   * Main manager class
   */
	public manager: Rainlink
	/**
   * Player's current using lavalink server
   */
	public node: RainlinkNode
	/**
   * Player's guild id
   */
	public guildId: string
	/**
   * Player's voice id
   */
	public voiceId: string | null
	/**
   * Player's text id
   */
	public textId: string
	/**
   * Player's queue
   */
	public readonly queue: RainlinkQueue
	/**
   * The temporary database of player, u can set any thing here and us like Map class!
   */
	public readonly data: RainlinkDatabase<unknown>
	/**
   * Whether the player is paused or not
   */
	public paused: boolean = true
	/**
   * Get the current track's position of the player
   */
	public position: number = 0
	/**
   * Get the current volume of the player
   */
	public volume: number
	/**
   * Whether the player is playing or not
   */
	public playing: boolean = false
	/**
   * Get the current loop mode of the player
   */
	public loop: RainlinkLoopMode
	/**
   * Get the current state of the player
   */
	public state: RainlinkPlayerState
	/**
   * Whether the player is deafened or not
   */
	public deaf: boolean
	/**
   * Whether the player is muted or not
   */
	public mute: boolean
	/**
   * ID of the current track
   */
	public track: string | null = null
	/**
   * All function to extend support driver
   */
	public functions: RainlinkDatabase<(...args: any) => unknown>
	/**
   * ID of the Shard that contains the guild that contains the connected voice channel
   */
	public shardId: number
	/**
   * Filter class to set, clear get the current filter data
   */
	public filter: RainlinkFilter
	/**
   * Voice handler class
   */
	public voice: RainlinkVoice
	/** @ignore */
	public sudoDestroy: boolean = false

	/**
   * The rainlink player handler class
   * @param manager The rainlink manager
   * @param voiceOptions The rainlink voice option, use VoiceChannelOptions interface
   * @param node The rainlink current use node
   */
	constructor(manager: Rainlink, voice: RainlinkVoice, node: RainlinkNode) {
		this.voice = voice
		this.manager = manager
		const rainlinkOptions = this.manager.rainlinkOptions.options!
		this.guildId = this.voice.guildId
		this.voiceId = this.voice.voiceId
		this.shardId = this.voice.shardId
		this.mute = this.voice.mute ?? false
		this.deaf = this.voice.deaf ?? false
		this.node = node
		this.guildId = this.voice.guildId
		this.voiceId = this.voice.voiceId
		this.textId = this.voice.options.textId
		const customQueue = rainlinkOptions.structures && rainlinkOptions.structures.queue
		this.queue = customQueue
			? new customQueue(this.manager, this)
			: new RainlinkQueue(this.manager, this)
		this.data = new RainlinkDatabase<unknown>()
		if (rainlinkOptions.structures && rainlinkOptions.structures.filter)
			this.filter = new rainlinkOptions.structures.filter(this)
		else this.filter = new RainlinkFilter(this)
		this.volume = rainlinkOptions.defaultVolume!
		this.loop = RainlinkLoopMode.NONE
		this.state = RainlinkPlayerState.DESTROYED
		this.deaf = this.voice.deaf ?? false
		this.mute = this.voice.mute ?? false
		this.functions = new RainlinkDatabase<(...args: any) => unknown>()
		if (this.node.driver.playerFunctions.size !== 0) {
			this.node.driver.playerFunctions.forEach((data, key) => {
				this.functions.set(key, data.bind(null, this))
			})
		}
		if (this.voice.options.volume && this.voice.options.volume !== this.volume)
			this.volume = this.voice.options.volume
	}

	/**
   * Sends server update to lavalink
   * @internal
   */
	public async sendServerUpdate(): Promise<void> {
		const playerUpdate = {
			guildId: this.guildId,
			playerOptions: {
				voice: {
					token: this.voice.serverUpdate!.token,
					endpoint: this.voice.serverUpdate!.endpoint,
					sessionId: this.voice.sessionId!,
				},
			},
		}
		await this.node.rest.updatePlayer(playerUpdate)
	}

	/**
   * Destroy the player
   * @internal
   */
	public async destroy(): Promise<void> {
		this.checkDestroyed()
		this.sudoDestroy = true
		if (this.playing)
			await this.node.rest.updatePlayer({
				guildId: this.guildId,
				playerOptions: {
					track: {
						encoded: null,
						length: 0,
					},
				},
			})
		this.clear(false)
		this.disconnect()
		await this.node.rest.destroyPlayer(this.guildId)
		this.manager.players.delete(this.guildId)
		this.state = RainlinkPlayerState.DESTROYED
		this.debug('Player destroyed')
		this.voiceId = ''
		this.manager.emit(RainlinkEvents.PlayerDestroy, this)
		this.sudoDestroy = false
	}

	/**
   * Play a track
   * @param track Track to play
   * @param options Play options
   * @returns RainlinkPlayer
   */
	public async play(track?: RainlinkTrack, options?: PlayOptions): Promise<RainlinkPlayer> {
		this.checkDestroyed()

		if (track && !(track instanceof RainlinkTrack)) throw new Error('track must be a RainlinkTrack')

		if (!track && !this.queue.totalSize) throw new Error('No track is available to play')

		if (!options || typeof options.replaceCurrent !== 'boolean')
			options = { ...options, replaceCurrent: false }

		if (track) {
			if (!options.replaceCurrent && this.queue.current) this.queue.unshift(this.queue.current)
			this.queue.current = track
		} else if (!this.queue.current) this.queue.current = this.queue.shift()

		if (!this.queue.current) throw new Error('No track is available to play')

		const current = this.queue.current

		let errorMessage: string | undefined

		const resolveResult = await current.resolver(this).catch((e: any) => {
			errorMessage = e.message
			return null
		})

		if (!resolveResult || (resolveResult && !resolveResult.isPlayable)) {
			this.manager.emit(RainlinkEvents.TrackResolveError, this, current, errorMessage!)
			this.debug(`Player resolve error: ${errorMessage}`)
			this.queue.current = null
			this.queue.size
				? await this.play()
				: this.manager.emit(RainlinkEvents.QueueEmpty, this, this.queue)
			return this
		}

		this.playing = true
		this.track = current.encoded

		const playerOptions: UpdatePlayerOptions = {
			track: {
				encoded: current.encoded,
				length: current.duration,
			},
			...options,
			volume: this.volume,
		}

		if (playerOptions.paused) {
			this.paused = playerOptions.paused
			this.playing = !this.paused
		}
		if (playerOptions.position) this.position = playerOptions.position

		await this.node.rest.updatePlayer({
			guildId: this.guildId,
			noReplace: options?.noReplace ?? false,
			playerOptions,
		})

		return this
	}

	/**
   * Set the loop mode of the track
   * @param mode Mode to loop
   * @returns RainlinkPlayer
   */
	public setLoop(mode: RainlinkLoopMode): RainlinkPlayer {
		this.checkDestroyed()
		this.loop = mode
		return this
	}

	/**
   * Search track directly from player
   * @param query The track search query link
   * @param options The track search options
   * @returns RainlinkSearchResult
   */
	public async search(
		query: string,
		options?: RainlinkSearchOptions
	): Promise<RainlinkSearchResult> {
		this.checkDestroyed()
		return await this.manager.search(query, {
			nodeName: this.node.options.name,
			...options,
		})
	}

	/**
   * Pause the track
   * @returns RainlinkPlayer
   */
	public async pause(): Promise<RainlinkPlayer> {
		this.checkDestroyed()
		if (this.paused == true) return this
		await this.node.rest.updatePlayer({
			guildId: this.guildId,
			playerOptions: {
				paused: true,
			},
		})
		this.paused = true
		this.playing = false
		this.manager.emit(RainlinkEvents.PlayerPause, this, this.queue.current!)
		return this
	}

	/**
   * Resume the track
   * @returns RainlinkPlayer
   */
	public async resume(): Promise<RainlinkPlayer> {
		this.checkDestroyed()
		if (this.paused == false) return this
		await this.node.rest.updatePlayer({
			guildId: this.guildId,
			playerOptions: {
				paused: false,
			},
		})
		this.paused = false
		this.playing = true
		this.manager.emit(RainlinkEvents.PlayerResume, this, this.queue.current!)
		return this
	}

	/**
   * Pause or resume a track but different method
   * @param mode Whether to pause or not
   * @returns RainlinkPlayer
   */
	public async setPause(mode: boolean): Promise<RainlinkPlayer> {
		this.checkDestroyed()
		if (this.paused == mode) return this
		await this.node.rest.updatePlayer({
			guildId: this.guildId,
			playerOptions: {
				paused: mode,
			},
		})
		this.paused = mode
		this.playing = !mode
		this.manager.emit(
			mode ? RainlinkEvents.PlayerPause : RainlinkEvents.PlayerResume,
			this,
      this.queue.current!
		)
		return this
	}

	/**
   * Play the previous track
   * @returns RainlinkPlayer
   */
	public async previous(): Promise<RainlinkPlayer> {
		this.checkDestroyed()
		const prevoiusData = this.queue.previous
		const current = this.queue.current
		const index = prevoiusData.length - 1
		if (index === -1 || !current) return this
		await this.play(prevoiusData[index])
		this.queue.previous.splice(index, 1)
		return this
	}

	/**
   * Get all previous track
   * @returns RainlinkTrack[]
   */
	public getPrevious(): RainlinkTrack[] {
		this.checkDestroyed()
		return this.queue.previous
	}

	/**
   * Skip the current track
   * @returns RainlinkPlayer
   */
	public async skip(): Promise<RainlinkPlayer> {
		this.checkDestroyed()
		await this.node.rest.updatePlayer({
			guildId: this.guildId,
			playerOptions: {
				track: {
					encoded: null,
				},
			},
		})
		return this
	}

	/**
   * Seek to another position in track
   * @param position Position to seek
   * @returns RainlinkPlayer
   */
	public async seek(position: number): Promise<RainlinkPlayer> {
		this.checkDestroyed()
		if (!this.queue.current) throw new Error('Player has no current track in it\'s queue')
		if (!this.queue.current.isSeekable) throw new Error('The current track isn\'t seekable')

		position = Number(position)

		if (isNaN(position)) throw new Error('position must be a number')
		if (position < 0 || position > (this.queue.current.duration ?? 0))
			position = Math.max(Math.min(position, this.queue.current.duration ?? 0), 0)

		await this.node.rest.updatePlayer({
			guildId: this.guildId,
			playerOptions: {
				position: position,
			},
		})
		this.queue.current.position = position
		return this
	}

	/**
   * Set another volume in player
   * @param volume Volume to cange
   * @returns RainlinkPlayer
   */
	public async setVolume(volume: number): Promise<RainlinkPlayer> {
		this.checkDestroyed()
		if (isNaN(volume)) throw new Error('volume must be a number')
		await this.node.rest.updatePlayer({
			guildId: this.guildId,
			playerOptions: {
				volume: volume,
			},
		})
		this.volume = volume
		return this
	}

	/**
   * Set player to mute or unmute
   * @param enable Enable or not
   * @returns RainlinkPlayer
   */
	public setMute(enable: boolean): RainlinkPlayer {
		this.checkDestroyed()
		if (enable == this.mute) return this
		this.mute = enable
		this.voice.mute = this.mute
		this.voice.sendVoiceUpdate()
		return this
	}

	/**
   * Stop all avtivities and reset to default
   * @param destroy Whenever you want to destroy a player or not
   * @returns RainlinkPlayer
   */
	public async stop(destroy: boolean): Promise<RainlinkPlayer> {
		this.checkDestroyed()

		if (destroy) {
			await this.destroy()
			return this
		}

		this.clear(false)

		await this.node.rest.updatePlayer({
			guildId: this.guildId,
			playerOptions: {
				track: {
					encoded: null,
				},
			},
		})
		this.manager.emit(RainlinkEvents.TrackEnd, this, this.queue.current!)

		return this
	}

	/**
   * Reset all data to default
   * @param emitEmpty Whenever emit empty event or not
   */
	public clear(emitEmpty: boolean): void {
		this.loop = RainlinkLoopMode.NONE
		this.queue.clear()
		this.queue.current = undefined
		this.queue.previous.length = 0
		this.volume = this.manager.rainlinkOptions!.options!.defaultVolume ?? 100
		this.paused = true
		this.playing = false
		this.track = null
		this.data.clear()
		this.position = 0
		if (emitEmpty) this.manager.emit(RainlinkEvents.QueueEmpty, this, this.queue)
		return
	}

	/**
   * Set player to deaf or undeaf
   * @param enable Enable or not
   * @returns RainlinkPlayer
   */
	public setDeaf(enable: boolean): RainlinkPlayer {
		this.checkDestroyed()
		if (enable == this.deaf) return this
		this.deaf = enable
		this.voice.deaf = this.deaf
		this.voice.sendVoiceUpdate()
		return this
	}

	/**
   * Disconnect from the voice channel
   * @returns RainlinkPlayer
   */
	public disconnect(): RainlinkPlayer {
		this.checkDestroyed()
		if (this.voice.state === VoiceConnectState.DISCONNECTED) return this
		this.voiceId = null
		this.deaf = false
		this.mute = false
		this.voice.disconnect()
		this.pause()
		this.state = RainlinkPlayerState.DISCONNECTED
		this.debug('Player disconnected')
		return this
	}

	/**
   * Set text channel
   * @param textId Text channel ID
   * @returns RainlinkPlayer
   */
	public setTextChannel(textId: string): RainlinkPlayer {
		this.checkDestroyed()
		this.textId = textId
		return this
	}

	/**
   * Set voice channel and move the player to the voice channel
   * @param voiceId Voice channel ID
   * @returns RainlinkPlayer
   */
	public setVoiceChannel(voiceId: string): RainlinkPlayer {
		this.checkDestroyed()
		this.disconnect()
		this.voiceId = voiceId
		this.voice.voiceId = voiceId
		this.voice.connect()
		this.debugDiscord(`Player moved to voice channel ${voiceId}`)
		return this
	}

	/**
   * Send custom player update data to lavalink server
   * @param data Data to change
   * @returns RainlinkPlayer
   */
	public async send(data: UpdatePlayerInfo): Promise<RainlinkPlayer> {
		this.checkDestroyed()
		await this.node.rest.updatePlayer(data)
		return this
	}

	protected debug(logs: string): void {
		this.manager.emit(RainlinkEvents.Debug, `[Rainlink] / [Player @ ${this.guildId}] | ${logs}`)
	}

	protected checkDestroyed(): void {
		if (this.state === RainlinkPlayerState.DESTROYED) throw new Error('Player is destroyed')
	}

	protected debugDiscord(logs: string): void {
		this.manager.emit(
			RainlinkEvents.Debug,
			`[Rainlink] / [Player @ ${this.guildId}] / [Voice] | ${logs}`
		)
	}
}
