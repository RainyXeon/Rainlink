import { Rainlink } from '../Rainlink';

export class RainlinkPlugin {
  public load(manager: Rainlink): void {
    throw new Error('Plugin must implement load()');
  }

  public unload(manager: Rainlink): void {
    throw new Error('Plugin must implement unload()');
  }
}
