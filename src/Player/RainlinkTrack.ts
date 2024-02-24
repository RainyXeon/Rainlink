import { RainlinkEvents } from '../Interface/Constants';
import { RainlinkSearchResult } from '../Interface/Manager';
import { RawTrack } from '../Interface/Rest';
import { ResolveOptions } from '../Interface/Track';
import { Rainlink } from '../Rainlink';

export class RainlinkTrack {
  /** Encoded string from lavalink */
  encoded: string;
  /** Identifier string from lavalink */
  identifier: string;
  /** Whenever track is seekable or not */
  isSeekable: boolean;
  /** Track's author */
  author: string;
  /** Track's duration */
  duration: number;
  /** Whenever track is stream able or not */
  isStream: boolean;
  /** Track's position */
  position: number;
  /** Track's title */
  title: string;
  /** Track's URL */
  uri?: string;
  /** Track's artwork URL */
  artworkUrl?: string;
  /** Track's isrc */
  isrc?: string;
  /** Track's source name */
  source: string;
  /** Data from lavalink plugin */
  pluginInfo: unknown;
  /** Track's requester */
  requester: unknown;
  /** Track's realUri (youtube fall back) */
  realUri?: string;

  constructor(
    protected options: RawTrack,
    requester: unknown,
  ) {
    this.encoded = options.encoded;
    this.identifier = options.info.identifier;
    this.isSeekable = options.info.isSeekable;
    this.author = options.info.author;
    this.duration = options.info.length;
    this.isStream = options.info.isStream;
    this.position = options.info.position;
    this.title = options.info.title;
    this.uri = options.info.uri;
    this.artworkUrl = options.info.artworkUrl;
    this.isrc = options.info.isrc;
    this.source = options.info.sourceName;
    this.pluginInfo = options.pluginInfo;
    this.requester = requester;
    this.realUri = undefined;
  }

  get isPlayable(): boolean {
    return (
      !!this.encoded &&
      !!this.source &&
      !!this.identifier &&
      !!this.author &&
      !!this.duration &&
      !!this.title &&
      !!this.uri &&
      !!this.realUri
    );
  }

  get raw(): RawTrack {
    return this.options;
  }

  /**
   * Resolve the track
   * @param options Resolve options
   * @returns Promise<KazagumoTrack>
   */
  public async resolver(manager: Rainlink, options?: ResolveOptions): Promise<RainlinkTrack> {
    const { overwrite } = options ? options : { overwrite: false };

    if (this.isPlayable) return this;

    manager.emit(
      RainlinkEvents.Debug,
      `Resolving ${this.source} track ${this.title}; Source: ${this.source}`,
    );

    const result = await this.getTrack(manager);
    if (!result) throw new Error('No results found');

    this.encoded = result.encoded;
    this.realUri = result.info.uri;
    this.duration = result.info.length;

    if (overwrite) {
      this.title = result.info.title;
      this.identifier = result.info.identifier;
      this.isSeekable = result.info.isSeekable;
      this.author = result.info.author;
      this.duration = result.info.length;
      this.isStream = result.info.isStream;
      this.uri = result.info.uri;
    }
    return this;
  }

  protected async getTrack(manager: Rainlink): Promise<RawTrack> {
    const defaultSearchEngine = manager.options.options.defaultSearchEngine;

    const source = manager.searchEngines.get(defaultSearchEngine || 'youtube');
    const query = [this.author, this.title].filter(x => !!x).join(' - ');
    const node = await manager.nodes.getLeastUsedNode();

    if (!node) throw new Error('No nodes available');

    let result: RainlinkSearchResult;

    const prase1 = await manager.search(query, {
      engine: source,
      requester: this.requester,
    });

    if (!prase1 || !prase1.tracks.length) {
      const prase2 = await manager.search(query, {
        engine: 'youtube',
        requester: this.requester,
      });
      result = prase2;
    } else {
      result = prase1;
    }

    if (!result || !result.tracks.length) throw new Error('No results found');

    const rawTracks = result.tracks.map(x => x.raw);

    if (this.author) {
      const author = [this.author, `${this.author} - Topic`];
      const officialTrack = rawTracks.find(
        track =>
          author.some(name => new RegExp(`^${this.escapeRegExp(name)}$`, 'i').test(track.info.author)) ||
          new RegExp(`^${this.escapeRegExp(this.title)}$`, 'i').test(track.info.title),
      );
      if (officialTrack) return officialTrack;
    }
    if (this.duration) {
      const sameDuration = rawTracks.find(
        track =>
          track.info.length >= (this.duration ? this.duration : 0) - 2000 &&
          track.info.length <= (this.duration ? this.duration : 0) + 2000,
      );
      if (sameDuration) return sameDuration;
    }

    return rawTracks[0];
  }

  protected escapeRegExp(string: string) {
    return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
  }
}
