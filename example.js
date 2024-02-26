// const directParam = /directSearch=(.*)/
// console.log(directParam.exec("directSearch=ytsearch:data"))

const {Client, GatewayIntentBits} = require('discord.js');
const {Guilds, GuildVoiceStates, GuildMessages, MessageContent} = GatewayIntentBits;
const {Rainlink, Library, Plugin} = require("./dist");

const Nodes = [{
    name: 'owo',
    host: 'localhost',
    port: 2333,
    auth: 'youshallnotpass',
    secure: false
}];

const client = new Client({intents: [Guilds, GuildVoiceStates, GuildMessages, MessageContent]});
const rainlink = new Rainlink({
    library: new Library.DiscordJS(client),
    nodes: Nodes,
    options: {
        retryCount: 20,
        retryTimeout: 2000,
        voiceConnectionTimeout: 5000,
    },
    plugins: [new Plugin.Deezer()],
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

rainlink.on("playerStart", (player, track) => {
    client.channels.cache.get(player.textId)?.send({content: `Now playing **${track.title}** by **${track.author}**`})
        .then(x => player.data.set("message", x));
});

rainlink.on("playerEnd", (player) => {
    player.data.get("message")?.edit({content: `Finished playing`});
});

rainlink.on("playerEmpty", player => {
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

        console.log(player)

        let result = await rainlink.search(query, {requester: msg.author});
        if (!result.tracks.length) return msg.reply("No results found!");

        if (result.type === "PLAYLIST") for (let track of result.tracks) player.queue.add(track);
        else player.queue.add(result.tracks[0]);

        if (!player.playing && !player.paused) player.play();
        return msg.reply({content: result.type === "PLAYLIST" ? `Queued ${result.tracks.length} from ${result.playlistName}` : `Queued ${result.tracks[0].title}`});
    }
})


client.login('');