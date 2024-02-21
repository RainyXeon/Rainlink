import { RawData, WebSocket } from "ws";
import { RainlinkNodeOptions } from "../Interface/Manager";
import { RainlinkManager } from '../Manager/RainlinkManager';
import { LavalinkEvents, RainlinkEvents } from "../Interface/Events";
import { RainlinkRest } from "./RainlinkRest"
import { metadata } from "../manifest";

export interface NodeStats {
    players: number;
    playingPlayers: number;
    memory: {
        reservable: number;
        used: number;
        free: number;
        allocated: number
    };
    frameStats: {
        sent: number;
        deficit: number;
        nulled: number
    };
    cpu: {
        cores: number;
        systemLoad: number;
        lavalinkLoad: number;
    };
    uptime: number;
}

export class RainlinkNode {
    public manager: RainlinkManager
    private node: RainlinkNodeOptions
    private wsUrl: string
    private wsClient: WebSocket
    public rest: RainlinkRest
    private sessionId: string | null = null
    private clientId: string

    constructor(manager: RainlinkManager, node: RainlinkNodeOptions, clientId: string) {
        this.manager = manager
        this.node = node
        this.clientId = clientId
        this.wsUrl = `${node.secure ? 'wss' : 'ws'}://${node.host}:${node.port}/v4/websocket`;
        this.wsClient = this.connect()
        this.rest = new RainlinkRest(manager, node)
        this.setupEvent()
    }

    connect(): WebSocket {
        const header = {
            "Authorization": this.node.auth,
            "User-Id": this.clientId,
            "Client-Name": `rainlink@${metadata.version}`,
            "Session-Id": this.sessionId == null ? "" : this.sessionId
        }
        return new WebSocket(this.wsUrl, { headers: header })
    }

    protected setupEvent() {
        this.wsClient.on("open", () => { this.wsOpenEvent() })
        this.wsClient.on("message", (data: RawData, isBin: boolean) => this.wsMessageEvent(data, isBin))
        this.wsClient.on("error", (err) => this.wsErrorEvent(err))
    }

    protected wsOpenEvent() {
        this.manager.emit(RainlinkEvents.Debug, `Node ${this.node.name} connected! URL: ${this.wsUrl}`)
        this.manager.emit(RainlinkEvents.NodeConnect, this)
    }

    protected wsMessageEvent(data: RawData, isBin: boolean) {
        const wsData: Record<string, unknown> = JSON.parse(data.toString())

        if (wsData.op == LavalinkEvents.Ready) {
            this.sessionId == wsData.sessionId
        }
    }

    protected wsErrorEvent(logs: Error) {
        this.manager.emit(RainlinkEvents.NodeError, logs)
    }
}