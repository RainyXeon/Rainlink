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
import { RainlinkPlayer } from '../Player/RainlinkPlayer';

export enum Nodelink2loadType {
  SHORTS = 'shorts',
  ALBUM = 'album',
  ARTIST = 'artist',
  SHOW = 'show',
  EPISODE = 'episode',
  STATION = 'station',
  PODCAST = 'podcast',
}

export class Nodelink2 extends AbstractDriver {
  public wsUrl: string;
  public httpUrl: string;
  public sessionPlugin?: SaveSessionPlugin | null;
  public sessionId: string | null;
  public functions: Map<string, (...args: any) => unknown>;
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
    this.functions = new Map<string, (...args: any) => unknown>();
    this.functions.set('getLyric', this.getLyric);
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
        'Client-Name': `${metadata.name}/${metadata.version} (${metadata.github})`,
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

    const preFinalData = this.testJSON(String(res.data)) ? (JSON.parse(res.data) as D) : (res.data as D);
    let finalData: any = preFinalData;

    if (finalData.loadType) {
      finalData = this.convertV4trackResponse(finalData) as D;
    }

    return finalData;
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

  protected convertV4trackResponse(nl2Data: Record<string, any>): Record<string, any> {
    if (!nl2Data) return {};
    switch (nl2Data.loadType) {
      case Nodelink2loadType.SHORTS: {
        nl2Data.loadType = LavalinkLoadType.TRACK;
        break;
      }
      case Nodelink2loadType.ALBUM: {
        nl2Data.loadType = LavalinkLoadType.PLAYLIST;
        break;
      }
      case Nodelink2loadType.ARTIST: {
        nl2Data.loadType = LavalinkLoadType.SEARCH;
        break;
      }
      case Nodelink2loadType.EPISODE: {
        nl2Data.loadType = LavalinkLoadType.PLAYLIST;
        break;
      }
      case Nodelink2loadType.STATION: {
        nl2Data.loadType = LavalinkLoadType.PLAYLIST;
        break;
      }
      case Nodelink2loadType.PODCAST: {
        nl2Data.loadType = LavalinkLoadType.PLAYLIST;
        break;
      }
      case Nodelink2loadType.SHOW: {
        nl2Data.loadType = LavalinkLoadType.PLAYLIST;
        break;
      }
      default: {
        nl2Data.loadType = LavalinkLoadType.TRACK;
        break;
      }
    }
    return nl2Data;
  }

  public async updateSession(sessionId: string, mode: boolean, timeout: number): Promise<void> {
    this.debug(
      "[WARNING]: Nodelink doesn't support resuming, set resume to true is useless in Nodelink2 driver",
    );
    return;
  }

  public async getLyric(player: RainlinkPlayer) {
    const options: RainlinkRequesterOptions = {
      endpoint: `/loadlyrics`,
      params: {
        encodedTrack: String(player.queue.current?.encoded),
        language: 'en',
      },
      useSessionId: false,
      requestOptions: {
        headers: { 'Content-Type': 'application/json' },
        method: 'GET',
      },
    };
    const data = await player.node.driver.requester(options);
    return data;
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
