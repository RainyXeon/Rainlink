import { AbstractLibrary } from '../Library/AbstractLibrary';
import { RainlinkPlugin } from '../Plugin/RainlinkPlugin';
import { RainlinkTrack } from '../Player/RainlinkTrack';

export interface RainlinkNodeOptions {
  name: string;
  host: string;
  port: number;
  auth: string;
  secure: boolean;
}

export interface RainlinkAdditionalOptions {
  retryTimeout: number;
  retryCount: number;
  voiceConnectionTimeout: number;
  defaultSearchEngine?: string;
  searchFallback?: boolean;
}

export interface RainlinkOptions {
  nodes: RainlinkNodeOptions[];
  options: RainlinkAdditionalOptions;
  library: AbstractLibrary;
  plugins: RainlinkPlugin[];
}

export enum RainlinkSearchResultType {
  TRACK,
  PLAYLIST,
  SEARCH,
}

export interface RainlinkSearchResult {
  type: RainlinkSearchResultType;
  playlistName?: string;
  tracks: RainlinkTrack[];
}

export interface RainlinkSearchOptions {
  requester?: unknown;
  nodeName?: string;
  engine?: string;
}
