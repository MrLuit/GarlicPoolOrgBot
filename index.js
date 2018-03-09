const Discord = require('discord.js');
const snekfetch = require('snekfetch');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json');
const config = require('./config.json');
const utils = require('./bin/Utils.js');
const handleCommand = require('./bin/Commands.js').handleCommand;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

new Bot();

function Bot() {
    this.djsversion = require('./node_modules/discord.js/package.json');
    this.botversion = require('./package.json');
    this.garlic_data = null;
    this.pool_data = null;
    this.pool_stats = null;
    this.client = new Discord.Client();
    this.db = low(adapter);
    this.db.defaults({
        users: [],
        block_mined: 20
    }).write();



    const bot = this;
    this.client.login(config.discord_token)
        .then(() => console.log(`Logged in as ${bot.client.user.tag}!`))
        .catch(error => console.log(`LOGIN ERROR: ${error}`));

    this.client.on('ready', () => {
        bot.updateData().catch(error => console.log(`ERROR: ${error}`));
        bot.client.setInterval(function(){
            bot.updateData().catch(error => console.log(`ERROR: ${error}`));
        }, 20 * 1000);
    });

    this.client.on('message', data => {
        handleCommand(bot, data);
    });
}

let lastHashrate = -1;

Bot.prototype.updateData = async function () {
    const db = this.db, client = this.client;
    const garlic_value = snekfetch.get('https://api.coinmarketcap.com/v1/ticker/garlicoin/');
    const poolstats = snekfetch.get(`https://garlicpool.org/index.php?page=api&action=getpoolstatus&api_key=${config.garlicpool_api_key}`);
    const { text } = await snekfetch.get(`https://garlicpool.org/index.php?page=api&action=getdashboarddata&api_key=${config.garlicpool_api_key}`);

    this.pool_data = JSON.parse(text).getdashboarddata.data;

    let hashrate = this.pool_data.raw.pool.hashrate;
    // Ignore hashrate if it suddenly spikes
    if(lastHashrate >= 0 && lastHashrate * 1.1 < hashrate)
        this.pool_data.raw.pool.hashrate = lastHashrate;
    lastHashrate = hashrate;
    hashrate = utils.readableHashrate(hashrate);


    console.log(`New Hashrate: ${hashrate}`);
    console.log(`Used hashrate: ${utils.readableHashrate(lastHashrate)}`);
    client.user.setActivity(`${hashrate}`);

    // Get lowest id first
    this.pool_data.pool.blocks.sort((a,b) => a.id - b.id);
    let lastId = db.get('block_mined').value();

    this.pool_data.pool.blocks.forEach(block => {
        if (!block.finder || block.id <= lastId) return;
        lastId = block.id;
        db.update('block_mined', n => block.id).write();
        let finder = db.get('users').find({
            username: block.finder
        }).value();

        const blockChannel = client.channels.get('405041206687432705');
        const name = finder ? `<@${finder.discord_id}>` : block.finder;
        if(utils.defined(blockChannel))
            blockChannel.send(`Block #${block.height} was mined by ${name}!`);
        console.log(`New block mined: ${block.id}`);
    });
    const response_stats = await poolstats;
    this.pool_stats = JSON.parse(response_stats.text).getpoolstatus.data;
    const response = await snekfetch.get(`https://explorer.grlc-bakery.fun/api/getblockhash?index=${this.pool_stats.currentnetworkblock}`);
    this.pool_stats.currentBlockHash = response.text;

    this.garlic_data = (await garlic_value).body[0];
};