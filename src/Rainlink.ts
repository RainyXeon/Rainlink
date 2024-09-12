import {
	RainlinkAdditionalOptions,
	RainlinkOptions,
	RainlinkSearchOptions,
	RainlinkSearchResult,
	RainlinkSearchResultType,
	Constructor,
} from './Interface/Manager'
import { EventEmitter } from 'node:events'
import { AbstractLibrary } from './Library/AbstractLibrary'
import { VoiceChannelOptions } from './Interface/Player'
import { RainlinkPlayerManager } from './Manager/RainlinkPlayerManager'
import { RainlinkNodeManager } from './Manager/RainlinkNodeManager'
import {
	LavalinkLoadType,
	RainlinkEvents,
	RainlinkPluginType,
	SourceIDs,
} from './Interface/Constants'
import { RainlinkTrack } from './Player/RainlinkTrack'
import { RawTrack } from './Interface/Rest'
import { RainlinkPlayer } from './Player/RainlinkPlayer'
import { SourceRainlinkPlugin } from './Plugin/SourceRainlinkPlugin'
import { metadata } from './metadata'
import { RainlinkPlugin } from './Plugin/RainlinkPlugin'
import { AbstractDriver } from './Drivers/AbstractDriver'
import { Lavalink3 } from './Drivers/Lavalink3'
import { Nodelink2 } from './Drivers/Nodelink2'
import { Lavalink4 } from './Drivers/Lavalink4'
import { RainlinkDatabase } from './Utilities/RainlinkDatabase'
import { FrequenC } from './Drivers/FrequenC'
import { RainlinkEventsInterface } from './Interface/Events'

/** The heart of Rainlink. Manage all package action */
export class Rainlink extends EventEmitter {
	/**
   * Discord library connector
   */
	public readonly library: AbstractLibrary
	/**
   * Lavalink server that has been configured
   */
	public nodes: RainlinkNodeManager
	/**
   * Rainlink options
   */
	public rainlinkOptions: RainlinkOptions
	/**
   * Bot id
   */
	public id: string | undefined
	/**
   * Player maps
   */
	public players: RainlinkPlayerManager
	/**
   * All search engine
   */
	public searchEngines: RainlinkDatabase<string>
	/**
   * All search plugins (resolver plugins)
   */
	public searchPlugins: RainlinkDatabase<SourceRainlinkPlugin>
	/**
   * All plugins (include resolver plugins)
   */
	public plugins: RainlinkDatabase<RainlinkPlugin>
	/**
   * The rainlink manager
   */
	public drivers: Constructor<AbstractDriver>[]
	/**
   * The current bott's shard count
   */
	public shardCount: number = 1

	/**
   * The main class that handle all works in lavalink server.
   * Call this class by using new Rainlink(your_params) to use!
   * @param options The main ranlink options
   */
	constructor(options: RainlinkOptions) {
		super()
		if (!options.library)
			throw new Error(
				'Please set an new lib to connect, example: \nlibrary: new Library.DiscordJS(client) '
			)
		this.library = options.library.set(this)
		this.drivers = [Lavalink3, Nodelink2, Lavalink4, FrequenC]
		this.rainlinkOptions = options
		this.rainlinkOptions.options = this.mergeDefault<RainlinkAdditionalOptions>(
			this.defaultOptions,
			this.rainlinkOptions.options ?? {}
		)
		if (
			this.rainlinkOptions.options.additionalDriver &&
      this.rainlinkOptions.options.additionalDriver?.length !== 0
		)
			this.drivers.push(...this.rainlinkOptions.options.additionalDriver)
		this.nodes = new RainlinkNodeManager(this)
		this.players = new RainlinkPlayerManager(this)
		this.searchEngines = new RainlinkDatabase<string>()
		this.searchPlugins = new RainlinkDatabase<SourceRainlinkPlugin>()
		this.plugins = new RainlinkDatabase<RainlinkPlugin>()
		this.initialSearchEngines()
		if (
			!this.rainlinkOptions.options.defaultSearchEngine ||
      this.rainlinkOptions.options.defaultSearchEngine.length == 0
		)
			this.rainlinkOptions.options.defaultSearchEngine == 'youtube'

		if (this.rainlinkOptions.plugins) {
			for (const [, plugin] of this.rainlinkOptions.plugins.entries()) {
				if (!plugin.isRainlinkPlugin)
					throw new Error('Plugin must be an instance of RainlinkPlugin or SourceRainlinkPlugin')
				plugin.load(this)

				this.plugins.set(plugin.name(), plugin)

				if (plugin.type() == RainlinkPluginType.SourceResolver) {
					const newPlugin = plugin as SourceRainlinkPlugin
					const sourceName = newPlugin.sourceName()
					const sourceIdentify = newPlugin.sourceIdentify()
					this.searchEngines.set(sourceName, sourceIdentify)
					this.searchPlugins.set(sourceName, newPlugin)
				}
			}
		}
		this.library.listen(this.rainlinkOptions.nodes)
	}

	protected initialSearchEngines() {
		for (const data of SourceIDs) {
			this.searchEngines.set(data.name, data.id)
		}
	}

	/**
   * Create a new player.
   * @returns RainlinkNode
   */
	async create(options: VoiceChannelOptions): Promise<RainlinkPlayer> {
		return await this.players.create(options)
	}

	/**
   * Destroy a specific player.
   * @returns void
   */
	async destroy(guildId: string): Promise<void> {
		this.players.destroy(guildId)
	}

	/**
   * Search a specific track.
   * @returns RainlinkSearchResult
   */
	async search(query: string, options?: RainlinkSearchOptions): Promise<RainlinkSearchResult> {
		const node =
      options && options?.nodeName
      	? this.nodes.get(options.nodeName) ?? (await this.nodes.getLeastUsed())
      	: await this.nodes.getLeastUsed()

		if (!node) throw new Error('No node is available')

		let pluginData: RainlinkSearchResult

		const directSearchRegex = /directSearch=(.*)/
		const isDirectSearch = directSearchRegex.exec(query)
		const isUrl = /^https?:\/\/.*/.test(query)

		const pluginSearch = this.searchPlugins.get(String(options?.engine))

		if (
			options &&
      options!.engine &&
      options!.engine !== null &&
      pluginSearch &&
      isDirectSearch == null
		) {
			pluginData = await pluginSearch.searchDirect(query, options)
			if (pluginData.tracks.length !== 0) return pluginData
		}

		const source =
      options && options?.engine
      	? this.searchEngines.get(options.engine)
      	: this.searchEngines.get(
            this.rainlinkOptions.options!.defaultSearchEngine
            	? this.rainlinkOptions.options!.defaultSearchEngine
            	: 'youtube'
      	)

		const finalQuery =
      isDirectSearch !== null ? isDirectSearch[1] : !isUrl ? `${source}search:${query}` : query

		const result = await node.rest.resolver(finalQuery).catch(() => null)
		if (!result || result.loadType === LavalinkLoadType.EMPTY) {
			return this.buildSearch(undefined, [], RainlinkSearchResultType.SEARCH)
		}

		let loadType: RainlinkSearchResultType
		let normalizedData: {
      playlistName?: string
      tracks: RawTrack[]
    } = { tracks: [] }
		switch (result.loadType) {
		case LavalinkLoadType.TRACK: {
			loadType = RainlinkSearchResultType.TRACK
			normalizedData.tracks = [result.data]
			break
		}

		case LavalinkLoadType.PLAYLIST: {
			loadType = RainlinkSearchResultType.PLAYLIST
			normalizedData = {
				playlistName: result.data.info.name,
				tracks: result.data.tracks,
			}
			break
		}

		case LavalinkLoadType.SEARCH: {
			loadType = RainlinkSearchResultType.SEARCH
			normalizedData.tracks = result.data
			break
		}

		default: {
			loadType = RainlinkSearchResultType.SEARCH
			normalizedData.tracks = []
			break
		}
		}

		this.emit(
			RainlinkEvents.Debug,
			`[Rainlink] / [Search] | Searched ${query}; Track results: ${normalizedData.tracks.length}`
		)

		return this.buildSearch(
			normalizedData.playlistName ?? undefined,
			normalizedData.tracks.map(
				(track) =>
					new RainlinkTrack(
						track,
						options && options.requester ? options.requester : undefined,
						node.driver.id
					)
			),
			loadType
		)
	}

	protected buildSearch(
		playlistName?: string,
		tracks: RainlinkTrack[] = [],
		type?: RainlinkSearchResultType
	): RainlinkSearchResult {
		return {
			playlistName,
			tracks,
			type: type ?? RainlinkSearchResultType.SEARCH,
		}
	}

	protected get defaultOptions(): RainlinkAdditionalOptions {
		return {
			additionalDriver: [],
			retryTimeout: 3000,
			retryCount: 15,
			voiceConnectionTimeout: 15000,
			defaultSearchEngine: 'youtube',
			defaultVolume: 100,
			searchFallback: {
				enable: true,
				engine: 'soundcloud',
			},
			resume: false,
			userAgent: `Discord/Bot/${metadata.name}/${metadata.version} (${metadata.github})`,
			nodeResolver: undefined,
			structures: {
				player: undefined,
				rest: undefined,
				queue: undefined,
				filter: undefined,
			},
			resumeTimeout: 300,
		}
	}

	// Modded from:
	// https://github.com/shipgirlproject/Shoukaku/blob/2677ecdf123ffef1c254c2113c5342b250ac4396/src/Utils.ts#L9-L23
	protected mergeDefault<T extends { [key: string]: any }>(def: T, given: T): Required<T> {
		if (!given) return def as Required<T>
		const defaultKeys: (keyof T)[] = Object.keys(def)
		for (const key in given) {
			if (defaultKeys.includes(key)) continue
			if (this.isNumber(key)) continue
			delete given[key]
		}
		for (const key of defaultKeys) {
			if (Array.isArray(given[key]) && given[key] !== null && given[key] !== undefined) {
				if (given[key].length == 0) given[key] = def[key]
			}
			if (def[key] === null || (typeof def[key] === 'string' && def[key].length === 0)) {
				if (!given[key]) given[key] = def[key]
			}
			if (given[key] === null || given[key] === undefined) given[key] = def[key]
			if (typeof given[key] === 'object' && given[key] !== null) {
				this.mergeDefault(def[key], given[key])
			}
		}
		return given as Required<T>
	}

	protected isNumber(data: string): boolean {
		return /^[+-]?\d+(\.\d+)?$/.test(data)
	}

	/** @ignore */
	public on<K extends keyof RainlinkEventsInterface>(
		event: K,
		listener: (...args: RainlinkEventsInterface[K]) => void
	): this {
		super.on(event as string, (...args: any) => listener(...args))
		return this
	}

	/** @ignore */
	public once<K extends keyof RainlinkEventsInterface>(
		event: K,
		listener: (...args: RainlinkEventsInterface[K]) => void
	): this {
		super.once(event as string, (...args: any) => listener(...args))
		return this
	}

	/** @ignore */
	public off<K extends keyof RainlinkEventsInterface>(
		event: K,
		listener: (...args: RainlinkEventsInterface[K]) => void
	): this {
		super.off(event as string, (...args: any) => listener(...args))
		return this
	}

	/** @ignore */
	public emit<K extends keyof RainlinkEventsInterface>(
		event: K,
		...data: RainlinkEventsInterface[K]
	): boolean {
		return super.emit(event as string, ...data)
	}
}
