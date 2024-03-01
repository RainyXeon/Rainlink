import { RawData, WebSocket } from 'ws';
import { RainlinkNodeOptions } from '../Interface/Manager';
import { Rainlink } from '../Rainlink';
import { RainlinkConnectState, RainlinkEvents } from '../Interface/Constants';
import { RainlinkRest } from './RainlinkRest';
import { metadata } from '../manifest';
import { setTimeout } from 'node:timers/promises';
import { RainlinkWebsocket } from './RainlinkWebsocket';
import { LavalinkEventsEnum } from '../Interface/LavalinkEvents';
import { LavalinkNodeStatsResponse, NodeStats } from '../Interface/Node';
import { RainlinkPlugin as SaveSessionPlugin } from '../Plugin/SaveSession/Plugin';

export class RainlinkNode {
  /** The rainlink manager */
  public manager: Rainlink;
  /** The rainlink node options */
  public options: RainlinkNodeOptions;
  /** @ignore */
  private wsUrl: string;
  /** The rainlink rest manager */
  public rest: RainlinkRest;
  /** The lavalink server season id to resume */
  public sessionId: string | null;
  /** The lavalink server online status */
  public online: boolean = false;
  /** @ignore */
  private retryCounter = 0;
  /** The lavalink server connect state */
  public state: RainlinkConnectState = RainlinkConnectState.Closed;
  /** The lavalink server all status */
  public stats: NodeStats;
  /** @ignore */
  private ws?: WebSocket;
  /** @ignore */
  private sudoDisconnect = false;
  /** @ignore */
  private wsEvent: RainlinkWebsocket;
  /** @ignore */
  private sessionPlugin?: SaveSessionPlugin | null;

  /**
   * The lavalink server handler class
   * @param manager The rainlink manager
   * @param options The lavalink server options
   */
  constructor(manager: Rainlink, options: RainlinkNodeOptions) {
    this.manager = manager;
    this.options = options;
    this.wsUrl = `${options.secure ? 'wss' : 'ws'}://${options.host}:${options.port}/v${metadata.lavalink}/websocket`;
    this.sessionPlugin = this.manager.plugins.get('rainlink-saveSession') as SaveSessionPlugin;
    const customRest = this.manager.rainlinkOptions.options!.structures!.rest;
    this.rest = customRest
      ? new customRest(manager, options, this)
      : new RainlinkRest(manager, options, this);
    this.sessionId = null;
    this.wsEvent = new RainlinkWebsocket();
    this.stats = {
      players: 0,
      playingPlayers: 0,
      uptime: 0,
      memory: {
        free: 0,
        used: 0,
        allocated: 0,
        reservable: 0,
      },
      cpu: {
        cores: 0,
        systemLoad: 0,
        lavalinkLoad: 0,
      },
      frameStats: {
        sent: 0,
        nulled: 0,
        deficit: 0,
      },
    };
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
    const newWsClient = new WebSocket(this.wsUrl, {
      headers: {
        Authorization: this.options.auth,
        'User-Id': this.manager.id,
        'Client-Name': `${metadata.name}@${metadata.version}`,
        'Session-Id': this.sessionId !== null && isResume ? this.sessionId : '',
        'user-agent': this.manager.rainlinkOptions.options!.userAgent!,
      },
    });
    this.setupEvent(newWsClient);
    return newWsClient;
  }

  /** @ignore */
  protected setupEvent(ws: WebSocket) {
    ws.on('open', () => {
      this.wsOpenEvent();
    });
    ws.on('message', (data: RawData, isBin: boolean) => this.wsMessageEvent(data, isBin));
    ws.on('error', err => this.wsErrorEvent(err));
    ws.on('close', (code: number, reason: Buffer) => this.wsCloseEvent(code, reason));
  }

  /** @ignore */
  protected wsOpenEvent() {
    this.clean(true);
    this.state = RainlinkConnectState.Connected;
    this.debug(`Node ${this.options.name} connected! URL: ${this.wsUrl}`);
    this.manager.emit(RainlinkEvents.NodeConnect, this);
  }

  /** @ignore */
  protected wsMessageEvent(data: RawData, isBin: boolean) {
    const wsData = JSON.parse(data.toString());
    switch (wsData.op) {
      case LavalinkEventsEnum.Ready: {
        const isResume = this.manager.rainlinkOptions.options!.resume!;
        const timeout = this.manager.rainlinkOptions.options?.resumeTimeout!;
        this.sessionId = wsData.sessionId;
        this.rest = new RainlinkRest(this.manager, this.options, this);
        if (isResume) {
          this.rest.updateSession(wsData.sessionId, isResume, timeout);
          if (this.sessionPlugin) {
            this.sessionPlugin.deleteSession(this.options.host);
            this.sessionPlugin.setSession(this.options.host, wsData.sessionId);
          }
        }
        break;
      }
      case LavalinkEventsEnum.Event: {
        this.wsEvent.initial(wsData, this.manager);
        break;
      }
      case LavalinkEventsEnum.PlayerUpdate: {
        this.wsEvent.initial(wsData, this.manager);
        break;
      }
      case LavalinkEventsEnum.Status: {
        this.stats = this.updateStatusData(wsData as LavalinkNodeStatsResponse);
        break;
      }
    }
  }

  /** @ignore */
  protected wsErrorEvent(logs: Error) {
    this.debug(`Node ${this.options.name} errored! URL: ${this.wsUrl}`);
    this.manager.emit(RainlinkEvents.NodeError, this, logs);
  }

  /** @ignore */
  protected async wsCloseEvent(code: number, reason: Buffer) {
    this.online = false;
    this.state = RainlinkConnectState.Disconnected;
    this.debug(`Node ${this.options.name} disconnected! URL: ${this.wsUrl}`);
    this.manager.emit(RainlinkEvents.NodeDisconnect, this, code, reason);
    if (!this.sudoDisconnect && this.retryCounter !== this.manager.rainlinkOptions.options!.retryCount) {
      await setTimeout(this.manager.rainlinkOptions.options!.retryTimeout);
      this.retryCounter = this.retryCounter + 1;
      this.reconnect();
      return;
    }
    this.nodeClosed();
    return;
  }

  /** @ignore */
  protected nodeClosed() {
    this.manager.emit(RainlinkEvents.NodeClosed, this);
    this.debug(`Node ${this.options.name} closed! URL: ${this.wsUrl}`);
    this.clean();
  }

  /** @ignore */
  protected updateStatusData(data: LavalinkNodeStatsResponse): NodeStats {
    return {
      players: data.players ?? this.stats.players,
      playingPlayers: data.playingPlayers ?? this.stats.playingPlayers,
      uptime: data.uptime ?? this.stats.uptime,
      memory: data.memory ?? this.stats.memory,
      cpu: data.cpu ?? this.stats.cpu,
      frameStats: data.frameStats ?? this.stats.frameStats,
    };
  }

  /** Disconnect this lavalink server */
  public disconnect() {
    this.sudoDisconnect = true;
    this.ws?.close();
  }

  /** Reconnect back to this lavalink server */
  public reconnect() {
    this.clean();
    this.ws = this.connect();
  }

  /** Clean all the lavalink server state and set to default value */
  public clean(online: boolean = false) {
    this.sudoDisconnect = false;
    this.retryCounter = 0;
    this.online = online;
    this.state = RainlinkConnectState.Closed;
  }

  /** @ignore */
  private debug(logs: string) {
    this.manager.emit(RainlinkEvents.Debug, `[Rainlink Node]: ${logs}`);
  }
}
