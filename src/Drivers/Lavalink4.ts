import { RainlinkNodeOptions } from '../Interface/Manager';
import { Rainlink } from '../Rainlink';
import { metadata } from '../metadata';
import { RainlinkPlugin as SaveSessionPlugin } from '../Plugin/SaveSession/Plugin';
import { RawData, WebSocket } from 'ws';
import axios from 'axios';
import { RainlinkEvents } from '../Interface/Constants';
import { RainlinkRequesterOptions } from '../Interface/Rest';
import { RainlinkNode } from '../Node/RainlinkNode';
import { AbstractDriver } from './AbstractDriver';

export class Lavalink4 extends AbstractDriver {
  public wsUrl: string;
  public httpUrl: string;
  public sessionPlugin?: SaveSessionPlugin | null;
  public sessionId: string | null;
  public functionMap: Map<string, <D = any>(options: RainlinkRequesterOptions) => D>;
  private wsClient?: WebSocket;

  constructor(
    public manager: Rainlink,
    public options: RainlinkNodeOptions,
    public node: RainlinkNode,
  ) {
    super();
    this.wsUrl = `${options.secure ? 'wss' : 'ws'}://${options.host}:${options.port}/v4/websocket`;
    this.httpUrl = `${options.secure ? 'https://' : 'http://'}${options.host}:${options.port}/v4`;
    this.sessionId = null;
    this.functionMap = new Map<string, <D = any>(options: RainlinkRequesterOptions) => D>();
  }

  public connect(): WebSocket {
    const isResume = this.manager.rainlinkOptions.options!.resume;
    if (this.sessionPlugin) {
      this.sessionId =
        this.sessionId == null && isResume
          ? this.sessionPlugin.getSession(this.options.host).sessionId
          : this.sessionId;
    }
    const ws = new WebSocket(this.wsUrl, {
      headers: {
        Authorization: this.options.auth,
        'User-Id': this.manager.id,
        'Client-Name': `${metadata.name}/${metadata.version}`,
        'Session-Id': this.sessionId !== null && isResume ? this.sessionId : '',
        'user-agent': this.manager.rainlinkOptions.options!.userAgent!,
      },
    });

    ws.on('open', () => {
      this.node.wsOpenEvent();
    });
    ws.on('message', (data: RawData) => this.wsMessageEvent(data));
    ws.on('error', err => this.node.wsErrorEvent(err));
    ws.on('close', (code: number, reason: Buffer) => this.node.wsCloseEvent(code, reason));
    this.wsClient = ws;
    return ws;
  }

  public async requester<D = any>(options: RainlinkRequesterOptions): Promise<D | undefined> {
    if (options.useSessionId && this.sessionId == null)
      throw new Error('sessionId not initalized! Please wait for lavalink get connected!');
    const url = new URL(`${this.httpUrl}${options.endpoint}`);
    if (options.params) url.search = new URLSearchParams(options.params).toString();

    const lavalinkHeaders = {
      Authorization: this.options.auth,
      'User-Agent': this.manager.rainlinkOptions.options!.userAgent!,
      ...options.requestOptions.headers,
    };

    options.requestOptions.headers = lavalinkHeaders;

    const res = await axios({
      url: url.toString(),
      ...options.requestOptions,
    });

    if (res.status == 204) {
      this.debug('Player now destroyed');
      return undefined;
    }
    if (res.status !== 200) {
      this.debug('Something went wrong with lavalink server.' + `Status code: ${res.status}`);
      return undefined;
    }

    const finalData = String(res.data);

    return this.testJSON(finalData) ? (JSON.parse(res.data) as D) : (res.data as D);
  }

  protected wsMessageEvent(data: RawData) {
    const wsData = JSON.parse(data.toString());
    this.node.wsMessageEvent(wsData);
  }

  private debug(logs: string) {
    this.manager.emit(RainlinkEvents.Debug, `[Rainlink v4 Plugin]: ${logs}`);
  }

  public wsClose(): void {
    if (this.wsClient) this.wsClient.close();
  }

  public async updateSession(sessionId: string, mode: boolean, timeout: number): Promise<void> {
    const options: RainlinkRequesterOptions = {
      endpoint: `/sessions/${sessionId}`,
      requestOptions: {
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
        data: {
          resuming: mode,
          timeout: timeout,
        },
      },
    };

    await this.requester<{ resuming: boolean; timeout: number }>(options);
    this.debug(`Session updated! resume: ${mode}, timeout: ${timeout}`);
    return;
  }

  protected testJSON(text: string) {
    if (typeof text !== 'string') {
      return false;
    }
    try {
      JSON.parse(text);
      return true;
    } catch (error) {
      return false;
    }
  }
}
