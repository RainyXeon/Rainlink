import { RainlinkRequesterOptions } from '../Interface/Rest'
import { RainlinkDatabase } from '../Utilities/RainlinkDatabase'
import { RainlinkNode } from '../Node/RainlinkNode'
import { RainlinkWebsocket } from '../Utilities/RainlinkWebsocket'
import { RainlinkPlayer } from '../Player/RainlinkPlayer'
import { Rainlink } from '../Rainlink'

/**
 * The abstract class for developing driver
 * to use another audio sending server.
 */
export abstract class AbstractDriver {
  /**  The id for the driver*/
  abstract id: string
  /** Ws url for dealing connection to lavalink/nodelink server */
  abstract wsUrl: string
  /** Http url for dealing rest request to lavalink/nodelink server */
  abstract httpUrl: string
  /** The lavalink server season id to resume */
  abstract sessionId: string | null
  /** All function to extend support driver on RainlinkPlayer class */
  abstract playerFunctions: RainlinkDatabase<(player: RainlinkPlayer, ...args: any) => unknown>
  /** All function to extend support driver on Rainlink class */
  abstract functions: RainlinkDatabase<(manager: Rainlink, ...args: any) => unknown>
  /** Rainlink manager class */
  abstract manager: Rainlink
  /** Rainlink reuqested lavalink/nodelink server */
  abstract node: RainlinkNode

  /**
   * Connect to lavalink/nodelink server
   * @returns WebSocket
   */
  abstract connect(): RainlinkWebsocket
  /**
   * Fetch function for dealing rest request to lavalink/nodelink server
   * @returns Promise<D | undefined>
   */
  abstract requester<D = any>(options: RainlinkRequesterOptions): Promise<D | undefined>
  /**
   * Close the lavalink/nodelink server
   * @returns void
   */
  abstract wsClose(): void
  /**
   * Update a season to resume able or not
   * @returns void
   */
  abstract updateSession(sessionId: string, mode: boolean, timeout: number): Promise<void>
}
