import { RainlinkPlugin as Plugin } from '../RainlinkPlugin';
import { Rainlink } from '../../Rainlink';
import { RainlinkEvents, RainlinkPluginType } from '../../Interface/Constants';
import { RainlinkNode } from '../../Node/RainlinkNode';
import { metadata } from '../../metadata';
import { VoiceChannelOptions } from '../../Interface/Player';
import { RainlinkWebsocket } from '../../Utilities/RainlinkWebsocket';
import { RainlinkDatabase } from '../../Utilities/RainlinkDatabase';

export class RainlinkPlugin extends Plugin {
	protected manager: Rainlink | null = null;
	protected runningWs: RainlinkDatabase<RainlinkWebsocket> = new RainlinkDatabase<RainlinkWebsocket>();

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

	/** Open the ws voice reciver client */
	public open(node: RainlinkNode, voiceOptions: VoiceChannelOptions): void {
		if (!this.manager) throw new Error('This plugin is unloaded!');
		const wsUrl = `${node.options.secure ? 'wss' : 'ws'}://${node.options.host}:${node.options.port}`;
		const ws = new RainlinkWebsocket(wsUrl + '/connection/data', {
			headers: {
				authorization: node.options.auth,
				'user-id': this.manager!.id,
				'client-name': `${metadata.name}/${metadata.version} (${metadata.github})`,
				'user-agent': this.manager!.rainlinkOptions.options!.userAgent!,
				'guild-id': voiceOptions.guildId,
			},
		});
		this.runningWs.set(voiceOptions.guildId, ws);
		ws.on('open', () => {
			this.debug('Connected to nodelink\'s voice receive server!');
			this.manager?.emit(RainlinkEvents.VoiceConnect, node);
		});
		ws.on('message', (data: string) => this.wsMessageEvent(node, data));
		ws.on('error', err => {
			this.debug('Errored at nodelink\'s voice receive server!');
			this.manager?.emit(RainlinkEvents.VoiceError, node, err);
		});
		ws.on('close', (code: number, reason: Buffer) => {
			ws.removeAllListeners();
			this.debug(`Disconnected to nodelink's voice receive server! Code: ${code} Reason: ${reason}`);
			this.manager?.emit(RainlinkEvents.VoiceDisconnect, node, code, reason);
		});
	}

	/** Open the ws voice reciver client */
	public close(guildId: string): void {
		if (!this.manager) throw new Error('This plugin is unloaded!');
		const targetWs = this.runningWs.get(guildId);
		if (!targetWs) return;
		targetWs.close(1006, 'Self closed');
		this.runningWs.delete(guildId);
		this.debug('Destroy connection to nodelink\'s voice receive server!');
		return;
	}

	protected wsMessageEvent(node: RainlinkNode, data: string) {
		if (!this.manager) throw new Error('This plugin is unloaded!');
		const wsData = JSON.parse(data.toString());
		this.debug(String(data));
		switch (wsData.type) {
		case 'startSpeakingEvent': {
			this.manager?.emit(RainlinkEvents.VoiceStartSpeaking, node, wsData.data.userId, wsData.data.guildId);
			break;
		}
		case 'endSpeakingEvent': {
			this.manager?.emit(
				RainlinkEvents.VoiceEndSpeaking,
				node,
				wsData.data.data,
				wsData.data.userId,
				wsData.data.guildId,
			);
			break;
		}
		}
	}

	/** Load function for make the plugin working */
	public load(manager: Rainlink): void {
		this.manager = manager;
		this.manager.on('playerCreate', player => {
			if (!player.node.driver.id.includes('nodelink')) return;
			this.open(player.node, {
				guildId: player.guildId,
				shardId: player.shardId,
				voiceId: player.voiceId || '',
				textId: player.textId,
			});
		});
		this.manager.on('playerDestroy', player => {
			if (!player.node.driver.id.includes('nodelink')) return;
			this.close(player.guildId);
		});
	}

	/** unload function for make the plugin stop working */
	public unload(): void {
		this.manager?.removeListener('playerCreate', () => {});
		this.manager?.removeListener('playerDestroy', () => {});
		this.manager = null;
	}

	protected debug(logs: string) {
		this.manager
			? this.manager.emit(RainlinkEvents.Debug, `[Rainlink] / [Plugin] / [Voice Receiver] | ${logs}`)
			: true;
	}
}
