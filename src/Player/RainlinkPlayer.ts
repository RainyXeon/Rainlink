import { RainlinkNodeOptions } from '../Interface/Manager';
import { RainlinkManager } from '../Manager/RainlinkManager';

export class RainlinkPlayer {
  manager: RainlinkManager;
  constructor(manager: RainlinkManager) {
    this.manager = manager;
  }
}
