export interface RainlinkNodeOptions {
    name: string
    host: string
    port: number
    auth: string
    secure: boolean
}

export interface RainlinkOptions {
    nodes: RainlinkNodeOptions[]
}
