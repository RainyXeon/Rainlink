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
    port: 8888,
    auth: 'youshallnotpass',
    driver: "frequenc/v1/miku"
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

  await tester.testCase('#1. Search tracks (title)', async () => {
    const data = await client.rainlink.search("Primary/yuiko - in the Garden")
    tester.debug(`@ Title: ${data.tracks[0].title}, Author: ${data.tracks[0].author}, URI: ${data.tracks[0].uri}`)
    return data.tracks[0].raw.info.identifier
  }, "5Cof9rP7TEQ")

  await tester.testCase('#2. Decode track (server side)', async () => {
    const data = await client.rainlink.search("Primary/yuiko - in the Garden")
    const encoded = data.tracks[0].raw.encoded
    const res = await client.rainlink.nodes.full.at(0)[1].rest.decodeTrack(encoded)
    tester.debug(`@ Title: ${res.info.title}, Author: ${res.info.author}, URI: ${res.info.uri}`)
    return res.info.identifier
  }, "5Cof9rP7TEQ")

  await tester.testCase('#3. Decode track (client side)', async () => {
    const data = await client.rainlink.search("Primary/yuiko - in the Garden")
    const encoded = data.tracks[0].raw.encoded
    const res = await client.rainlink.nodes.full.at(0)[1].driver.functions.get("decode")(encoded)
    tester.debug(`@ Title: ${res.info.title}, Author: ${res.info.author}, URI: ${res.info.uri}`)
    return res.info.identifier
  }, "5Cof9rP7TEQc")

  process.exit(0)
}


run()