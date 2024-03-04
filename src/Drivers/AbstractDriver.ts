import { RainlinkFetcherOptions } from '../Interface/Rest';
import { RainlinkPlugin as SaveSessionPlugin } from '../Plugin/SaveSession/Plugin';
import { RawData, WebSocket } from 'ws';

export abstract class AbstractDriver {
  /** @ignore */
  abstract wsUrl: string;
  /** @ignore */
  abstract httpUrl: string;
  /** @ignore */
  abstract sessionPlugin?: SaveSessionPlugin | null;
  /** The lavalink server season id to resume */
  abstract sessionId: string | null;
  abstract connect(): WebSocket;
  abstract fetcher<D = any>(options: RainlinkFetcherOptions): Promise<D | undefined>;
  abstract wsClose(): void;
}
