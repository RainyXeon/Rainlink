import { Rainlink } from '../Rainlink';
import { metadata } from '../metadata';
import { RainlinkEvents } from '../Interface/Constants';
import { RainlinkRequesterOptions, RawTrack } from '../Interface/Rest';
import { RainlinkNode } from '../Node/RainlinkNode';
import { AbstractDriver } from './AbstractDriver';
import util from 'node:util';
import { RainlinkPlayer } from '../Player/RainlinkPlayer';
import { RainlinkWebsocket } from '../Utilities/RainlinkWebsocket';
import { RainlinkDatabase } from '../Utilities/RainlinkDatabase';

export class Lavalink4 extends AbstractDriver {
	public id: string = 'lavalink/v4/koinu';
	public wsUrl: string = '';
	public httpUrl: string = '';
	public sessionId: string | null;
	public playerFunctions: RainlinkDatabase<(player: RainlinkPlayer, ...args: any) => unknown>;
	public functions: RainlinkDatabase<(manager: Rainlink, ...args: any) => unknown>;
	protected wsClient?: RainlinkWebsocket;
	public manager: Rainlink | null = null;
	public node: RainlinkNode | null = null;

	constructor() {
		super();
		this.playerFunctions = new RainlinkDatabase<(player: RainlinkPlayer, ...args: any) => unknown>();
		this.functions = new RainlinkDatabase<(manager: Rainlink, ...args: any) => unknown>();
		this.sessionId = null;
	}

	public get isRegistered(): boolean {
		return (
			this.manager !== null && this.node !== null && this.wsUrl.length !== 0 && this.httpUrl.length !== 0
		);
	}

	public initial(manager: Rainlink, node: RainlinkNode): void {
		this.manager = manager;
		this.node = node;
		this.wsUrl = `${this.node.options.secure ? 'wss' : 'ws'}://${this.node.options.host}:${this.node.options.port}/v4/websocket`;
		this.httpUrl = `${this.node.options.secure ? 'https://' : 'http://'}${this.node.options.host}:${this.node.options.port}/v4`;
		this.functions.set('decode', this.decode);
	}

	public connect(): RainlinkWebsocket {
		if (!this.isRegistered) throw new Error(`Driver ${this.id} not registered by using initial()`);
		const isResume = this.manager!.rainlinkOptions.options!.resume;
		const ws = new RainlinkWebsocket(this.wsUrl, {
			headers: {
				Authorization: this.node!.options.auth,
				'user-id': this.manager!.id,
				'client-name': `${metadata.name}/${metadata.version} (${metadata.github})`,
				'session-id': this.sessionId !== null && isResume ? this.sessionId : '',
				'user-agent': this.manager!.rainlinkOptions.options!.userAgent!,
				'num-shards': this.manager!.shardCount,
			},
		});

		ws.on('open', () => {
      this.node!.wsOpenEvent();
		});
		ws.on('message', data => this.wsMessageEvent(data));
		ws.on('error', err => this.node!.wsErrorEvent(err));
		ws.on('close', (code: number, reason: Buffer) => {
      this.node!.wsCloseEvent(code, reason);
      ws.removeAllListeners();
		});
		this.wsClient = ws;
		return ws;
	}

	public async requester<D = any>(options: RainlinkRequesterOptions): Promise<D | undefined> {
		if (!this.isRegistered) throw new Error(`Driver ${this.id} not registered by using initial()`);
		if (options.path.includes('/sessions') && this.sessionId == null)
			throw new Error('sessionId not initalized! Please wait for lavalink get connected!');
		const url = new URL(`${this.httpUrl}${options.path}`);
		if (options.params) url.search = new URLSearchParams(options.params).toString();

		if (options.data) {
			options.body = JSON.stringify(options.data);
		}

		const lavalinkHeaders = {
			authorization: this.node!.options.auth,
			'user-agent': this.manager!.rainlinkOptions.options!.userAgent!,
			...options.headers,
		};

		options.headers = lavalinkHeaders;

		if (options.path == '/decodetrack') {
			const data = this.decode(
				options.params ? (options.params as Record<string, string>).encodedTrack : '',
			) as D;
			if (data) return data;
		}

		const res = await fetch(url, options);

		if (res.status == 204) {
			this.debug(
				`${options.method ?? 'GET'} ${url.pathname + url.search} payload=${options.body ? String(options.body) : '{}'}`,
			);
			return undefined;
		}
		if (res.status !== 200) {
			this.debug(
				`${options.method ?? 'GET'} ${options.path} payload=${options.body ? String(options.body) : '{}'}`,
			);
			this.debug(
				'Something went wrong with lavalink server. ' +
          `Status code: ${res.status}\n Headers: ${util.inspect(options.headers)}`,
			);
			return undefined;
		}

		const finalData = await res.json();

		this.debug(
			`${options.method ?? 'GET'} ${url.pathname + url.search} payload=${options.body ? String(options.body) : '{}'}`,
		);

		return finalData as D;
	}

	protected wsMessageEvent(data: string) {
		if (!this.isRegistered) throw new Error(`Driver ${this.id} not registered by using initial()`);
		const wsData = JSON.parse(data.toString());
    this.node!.wsMessageEvent(wsData);
	}

	protected debug(logs: string) {
		if (!this.isRegistered) throw new Error(`Driver ${this.id} not registered by using initial()`);
    this.manager!.emit(
    	RainlinkEvents.Debug,
    	`[Rainlink] / [Node @ ${this.node?.options.name}] / [Driver] / [Lavalink4] | ${logs}`,
    );
	}

	public wsClose(): void {
		if (this.wsClient) this.wsClient.close(1006, 'Self closed');
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
		};

		await this.requester<{ resuming: boolean; timeout: number }>(options);
		this.debug(`Session updated! resume: ${mode}, timeout: ${timeout}`);
		return;
	}

	protected decode(base64: string) {
		return new Decoder(base64).getTrack ?? undefined;
	}
}

class Decoder {
	protected position = 0;
	protected buffer: Buffer;
	constructor(protected track: string) {
		this.buffer = Buffer.from(track, 'base64');
	}

	get getTrack(): RawTrack | null {
		try {
			const isVersioned = (((this.readInt() & 0xc0000000) >> 30) & 1) !== 0;
			const version = isVersioned ? Number(this.readByte()) : 1;

			switch (version) {
			case 1:
				return this.trackVersionOne;
			case 2:
				return this.trackVersionTwo;
			case 3:
				return this.trackVersionThree;
			default:
				return null;
			}
		} catch {
			return null;
		}
	}

	get trackVersionOne(): RawTrack | null {
		try {
			return {
				encoded: this.track,
				info: {
					title: this.readUTF(), // Char
					author: this.readUTF(), // Char
					length: Number(this.readLong()), // Unsigned int 32-bit
					identifier: this.readUTF(), // Char
					isSeekable: true,
					isStream: !!this.readByte(), // Byte
					uri: null,
					artworkUrl: null,
					isrc: null,
					sourceName: this.readUTF().toLowerCase(),
					position: Number(this.readLong()),
				},
				pluginInfo: {},
			};
		} catch {
			return null;
		}
	}

	get trackVersionTwo(): RawTrack | null {
		try {
			return {
				encoded: this.track,
				info: {
					title: this.readUTF(), // Char
					author: this.readUTF(), // Char
					length: Number(this.readLong()), // Unsigned int 32-bit
					identifier: this.readUTF(), // Char
					isSeekable: true,
					isStream: !!this.readByte(), // Byte
					uri: this.readByte() ? this.readUTF() : null,
					artworkUrl: null,
					isrc: null,
					sourceName: this.readUTF().toLowerCase(),
					position: Number(this.readLong()),
				},
				pluginInfo: {},
			};
		} catch {
			return null;
		}
	}

	get trackVersionThree(): RawTrack | null {
		try {
			return {
				encoded: this.track,
				info: {
					title: this.readUTF(), // Char
					author: this.readUTF(), // Char
					length: Number(this.readLong()), // Unsigned int 32-bit
					identifier: this.readUTF(), // Char
					isSeekable: true,
					isStream: !!this.readByte(), // Byte
					uri: this.readByte() ? this.readUTF() : null,
					artworkUrl: this.readByte() ? this.readUTF() : null,
					isrc: this.readByte() ? this.readUTF() : null,
					sourceName: this.readUTF().toLowerCase(),
					position: Number(this.readLong()),
				},
				pluginInfo: {},
			};
		} catch {
			return null;
		}
	}

	changeBytes(bytes: number) {
		this.position += bytes;
		return this.position - bytes;
	}

	readByte() {
		return this.buffer[this.changeBytes(1)];
	}

	readUShort() {
		return this.buffer.readUInt16BE(this.changeBytes(2));
	}

	readInt() {
		return this.buffer.readInt32BE(this.changeBytes(4));
	}

	readLong() {
		return this.buffer.readBigInt64BE(this.changeBytes(8));
	}

	readUTF() {
		const len = this.readUShort();
		const start = this.changeBytes(len);

		return this.buffer.toString('utf8', start, start + len);
	}
}
