import { RainlinkEvents, RainlinkLoopMode, RainlinkPlayerState } from '../Interface/Constants';
import {
  LavalinkEventsEnum,
  PlayerUpdate,
  TrackEndEvent,
  TrackExceptionEvent,
  TrackStartEvent,
  TrackStuckEvent,
  WebSocketClosedEvent,
} from '../Interface/LavalinkEvents';
import { Rainlink } from '../Rainlink';

export class RainlinkWebsocket {
  public manager: Rainlink;
  private readonly methods: Record<string, (data: Record<string, any>) => void>;

  constructor(manager: Rainlink) {
    this.manager = manager;
    this.methods = {
      TrackStartEvent: this.TrackStartEvent.bind(this),
      TrackEndEvent: this.TrackEndEvent.bind(this),
      TrackExceptionEvent: this.TrackExceptionEvent.bind(this),
      TrackStuckEvent: this.TrackStuckEvent.bind(this),
      WebSocketClosedEvent: this.WebSocketClosedEvent.bind(this),
    };
  }

  public initial(data: Record<string, any>) {
    if (data.op == LavalinkEventsEnum.PlayerUpdate) return this.PlayerUpdate(data);
    const _function = this.methods[data.type];
    if (_function !== undefined) _function(data);
  }

  protected TrackStartEvent(data: Record<string, any>) {
    const newData = data as TrackStartEvent;
    const player = this.manager.players.get(newData.guildId);
    if (player) {
      player.playing = true;
      this.manager.emit(RainlinkEvents.PlayerStart, player, player.queue.current);
      this.debug(`Player started at guild ${newData.guildId}`);
    }
    return;
  }

  protected TrackEndEvent(data: Record<string, any>) {
    const newData = data as TrackEndEvent;
    const player = this.manager.players.get(newData.guildId);
    if (player) {
      // This event emits STOPPED reason when destroying, so return to prevent double emit
      if (player.state === RainlinkPlayerState.DESTROYED)
        return this.debug(`Player ${player.guildId} destroyed from end event`);

      player.playing = false;
      player.paused = true;

      if (newData.reason === 'replaced') {
        return this.manager.emit(RainlinkEvents.PlayerEnd, player);
      }
      if (['loadFailed', 'cleanup'].includes(newData.reason)) {
        if (player.queue.current) player.queue.previous.push(player.queue.current);
        if (!player.queue.length) return this.manager.emit(RainlinkEvents.PlayerEmpty, player);
        this.manager.emit(RainlinkEvents.PlayerEnd, player, player.queue.current);
        player.queue.current = null;
        return player.play();
      }

      if (player.loop == RainlinkLoopMode.SONG && player.queue.current)
        player.queue.unshift(player.queue.current);
      if (player.loop == RainlinkLoopMode.QUEUE && player.queue.current)
        player.queue.push(player.queue.current);

      if (player.queue.current) player.queue.previous.push(player.queue.current);
      const currentSong = player.queue.current;
      player.queue.current = null;

      if (player.queue.length) {
        this.manager.emit(RainlinkEvents.PlayerEnd, this, currentSong);
      } else {
        return this.manager.emit(RainlinkEvents.PlayerEmpty, this);
      }

      return player.play();
    }
    return;
  }

  protected TrackExceptionEvent(data: Record<string, any>) {
    const newData = data as TrackExceptionEvent;
    const player = this.manager.players.get(newData.guildId);
    if (player) {
      this.manager.emit(RainlinkEvents.PlayerException, player, newData);
      this.debug(`Player got exception at guild ${newData.guildId}`);
    }
    return;
  }

  protected TrackStuckEvent(data: Record<string, any>) {
    const newData = data as TrackStuckEvent;
    const player = this.manager.players.get(newData.guildId);
    if (player) {
      this.manager.emit(RainlinkEvents.PlayerStuck, player, newData);
      this.debug(`Player stucked at guild ${newData.guildId}`);
    }
    return;
  }

  protected WebSocketClosedEvent(data: Record<string, any>) {
    const newData = data as WebSocketClosedEvent;
    const player = this.manager.players.get(newData.guildId);
    if (player) {
      this.manager.emit(RainlinkEvents.PlayerWebsocketClosed, player, newData);
      this.debug(`Websocket closed at guild ${newData.guildId}`);
    }
    return;
  }

  protected PlayerUpdate(data: Record<string, any>) {
    const newData = data as PlayerUpdate;
    const player = this.manager.players.get(newData.guildId);
    if (player) {
      player.position = Number(newData.state.position);
      this.debug(`Player updated, position: ${data.state.position}`);
      this.manager.emit(RainlinkEvents.PlayerUpdate, player, newData);
    }
    return;
  }

  protected debug(logs: string) {
    this.manager.emit(RainlinkEvents.Debug, `[Rainlink Player Events]: ${logs}`);
  }
}
