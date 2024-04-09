import { RainlinkPlugin as PlayerMoved } from './PlayerMoved/Plugin.js';
import { RainlinkPlugin as VoiceReceiver } from './VoiceReceiver/Plugin.js';

/**
 * Import example:
 * @example
 * ```ts
 *
 * const { Rainlink, Plugin, Library } = require('rainlink');
 *
 * const rainlink = new Rainlink(
 *   {
 *     nodes: Nodes,
 *     library: new Library.DiscordJS(client),
 *     plugins: [
 *       new Plugin.PlayerMoved(client),
 *  *    // About voice receiver plugin:
 *       // This plugin only works with node use Nodelink2 driver.
 *       new Plugin.VoiceReceiver()
 *     ],
 *   },
 * );
 * ```
 */

export default {
	PlayerMoved,
	VoiceReceiver,
};
