import { RainlinkNode } from '../Node/RainlinkNode'
import { RainlinkPlayer } from '../Player/RainlinkPlayer'
import { RainlinkQueue } from '../Player/RainlinkQueue'
import { RainlinkTrack } from '../Player/RainlinkTrack'

export interface RainlinkEventsInterface {
  ////// ------------------------- Node Event ------------------------- /////
  /**
   * Emitted when rainlink have a debug log.
   * @event Rainlink#debug
   */
  debug: [logs: string]
  /**
   * Emitted when a lavalink server is connected.
   * @event Rainlink#nodeConnect
   */
  nodeConnect: [node: RainlinkNode]
  /**
   * Emitted when a lavalink server is disconnected.
   * @event Rainlink#nodeDisconnect
   */
  nodeDisconnect: [node: RainlinkNode, code: number, reason: Buffer | string]
  /**
   * Emitted when a lavalink server is trying to reconnect.
   * @event Rainlink#nodeReconnect
   */
  nodeReconnect: [node: RainlinkNode]
  /**
   * Emitted when a lavalink server is closed.
   * @event Rainlink#nodeClosed
   */
  nodeClosed: [node: RainlinkNode]
  /**
   * Emitted when a lavalink server is errored.
   * @event Rainlink#nodeError
   */
  nodeError: [node: RainlinkNode, error: Error]

  ////// ------------------------- Player Event ------------------------- /////
  /**
   * Emitted when a player is created.
   * @event Rainlink#playerCreate
   */
  playerCreate: [player: RainlinkPlayer]
  /**
   * Emitted when a player is going to destroyed.
   * @event Rainlink#playerDestroy
   */
  playerDestroy: [player: RainlinkPlayer]
  /**
   * Emitted when a player have an exception.
   * @event Rainlink#playerException
   */
  playerException: [player: RainlinkPlayer, data: Record<string, any>]
  /**
   * Emitted when a player updated info.
   * @event Rainlink#playerUpdate
   */
  playerUpdate: [player: RainlinkPlayer, data: Record<string, any>]
  /**
   * Emitted when a track paused.
   * @event Rainlink#playerPause
   */
  playerPause: [player: RainlinkPlayer, track: RainlinkTrack]
  /**
   * Emitted when a track resumed.
   * @event Rainlink#playerResume
   */
  playerResume: [player: RainlinkPlayer, data: RainlinkTrack]
  /**
   * Emitted when a player's websocket closed.
   * @event Rainlink#playerWebsocketClosed
   */
  playerWebsocketClosed: [player: RainlinkPlayer, data: Record<string, any>]

  ////// ------------------------- Track Event ------------------------- /////
  /**
   * Emitted when a track is going to play.
   * @event Rainlink#trackStart
   */
  trackStart: [player: RainlinkPlayer, track: RainlinkTrack]
  /**
   * Emitted when a track is going to end.
   * @event Rainlink#trackEnd
   */
  trackEnd: [player: RainlinkPlayer, track: RainlinkTrack]
  /**
   * Emitted when a track stucked.
   * @event Rainlink#trackStuck
   */
  trackStuck: [player: RainlinkPlayer, data: Record<string, any>]
  /**
   * Emitted when a track is failed to resolve using fallback search engine.
   * @event Rainlink#trackResolveError
   */
  trackResolveError: [player: RainlinkPlayer, track: RainlinkTrack, message: string]

  ////// ------------------------- Queue Event ------------------------- /////
  /**
   * Emitted when a track added into queue.
   * @event Rainlink#queueAdd
   */
  queueAdd: [player: RainlinkPlayer, queue: RainlinkQueue, track: RainlinkTrack[]]
  /**
   * Emitted when a track removed from queue.
   * @event Rainlink#queueRemove
   */
  queueRemove: [player: RainlinkPlayer, queue: RainlinkQueue, track: RainlinkTrack]
  /**
   * Emitted when a queue shuffled.
   * @event Rainlink#queueShuffle
   */
  queueShuffle: [player: RainlinkPlayer, queue: RainlinkQueue]
  /**
   * Emitted when a queue cleared.
   * @event Rainlink#queueClear
   */
  queueClear: [player: RainlinkPlayer, queue: RainlinkQueue]
  /**
   * Emitted when a queue is empty.
   * @event Rainlink#queueEmpty
   */
  queueEmpty: [player: RainlinkPlayer, queue: RainlinkQueue]
}
