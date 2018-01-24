const Discord = require('discord.js');
const snekfetch = require('snekfetch');
const client = new Discord.Client();
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json');
const discord_token = '';
const garlicpool_api_key = '';
const db = low(adapter);
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

db.defaults({
    users: [],
    block_mined: 20
}).write();

const defined = function (thing) {
    return typeof (thing) !== 'undefined' && thing !== null;
};

async function updateData() {
    const { body } = await snekfetch.get(`https://garlicpool.org/index.php?page=api&action=getdashboarddata&api_key=${garlicpool_api_key}`);
    const data = JSON.parse(body.toString()).getdashboarddata.data;
    let hashrate = (data.raw.pool.hashrate / 1000).toFixed(2);
    console.log(`Hashrate: ${hashrate} MH/s`);
    client.user.setActivity(`${hashrate} MH/s`);
    data.pool.blocks.forEach(block => {
        if (block.finder) {
            if (block.id <= db.get('block_mined').value()) return;
            db.update('block_mined', n => n + 1).
                write();
            let finder = db.get('users').find({
                username: block.finder
            }).value();
            client.channels.get('405041206687432705').send(`Block #${block.height} was mined by ${finder ? `<@${finder.discord_id}>` : block.finder}!`);
            console.log(`New block mined: ${block.id}`);
        }
    });
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    updateData();
    setInterval(updateData, 20 * 1000);
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
    'help': function (data) {
        data.reply('**!setname <username>**: Set Garlicpool.org-username to your Discord account');
    }
};

client.on('message', data => {
    let command = data.content.substr(1).split(' ');
    if (!(command[0] in cmds) || data.channel.guild.id != '404763968113082369') return;
    cmds[command[0]](data, command[1]);
});

client.login(discord_token);