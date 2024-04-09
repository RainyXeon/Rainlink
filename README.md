# 🌦️ Rainlink

Another lavalink wrapper but focus on stability and rich features

# ⚠️ Warning!!

⚠️ This lavalink wrapper is just in the beta stage, it will have some bug so please report it on github!

⚠️ Update 4: Rainlink now in stage 20 of development (Release beta 4 product / Near stable)

# Installation

```
npm i rainlink
```

# Document:

Here: [https://rainlink.netlify.app/](https://rainlink.netlify.app/)

# Used by

| Name                                                 | Creator      | Variants          |
| ---------------------------------------------------- | ------------ | ----------------- |
| [ByteBlaze](https://github.com/RainyXeon/ByteBlaze)  | RainyXeon    | Modded / Built in |

If you want to add your own bot create a pull request with your bot added. Please add your full name.

# Example bot:

```js
const {Client, GatewayIntentBits} = require('discord.js');
const {Guilds, GuildVoiceStates, GuildMessages, MessageContent} = GatewayIntentBits;
const {Rainlink, Library, Plugin, RainlinkDriver} = require("rainlink");

const Nodes = [{
    name: 'owo',
    host: 'localhost',
    port: 2333,
    auth: 'youshallnotpass',
    secure: false,
    driver: RainlinkDriver.Lavalink4
}];

const client = new Client({intents: [Guilds, GuildVoiceStates, GuildMessages, MessageContent]});
const rainlink = new Rainlink({
    library: new Library.DiscordJS(client),
    nodes: Nodes,
    plugins: [
        new Plugin.Deezer(),
        new Plugin.Nico({
            searchLimit: 10,
        }),
        new Plugin.Apple({
            countryCode: "us",
            imageWidth: 600,
            imageHeight: 900,
         }),
        new Plugin.Spotify({
            clientId: "your_spotify_client_id",
            clientSecret: "your_spotify_client_secret",
            playlistPageLimit: 1,
            albumPageLimit: 1,
            searchLimit: 20,
            searchMarket: "US"
         }),
        new Plugin.PlayerMoved(client),
    ],
});

client.on("ready", () => console.log(client.user.tag + " Ready!"));

rainlink.on('nodeConnect', (node) => console.log(`Lavalink ${node.options.name}: Ready!`));
rainlink.on('nodeError', (node, error) => console.error(`Lavalink ${node.options.name}: Error Caught,`, error));
rainlink.on('nodeClosed', (node, code, reason) => console.warn(`Lavalink ${node.options.name}: Closed, Code ${code}, Reason ${reason || 'No reason'}`));
// rainlink.on('debug', (name, info) => console.debug(`Lavalink ${name}: Debug,`, info));
rainlink.on('nodeDisconnect', (node, players, moved) => {
    if (moved) return;
    players.map(player => player.connection.disconnect())
    console.warn(`Lavalink ${node.options.name}: Disconnected`);
});

rainlink.on("trackStart", (player, track) => {
    client.channels.cache.get(player.textId)?.send({content: `Now playing **${track.title}** by **${track.author}**`})
        .then(x => player.data.set("message", x));
});

rainlink.on("trackEnd", (player) => {
    player.data.get("message")?.edit({content: `Finished playing`});
});

rainlink.on("queueEmpty", player => {
    client.channels.cache.get(player.textId)?.send({content: `Destroyed player due to inactivity.`})
        .then(x => player.data.set("message", x));
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

        if (!player.playing && !player.paused) player.play();
        return msg.reply({content: result.type === "PLAYLIST" ? `Queued ${result.tracks.length} from ${result.playlistName}` : `Queued ${result.tracks[0].title}`});
    }
})


client.login('');
```

# 💫 Special thanks

- [@Deivu](https://github.com/Deivu): Founder of [@shipgirlproject](https://github.com/shipgirlproject) and creator of [Shoukaku](https://www.npmjs.com/package/shoukaku) / **inspired**
- [@0t4u](https://github.com/0t4u): Member of [@shipgirlproject](https://github.com/shipgirlproject) / **inspired**
- [@Takiyo0](https://github.com/Takiyo0): Creator of [Kazagumo](https://www.npmjs.com/package/kazagumo) / **Player and queue inspiration**
- [@Solaris9](https://github.com/Solaris9): Original creator of [erela.js](https://www.npmjs.com/package/erela.js) / **Event system inspiration**
- **And everyone who contribute my project 💗**

# 💫 Credits
- [@RainyXeon](https://github.com/RainyXeon): Owner of Rainlink
- [@PAINFUEG0](https://github.com/PAINFUEG0): Tester and member of [#TeamRain](https://comming.soon)