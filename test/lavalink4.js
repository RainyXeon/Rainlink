const {Rainlink, Library } = require("../dist");
const {Client, GatewayIntentBits} = require('discord.js');
const {Guilds, GuildVoiceStates, GuildMessages, MessageContent} = GatewayIntentBits;
const Tester = require("./tester")
require("dotenv").config()

const tester = new Tester()
const token = process.env.token
const Nodes = [
  {
    name: 'owo',
    host: process.env.v4_host,
    port: 2333,
    auth: 'youshallnotpass',
    secure: false
  }
];

async function run() {
  class editedClient extends Client {
    rainlink = new Rainlink({
      library: new Library.DiscordJS(this),
      options: {
          defaultSearchEngine: 'youtube',
      },
      nodes: Nodes
    });
  }
  const client = new editedClient({intents: [Guilds, GuildVoiceStates, GuildMessages, MessageContent]});
  
  await tester.testCase('Connecting to voice server', async () => {
    client.login(token);
    const connectChecking = new Promise((resolve, reject) => {
      client.rainlink.on("nodeConnect", () => resolve("localPass"))
      client.rainlink.on("nodeDisconnect", () => reject("Cannot connect"))
      client.rainlink.on("nodeError", () => reject("Cannot connect"))
    })
    return await connectChecking
  })
  
  await tester.testCase('GET /info', async () => {
    const data = await client.rainlink.nodes.full.at(0)[1].rest.getInfo()
    return data ? "localPass" : true
  })

  await tester.testCase('GET /status', async () => {
    const data = await client.rainlink.nodes.full.at(0)[1].rest.getStatus()
    return data ? "localPass" : true
  })

  await tester.testCase('GET /sessions/{id}/players', async () => {
    const data = await client.rainlink.nodes.full.at(0)[1].rest.getPlayers()
    tester.debug(`<DATA> | players: ${data.length}`)
    return "localPass"
  })

  await tester.testCase('Search tracks (title)', async () => {
    const data = await client.rainlink.search("Primary/yuiko - in the Garden")
    tester.debug(`<DATA> | Type: ${data.type}, Tracks: ${data.tracks.length}`)
    tester.debug(`<DATA> | Title: ${data.tracks[0].title}, Author: ${data.tracks[0].author}, URI: ${data.tracks[0].uri}`)
    return data.tracks[0].raw.info.identifier
  }, "5Cof9rP7TEQ")

  await tester.testCase('Search tracks (uri)', async () => {
    const data = await client.rainlink.search("https://www.youtube.com/watch?v=5Cof9rP7TEQ")
    tester.debug(`<DATA> | Type: ${data.type}, Tracks: ${data.tracks.length}`)
    tester.debug(`<DATA> | Title: ${data.tracks[0].title}, Author: ${data.tracks[0].author}, URI: ${data.tracks[0].uri}`)
    return data.tracks[0].raw.info.identifier
  }, "5Cof9rP7TEQ")

  await tester.testCase('Connect to discord voice', async () => {
    const isPass = await client.rainlink.create({
      guildId: "1027945618347397220",
      textId: "1163101075100946572",
      voiceId: "1239150964284461086",
      shardId: 0,
      volume: 100
    }).then(() => "localPass").catch(err => false)
    return isPass
  })

  await tester.testCase('Disconnect to discord voice', async () => {
    const isPass = await client.rainlink.players.destroy("1027945618347397220")
    .then(() => "localPass").catch(err => false)
    return isPass
  })

  tester.printSummary()

  process.exit(0)
}


run()