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

export class FrequenC extends AbstractDriver {
	public id: string = 'frequenc/v1/miku';
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
		this.wsUrl = `${this.node.options.secure ? 'wss' : 'ws'}://${this.node.options.host}:${this.node.options.port}/v1/websocket`;
		this.httpUrl = `${this.node.options.secure ? 'https://' : 'http://'}${this.node.options.host}:${this.node.options.port}/v1`;
		this.functions.set('buildTrack', this.buildTrack);
	}

	public connect(): RainlinkWebsocket {
		if (!this.isRegistered) throw new Error(`Driver ${this.id} not registered by using initial()`);
		const ws = new RainlinkWebsocket(this.wsUrl, {
			headers: {
				authorization: this.node!.options.auth,
				'user-id': this.manager!.id,
				'client-info': `${metadata.name}/${metadata.version} (${metadata.github})`,
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
			const converted = this.camelToSnake(options.data);
			options.body = JSON.stringify(converted);
		}

		const lavalinkHeaders = {
			authorization: this.node!.options.auth,
			...options.headers,
		};

		options.headers = lavalinkHeaders;
		if (options.body && JSON.stringify(options.body) == '{}') delete options.body;
		//  + url.search;

		const res = await fetch(url, options);

		if (res.status == 204) {
			this.debug(
				`${options.method ?? 'GET'} ${url.pathname + url.search} payload=${options.body ? String(options.body) : '{}'}`,
			);
			return undefined;
		}
		if (res.status !== 200) {
			this.debug(
				`${options.method ?? 'GET'} ${url.pathname + url.search} payload=${options.body ? String(options.body) : '{}'}`,
			);
			this.debug(
				'Something went wrong with frequenc server. ' +
          `Status code: ${res.status}\n Headers: ${util.inspect(options.headers)}`,
			);
			return undefined;
		}

		let finalData;

		if (res.headers.get('content-type') == 'application/json') finalData = await res.json();
		else finalData = { rawData: await res.text() };

		this.debug(
			`${options.method ?? 'GET'} ${url.pathname + url.search} payload=${options.body ? String(options.body) : '{}'}`,
		);

		return finalData as D;
	}

	protected wsMessageEvent(data: string) {
		if (!this.isRegistered) throw new Error(`Driver ${this.id} not registered by using initial()`);
		const wsData = this.snakeToCamel(JSON.parse(data.toString()));
    this.node!.wsMessageEvent(wsData);
	}

	protected debug(logs: string) {
		if (!this.isRegistered) throw new Error(`Driver ${this.id} not registered by using initial()`);
    this.manager!.emit(
    	RainlinkEvents.Debug,
    	`[Rainlink] / [Node @ ${this.node?.options.name}] / [Driver] / [FrequenC1] | ${logs}`,
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

	protected camelToSnake(obj: Record<string, unknown>): Record<string, unknown> {
		if (typeof obj !== 'object') return {};
		if (!obj || JSON.stringify(obj) == '{}') return {};
		const allKeys = Object.keys(obj);
		const regex = /^([a-z]{1,})(_[a-z0-9]{1,})*$/;

		for (const key of allKeys) {
			let newKey;
			if (!regex.test(key)) {
				newKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
				obj[newKey] = obj[key];
				delete obj[key];
			}
			if (newKey && typeof obj[newKey] !== 'object' && typeof obj[key] !== 'object') continue;

			newKey
				? this.camelToSnake(obj[newKey] as Record<string, unknown>)
				: this.camelToSnake(obj[key] as Record<string, unknown>);
		}
		return obj;
	}

	protected snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
		if (typeof obj !== 'object') return {};
		if (!obj || JSON.stringify(obj) == '{}') return {};
		const allKeys = Object.keys(obj);
		for (const key of allKeys) {
			let newKey;
			if (/([-_][a-z])/.test(key)) {
				newKey = key
					.toLowerCase()
					.replace(/([-_][a-z])/g, group => group.toUpperCase().replace('-', '').replace('_', ''));
				obj[newKey] = obj[key];
				delete obj[key];
			}
			if (newKey && typeof obj[newKey] !== 'object' && typeof obj[key] !== 'object') continue;

			newKey
				? this.snakeToCamel(obj[newKey] as Record<string, unknown>)
				: this.snakeToCamel(obj[key] as Record<string, unknown>);
		}
		return obj;
	}

	protected buildTrack(base64: string) {
		return new Decoder(base64).getTrack ?? undefined;
	}
}

class Decoder {
	protected position: number;
	protected buffer: Buffer;
	constructor(protected track: string) {
		this.position = 0;
		this.buffer = Buffer.from(track, 'base64');
	}

	get getTrack(): RawTrack | null {
		try {
			(((Number(this.read('int')) & 0xc0000000) >> 30) & 1) !== 0 ? this.read('byte') : 1;
			return {
				encoded: this.track,
				info: {
					title: String(this.read('utf')),
					author: String(this.read('utf')),
					length: Number(this.read('long')),
					identifier: String(this.read('utf')),
					isSeekable: true,
					isStream: this.read('byte') === 1,
					uri: String(this.read('utf')),
					artworkUrl: this.read('byte') === 1 ? String(this.read('utf')) : null,
					isrc: this.read('byte') === 1 ? String(this.read('utf')) : null,
					sourceName: String(this.read('utf')).toLowerCase(),
					position: 0,
				},
				pluginInfo: {},
			};
		} catch (err) {
			return null;
		}
	}

	protected changeBytes(bytes: number) {
		this.position += bytes;
		return this.position - bytes;
	}

	protected read(type: string) {
		switch (type) {
		case 'byte': {
			return this.buffer[this.changeBytes(1)];
		}
		case 'unsignedShort': {
			const result = this.buffer.readUInt16BE(this.changeBytes(2));
			return result;
		}
		case 'int': {
			const result = this.buffer.readInt32BE(this.changeBytes(4));
			return result;
		}
		case 'long': {
			const msb: bigint = BigInt(this.read('int') as string | number | bigint | boolean);
			const lsb: bigint = BigInt(this.read('int') as string | number | bigint | boolean);

			return msb * BigInt(2 ** 32) + lsb;
		}
		case 'utf': {
			const len = this.read('unsignedShort');
			const start = this.changeBytes(Number(len));
			const result = this.buffer.toString('utf8', start, Number(start) + Number(len));
			return result;
		}
		}
	}
}
