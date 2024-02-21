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
}

export interface RainlinkOptions {
  nodes: RainlinkNodeOptions[];
  options: RainlinkAdditionalOptions;
}
