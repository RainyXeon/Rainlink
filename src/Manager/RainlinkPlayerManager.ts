import { RainlinkEvents, RainlinkPlayerState, VoiceState } from '../Interface/Constants'
import { VoiceChannelOptions } from '../Interface/Player'
import { RainlinkPlayer } from '../Player/RainlinkPlayer'
import { RainlinkVoice } from '../Player/RainlinkVoice'
import { Rainlink } from '../Rainlink'
import { RainlinkDatabase } from '../Utilities/RainlinkDatabase'

/** The node manager class for managing all active players */
export class RainlinkPlayerManager extends RainlinkDatabase<RainlinkPlayer> {
	/** The rainlink manager */
	public manager: Rainlink

	/**
   * The main class for handling lavalink players
   * @param manager The rainlink manager
   */
	constructor(manager: Rainlink) {
		super()
		this.manager = manager
	}

	/**
   * Create a player
   * @returns RainlinkPlayer
   * @internal
   */
	async create(options: VoiceChannelOptions): Promise<RainlinkPlayer> {
		// Check player exist
		const createdPlayer = this.get(options.guildId)
		if (createdPlayer) return createdPlayer

		// Check voice
		const getCurrVoice = this.manager.voices.get(options.guildId)
		if (getCurrVoice) getCurrVoice.disconnect()

		// Create voice handler
		const voiceHandler = new RainlinkVoice(this.manager, options)
		this.manager.voices.set(options.guildId, voiceHandler)
		// eslint-disable-next-line no-useless-catch
		try {
			await voiceHandler.connect()
		} catch (err) {
			throw err
		}

		// Get node
		let getCustomNode = this.manager.nodes.get(String(options.nodeName ? options.nodeName : ''))
		const reigonedNode = this.manager.nodes.full
			.filter(([, node]) => node.options.region)
			.map(([, node]) => node)
		if (!getCustomNode && voiceHandler.region && reigonedNode.length !== 0) {
			const node = reigonedNode.filter((node) => node.options.region == voiceHandler.region)
			if (node) getCustomNode = await this.manager.nodes.getLeastUsed(node)
		}
		const node = getCustomNode ? getCustomNode : await this.manager.nodes.getLeastUsed()
		if (!node) throw new Error('Can\'t find any nodes to connect on')

		// Create player
		const customPlayer =
      this.manager.rainlinkOptions.options!.structures &&
      this.manager.rainlinkOptions.options!.structures.player
		const player = customPlayer
			? new customPlayer(this.manager, voiceHandler, node)
			: new RainlinkPlayer(this.manager, voiceHandler, node)
		this.set(player.guildId, player)

		// Send server update
		const onUpdate = (state: VoiceState) => {
			if (state !== VoiceState.SESSION_READY) return
			player.sendServerUpdate()
		}
		await player.sendServerUpdate()
		voiceHandler.on('connectionUpdate', onUpdate)

		// Finishing up
		player.state = RainlinkPlayerState.CONNECTED
		this.debug('Player created at ' + options.guildId)
		this.manager.emit(RainlinkEvents.PlayerCreate, player)
		return player
	}

	/**
   * Destroy a player
   * @returns The destroyed / disconnected player or undefined if none
   * @internal
   */
	public async destroy(guildId: string = ''): Promise<void> {
		const player = this.get(guildId)
		if (player) await player.destroy()
	}

	protected debug(logs: string) {
		this.manager.emit(RainlinkEvents.Debug, `[Rainlink] / [PlayerManager] | ${logs}`)
	}
}
