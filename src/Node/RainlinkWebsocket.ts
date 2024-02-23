import { RainlinkEvents, RainlinkLoopMode, RainlinkPlayerState } from '../Interface/Constants';
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
    const _function = this.methods[data.type];
    if (_function !== undefined) _function(data);
  }

  TrackStartEvent(data: Record<string, any>) {
    const player = this.manager.players.get(data.guildId);
    if (player) {
      player.playing = true;
      this.manager.emit(RainlinkEvents.PlayerStart, player, player.queue.current);
    }
    return;
  }

  TrackEndEvent(data: Record<string, any>) {
    const player = this.manager.players.get(data.guildId);
    if (player) {
      // This event emits STOPPED reason when destroying, so return to prevent double emit
      if (player.state === RainlinkPlayerState.DESTROYING || player.state === RainlinkPlayerState.DESTROYED)
        return this.debug(`Player ${player.guildId} destroyed from end event`);

      if (data.reason === 'replaced') return this.manager.emit(RainlinkEvents.PlayerEnd, player);
      if (['loadFailed', 'cleanup'].includes(data.reason)) {
        if (player.queue.current) player.queue.previous.push(player.queue.current);
        player.playing = false;
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

      if (player.queue.length) this.manager.emit(RainlinkEvents.PlayerEnd, this, currentSong);
      else {
        player.playing = false;
        return this.manager.emit(RainlinkEvents.PlayerEmpty, this);
      }

      return player.play();
    }
    return;
  }

  TrackExceptionEvent(data: Record<string, any>) {}

  TrackStuckEvent(data: Record<string, any>) {}

  WebSocketClosedEvent(data: Record<string, any>) {}

  private debug(logs: string) {
    this.manager.emit(RainlinkEvents.Debug, `[Rainlink Player Events]: ${logs}`);
  }
}
