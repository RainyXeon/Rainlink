import { RawData, WebSocket } from 'ws';
import { RainlinkNodeOptions } from '../Interface/Manager';
import { RainlinkManager } from '../Manager/RainlinkManager';
import {
  LavalinkEvents,
  RainlinkConnectState,
  RainlinkEvents,
} from '../Interface/Constants';
import { RainlinkRest } from './RainlinkRest';
import { metadata } from '../manifest';
import { setTimeout } from 'node:timers/promises';

export interface NodeStats {
  players: number;
  playingPlayers: number;
  memory: {
    reservable: number;
    used: number;
    free: number;
    allocated: number;
  };
  frameStats: {
    sent: number;
    deficit: number;
    nulled: number;
  };
  cpu: {
    cores: number;
    systemLoad: number;
    lavalinkLoad: number;
  };
  uptime: number;
}

export class RainlinkNode {
  public manager: RainlinkManager;
  public node: RainlinkNodeOptions;
  private wsUrl: string;
  public rest: RainlinkRest;
  private sessionId: string | null = null;
  private clientId: string;
  public online: boolean = false;
  private retryCounter = 0;
  public state: RainlinkConnectState = RainlinkConnectState.Closed;
  private ws: WebSocket;
  private sudoDisconnect = false;

  constructor(
    manager: RainlinkManager,
    node: RainlinkNodeOptions,
    clientId: string,
  ) {
    this.manager = manager;
    this.node = node;
    this.clientId = clientId;
    this.wsUrl = `${node.secure ? 'wss' : 'ws'}://${node.host}:${node.port}/v4/websocket`;
    this.ws = this.connect();
    this.rest = new RainlinkRest(manager, node);
  }

  public connect(): WebSocket {
    const header = {
      Authorization: this.node.auth,
      'User-Id': this.clientId,
      'Client-Name': `rainlink@${metadata.version}`,
      'Session-Id': this.sessionId == null ? '' : this.sessionId,
    };
    const newWsClient = new WebSocket(this.wsUrl, { headers: header });
    this.setupEvent(newWsClient);
    return newWsClient;
  }

  protected setupEvent(ws: WebSocket) {
    ws.on('open', () => {
      this.wsOpenEvent();
    });
    ws.on('message', (data: RawData, isBin: boolean) =>
      this.wsMessageEvent(data, isBin),
    );
    ws.on('error', err => this.wsErrorEvent(err));
    ws.on('close', (code: number, reason: Buffer) =>
      this.wsCloseEvent(code, reason),
    );
  }

  protected wsOpenEvent() {
    this.online = true;
    this.state = RainlinkConnectState.Connected;
    this.manager.emit(
      RainlinkEvents.Debug,
      `[Rainlink]: Node ${this.node.name} connected! URL: ${this.wsUrl}`,
    );
    this.manager.emit(RainlinkEvents.NodeConnect, this);
  }

  protected wsMessageEvent(data: RawData, isBin: boolean) {
    const wsData: Record<string, unknown> = JSON.parse(data.toString());
    switch (wsData.op) {
      case LavalinkEvents.Ready: {
        this.sessionId == wsData.sessionId;
        break;
      }
    }
  }

  protected wsErrorEvent(logs: Error) {
    this.manager.emit(
      RainlinkEvents.Debug,
      `[Rainlink]: Node ${this.node.name} errored! URL: ${this.wsUrl}`,
    );
    this.manager.emit(RainlinkEvents.NodeError, this, logs);
  }

  protected async wsCloseEvent(code: number, reason: Buffer) {
    this.online = false;
    this.state = RainlinkConnectState.Disconnected;
    this.manager.emit(
      RainlinkEvents.Debug,
      `[Rainlink]: Node ${this.node.name} disconnected! URL: ${this.wsUrl}`,
    );
    this.manager.emit(RainlinkEvents.NodeDisconnect, this, code, reason);
    if (
      !this.sudoDisconnect &&
      this.retryCounter !== this.manager.options.options.retryCount
    ) {
      await setTimeout(this.manager.options.options.retryTimeout);
      this.retryCounter = this.retryCounter + 1;
      this.reconnect();
      return;
    }
    this.nodeClosed();
    return;
  }

  protected nodeClosed() {
    this.manager.emit(RainlinkEvents.NodeClosed, this);
    this.manager.emit(
      RainlinkEvents.Debug,
      `[Rainlink]: Node ${this.node.name} closed! URL: ${this.wsUrl}`,
    );
    this.manager.node.delete(this.node.name);
  }

  public disconnect() {
    this.sudoDisconnect = true;
    this.ws.close();
  }

  public reconnect() {
    this.ws = this.connect();
  }
}
