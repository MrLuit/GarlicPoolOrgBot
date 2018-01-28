const utils = require('./Utils.js');
const Discord = require('discord.js');
const snekfetch = require('snekfetch');

const cmds = {
    'setname': function (bot, data, msg) {
        cmds.setusername(bot, data, msg);
    },
    'setusername': function (bot, data, msg) {
        const db = bot.db;
        // Ensures there is a username given
        if (!utils.defined(msg) || msg.length === 0)
            return data.reply('Please specify your Garlicpool.org-username');

        // Checks if username is already used
        let knowGiven = db.get('users').find({
            username: msg
        }).value();
        if (knowGiven) {
            if(knowGiven.discord_id === data.author.id)
                return data.reply('You\'re already assigned that name');
            return data.reply('Uh-oh, looks like that username is already tied to a Discord account!');
        }

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
    'price': function(bot, data) {
        const lastChange = 2 * bot.garlic_data.percent_change_1h;
        const colorChange = Math.max(-127.5, Math.min(127.5, lastChange * 1.28));
        const redColor = Math.round(127.5 - colorChange).toString(16).padStart(2, '0');
        const greenColor = Math.round(127.5 + colorChange).toString(16).padStart(2, '0');

        // TODO: update when 1 week has passed (today: 28/01/2018)
        const weeklyChange = utils.defined(bot.garlic_data.percent_change_7d)
            ? `${bot.garlic_data.percent_change_7d}%`
            : "TBD";

        const embed = new Discord.RichEmbed()
            .setColor(`#${redColor}${greenColor}00`) // green or red depending on last change
            .addField('USD price', `$${bot.garlic_data.price_usd}`, true)
            .addField('BTC price', bot.garlic_data.price_btc, true)
            .addField('Rank', bot.garlic_data.rank, true)
            .addField('Total supply', bot.garlic_data.total_supply, true)
            .addField('24 hr volume (usd)', bot.garlic_data['24h_volume_usd'], true)
            .addBlankField(true)
            .addField('Hourly change', `${bot.garlic_data.percent_change_1h}%`, true)
            .addField('Daily change', `${bot.garlic_data.percent_change_24h}%`, true)
            .addField('Weekly change', weeklyChange, true);
        return data.channel.send({embed});
    },
    'hashrate': function (bot, data) {
        const pool_data = bot.pool_data;
        const total_hashrate = (pool_data.raw.network.hashrate / 1000000).toFixed(2);
        const pool_hashrate = (pool_data.raw.pool.hashrate / 1000).toFixed(2);
        const pool_percent = (pool_data.raw.pool.hashrate / pool_data.raw.network.hashrate * 100).toFixed(2);
        return data.channel.send(
            `**Total hashrate:** ${total_hashrate} GH/s\n` +
            `**Pool hashrate:** ${pool_hashrate} MH/s\n` +
            `**Pool dominance:** ${pool_percent}%`
        );
    },
    'workers': function (bot, data) {
        const workers = bot.pool_data.pool.workers;
        return data.channel.send(`**Workers**: ${workers}`);
    },
    'difficulty': function (bot, data) {
        const pool_data = bot.pool_data;
        const difficulty = pool_data.network.difficulty;
        const next_difficulty = pool_data.network.nextdifficulty;
        const blocksuntildiffchange = pool_data.network.blocksuntildiffchange;
        return data.channel.send(`**Difficulty**: ${difficulty}\n**Next difficulty**: ${next_difficulty} (changes in ${blocksuntildiffchange} blocks)`);
    },
    'block': function (bot, data) {
        const block = bot.pool_data.network.block;
        return data.channel.send(`**Current block**: ${block}`);
    },
    'botstats': function (bot, data) {
        const embed = new Discord.RichEmbed()
            .setColor(utils.getRandomColor())
            .addField('Uptime:', utils.uptime(process.uptime()), true)
            .addField('Current RAM usage:', `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`, true)
            .addField('Node.js Version:', process.version, true)
            .addField('Bot\'s Version:', `v${bot.botversion.version}`, true)
            .addField('Discord.js Version:', `v${bot.djsversion.version}`, true);
        return data.channel.send('**Statistics**', {embed});
    },
    'poolstats': function (bot, data) {
        const pool_data = bot.pool_data;
        const pool_stats = bot.pool_stats;
        const embed = new Discord.RichEmbed()
            .setColor('GREEN')
            .addField('Pool Hashrate', `${pool_stats.hashrate.toFixed(3)}KH/s`, true)
            .addField('Pool Efficiency', `${pool_stats.efficiency}%`, true)
            .addField('Active Workers', pool_stats.workers, true)
            .addField('Next Network Block', `${pool_stats.nextnetworkblock} (Current: [${pool_stats.currentnetworkblock}](https://explorer.grlc-bakery.fun/block/${pool_stats.currentBlockHash}}))`, true)
            .addField('Last Block Found', `[${pool_stats.lastblock}](https://garlicpool.org/index.php?page=statistics&action=round&height=${pool_stats.lastblock})`, true)
            .addField('Current Difficulty', pool_stats.networkdiff, true)
            .addField('Est. Next Difficulty', `${pool_data.network.nextdifficulty} (changes in ${pool_data.network.blocksuntildiffchange} blocks)`, true);
        return data.channel.send('**Statistics about Garlicpool.org:**', {embed});
    },
    'status': async function (bot, data) {
        const { body } = await snekfetch.get('https://garlicpool.org/backendstatus.php');
        const embed = new Discord.RichEmbed()
            .setColor(body.result === 'OK' ? 'GREEN' : (body.result === 'ERR' ? 'RED' : '#A3192E'))
            .addField('Statistics', body.statistics, true)
            .addField('Block Finder', body.findblock, true)
            .addField('Proportional Payout', body.proportional_payout, true)
            .addField('Block Update', body.blockupdate, true)
            .addField('Payouts', body.payouts, true);
        return data.channel.send('**Back End Response:**', { embed });
    },
    'help': function (bot, data) {
        return data.channel.send('**Commands**: ' + Object.keys(cmds).join(', '));
    }
};


const commandSymbol = '!';
module.exports = {
    handleCommand: function(bot, data) {
        if(
            data.content.charAt(0) !== commandSymbol ||
            !(['406176402832883717', '404763968113082369', '369717342457823234'].includes(data.channel.guild.id)))
            return;
        let command = data.content.substr(1).split(' ');
        if (!(command[0] in cmds))
            return data.reply('Unknown command, use !help to see available commands');
        cmds[command[0]](bot, data, command[1]);
    },
    commands: cmds
};