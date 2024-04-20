import { Rainlink } from '../Rainlink';
import { metadata } from '../metadata';
import { RainlinkEvents } from '../Interface/Constants';
import { RainlinkRequesterOptions } from '../Interface/Rest';
import { RainlinkNode } from '../Node/RainlinkNode';
import { AbstractDriver } from './AbstractDriver';
import util from 'node:util';
import { RainlinkPlayer } from '../Player/RainlinkPlayer';
import { RainlinkWebsocket } from '../Node/RainlinkWebsocket';
import { RainlinkDatabase } from '../Manager/RainlinkDatabase';

export class Lavalink4 extends AbstractDriver {
	public id: string = 'lavalink/v4/koinu';
	public wsUrl: string = '';
	public httpUrl: string = '';
	public sessionId: string | null;
	public playerFunctions: RainlinkDatabase<(player: RainlinkPlayer, ...args: any) => unknown>;
	public globalFunctions: RainlinkDatabase<(manager: Rainlink, ...args: any) => unknown>;
	private wsClient?: RainlinkWebsocket;
	public manager: Rainlink | null = null;
	public node: RainlinkNode | null = null;

	constructor() {
		super();
		this.playerFunctions = new RainlinkDatabase<(player: RainlinkPlayer, ...args: any) => unknown>();
		this.globalFunctions = new RainlinkDatabase<(manager: Rainlink, ...args: any) => unknown>();
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
	}

	public connect(): RainlinkWebsocket {
		if (!this.isRegistered) throw new Error(`Driver ${this.id} not registered by using initial()`);
		const isResume = this.manager!.rainlinkOptions.options!.resume;
		const ws = new RainlinkWebsocket(this.wsUrl, {
			headers: {
				Authorization: this.node!.options.auth,
				'User-Id': this.manager!.id,
				'Client-Name': `${metadata.name}/${metadata.version} (${metadata.github})`,
				'Session-Id': this.sessionId !== null && isResume ? this.sessionId : '',
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

	private debug(logs: string) {
		if (!this.isRegistered) throw new Error(`Driver ${this.id} not registered by using initial()`);
    this.manager!.emit(RainlinkEvents.Debug, `[Rainlink] -> [Driver] -> [Lavalink4] | ${logs}`);
	}

	public wsClose(): void {
		if (this.wsClient) this.wsClient.close(1006, 'Self closed');
	}

	public async updateSession(sessionId: string, mode: boolean, timeout: number): Promise<void> {
		const options: RainlinkRequesterOptions = {
			path: `/sessions/${sessionId}`,
			headers: { 'Content-Type': 'application/json' },
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
}
