import undici from 'undici';
import { RainlinkNodeOptions } from '../Interface/Manager';
import { RainlinkManager } from '../Manager/RainlinkManager';
import { metadata } from '../manifest';
import { RainlinkEvents } from '../Interface/Constants';

export interface RainlinkFetcherOptions {
  endpoints: string;
  params: string;
}

export class RainlinkRest {
  protected undici: typeof undici;
  public manager: RainlinkManager;
  public node: RainlinkNodeOptions;
  public url: string;

  constructor(manager: RainlinkManager, node: RainlinkNodeOptions) {
    this.manager = manager;
    this.undici = undici;
    this.node = node;
    this.url = `${node.secure ? 'https://' : 'http://'}${node.host}:${node.port}/v${metadata.lavalink}`;
  }

  async fetcher(
    options: RainlinkFetcherOptions,
  ): Promise<Record<string, any> | undefined> {
    const url = new URL(`${this.url}${options.endpoints}`);
    if (options.params)
      url.search = new URLSearchParams(options.params).toString();

    const headers = {
      Authorization: this.node.auth,
    };

    const res = await undici.fetch(url, { headers });
    if (res.status !== 200) {
      this.manager.emit(
        RainlinkEvents.Debug,
        '[Rainlink] Something went wrong with lavalink server',
      );
      return {};
    }
  }
}
