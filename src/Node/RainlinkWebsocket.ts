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
    if (player) player.setPlaying(true);
    return;
  }

  TrackEndEvent(data: Record<string, any>) {}

  TrackExceptionEvent(data: Record<string, any>) {}

  TrackStuckEvent(data: Record<string, any>) {}

  WebSocketClosedEvent(data: Record<string, any>) {}
}
