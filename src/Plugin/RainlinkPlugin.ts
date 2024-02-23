import { RainlinkPluginType } from '../Interface/Constants';
import { Rainlink } from '../Rainlink';

export class RainlinkPlugin {
  public type(): RainlinkPluginType {
    throw new Error('Plugin must implement type() and return "sourceResolver" or "default"');
  }

  public load(manager: Rainlink): void {
    throw new Error('Plugin must implement load()');
  }

  public unload(manager: Rainlink): void {
    throw new Error('Plugin must implement unload()');
  }
}
