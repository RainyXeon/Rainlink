import { RainlinkPlugin as Deezer } from './Deezer/Plugin.js';
import { RainlinkPlugin as Apple } from './Apple/Plugin.js';
import { RainlinkPlugin as Nico } from './Nico/Plugin.js';
import { RainlinkPlugin as Spotify } from './Spotify/Plugin.js';
import { RainlinkPlugin as PlayerMoved } from './PlayerMoved/Plugin.js';

/**
 * Import example:
 * @example
 * ```ts
 * new Plugin.Deezer()
 *
 * new Plugin.Apple({
 *   countryCode: "us",
 *   imageWidth: 600,
 *   imageHeight: 900,
 * })
 *
 * new Plugin.Nico({
 *   searchLimit: 10,
 * })
 *
 * new Plugin.Spotify({
 *   clientId: "your_spotify_client_id",
 *   clientSecret: "your_spotify_client_secret",
 *   playlistPageLimit: 1,
 *   albumPageLimit: 1,
 *   searchLimit: 20,
 *   searchMarket: "US"
 * })
 *
 * new Plugin.PlayerMoved(client)
 * ```
 */
export default {
  Deezer,
  Apple,
  Nico,
  Spotify,
  PlayerMoved,
};
