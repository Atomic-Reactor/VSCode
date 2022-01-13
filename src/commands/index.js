const fs = require('fs-extra');

const imports = fs
    .readdirSync(__dirname)
    .filter(file => Boolean(file !== 'index.js'))
    .reduce((obj, item) => {
        const key = String(item).replace(/\.js/gi, '');
        const file = './' + key;

        obj[key] = require(file);
        return obj;
    }, {});

module.exports = {
    ...imports,
    update: imports.install,
};
