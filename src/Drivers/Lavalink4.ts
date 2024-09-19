import { Rainlink } from '../Rainlink'
import { metadata } from '../metadata'
import { RainlinkEvents } from '../Interface/Constants'
import { RainlinkRequesterOptions } from '../Interface/Rest'
import { RainlinkNode } from '../Node/RainlinkNode'
import { AbstractDriver } from './AbstractDriver'
import util from 'node:util'
import { RainlinkWebsocket } from '../Utilities/RainlinkWebsocket'
import { LavalinkDecoder } from '../Utilities/LavalinkDecoder'
import { RainlinkFunctions } from '../Utilities/RainlinkFunctions'

export class Lavalink4 extends AbstractDriver {
	public id: string = 'lavalink/v4/koinu'
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
		this.playerFunctions = new RainlinkFunctions()
		this.functions = new RainlinkFunctions()
		this.sessionId = null
		this.wsUrl = `${this.node.options.secure ? 'wss' : 'ws'}://${this.node.options.host}:${this.node.options.port}/v4/websocket`
		this.httpUrl = `${this.node.options.secure ? 'https://' : 'http://'}${this.node.options.host}:${this.node.options.port}/v4`
		this.functions.set('decode', this.decode)
	}

	public connect(): RainlinkWebsocket {
		const isResume = this.manager.rainlinkOptions.options!.resume

		const headers: Record<string, string | number> = {
			Authorization: this.node.options.auth,
			'user-id': String(this.manager.id),
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
			throw new Error('sessionId not initalized! Please wait for lavalink get connected!')
		const url = new URL(`${this.httpUrl}${options.path}`)
		if (options.params) url.search = new URLSearchParams(options.params).toString()

		if (options.data) {
			options.body = JSON.stringify(options.data)
		}

		const lavalinkHeaders = {
			authorization: this.node.options.auth,
			'user-agent': this.manager.rainlinkOptions.options!.userAgent!,
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
				`${options.method ?? 'GET'} ${options.path} payload=${options.body ? String(options.body) : '{}'}`
			)
			this.debug(
				'Something went wrong with lavalink server. ' +
          `Status code: ${res.status}\n Headers: ${util.inspect(options.headers)}`
			)
			return undefined
		}

		const finalData = await res.json()

		this.debug(
			`${options.method ?? 'GET'} ${url.pathname + url.search} payload=${options.body ? String(options.body) : '{}'}`
		)

		return finalData as D
	}

	protected wsMessageEvent(data: string) {
		const wsData = JSON.parse(data.toString())
		this.node.wsMessageEvent(wsData)
	}

	protected debug(logs: string) {
		this.manager.emit(
			RainlinkEvents.Debug,
			`[Rainlink] / [Node @ ${this.node?.options.name}] / [Driver] / [Lavalink4] | ${logs}`
		)
	}

	public wsClose(): void {
		if (this.wsClient) this.wsClient.close(1006, 'Self closed')
	}

	public async updateSession(sessionId: string, mode: boolean, timeout: number): Promise<void> {
		const options: RainlinkRequesterOptions = {
			path: `/sessions/${sessionId}`,
			headers: { 'content-type': 'application/json' },
			method: 'PATCH',
			data: {
				resuming: mode,
				timeout: timeout,
			},
		}

		await this.requester<{ resuming: boolean; timeout: number }>(options)
		this.debug(`Session updated! resume: ${mode}, timeout: ${timeout}`)
		return
	}

	protected decode(base64: string) {
		return new LavalinkDecoder(base64).getTrack ?? undefined
	}
}
