import { RawTrack } from '../Interface/Rest';
import { Rainlink } from '../Rainlink';

export class RainlinkTrack {
  encoded: string;
  identifier: string;
  isSeekable: boolean;
  author: string;
  duration: number;
  isStream: boolean;
  position: number;
  title: string;
  uri?: string;
  artworkUrl?: string;
  isrc?: string;
  source: string;
  pluginInfo: unknown;
  requester: unknown;

  constructor(
    protected options: RawTrack,
    requester: unknown,
  ) {
    // Initial data
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
  }

  get isPlayable(): boolean {
    return this.encoded && this.encoded.length !== 0 ? true : false;
  }

  get raw(): RawTrack {
    return this.options;
  }

  async resolver(manager: Rainlink) {}
}
