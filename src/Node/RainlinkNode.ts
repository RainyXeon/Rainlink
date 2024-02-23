import { RawData, WebSocket } from 'ws';
import { RainlinkNodeOptions } from '../Interface/Manager';
import { Rainlink } from '../Rainlink';
import { RainlinkConnectState, RainlinkEvents } from '../Interface/Constants';
import { RainlinkRest } from './RainlinkRest';
import { metadata } from '../manifest';
import { setTimeout } from 'node:timers/promises';
import { RainlinkWebsocket } from './RainlinkWebsocket';
import { LavalinkEventsEnum } from '../Interface/LavalinkEvents';

export class RainlinkNode {
  public manager: Rainlink;
  public node: RainlinkNodeOptions;
  private wsUrl: string;
  public rest: RainlinkRest;
  public sessionId: string | null;
  public online: boolean = false;
  private retryCounter = 0;
  public state: RainlinkConnectState = RainlinkConnectState.Closed;
  private ws?: WebSocket;
  private sudoDisconnect = false;
  private wsEvent: RainlinkWebsocket;

  constructor(manager: Rainlink, node: RainlinkNodeOptions) {
    this.manager = manager;
    this.node = node;
    this.wsUrl = `${node.secure ? 'wss' : 'ws'}://${node.host}:${node.port}/v${metadata.lavalink}/websocket`;
    this.rest = new RainlinkRest(manager, node, this);
    this.sessionId = null;
    this.wsEvent = new RainlinkWebsocket(manager);
  }

  public connect(): WebSocket {
    const header = {
      Authorization: this.node.auth,
      'User-Id': this.manager.id,
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
    ws.on('message', (data: RawData, isBin: boolean) => this.wsMessageEvent(data, isBin));
    ws.on('error', err => this.wsErrorEvent(err));
    ws.on('close', (code: number, reason: Buffer) => this.wsCloseEvent(code, reason));
  }

  protected wsOpenEvent() {
    this.clean(true);
    this.state = RainlinkConnectState.Connected;
    this.debug(`Node ${this.node.name} connected! URL: ${this.wsUrl}`);
    this.manager.emit(RainlinkEvents.NodeConnect, this);
  }

  protected wsMessageEvent(data: RawData, isBin: boolean) {
    const wsData = JSON.parse(data.toString());
    switch (wsData.op) {
      case LavalinkEventsEnum.Ready: {
        this.sessionId = wsData.sessionId;
        this.rest = new RainlinkRest(this.manager, this.node, this);
        break;
      }
      case LavalinkEventsEnum.Event: {
        this.wsEvent.initial(data);
        break;
      }
      case LavalinkEventsEnum.PlayerUpdate: {
        this.wsEvent.initial(data);
        break;
      }
    }
  }

  protected wsErrorEvent(logs: Error) {
    this.debug(`Node ${this.node.name} errored! URL: ${this.wsUrl}`);
    this.manager.emit(RainlinkEvents.NodeError, this, logs);
  }

  protected async wsCloseEvent(code: number, reason: Buffer) {
    this.online = false;
    this.state = RainlinkConnectState.Disconnected;
    this.debug(`Node ${this.node.name} disconnected! URL: ${this.wsUrl}`);
    this.manager.emit(RainlinkEvents.NodeDisconnect, this, code, reason);
    if (!this.sudoDisconnect && this.retryCounter !== this.manager.options.options.retryCount) {
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
    this.debug(`Node ${this.node.name} closed! URL: ${this.wsUrl}`);
  }

  public disconnect() {
    this.sudoDisconnect = true;
    this.ws?.close();
  }

  public reconnect() {
    this.clean();
    this.ws = this.connect();
  }

  public clean(online: boolean = false) {
    this.sudoDisconnect = false;
    this.retryCounter = 0;
    this.online = online;
    this.state = RainlinkConnectState.Closed;
  }

  private debug(logs: string) {
    this.manager.emit(RainlinkEvents.Debug, `[Rainlink Node]: ${logs}`);
  }
}
