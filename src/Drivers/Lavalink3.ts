import { RainlinkNodeOptions } from '../Interface/Manager';
import { Rainlink } from '../Rainlink';
import { metadata } from '../metadata';
import { RainlinkPlugin as SaveSessionPlugin } from '../Plugin/SaveSession/Plugin';
import { RawData, WebSocket } from 'ws';
import axios from 'axios';
import { LavalinkLoadType, RainlinkEvents } from '../Interface/Constants';
import { RainlinkRequesterOptions } from '../Interface/Rest';
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
  public wsUrl: string;
  public httpUrl: string;
  public sessionPlugin?: SaveSessionPlugin | null;
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

    const preFinalData = this.testJSON(String(res.data)) ? (JSON.parse(res.data) as D) : (res.data as D);
    let finalData: any = preFinalData;

    if (finalData.loadType) {
      finalData = this.convertV4trackResponse(finalData) as D;
    }

    if (finalData.guildId && finalData.track && finalData.track.encoded) {
      finalData.track = this.buildV4track(finalData.track);
    }

    // console.log('------------------------- Lavalink Data -------------------------');
    // console.log(finalData);
    // console.log('------------------------- Lavalink Data -------------------------');

    return finalData;
  }

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
    const options: RainlinkRequesterOptions = {
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

    await this.requester<{ resuming: boolean; timeout: number }>(options);
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

  protected convertV4trackResponse(v3data: Record<string, any>): Record<string, any> {
    if (!v3data) return {};
    if (v3data.loadType == Lavalink3loadType.LOAD_FAILED) {
      v3data.loadType = LavalinkLoadType.ERROR;
    }
    if (v3data.loadType == Lavalink3loadType.PLAYLIST_LOADED) {
      v3data.loadType = LavalinkLoadType.PLAYLIST;
      v3data.data.tracks = v3data.tracks;
      v3data.data.info = v3data.playlistInfo;
      for (let i = 0; i < v3data.data.tracks.length; i++) {
        v3data.data.tracks[i] = this.buildV4track(v3data.data.tracks[i]);
      }
      delete v3data.tracks;
    }
    if (v3data.loadType == Lavalink3loadType.SEARCH_RESULT) {
      v3data.loadType = LavalinkLoadType.SEARCH;
      v3data.data = v3data.tracks;
      for (let i = 0; i < v3data.data.length; i++) {
        v3data.data[i] = this.buildV4track(v3data.data[i]);
      }
      delete v3data.tracks;
      delete v3data.playlistInfo;
    }
    if (v3data.loadType == Lavalink3loadType.TRACK_LOADED) {
      v3data.loadType = LavalinkLoadType.TRACK;
      v3data.data = this.buildV4track(v3data.tracks[0]);
      delete v3data.tracks;
    }
    if (v3data.loadType == Lavalink3loadType.NO_MATCHES) {
      v3data.loadType = LavalinkLoadType.EMPTY;
    }
    return v3data;
  }

  protected buildV4track(v3data: Record<string, any>) {
    return {
      encoded: v3data.encoded,
      info: {
        sourceName: v3data.info.sourceName,
        identifier: v3data.info.identifier,
        isSeekable: v3data.info.isSeekable,
        author: v3data.info.author,
        length: v3data.info.length,
        isStream: v3data.info.isStream,
        position: v3data.info.position,
        title: v3data.info.title,
        uri: v3data.info.uri,
        artworkUrl: undefined,
      },
      pluginInfo: undefined,
    };
  }
}
