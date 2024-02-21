export interface VoiceChannelOptions {
  guildId: string;
  shardId: number;
  channelId: string;
  deaf?: boolean;
  mute?: boolean;
}
