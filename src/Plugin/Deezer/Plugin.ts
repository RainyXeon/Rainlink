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

const API_URL = 'https://api.deezer.com/';
const REGEX = /^https?:\/\/(?:www\.)?deezer\.com\/[a-z]+\/(track|album|playlist)\/(\d+)$/;
const SHORT_REGEX = /^https:\/\/deezer\.page\.link\/[a-zA-Z0-9]{12}$/;

export class RainlinkPlugin extends SourceRainlinkPlugin {
  private manager: Rainlink | null;
  private _search?: (query: string, options?: RainlinkSearchOptions) => Promise<RainlinkSearchResult>;
  private readonly methods: Record<string, (id: string, requester: unknown) => Promise<Result>>;

  public sourceIdentify(): string {
    return 'dz';
  }

  public sourceName(): string {
    return 'deezer';
  }

  public type(): RainlinkPluginType {
    return RainlinkPluginType.SourceResolver;
  }

  constructor() {
    super();
    this.methods = {
      track: this.getTrack.bind(this),
      album: this.getAlbum.bind(this),
      playlist: this.getPlaylist.bind(this),
    };
    this.manager = null;
    this._search = undefined;
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
    if (!this.manager || !this._search) throw new Error('rainlink-deezer is not loaded yet.');

    if (!query) throw new Error('Query is required');

    const isUrl = /^https?:\/\//.test(query);

    if (SHORT_REGEX.test(query)) {
      const res = await axios.head(query);
      query = String(res.headers.location);
    }

    //---- You can implement this for search from lavalink first ----

    this.debug('Start search from plugin');
    this.debug('Searching from lavalink (pre search)');

    const preSearchQuery = isUrl ? query : `${this.sourceIdentify()}search:${query}`;

    const preSearch = await this._search!(`directSearch=${preSearchQuery}`, {
      engine: this.sourceName(),
      nodeName: options?.nodeName,
      requester: options?.requester,
    });

    if (preSearch.tracks.length !== 0) return preSearch;

    this.debug('Searching from lavalink failed, now search directly from api');

    //---- You can implement this for search from lavalink first ----

    const [, type, id] = REGEX.exec(query) || [];

    if (type in this.methods) {
      try {
        const _function = this.methods[type];
        const result: Result = await _function(id, options?.requester);

        const loadType =
          type === 'track' ? RainlinkSearchResultType.TRACK : RainlinkSearchResultType.PLAYLIST;
        const playlistName = result.name ?? undefined;

        const tracks = result.tracks.filter(this.filterNullOrUndefined);
        return this.buildSearch(playlistName, tracks, loadType);
      } catch (e) {
        return this.buildSearch(undefined, [], RainlinkSearchResultType.SEARCH);
      }
    } else if (options?.engine === this.sourceName() && !isUrl) {
      const result = await this.searchTrack(query, options?.requester);

      return this.buildSearch(undefined, result.tracks, RainlinkSearchResultType.SEARCH);
    } else return this.buildSearch(undefined, [], RainlinkSearchResultType.SEARCH);
  }

  private async searchTrack(query: string, requester: unknown): Promise<Result> {
    try {
      const request = await axios.get(`${API_URL}/search/track?q=${decodeURIComponent(query)}`);

      const res = request.data as SearchResult;
      return {
        tracks: res.data.map(track => this.buildRainlinkTrack(track, requester)),
      };
    } catch (e: any) {
      throw new Error(e);
    }
  }

  private async getTrack(id: string, requester: unknown): Promise<Result> {
    try {
      const request = await axios.get(`${API_URL}/track/${id}/`);
      const track = request.data as DeezerTrack;

      return { tracks: [this.buildRainlinkTrack(track, requester)] };
    } catch (e: any) {
      throw new Error(e);
    }
  }

  private async getAlbum(id: string, requester: unknown): Promise<Result> {
    try {
      const request = await axios.get(`${API_URL}/album/${id}`);
      const album = request.data as Album;

      const tracks = album.tracks.data
        .filter(this.filterNullOrUndefined)
        .map(track => this.buildRainlinkTrack(track, requester));

      return { tracks, name: album.title };
    } catch (e: any) {
      throw new Error(e);
    }
  }

  private async getPlaylist(id: string, requester: unknown): Promise<Result> {
    try {
      const request = await axios.get(`${API_URL}/playlist/${id}`);
      const playlist = request.data as Playlist;

      const tracks = playlist.tracks.data
        .filter(this.filterNullOrUndefined)
        .map(track => this.buildRainlinkTrack(track, requester));

      return { tracks, name: playlist.title };
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

  private buildRainlinkTrack(dezzerTrack: any, requester: unknown) {
    return new RainlinkTrack(
      {
        encoded: '',
        info: {
          sourceName: 'deezer',
          identifier: dezzerTrack.id,
          isSeekable: true,
          author: dezzerTrack.artist ? dezzerTrack.artist.name : 'Unknown',
          length: dezzerTrack.duration * 1000,
          isStream: false,
          position: 0,
          title: dezzerTrack.title,
          uri: `https://www.deezer.com/track/${dezzerTrack.id}`,
          artworkUrl: dezzerTrack.album ? dezzerTrack.album.cover : '',
        },
        pluginInfo: {
          name: 'rainlink@deezer',
        },
      },
      requester,
    );
  }

  private debug(logs: string) {
    this.manager ? this.manager.emit(RainlinkEvents.Debug, `[Rainlink Deezer Plugin]: ${logs}`) : true;
  }
}

// Interfaces
export interface Result {
  tracks: RainlinkTrack[];
  name?: string;
}
export interface Album {
  title: string;
  tracks: AlbumTracks;
}
export interface AlbumTracks {
  data: DeezerTrack[];
  next: string | null;
}
export interface Artist {
  name: string;
}
export interface Playlist {
  tracks: PlaylistTracks;
  title: string;
}
export interface PlaylistTracks {
  data: DeezerTrack[];
  next: string | null;
}
export interface DeezerTrack {
  data: RainlinkTrack[];
}
export interface SearchResult {
  exception?: {
    severity: string;
    message: string;
  };
  loadType: string;
  playlist?: {
    duration_ms: number;
    name: string;
  };
  data: RainlinkTrack[];
}
