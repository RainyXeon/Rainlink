import { RainlinkPlugin as Plugin } from '../RainlinkPlugin';
import { Rainlink } from '../../Rainlink';
import { RainlinkDriver, RainlinkEvents, RainlinkPluginType } from '../../Interface/Constants';
import { RawData, WebSocket } from 'ws';
import { RainlinkNode } from '../../Node/RainlinkNode';
import { metadata } from '../../metadata';
import { VoiceChannelOptions } from '../../Interface/Player';

export class RainlinkPlugin extends Plugin {
  protected manager?: Rainlink;
  /** Whenever the plugin is enabled or not */
  public enabled: boolean = false;

  constructor() {
    super();
  }

  /** Name function for getting plugin name */
  public name(): string {
    return 'rainlink-voiceReceiver';
  }

  /** Type function for diferent type of plugin */
  public type(): RainlinkPluginType {
    return RainlinkPluginType.Default;
  }

  /** Setup the ws voice reciver client */
  public setup(node: RainlinkNode, voiceOptions: VoiceChannelOptions): void {
    if (!this.enabled) throw new Error('This plugin is unloaded!');
    if (node.options.driver !== RainlinkDriver.Nodelink2)
      throw new Error('This node not support voice receiver, please use Nodelink2 to use this feature!');
    const wsUrl = `${node.options.secure ? 'wss' : 'ws'}://${node.options.host}:${node.options.port}`;
    const ws = new WebSocket(wsUrl + '/connection/data', {
      headers: {
        Authorization: node.options.auth,
        'User-Id': this.manager!.id,
        'Client-Name': `${metadata.name}/${metadata.version} (${metadata.github})`,
        'user-agent': this.manager!.rainlinkOptions.options!.userAgent!,
        'Guild-Id': voiceOptions.guildId,
      },
    });
    ws.on('open', () => {
      this.debug("Connected to nodelink's voice receive server!");
      this.manager?.emit(RainlinkEvents.VoiceConnect, voiceOptions);
    });
    ws.on('message', (data: RawData) => this.wsMessageEvent(data));
    ws.on('error', err => {
      this.debug(`Errored at nodelink's voice receive server!`);
      this.manager?.emit(RainlinkEvents.VoiceError, voiceOptions, err);
    });
    ws.on('close', (code: number, reason: Buffer) => {
      this.debug(`Disconnected to nodelink's voice receive server! Code: ${code} Reason: ${reason}`);
      this.manager?.emit(RainlinkEvents.VoiceDisconnect, voiceOptions, code, reason);
    });
  }

  protected wsMessageEvent(data: RawData) {
    const wsData = JSON.parse(data.toString());
    this.debug(String(data));
    // this.node.wsMessageEvent(wsData);
  }

  /** Load function for make the plugin working */
  public load(manager: Rainlink): void {
    this.manager = manager;
    this.enabled = true;
  }

  /** unload function for make the plugin stop working */
  public unload(manager: Rainlink): void {
    this.manager = manager;
    this.enabled = false;
  }

  private debug(logs: string) {
    this.manager
      ? this.manager.emit(RainlinkEvents.Debug, `[Rainlink Voice Receiver Plugin]: ${logs}`)
      : true;
  }
}
