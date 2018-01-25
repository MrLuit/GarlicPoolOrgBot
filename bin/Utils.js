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
    }
};

module.exports = utils;