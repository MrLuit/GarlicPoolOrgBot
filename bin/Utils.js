const utils = {
    getRandomColor: function () {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++)
            color += letters[Math.floor(Math.random() * 16)];
        return color;
    },
    uptime: function (seconds) {
        seconds %= 31536000;
        const days = Math.floor(seconds / 86400);
        seconds %= 86400;
        const hours = Math.floor(seconds / 3600);
        seconds %= 3600;
        const minutes = Math.floor(seconds / 60);
        return (days + 'd ' + hours + 'h ' + minutes + 'm');
    },
    defined: function (thing) {
        return typeof (thing) !== 'undefined' && thing !== null;
    },
    readableHashrate: function(hashrate, start = 'K') {
        const denominators = ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];
        let i = start === 'K' ? 1
            : Math.max(0, denominators.indexOf(start.toUpperCase()));
        for(; i < denominators.length && hashrate >= 1000; i++) hashrate /= 1000;
        return `${(hashrate).toFixed(2)} ${denominators[i]}H/s`
    },
    readableBigNumber: function(number, start = '') {
        const denominators = ['', 'Thousand', 'Million', 'Billion', 'Trillion', 'Quadrillion'];
        const neg = number < 0 ? '-' : '';
        number = Math.abs(number);
        let i = Math.max(0, denominators.indexOf(start));
        for(; i < denominators.length && number >= 1000; i++) number /= 1000;
        if(i === 0) return `${neg}${(number).toFixed(2)}`;
        return `${neg}${(number).toFixed(2)} ${denominators[i]}`
    }
};

module.exports = utils;