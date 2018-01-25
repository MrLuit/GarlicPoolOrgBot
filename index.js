const Discord = require('discord.js');
const snekfetch = require('snekfetch');
const client = new Discord.Client();
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json');
const config = require('./config.json');
const db = low(adapter);
const utils = require("./bin/Utils.js");
const cmds = require("./bin/Commands.js");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

new Bot();

function Bot() {
    this.djsversion = require('./node_modules/discord.js/package.json');
    this.botversion = require('./package.json');
    this.pool_data = null;
    this.pool_stats = null;
    this.client = new Discord.Client();
    this.db = low(adapter);
    this.db.defaults({
        users: [],
        block_mined: 20
    }).write();


    const self = this;
    this.client.on('ready', () => {
        console.log(`Logged in as ${self.client.user.tag}!`);
        self.updateData();
        self.client.setInterval(self.updateData, 20 * 1000);
    });

    this.client.on('message', data => {
        let command = data.content.substr(1).split(' ');
        if (!(command[0] in cmds) || (['404763968113082369', '369717342457823234'].includes(data.channel.guild.id)))
            return;
        cmds[command[0]](self, data, command[1]);
    });

    this.client.login(config.discord_token);
}

Bot.prototype.updateData = async function () {
    const db = this.db, client = this.client;
    const poolstats = snekfetch.get(`https://garlicpool.org/index.php?page=api&action=getpoolstatus&api_key=${config.garlicpool_api_key}`);
    const {body} = await snekfetch.get(`https://garlicpool.org/index.php?page=api&action=getdashboarddata&api_key=${config.garlicpool_api_key}`);
    this.pool_data = JSON.parse(body.toString()).getdashboarddata.data;
    let hashrate = (this.pool_data.raw.pool.hashrate / 1000).toFixed(2);
    console.log(`Hashrate: ${hashrate} MH/s`);
    client.user.setActivity(`${hashrate} MH/s`);
    this.pool_data.pool.blocks.forEach(block => {
        if (!block.finder || block.id <= db.get('block_mined').value()) return;
        db.update('block_mined', n => n + 1)
            .write();
        let finder = db.get('users').find({
            username: block.finder
        }).value();
        //client.channels.get('405041206687432705').send(`Block #${block.height} was mined by ${finder ? `<@${finder.discord_id}>` : block.finder}!`);
        console.log(`New block mined: ${block.id}`);
    });
    const response_stats = await poolstats;
    this.pool_stats = JSON.parse(response_stats.body.toString()).getpoolstatus.data;
    this.pool_stats = JSON.parse(response_stats.body.toString()).getpoolstatus.data;
    const {text} = await snekfetch.get(`https://explorer.grlc-bakery.fun/api/getblockhash?index=${this.pool_stats.currentnetworkblock}`);
    this.pool_stats.currentBlockHash = text;
};