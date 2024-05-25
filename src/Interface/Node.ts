/** The lavalink server status interface */
export interface NodeStats {
  players: number;
  playingPlayers: number;
  memory: {
    reservable: number;
    used: number;
    free: number;
    allocated: number;
  };
  frameStats: {
    sent: number;
    deficit: number;
    nulled: number;
  };
  cpu: {
    cores: number;
    systemLoad: number;
    lavalinkLoad: number;
  };
  uptime: number;
}

/** The lavalink server status response interface */
export interface LavalinkNodeStatsResponse {
  op: string;
  players: number;
  playingPlayers: number;
  memory: {
    reservable: number;
    used: number;
    free: number;
    allocated: number;
  };
  frameStats: {
    sent: number;
    deficit: number;
    nulled: number;
  };
  cpu: {
    cores: number;
    systemLoad: number;
    lavalinkLoad: number;
  };
  uptime: number;
}

/** The audio sending node infomation interface */
export type NodeInfo = {
  version: NodeInfoVersion;
  buildTime: number;
  git: NodeInfoGit;
  jvm: string;
  lavaplayer: string;
  sourceManagers: string[];
  filters: string[];
  plugins: NodeInfoPlugin[];
};

/** The audio sending node version infomation interface */
export type NodeInfoVersion = {
  semver: string;
  major: number;
  minor: number;
  patch: number;
  preRelease?: string;
  build?: string;
};

/** The audio sending node git infomation interface */
export type NodeInfoGit = {
  branch: string;
  commit: string;
  commitTime: number;
};

/** The audio sending node plugin infomation interface */
export type NodeInfoPlugin = {
  name: string;
  version: string;
};
