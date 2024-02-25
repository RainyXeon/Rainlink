import axios from 'axios';
import {
  RainlinkSearchOptions,
  RainlinkSearchResult,
  RainlinkSearchResultType,
} from '../../Interface/Manager';
import { Rainlink } from '../../Rainlink';
import { RainlinkTrack } from '../../Player/RainlinkTrack';
import { SourceRainlinkPlugin } from '../SourceRainlinkPlugin';
import { RainlinkEvents, RainlinkPluginType } from '../../Interface/Constants';

const REGEX =
  /(?:https:\/\/music\.apple\.com\/)(?:.+)?(artist|album|music-video|playlist)\/([\w\-\.]+(\/)+[\w\-\.]+|[^&]+)\/([\w\-\.]+(\/)+[\w\-\.]+|[^&]+)/;
const REGEX_SONG_ONLY =
  /(?:https:\/\/music\.apple\.com\/)(?:.+)?(artist|album|music-video|playlist)\/([\w\-\.]+(\/)+[\w\-\.]+|[^&]+)\/([\w\-\.]+(\/)+[\w\-\.]+|[^&]+)(\?|\&)([^=]+)\=([\w\-\.]+(\/)+[\w\-\.]+|[^&]+)/;

type HeaderType = {
  Authorization: string;
  origin: string;
};

type AppleOptions = {
  countryCode?: string;
  imageWidth?: number;
  imageHeight?: number;
};

const credentials = {
  APPLE_TOKEN:
    'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldlYlBsYXlLaWQifQ.eyJpc3MiOiJBTVBXZWJQbGF5IiwiaWF0IjoxNzAyNTAyMjM0LCJleHAiOjE3MDk3NTk4MzQsInJvb3RfaHR0cHNfb3JpZ2luIjpbImFwcGxlLmNvbSJdfQ.zzeMLmez71PLinP9GozYSQnF7NYyCiXHB9tKL3-cyu3LzyeRnYz0ejLj4CrNJs0dlNkFg9_mwKmMLueUAR-KRg',
};

export class RainlinkPlugin extends SourceRainlinkPlugin {
  public options: AppleOptions;
  private manager: Rainlink | null;
  private _search?: (query: string, options?: RainlinkSearchOptions) => Promise<RainlinkSearchResult>;
  private readonly methods: Record<string, (id: string, requester: unknown) => Promise<Result>>;
  private credentials: HeaderType;
  private fetchURL: string;
  private baseURL: string;
  public countryCode: string;
  public imageWidth: number;
  public imageHeight: number;

  public sourceIdentify(): string {
    return 'am';
  }

  public sourceName(): string {
    return 'apple';
  }

  public type(): RainlinkPluginType {
    return RainlinkPluginType.SourceResolver;
  }

  constructor(appleOptions: AppleOptions) {
    super();
    this.methods = {
      artist: this.getArtist.bind(this),
      album: this.getAlbum.bind(this),
      playlist: this.getPlaylist.bind(this),
      track: this.getTrack.bind(this),
    };
    this.options = appleOptions;
    this.manager = null;
    this._search = undefined;
    this.countryCode = this.options?.countryCode ? this.options?.countryCode : 'us';
    this.imageHeight = this.options?.imageHeight ? this.options?.imageHeight : 900;
    this.imageWidth = this.options?.imageWidth ? this.options?.imageWidth : 600;
    this.baseURL = 'https://api.music.apple.com/v1/';
    this.fetchURL = `https://amp-api.music.apple.com/v1/catalog/${this.countryCode}`;
    this.credentials = {
      Authorization: `Bearer ${credentials.APPLE_TOKEN}`,
      origin: 'https://music.apple.com',
    };
  }

  public load(manager: Rainlink): void {
    this.manager = manager;
    this._search = manager.search.bind(manager);
    manager.search = this.search.bind(this);
  }

  async search(query: string, options?: RainlinkSearchOptions): Promise<RainlinkSearchResult> {
    const res = await this.searchDirect(query, options);
    if (res.tracks.length == 0) return this._search!(query, options);
    else return res;
  }

  public async searchDirect(
    query: string,
    options?: RainlinkSearchOptions | undefined,
  ): Promise<RainlinkSearchResult> {
    let type: string;
    let id: string;
    let isTrack: boolean = false;

    if (!this.manager || !this._search) throw new Error('rainlink-apple is not loaded yet.');

    if (!query) throw new Error('Query is required');

    const isUrl = /^https?:\/\//.test(query);

    if (!REGEX_SONG_ONLY.exec(query) || REGEX_SONG_ONLY.exec(query) == null) {
      const extract = REGEX.exec(query) || [];
      id = extract![4];
      type = extract![1];
    } else {
      const extract = REGEX_SONG_ONLY.exec(query) || [];
      id = extract![8];
      type = extract![1];
      isTrack = true;
    }

    if (type in this.methods) {
      try {
        this.debug(`Start search from ${this.sourceName()} plugin`);
        let _function = this.methods[type];
        if (isTrack) _function = this.methods.track;
        const result: Result = await _function(id, options?.requester);

        const loadType = isTrack ? RainlinkSearchResultType.TRACK : RainlinkSearchResultType.PLAYLIST;
        const playlistName = result.name ?? undefined;

        const tracks = result.tracks.filter(this.filterNullOrUndefined);
        return this.buildSearch(playlistName, tracks, loadType);
      } catch (e) {
        return this.buildSearch(undefined, [], RainlinkSearchResultType.SEARCH);
      }
    } else if (options?.engine === 'apple' && !isUrl) {
      const result = await this.searchTrack(query, options?.requester);

      return this.buildSearch(undefined, result.tracks, RainlinkSearchResultType.SEARCH);
    } else return this.buildSearch(undefined, [], RainlinkSearchResultType.SEARCH);
  }

  public async getData(params: string) {
    const req = await axios.get(`${this.fetchURL}${params}`, {
      headers: this.credentials,
    });
    return req.data.data;
  }

  public async getSearchData(params: string) {
    const req = await axios.get(`${this.fetchURL}${params}`, {
      headers: this.credentials,
    });
    return req.data;
  }

  private async searchTrack(query: string, requester: unknown): Promise<Result> {
    try {
      const res = await this.getSearchData(
        `/search?types=songs&term=${query.replace(/ /g, '+').toLocaleLowerCase()}`,
      ).catch(e => {
        throw new Error(e);
      });
      return {
        tracks: res.results.songs.data.map((track: Track) => this.buildRainlinkTrack(track, requester)),
      };
    } catch (e: any) {
      throw new Error(e);
    }
  }

  private async getTrack(id: string, requester: unknown): Promise<Result> {
    try {
      const track = await this.getData(`/songs/${id}`).catch(e => {
        throw new Error(e);
      });
      return { tracks: [this.buildRainlinkTrack(track[0], requester)] };
    } catch (e: any) {
      throw new Error(e);
    }
  }

  private async getArtist(id: string, requester: unknown): Promise<Result> {
    try {
      const track = await this.getData(`/artists/${id}/view/top-songs`).catch(e => {
        throw new Error(e);
      });
      return { tracks: [this.buildRainlinkTrack(track[0], requester)] };
    } catch (e: any) {
      throw new Error(e);
    }
  }

  private async getAlbum(id: string, requester: unknown): Promise<Result> {
    try {
      const album = await this.getData(`/albums/${id}`).catch(e => {
        throw new Error(e);
      });

      const tracks = album[0].relationships.tracks.data
        .filter(this.filterNullOrUndefined)
        .map((track: Track) => this.buildRainlinkTrack(track, requester));

      return { tracks, name: album[0].attributes.name };
    } catch (e: any) {
      throw new Error(e);
    }
  }

  private async getPlaylist(id: string, requester: unknown): Promise<Result> {
    try {
      const playlist = await this.getData(`/playlists/${id}`).catch(e => {
        throw new Error(e);
      });

      const tracks = playlist[0].relationships.tracks.data
        .filter(this.filterNullOrUndefined)
        .map((track: any) => this.buildRainlinkTrack(track, requester));

      return { tracks, name: playlist[0].attributes.name };
    } catch (e: any) {
      throw new Error(e);
    }
  }

  private filterNullOrUndefined(obj: unknown): obj is unknown {
    return obj !== undefined && obj !== null;
  }

  private buildSearch(
    playlistName?: string,
    tracks: RainlinkTrack[] = [],
    type?: RainlinkSearchResultType,
  ): RainlinkSearchResult {
    return {
      playlistName,
      tracks,
      type: type ?? RainlinkSearchResultType.SEARCH,
    };
  }

  private buildRainlinkTrack(appleTrack: Track, requester: unknown) {
    const artworkURL = String(appleTrack.attributes.artwork.url)
      .replace('{w}', String(this.imageWidth))
      .replace('{h}', String(this.imageHeight));
    return new RainlinkTrack(
      {
        encoded: '',
        info: {
          sourceName: 'apple',
          identifier: appleTrack.id,
          isSeekable: true,
          author: appleTrack.attributes.artistName ? appleTrack.attributes.artistName : 'Unknown',
          length: appleTrack.attributes.durationInMillis,
          isStream: false,
          position: 0,
          title: appleTrack.attributes.name,
          uri: appleTrack.attributes.url || '',
          artworkUrl: artworkURL ? artworkURL : '',
        },
        pluginInfo: {
          name: 'rainlink@apple',
        },
      },
      requester,
    );
  }

  private debug(logs: string) {
    this.manager ? this.manager.emit(RainlinkEvents.Debug, `[Rainlink Apple Plugin]: ${logs}`) : true;
  }
}

// Interfaces
export interface Result {
  tracks: RainlinkTrack[];
  name?: string;
}

export interface Track {
  id: string;
  type: string;
  href: string;
  attributes: TrackAttributes;
}

export interface TrackAttributes {
  albumName: string;
  hasTimeSyncedLyrics: boolean;
  genreNames: any[];
  trackNumber: number;
  releaseDate: string;
  durationInMillis: number;
  isVocalAttenuationAllowed: boolean;
  isMasteredForItunes: boolean;
  isrc: string;
  artwork: Record<string, any>;
  audioLocale: string;
  composerName: string;
  url: string;
  playParams: Record<string, any>;
  discNumber: number;
  hasCredits: boolean;
  hasLyrics: boolean;
  isAppleDigitalMaster: boolean;
  audioTraits: any[];
  name: string;
  previews: any[];
  artistName: string;
}
