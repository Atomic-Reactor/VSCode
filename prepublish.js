const path = require('path');
const fs = require('fs-extra');
const semver = require('semver');
const pkg = require('./package');
const op = require('object-path');
const inquirer = require('inquirer');

const utils = {
    normalize: (...args) => path.normalize(path.join(process.cwd(), ...args)),

    prefix: '   > ',

    suffix: ': ',

    validate: (val, field) => {
        switch (field) {
            case 'version':
                return !semver.valid(semver.coerce(val))
                    ? `invalid version: ${val}`
                    : true;

            default:
                return !val ? `${field} is required` : true;
        }
    },
};

const env = op.get(process.env, 'NODE_ENV');

const versionUpdater = async () => {
    const { normalize, prefix, suffix, validate } = utils;

    const type = 'input';
    const pkgFilePath = normalize('package.json');
    const defaultVer = semver.inc(pkg.version, 'patch');

    console.log('');
    console.log(` Publishing ${pkg.name}...`);
    console.log('');

    fs.removeSync('./dist');

    // Input version number
    const { version } = await inquirer.prompt([
        {
            type,
            prefix,
            suffix,
            name: 'version',
            default: defaultVer,
            message: 'Version',
            validate: val => validate(val, 'version'),
            filter: val => semver.valid(semver.coerce(val)) || defaultVer,
        },
    ]);

    // Write package.json
    if (env !== 'test') {
        await Promise.all([
            fs.writeFile(
                pkgFilePath,
                JSON.stringify({ ...pkg, version }, null, 2),
            ),
        ]);
    }

    console.log('');

    if (env === 'test') {
        console.log(JSON.stringify({ version }, null, 2));
        console.log('');
    }
};

versionUpdater();
