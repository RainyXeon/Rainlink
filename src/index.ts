import { metadata } from './manifest';
import Library from './Library';
import Plugin from './Plugin';

// Export main class
export * from './Rainlink';
// Export player class
export * from './Manager/RainlinkVoiceManager';
export * from './Player/RainlinkPlayer';
// Export node class
export * from './Node/RainlinkNode';
export * from './Node/RainlinkRest';
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
// Export plugin
export { Plugin };
// Export version
export const version = metadata.version;
