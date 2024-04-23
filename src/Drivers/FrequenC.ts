import { Rainlink } from '../Rainlink';
import { metadata } from '../metadata';
import { RainlinkEvents } from '../Interface/Constants';
import { RainlinkRequesterOptions } from '../Interface/Rest';
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
	}

	public connect(): RainlinkWebsocket {
		if (!this.isRegistered) throw new Error(`Driver ${this.id} not registered by using initial()`);
		const ws = new RainlinkWebsocket(this.wsUrl, {
			headers: {
				Authorization: this.node!.options.auth,
				'User-Id': this.manager!.id,
				'Client-Info': `${metadata.name}/${metadata.version} (${metadata.name})`,
				'user-agent': this.manager!.rainlinkOptions.options!.userAgent!,
				'Num-Shards': this.manager!.shardCount,
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
		if (options.useSessionId && this.sessionId == null)
			throw new Error('sessionId not initalized! Please wait for lavalink get connected!');
		const url = new URL(`${this.httpUrl}${options.path}`);
		if (options.params) url.search = new URLSearchParams(options.params).toString();

		if (options.data) {
			options.body = JSON.stringify(options.data);
		}

		const lavalinkHeaders = {
			Authorization: this.node!.options.auth,
			'User-Agent': this.manager!.rainlinkOptions.options!.userAgent!,
			...options.headers,
		};

		options.headers = lavalinkHeaders;
		options.path = url.pathname + url.search;

		const res = await fetch(url.origin + options.path, options);

		if (res.status == 204) {
			this.debug('Player now destroyed');
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
			`${options.method ?? 'GET'} ${options.path} payload=${options.body ? String(options.body) : '{}'}`,
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
    this.manager!.emit(RainlinkEvents.Debug, `[Rainlink] -> [Driver] -> [FrequenC1] | ${logs}`);
	}

	public wsClose(): void {
		if (this.wsClient) this.wsClient.close(1006, 'Self closed');
	}

	public async updateSession(sessionId: string, mode: boolean, timeout: number): Promise<void> {
		return;
	}
}
