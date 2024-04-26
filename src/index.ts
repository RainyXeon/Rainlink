import { metadata } from './metadata';
import Library from './Library';
import Plugin from './Plugin';

// Export main class
export * from './Rainlink';
// Export player class
export * from './Player/RainlinkPlayer';
export * from './Player/RainlinkQueue';
export * from './Player/RainlinkTrack';
export * from './Player/RainlinkFilter';
// Export node class
export * from './Node/RainlinkNode';
export * from './Node/RainlinkRest';
export * from './Node/RainlinkPlayerEvents';
// Export manager class
export * from './Manager/RainlinkNodeManager';
export * from './Manager/RainlinkPlayerManager';
//// Export library class
export * from './Library/AbstractLibrary';
export { Library };
//Export interface
export * from './Interface/Connection';
export * from './Interface/Constants';
export * from './Interface/Manager';
export * from './Interface/Node';
export * from './Interface/Player';
export * from './Interface/Rest';
export * from './Interface/Track';
// Export plugin
export * from './Plugin/RainlinkPlugin';
export * from './Plugin/SourceRainlinkPlugin';
export { Plugin };
// Export driver
export * from './Drivers/AbstractDriver';
export * from './Drivers/Lavalink3';
export * from './Drivers/Lavalink4';
export * from './Drivers/Nodelink2';
// Export utilities
export * from './Utilities/RainlinkDatabase';
export * from './Utilities/RainlinkWebsocket';
// Export metadata
export * from './metadata';
export const version = metadata.version;
