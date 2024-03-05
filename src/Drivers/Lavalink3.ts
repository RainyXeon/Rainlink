import { RainlinkNodeOptions, RainlinkSearchResultType } from '../Interface/Manager';
import { Rainlink } from '../Rainlink';
import { metadata } from '../metadata';
import { RainlinkPlugin as SaveSessionPlugin } from '../Plugin/SaveSession/Plugin';
import { RawData, WebSocket } from 'ws';
import axios from 'axios';
import { LavalinkLoadType, RainlinkEvents } from '../Interface/Constants';
import { RainlinkFetcherOptions } from '../Interface/Rest';
import { RainlinkNode } from '../Node/RainlinkNode';
import { AbstractDriver } from './AbstractDriver';

export enum Lavalink3loadType {
  TRACK_LOADED = 'TRACK_LOADED',
  PLAYLIST_LOADED = 'PLAYLIST_LOADED',
  SEARCH_RESULT = 'SEARCH_RESULT',
  NO_MATCHES = 'NO_MATCHES',
  LOAD_FAILED = 'LOAD_FAILED',
}

export class Lavalink3 extends AbstractDriver {
  /** @ignore */
  public wsUrl: string;
  /** @ignore */
  public httpUrl: string;
  /** @ignore */
  public sessionPlugin?: SaveSessionPlugin | null;
  /** The lavalink server season id to resume */
  public sessionId: string | null;
  private wsClient?: WebSocket;

  constructor(
    public manager: Rainlink,
    public options: RainlinkNodeOptions,
    public node: RainlinkNode,
  ) {
    super();
    this.wsUrl = `${options.secure ? 'wss' : 'ws'}://${options.host}:${options.port}/v3/websocket`;
    this.httpUrl = `${options.secure ? 'https://' : 'http://'}${options.host}:${options.port}/v3`;
    this.sessionId = null;
  }

  /** Connect this lavalink server */
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

  /** @ignore */
  public async fetcher<D = any>(options: RainlinkFetcherOptions): Promise<D | undefined> {
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

    this.convertToV3request(options.requestOptions.data);

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

    const finalData = this.testJSON(String(res.data)) ? (JSON.parse(res.data) as D) : (res.data as D);

    this.convertToV4response(finalData as Record<string, any>);

    console.log(finalData);

    return finalData;
  }

  /** @ignore */
  protected wsMessageEvent(data: RawData) {
    const wsData = JSON.parse(data.toString());
    if (wsData.reason) wsData.reason = (wsData.reason as string).toLowerCase();
    this.node.wsMessageEvent(wsData);
  }

  /**
   * Update a season to resume able or not
   * @returns LavalinkResponse
   */
  public async updateSession(sessionId: string, mode: boolean, timeout: number): Promise<void> {
    const options: RainlinkFetcherOptions = {
      endpoint: `/sessions/${sessionId}`,
      requestOptions: {
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
        data: {
          resumingKey: sessionId,
          timeout: timeout,
        },
      },
    };

    await this.fetcher<{ resuming: boolean; timeout: number }>(options);
    this.debug(`Session updated! resume: ${mode}, timeout: ${timeout}`);
    return;
  }

  /** @ignore */
  private debug(logs: string) {
    this.manager.emit(RainlinkEvents.Debug, `[Rainlink v4 Plugin]: ${logs}`);
  }

  /** @ignore */
  public wsClose(): void {
    if (this.wsClient) this.wsClient.close();
  }

  /** @ignore */
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

  protected convertToV3request(data?: Record<string, any>) {
    if (!data) return;
    if (data.track && data.track.encoded) {
      data.encodedTrack = data.track.encoded;
    }
    return;
  }

  protected convertToV4response(v3data?: Record<string, any>) {
    if (!v3data) return {};
    if (v3data.loadType == Lavalink3loadType.LOAD_FAILED) {
      v3data.loadType = LavalinkLoadType.ERROR;
    }
    if (v3data.loadType == Lavalink3loadType.PLAYLIST_LOADED) {
      v3data.loadType = LavalinkLoadType.PLAYLIST;
      v3data.data.tracks = v3data.tracks;
      v3data.data.info = v3data.playlistInfo
      for (const parseData of v3data.data.tracks) {
        parseData.track = undefined;
      }
      v3data.tracks  = undefined;
    }
    if (v3data.loadType == Lavalink3loadType.SEARCH_RESULT) {
      v3data.loadType = LavalinkLoadType.SEARCH;
      v3data.data = v3data.tracks;
      for (const parseData of v3data.data) {
        parseData.track  = undefined;
      }
      v3data.tracks  = undefined;
      v3data.playlistInfo  = undefined;
    }
    if (v3data.loadType == Lavalink3loadType.TRACK_LOADED) {
      v3data.loadType = LavalinkLoadType.TRACK;
      v3data.data = v3data.tracks[0];
      v3data.data.track  = undefined;
      v3data.tracks  = undefined;
    }
    if (v3data.loadType == Lavalink3loadType.NO_MATCHES) {
      v3data.loadType = LavalinkLoadType.EMPTY;
    }
  }
}
