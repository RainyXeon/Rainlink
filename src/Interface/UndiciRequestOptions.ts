import { Readable } from 'stream';

export interface UndiciRequestOptions {
  origin?: string | URL;
  path?: string;
  method: HttpMethod;
  /** Default: `null` */
  body?: string | Buffer | Uint8Array | Readable | null | FormData;
  /** Default: `null` */
  headers?: IncomingHttpHeaders | string[] | null;
  /** Query string params to be embedded in the request URL. Default: `null` */
  query?: Record<string, any>;
  /** Whether the requests can be safely retried or not. If `false` the request won't be sent until all preceding requests in the pipeline have completed. Default: `true` if `method` is `HEAD` or `GET`. */
  idempotent?: boolean;
  /** Whether the response is expected to take a long time and would end up blocking the pipeline. When this is set to `true` further pipelining will be avoided on the same connection until headers have been received. */
  blocking?: boolean;
  /** Upgrade the request. Should be used to specify the kind of upgrade i.e. `'Websocket'`. Default: `method === 'CONNECT' || null`. */
  upgrade?: boolean | string | null;
  /** The amount of time, in milliseconds, the parser will wait to receive the complete HTTP headers. Defaults to 300 seconds. */
  headersTimeout?: number | null;
  /** The timeout after which a request will time out, in milliseconds. Monitors time between receiving body data. Use 0 to disable it entirely. Defaults to 300 seconds. */
  bodyTimeout?: number | null;
  /** Whether the request should stablish a keep-alive or not. Default `false` */
  reset?: boolean;
  /** Whether Undici should throw an error upon receiving a 4xx or 5xx response from the server. Defaults to false */
  throwOnError?: boolean;
  /** For H2, it appends the expect: 100-continue header, and halts the request body until a 100-continue is received from the remote server*/
  expectContinue?: boolean;
}

export type IncomingHttpHeaders = Record<string, string | string[] | undefined>;

export type HttpMethod =
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'CONNECT'
  | 'OPTIONS'
  | 'TRACE'
  | 'PATCH';
