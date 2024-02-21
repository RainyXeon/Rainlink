import { AbstractLibrary } from '../Library/AbstractLibrary';

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
}

export interface RainlinkOptions {
  nodes: RainlinkNodeOptions[];
  options: RainlinkAdditionalOptions;
  library: AbstractLibrary;
}
