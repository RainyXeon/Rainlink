# 🌦️ Rainlink

Another lavalink wrapper but focus on stability and rich features

# 🌟 Features
 - Stable client
 - Support TypeScript
 - 100% Compatible with Lavalink
 - Object-oriented
 - Easy to setup
 - Inbuilt Queue System
 - Extendable Player, Queue, Rest class
 - Backward compatible (Can run lavalink version 3.7.x)
 - Driver based (avaliable to run Nodelink v2 and port older lavalink version)
 - Plugin system
 - Using [PWSL](https://github.com/PerformanC/internals) by [The PerformanC Organization](https://github.com/PerformanC) for better WS implementation
 - Compatible with bun

# 🛠️ Installation

```
npm i rainlink
```

# 📘 Document:

Here: [https://rainlinkjs.vercel.app/](https://rainlinkjs.vercel.app/)

# 💿 Used by

| Name                                                 | Creator      | Variants          |
|------------------------------------------------------|--------------|-------------------|
| [ByteBlaze](https://github.com/RainyXeon/ByteBlaze)  | RainyXeon    | Original          |
| [Lunox](https://github.com/adh319/Lunox)             | adh319       | Original          |

If you want to add your own bot create a pull request with your bot added. Please add your full name.

# ➕ Plugins

This is the list of all rainlink plugin currently supported

| Name               | Type     | Link                                                                                                                          | Author    |
|--------------------|----------|-------------------------------------------------------------------------------------------------------------------------------|-----------|
| rainlink-nico      | Official | [npmjs](https://www.npmjs.com/package/rainlink-nico) / [github](https://github.com/RainyProduction/rainlink-nico)             | RainyXeon |
| rainlink-deezer    | Official | [npmjs](https://www.npmjs.com/package/rainlink-deezer) / [github](https://github.com/RainyProduction/rainlink-deezer)         | RainyXeon | 
| rainlink-apple     | Official | [npmjs](https://www.npmjs.com/package/rainlink-apple) / [github](https://github.com/RainyProduction/rainlink-apple)           | RainyXeon | 
| rainlink-spotify   | Official | [npmjs](https://www.npmjs.com/package/rainlink-spotify) / [github](https://github.com/RainyProduction/rainlink-spotify)       | RainyXeon | 
| rainlink-voice     | Official | [npmjs](https://www.npmjs.com/package/rainlink-voice) / [github](https://github.com/RainyProduction/rainlink-voice)           | RainyXeon | 

# ⚙ Drivers

This is the list of all rainlink driver currently supported (codename is made up by me)

| Driver Name       | Voice Server                                          | Language   | Supported Version | Codename | Notes                                                             |
|-------------------|-------------------------------------------------------|------------|-------------------|----------|-------------------------------------------------------------------| 
| lavalink/v4/koinu | [Lavalink](https://github.com/lavalink-devs/Lavalink) | Java       | v4.0.0 - v4.x.x   | koinu    |                                                                   |
| lavalink/v3/koto  | [Lavalink](https://github.com/lavalink-devs/Lavalink) | Java       | v3.0.0 - v3.7.x   | koto     | `filter` and `resume` in lavalink below v3.4 not supported        |
| nodelink/v2/nari  | [Nodelink](https://github.com/PerformanC/NodeLink)    | Javascript | v2.0.0 - v2.x.x   | nari     | Some `filter` mode in nodelink not supported                      |
| frequenc/v1/miku  | [FrequenC](https://github.com/PerformanC/FrequenC)    | C          | IN TESTING        | miku     | This driver is in testing so don't use it or you will have errors |

# 💾 Example bot:

```js
const {Client, GatewayIntentBits} = require('discord.js');
const {Guilds, GuildVoiceStates, GuildMessages, MessageContent} = GatewayIntentBits;
const {Rainlink, Library} = require("rainlink");
const Nodes = [{
    name: 'owo',
    host: '192.168.0.66',
    port: 2333,
    auth: 'youshallnotpass',
    secure: false,
}];

const client = new Client({intents: [Guilds, GuildVoiceStates, GuildMessages, MessageContent]});
const rainlink = new Rainlink({
    library: new Library.DiscordJS(client),
    nodes: Nodes,
});

client.on("ready", () => console.log(client.user?.tag + " Ready!"));

rainlink.on('nodeConnect', (node) => console.log(`Lavalink ${node.options.name}: Ready!`));
rainlink.on('nodeError', (node, error) => console.error(`Lavalink ${node.options.name}: Error Caught,`, error));
rainlink.on("nodeClosed", (node) => console.warn(`Lavalink ${node.options.name}: Closed`))
// rainlink.on('debug', (name, info) => console.debug(`Lavalink ${name}: Debug,`, info));
rainlink.on('nodeDisconnect', (node, code, reason) => {
  console.warn(`Lavalink ${node.options.name}: Disconnected, Code ${code}, Reason ${reason || 'No reason'}`)
});

rainlink.on("trackStart", (player, track) => {
    client.channels.cache.get(player.textId).send({content: `Now playing **${track.title}** by **${track.author}**`})
});

rainlink.on("trackEnd", (player) => {
  client.channels.cache.get(player.textId).send({content: `Finished playing`})
});

rainlink.on("queueEmpty", player => {
    client.channels.cache.get(player.textId).send({content: `Destroyed player due to inactivity.`})
    player.destroy();
});

client.on("messageCreate", async msg => {
    if (msg.author.bot) return;

    if (msg.content.startsWith("!play")) {
        const args = msg.content.split(" ");
        const query = args.slice(1).join(" ");

        const {channel} = msg.member.voice;
        if (!channel) return msg.reply("You need to be in a voice channel to use this command!");

        let player = await rainlink.create({
            guildId: msg.guild.id,
            textId: msg.channel.id,
            voiceId: channel.id,
            shardId: 0,
            volume: 40
        })

        let result = await rainlink.search(query, {requester: msg.author});
        if (!result.tracks.length) return msg.reply("No results found!");

        if (result.type === "PLAYLIST") for (let track of result.tracks) player.queue.add(track);
        else player.queue.add(result.tracks[0]);


        if (!player.playing || !player.paused) player.play();

        return msg.reply({content: result.type === "PLAYLIST" ? `Queued ${result.tracks.length} from ${result.playlistName}` : `Queued ${result.tracks[0].title}`});
    }
})

client.login('');
```

# 📃 Migrtation logs:
## 1.1.0 -> 1.2.0
```diff
src/Interface/Manager.ts
+ RainlinkNodeOptions.legacyWS
+ RainlinkNodeOptions.region

+ src/Player/RainlinkVoice

src/Player/RainlinkPLayer
- RainlinkPlayer.state
- RainlinkPlayer.lastvoiceId
- RainlinkPlayer.region
- RainlinkPlayer.lastRegion
- RainlinkPlayer.serverUpdat
- RainlinkPlayer.sessionId
```

## 1.0.0 -> 1.1.0
```diff
+ src/Interface/Events.ts
```

## 0.9.2 -> 1.0.0
```diff
src/index.ts
- Plugin
- Plugin.VoiceReceiver
- Plugin.PlayerMoved
src/Interface/Constants.ts
- VoiceConnect = 'voiceConnect',
- VoiceDisconnect = 'voiceDisconnect',
- VoiceError = 'voiceError',
- VoiceStartSpeaking = 'voiceStartSpeaking',
- VoiceEndSpeaking = 'voiceEndSpeaking',
src/Plugin/RainlinkPlugin.ts
+ isRainlinkPlugin
```

## 0.9.0 -> 0.9.2
```diff
src/Node/RainlinkRest.ts
- getLavalinkInfo()
+ getInfo()
```

## 0.8.0 -> 0.9.0
```diff
src/Player/RainlinkPlayer.ts
- <RainlinkPlayer>.setFilter("nightcore")
+ <RainlinkPlayer>.filter.set()
+ <RainlinkPlayer>.filter

src/Interface/Constants.ts
+ RainlinkFilterMode

src/index.ts (Add new class)
+ RainlinkFilter
```

# ✨ Special thanks

- [@Deivu](https://github.com/Deivu): Founder of [@shipgirlproject](https://github.com/shipgirlproject) and creator of [Shoukaku](https://www.npmjs.com/package/shoukaku) / **inspired**
- [@0t4u](https://github.com/0t4u): Member of [@shipgirlproject](https://github.com/shipgirlproject) / **inspired**
- [@Takiyo0](https://github.com/Takiyo0): Creator of [Kazagumo](https://www.npmjs.com/package/kazagumo) / **Player and queue inspiration**
- [@Solaris9](https://github.com/Solaris9): Original creator of [erela.js](https://www.npmjs.com/package/erela.js) / **Event system inspiration**
- **And everyone who contribute my project 💗**

# 💫 Credits
- [@RainyXeon](https://github.com/RainyXeon): Owner of Rainlink
- [@PAINFUEG0](https://github.com/PAINFUEG0): Tester of [#TeamRain](https://comming.soon)
