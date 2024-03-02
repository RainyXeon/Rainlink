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
  private readonly methods: Record<string, (manager: Rainlink, data: Record<string, any>) => void>;

  constructor() {
    this.methods = {
      TrackStartEvent: this.TrackStartEvent,
      TrackEndEvent: this.TrackEndEvent,
      TrackExceptionEvent: this.TrackExceptionEvent,
      TrackStuckEvent: this.TrackStuckEvent,
      WebSocketClosedEvent: this.WebSocketClosedEvent,
    };
  }

  public initial(data: Record<string, any>, manager: Rainlink) {
    if (data.op == LavalinkEventsEnum.PlayerUpdate) return this.PlayerUpdate(manager, data);
    const _function = this.methods[data.type];
    if (_function !== undefined) _function(manager, data);
  }

  protected TrackStartEvent(manager: Rainlink, data: Record<string, any>) {
    const newData = data as TrackStartEvent;
    const player = manager.players.get(newData.guildId);
    if (player) {
      player.playing = true;
      manager.emit(RainlinkEvents.PlayerStart, player, player.queue.current);
      manager.emit(
        RainlinkEvents.Debug,
        `[Rainlink Player Events]: Player started at guild ${newData.guildId}`,
      );
    }
    return;
  }

  protected TrackEndEvent(manager: Rainlink, data: Record<string, any>) {
    const newData = data as TrackEndEvent;
    const player = manager.players.get(newData.guildId);
    if (player) {
      // This event emits STOPPED reason when destroying, so return to prevent double emit
      if (player.state === RainlinkPlayerState.DESTROYED)
        return manager.emit(
          RainlinkEvents.Debug,
          `[Rainlink Player Events]: Player ${player.guildId} destroyed from end event`,
        );

      manager.emit(
        RainlinkEvents.Debug,
        `[Rainlink Player Events]: Player ended at guild ${newData.guildId}`,
      );

      player.playing = false;
      player.paused = true;

      if (newData.reason === 'replaced') {
        return manager.emit(RainlinkEvents.PlayerEnd, player, player.queue.current);
      }
      if (['loadFailed', 'cleanup'].includes(newData.reason)) {
        if (player.queue.current) player.queue.previous.push(player.queue.current);
        if (!player.queue.length) return manager.emit(RainlinkEvents.PlayerEmpty, player);
        manager.emit(RainlinkEvents.PlayerEnd, player, player.queue.current);
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
        manager.emit(RainlinkEvents.PlayerEnd, player, currentSong);
      } else {
        return manager.emit(RainlinkEvents.PlayerEmpty, player);
      }

      return player.play();
    }
    return;
  }

  protected TrackExceptionEvent(manager: Rainlink, data: Record<string, any>) {
    const newData = data as TrackExceptionEvent;
    const player = manager.players.get(newData.guildId);
    if (player) {
      manager.emit(RainlinkEvents.PlayerException, player, newData);
      manager.emit(
        RainlinkEvents.Debug,
        `[Rainlink Player Events]: Player got exception at guild ${newData.guildId}`,
      );
    }
    return;
  }

  protected TrackStuckEvent(manager: Rainlink, data: Record<string, any>) {
    const newData = data as TrackStuckEvent;
    const player = manager.players.get(newData.guildId);
    if (player) {
      manager.emit(RainlinkEvents.PlayerStuck, player, newData);
      manager.emit(
        RainlinkEvents.Debug,
        `[Rainlink Player Events]: Player stucked at guild ${newData.guildId}`,
      );
    }
    return;
  }

  protected WebSocketClosedEvent(manager: Rainlink, data: Record<string, any>) {
    const newData = data as WebSocketClosedEvent;
    const player = manager.players.get(newData.guildId);
    if (player) {
      manager.emit(RainlinkEvents.PlayerWebsocketClosed, player, newData);
      manager.emit(
        RainlinkEvents.Debug,
        `[Rainlink Player Events]: Websocket closed at guild ${newData.guildId}`,
      );
    }
    return;
  }

  protected PlayerUpdate(manager: Rainlink, data: Record<string, any>) {
    const newData = data as PlayerUpdate;
    const player = manager.players.get(newData.guildId);
    if (player) {
      player.position = Number(newData.state.position);
      manager.emit(
        RainlinkEvents.Debug,
        `[Rainlink Player Events]: Player updated, position: ${data.state.position}`,
      );
      manager.emit(RainlinkEvents.PlayerUpdate, player, newData);
    }
    return;
  }
}
