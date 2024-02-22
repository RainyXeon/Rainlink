import { metadata } from './manifest';
import Library from './Library';

// Export main class
export * from './Rainlink';
// Export player class
export * from './Player/RainlinkConnection';
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
export * from './Interface/Constants';
export * from './Interface/Manager';
export * from './Interface/Player';
// Export version
export const version = metadata.version;
