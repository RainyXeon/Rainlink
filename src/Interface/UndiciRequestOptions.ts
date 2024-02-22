import { Readable } from 'stream';

export interface UndiciRequestOptions {
  origin?: string | URL;
  path?: string;
  method: HttpMethod;
  body?: string | Buffer | Uint8Array | Readable | null | FormData;
  headers?: IncomingHttpHeaders | string[] | null;
  query?: Record<string, any>;
  idempotent?: boolean;
  blocking?: boolean;
  upgrade?: boolean | string | null;
  headersTimeout?: number | null;
  bodyTimeout?: number | null;
  reset?: boolean;
  throwOnError?: boolean;
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
