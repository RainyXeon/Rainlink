import { metadata } from './metadata';
import Library from './Library';
import Plugin from './Plugin';
import Driver from './Drivers';

// Export main class
export * from './Rainlink';
// Export player class
export * from './Player/RainlinkPlayer';
export * from './Player/RainlinkQueue';
export * from './Player/RainlinkTrack';
// Export node class
export * from './Node/RainlinkNode';
export * from './Node/RainlinkRest';
export * from './Node/RainlinkWebsocket';
// Export manager class
export * from './Manager/RainlinkNodeManager';
export * from './Manager/RainlinkPlayerManager';
export * from './Manager/RainlinkVoiceManager';
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
export { Driver };
// Export version
export const version = metadata.version;
