const Discord = require('discord.js');
const snekfetch = require('snekfetch');
const client = new Discord.Client();
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json');
const config = require('./config.json');
const db = low(adapter);
const djsversion = require('./node_modules/discord.js/package.json');
const botversion = require('./package.json');
let pool_data;
let pool_stats;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

db.defaults({
    users: [],
    block_mined: 20
}).write();

const defined = function (thing) {
    return typeof (thing) !== 'undefined' && thing !== null;
};

async function updateData() {
    const poolstats = snekfetch.get(`https://garlicpool.org/index.php?page=api&action=getpoolstatus&api_key=${config.garlicpool_api_key}`);
    const { body } = await snekfetch.get(`https://garlicpool.org/index.php?page=api&action=getdashboarddata&api_key=${config.garlicpool_api_key}`);
    pool_data = JSON.parse(body.toString()).getdashboarddata.data;
    let hashrate = (pool_data.raw.pool.hashrate / 1000).toFixed(2);
    console.log(`Hashrate: ${hashrate} MH/s`);
    client.user.setActivity(`${hashrate} MH/s`);
    pool_data.pool.blocks.forEach(block => {
        if(!block.finder || block.id <= db.get('block_mined').value()) return;
        db.update('block_mined', n => n + 1).
            write();
        let finder = db.get('users').find({
            username: block.finder
        }).value();
        client.channels.get('405041206687432705').send(`Block #${block.height} was mined by ${finder ? `<@${finder.discord_id}>` : block.finder}!`);
        console.log(`New block mined: ${block.id}`);
    });
    const response_stats = await poolstats;
    pool_stats = JSON.parse(response_stats.body.toString()).getpoolstatus.data;
    const { text } = await snekfetch.get(`https://explorer.grlc-bakery.fun/api/getblockhash?index=${pool_stats.currentnetworkblock}`);
    pool_stats.currentBlockHash = text;
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    updateData();
    client.setInterval(updateData, 20 * 1000);
});

const cmds = {
    'setname': function (data, msg) {
        cmds.setusername(data, msg);
    },
    'setusername': function (data, msg) {
        // Ensures there is a username given
        if (!defined(msg) || msg.length === 0)
            return data.reply('Please specify your Garlicpool.org-username');

        // Checks if username is already used
        let knowGiven = !!db.get('users').find({
            username: msg
        }).value();
        if (knowGiven)
            return data.reply('Uh-oh, looks like that username is already tied to a Discord account!');

        // Checks if we know the user giving command already
        let knownsUser = !!db.get('users').find({
            discord_id: data.author.id
        }).value();
        if (knownsUser) {
            db.get('users').find({
                discord_id: data.author.id
            }).assign({
                discord_id: data.author.id,
                username: msg
            }).write();
        } else {
            db.get('users').push({
                discord_id: data.author.id,
                username: msg
            }).write();
        }
        data.reply('done!');
    },
    'hashrate': function(data) {
        const total_hashrate = (pool_data.raw.network.hashrate / 1000000).toFixed(2);
        const pool_hashrate = (pool_data.raw.pool.hashrate / 1000).toFixed(2); 
        data.channel.send(`**Total hashrate**: ${total_hashrate} GH/s\n**Pool hashrate**: ${pool_hashrate} MH/s`);
    },
    'workers': function(data) {
        const workers = pool_data.pool.workers;
        data.channel.send(`**Workers**: ${workers}`);
    },
    'difficulty': function(data) {
        const difficulty = pool_data.network.difficulty;
        const next_difficulty = pool_data.network.nextdifficulty;
        const blocksuntildiffchange = pool_data.network.blocksuntildiffchange;
        data.channel.send(`**Difficulty**: ${difficulty}\n**Next difficulty**: ${next_difficulty} (changes in ${blocksuntildiffchange} blocks)`);
    },
    'block': function(data) {
        const block = pool_data.network.block;
        data.channel.send(`**Current block**: ${block}`);
    },
    'botstats': function(data) {
        const embed = new Discord.RichEmbed()
            .setColor(getRandomColor())
            .addField('Uptime:', uptime(process.uptime()), true)
            .addField('Current RAM usage:', `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`, true)
            .addField('Node.js Version:', process.version, true)
            .addField('Bot\'s Version:', `v${botversion.version}`, true)
            .addField('Discord.js Version:', `v${djsversion.version}`, true);
        return data.channel.send('**Statistics**', { embed });
    },
    'poolstats': function(data) {
        const embed = new Discord.RichEmbed()
            .setColor(getRandomColor())
            .addField('Pool Hashrate', `${pool_stats.hashrate.toFixed(3)}KH/s`, true)
            .addField('Pool Efficiency', `${pool_stats.efficiency}%`, true)
            .addField('Active Workers', pool_stats.workers, true)
            .addField('Next Network Block', `${pool_stats.nextnetworkblock} (Current: [${pool_stats.currentnetworkblock}](https://explorer.grlc-bakery.fun/block/${pool_stats.currentBlockHash}}))`, true)
            .addField('Last Block Found', `[${pool_stats.lastblock}](https://garlicpool.org/index.php?page=statistics&action=round&height=${pool_stats.lastblock})`, true)
            .addField('Current Difficulty', pool_stats.networkdiff, true)
            .addField('Est. Next Difficulty', `${pool_data.network.nextdifficulty} (changes in ${pool_data.network.blocksuntildiffchange} blocks)`, true)
            .addField('Est. Avg. Time per Round', secondsToNiceTime(pool_stats.esttime), true)
            .addField('Est. Shares this Round', `${pool_stats.estshares} (Current: ${pool_stats.progress})`, true)
            .addField('Time Since Last Block', secondsToNiceTime(pool_stats.timesincelast), true);
        return data.channel.send('**Statistics about Garlicpool.org:**', { embed });
    },
    'help': function (data) {
        data.channel.send('**Commands**: ' + Object.keys(cmds).join(', '));
        // data.channel.send('**!setname <username>**: Set Garlicpool.org-username to your Discord account');
    }
};

client.on('message', data => {
    let command = data.content.substr(1).split(' ');
    if (!(command[0] in cmds) || !(['404763968113082369','369717342457823234'].includes(data.channel.guild.id))) return;
    cmds[command[0]](data, command[1]);
});

client.login(config.discord_token);

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function uptime(seconds) {
    const numdays = Math.floor((seconds % 31536000) / 86400);
    const numhours = Math.floor(((seconds % 31536000) % 86400) / 3600);
    const numminutes = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60);
    return (numdays + 'd ' + numhours + 'h ' + numminutes + 'm');
}

function secondsToNiceTime(seconds) {
    const esttime = new Date(null);
    esttime.setSeconds(seconds);
    const time = esttime.toISOString().substr(14, 5).split(':');
    return `${time[0]}m ${time[1]}s`;
}