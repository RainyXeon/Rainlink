import { Rainlink } from '../Rainlink'
import { metadata } from '../metadata'
import { LavalinkLoadType, RainlinkEvents } from '../Interface/Constants'
import { RainlinkRequesterOptions } from '../Interface/Rest'
import { RainlinkNode } from '../Node/RainlinkNode'
import { AbstractDriver } from './AbstractDriver'
import util from 'node:util'
import { RainlinkWebsocket } from '../Utilities/RainlinkWebsocket'
import { LavalinkDecoder } from '../Utilities/LavalinkDecoder'
import { RainlinkFunctions } from '../Utilities/RainlinkFunctions'
import { RainlinkPlayer } from '../Player/RainlinkPlayer'

export enum Nodelink2loadType {
  SHORTS = 'shorts',
  ALBUM = 'album',
  ARTIST = 'artist',
  SHOW = 'show',
  EPISODE = 'episode',
  STATION = 'station',
  PODCAST = 'podcast',
}

export interface NodelinkGetLyricsInterface {
  loadType: Nodelink2loadType | LavalinkLoadType
  data:
    | {
        name: string
        synced: boolean
        data: {
          startTime: number
          endTime: number
          text: string
        }[]
        rtl: boolean
      }
    | Record<string, never>
}

export class Nodelink2 extends AbstractDriver {
	public id: string = 'nodelink/v2/nari'
	public wsUrl: string = ''
	public httpUrl: string = ''
	public sessionId: string | null
	public playerFunctions: RainlinkFunctions
	public functions: RainlinkFunctions
	protected wsClient?: RainlinkWebsocket

	constructor(
    public manager: Rainlink,
    public node: RainlinkNode
	) {
		super()
		this.sessionId = null
		this.playerFunctions = new RainlinkFunctions()
		this.functions = new RainlinkFunctions()
		this.wsUrl = `${this.node.options.secure ? 'wss' : 'ws'}://${this.node.options.host}:${this.node.options.port}/v4/websocket`
		this.httpUrl = `${this.node.options.secure ? 'https://' : 'http://'}${this.node.options.host}:${this.node.options.port}/v4`
		this.playerFunctions.set('getLyric', this.getLyric)
		this.functions.set('decode', this.decode)
	}

	public connect(): RainlinkWebsocket {
		const isResume = this.manager.rainlinkOptions.options!.resume

		const headers: Record<string, string | number> = {
			Authorization: this.node.options.auth,
			'user-id': String(this.manager.id),
			'accept-encoding': (process as any).isBun ? 'gzip, deflate' : 'br, gzip, deflate',
			'client-name': `${metadata.name}/${metadata.version} (${metadata.github})`,
			'user-agent': this.manager.rainlinkOptions.options!.userAgent!,
			'num-shards': String(this.manager.shardCount),
		}
		if (this.sessionId !== null && isResume) headers['session-id'] = this.sessionId

		const ws = new RainlinkWebsocket(this.wsUrl, {
			legacy: this.node.options.legacyWS,
			headers,
		})

		ws.on('open', () => {
			this.node.wsOpenEvent()
		})
		ws.on('message', (data) => this.wsMessageEvent(data))
		ws.on('error', (err) => this.node.wsErrorEvent(err))
		ws.on('close', (code, reason) => {
			this.node.wsCloseEvent(code, reason)
			ws.removeAllListeners()
		})
		this.wsClient = ws
		return ws
	}

	public async requester<D = any>(options: RainlinkRequesterOptions): Promise<D | undefined> {
		if (options.path.includes('/sessions') && this.sessionId == null)
			throw new Error('sessionId not initalized! Please wait for nodelink get connected!')
		const url = new URL(`${this.httpUrl}${options.path}`)
		if (options.params) url.search = new URLSearchParams(options.params).toString()

		if (options.data) {
			options.body = JSON.stringify(options.data)
		}

		const lavalinkHeaders = {
			authorization: this.node.options.auth,
			'user-agent': this.manager.rainlinkOptions.options!.userAgent!,
			'accept-encoding': (process as any).isBun ? 'gzip, deflate' : 'br, gzip, deflate',
			...options.headers,
		}

		options.headers = lavalinkHeaders

		if (options.path == '/decodetrack') {
			const data = this.decode(
				options.params ? (options.params as Record<string, string>).encodedTrack : ''
			) as D
			if (data) return data
		}

		const res = await fetch(url, options)

		if (res.status == 204) {
			this.debug(
				`${options.method ?? 'GET'} ${url.pathname + url.search} payload=${options.body ? String(options.body) : '{}'}`
			)
			return undefined
		}
		if (res.status !== 200) {
			this.debug(
				`${options.method ?? 'GET'} ${url.pathname + url.search} payload=${options.body ? String(options.body) : '{}'}`
			)
			this.debug(
				'Something went wrong with nodelink server. ' +
          `Status code: ${res.status}\n Headers: ${util.inspect(options.headers)}`
			)
			return undefined
		}

		const preFinalData = (await res.json()) as D
		let finalData: any = preFinalData

		if (finalData.loadType) {
			finalData = this.convertV4trackResponse(finalData) as D
		}

		this.debug(
			`${options.method ?? 'GET'} ${url.pathname + url.search} payload=${options.body ? String(options.body) : '{}'}`
		)

		return finalData
	}

	protected wsMessageEvent(data: string) {
		const wsData = JSON.parse(data.toString())
		this.node.wsMessageEvent(wsData)
	}

	protected debug(logs: string) {
		this.manager.emit(
			RainlinkEvents.Debug,
			`[Rainlink] / [Node @ ${this.node?.options.name}] / [Driver] / [Nodelink2] | ${logs}`
		)
	}

	public wsClose(): void {
		if (this.wsClient) this.wsClient.close(1006, 'Self closed')
	}

	protected convertV4trackResponse(nl2Data: Record<string, any>): Record<string, any> {
		if (!nl2Data) return {}
		switch (nl2Data.loadType) {
		case Nodelink2loadType.SHORTS: {
			nl2Data.loadType = LavalinkLoadType.TRACK
			return nl2Data
		}
		case Nodelink2loadType.ALBUM: {
			nl2Data.loadType = LavalinkLoadType.PLAYLIST
			return nl2Data
		}
		case Nodelink2loadType.ARTIST: {
			nl2Data.loadType = LavalinkLoadType.PLAYLIST
			return nl2Data
		}
		case Nodelink2loadType.EPISODE: {
			nl2Data.loadType = LavalinkLoadType.PLAYLIST
			return nl2Data
		}
		case Nodelink2loadType.STATION: {
			nl2Data.loadType = LavalinkLoadType.PLAYLIST
			return nl2Data
		}
		case Nodelink2loadType.PODCAST: {
			nl2Data.loadType = LavalinkLoadType.PLAYLIST
			return nl2Data
		}
		case Nodelink2loadType.SHOW: {
			nl2Data.loadType = LavalinkLoadType.PLAYLIST
			return nl2Data
		}
		}
		return nl2Data
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public async updateSession(sessionId: string, mode: boolean, timeout: number): Promise<void> {
		this.debug('WARNING: Nodelink doesn\'t support resuming, set resume to true is useless')
		return
	}

	public async getLyric(
		player: RainlinkPlayer,
		trackName?: string,
		language?: string
	): Promise<NodelinkGetLyricsInterface | undefined> {
		let track: string = String(player.queue.current?.encoded)
		if (trackName) {
			const nodeName = player.node.options.name
			const res = await player.search('trackName', { nodeName })
			if (res.tracks.length == 0) return undefined
			track = res.tracks[0].encoded
		}
		const options: RainlinkRequesterOptions = {
			path: '/loadlyrics',
			params: {
				encodedTrack: track,
				language: language ? language : 'en',
			},
			headers: { 'content-type': 'application/json' },
			method: 'GET',
		}
		const data = await player.node.driver.requester<NodelinkGetLyricsInterface>(options)
		return data
	}

	protected testJSON(text: string) {
		if (typeof text !== 'string') {
			return false
		}
		try {
			JSON.parse(text)
			return true
		} catch {
			return false
		}
	}

	protected decode(base64: string) {
		return new LavalinkDecoder(base64).getTrack ?? undefined
	}
}
