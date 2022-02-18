const path = require('path');
const fs = require('fs-extra');
const _ = require('underscore');
const vscode = require('vscode');
const glob = require('fast-glob');
const op = require('object-path');
const camelcase = require('camelcase');
const { spawn } = require('child_process');
const handlebars = require('handlebars').compile;

const cc = str =>
    camelcase(str, { pascalCase: true, preserveConsecutiveUppercase: true });

const componentFeatureSelect = async (options = {}, params) => {
    const { isReactiumNative } = params;

    const choices = [
        {
            key: 'hooks',
            label: 'Reactium Hooks:',
            picked: true,
            description: 'Create or replace reactium-hooks.js file',
        },
        {
            key: 'style',
            label: isReactiumNative ? 'Styles:' : 'Stylesheet:',
            picked: true,
            description: isReactiumNative
                ? 'Include Reactium.Style registration block'
                : 'Create or replace _reactium-style.scss file',
        },
        {
            key: 'route',
            label: 'Route:',
            picked: true,
            value: true,
            description: isReactiumNative
                ? 'Include Reactium.Route registration block'
                : 'Create or replace the route.js file',
        },
    ];

    if (!isReactiumNative) {
        choices.push({
            key: 'domain',
            label: 'Domain:',
            picked: true,
            value: true,
            description: 'Create or replace the domain.js file',
        });
    }

    const selection = await vscode.window.showQuickPick(choices, {
        canPickMany: true,
        ...options,
    });

    return _.pluck(selection, 'key');
};

const componentGen = async params => {
    const cwd = params.workspace;

    const { isReactiumNative } = params;

    const templateDirSearch = glob.sync(['**/reactium-config.js'], {
        cwd,
        dot: true,
        absolute: true,
        onlyFiles: true,
    });

    if (templateDirSearch.length < 1) {
        await Utils.confirm(
            'Unable to find Reactium Component template directory',
            ['OK'],
        );
        return;
    }

    const templateDir = Utils.normalize(
        path.dirname(_.first(templateDirSearch)),
        '.cli',
        'commands',
        'reactium',
        'component',
        'template',
    );

    const templates = {
        hooks: {
            file: 'reactium-hooks.js',
            template: 'reactium-hooks.hbs',
            create: params.hooks,
        },
        component: {
            file: 'index.js',
            template: 'index-functional.hbs',
            create: params.index,
        },
        domain: {
            file: 'domain.js',
            template: 'domain.hbs',
            create: params.domain,
        },
        route: {
            file: 'route.js',
            template: 'route.hbs',
            create: typeof params.route === 'string',
        },
        style: {
            file: params.styleType || '_reactium-style.scss',
            template: 'reactium-style.hbs',
            create: params.style,
        },
    };

    if (isReactiumNative) {
        delete templates.route;
        delete templates.style;
    }

    // Create component directory:
    fs.ensureDirSync(params.dir);

    // Create component files:
    for (const item of Object.values(templates)) {
        if (!item.create) continue;

        const filePath = Utils.normalize(params.dir, item.file);

        if (fs.existsSync(filePath)) {
            const overwrite = await Utils.confirm(
                `Replace existing '${item.file}' file?`,
            );
            if (!overwrite) continue;
        }

        if (!item.template) {
            fs.ensureFileSync(filePath);
            continue;
        }

        const templateFilePath = Utils.normalize(templateDir, item.template);
        const fileContent = handlebars(
            fs.readFileSync(templateFilePath, 'utf-8'),
        )(params);

        fs.writeFileSync(filePath, fileContent);
    }
};

const confirm = (message, buttons = ['Yes', 'No']) =>
    vscode.window
        .showInformationMessage(message, { modal: true }, ...buttons)
        .then(answer => Boolean(answer === buttons[0]));

const getWorkspace = cwd => {
    return _.first(
        vscode.workspace.workspaceFolders
            .map(space => op.get(space, 'uri.path'))
            .filter(space => String(cwd).startsWith(space)),
    );
};

const input = options => vscode.window.showInputBox(options);

const inputToArray = str => {
    str = String(str)
        .replace(/,/g, ' ')
        .replace(/\s\s+/g, ' ');

    return _.compact(str.split(' ')).map(item => {
        if (String(item).substring(0, 1) !== '/') {
            item = `/${item}`;
        }

        return item;
    });
};

const isActinium = dir => {
    let val = false;

    const dirArr = dir.split(path.sep);
    const wspArr = getWorkspace(dir).split(path.sep);

    while (val === false) {
        const filepath = normalize(...dirArr, '.core', 'actinium-config.js');
        val = fs.existsSync(filepath);

        dirArr.pop();

        if (dirArr.length < wspArr.length) {
            break;
        }
    }

    console.log('file: index.js : isActinium :', val);

    return val;
};

const isFile = (...args) => fs.existsSync(normalize(...args));

const isReactium = dir => {
    let val = false;

    const dirArr = dir.split(path.sep);
    const wspArr = getWorkspace(dir).split(path.sep);

    while (val === false) {
        const filepath = normalize(...dirArr, '.core', 'reactium-config.js');
        const rnfilepath = normalize(...dirArr, '.core', 'metro.config.js');

        val = fs.existsSync(filepath) && !fs.existsSync(rnfilepath);

        dirArr.pop();

        if (dirArr.length < wspArr.length) {
            break;
        }
    }

    console.log('file: index.js : isReactium :', dir, val);

    return val;
};

const isReactiumNative = dir => {
    let val = false;

    const dirArr = dir.split(path.sep);
    const wspArr = getWorkspace(dir).split(path.sep);

    while (val === false) {
        const filepath = normalize(...dirArr, '.core', 'metro.config.js');

        val = fs.existsSync(filepath);

        dirArr.pop();

        if (dirArr.length < wspArr.length) {
            break;
        }
    }

    console.log('file: index.js : isReactiumNative :', dir, val);

    return val;
};

const normalize = (...args) => path.normalize(path.join(...args));

const progressOptions = (cancellable = false) => ({
    cancellable,
    title: 'Reactium',
    location: vscode.ProgressLocation.Notification,
});

const runCommand = (cmd, args = [], opt = {}) =>
    new Promise((resolve, reject) => {
        args = Array.isArray(args) ? args : [args];
        const options = { shell: true, stdio: 'inherit', ...opt };
        const ps = spawn(cmd, args, options);

        ps.on('error', err => {
            reject(err.message);
            return;
        });

        ps.on('close', code => {
            if (code !== 0) {
                reject(`Error (${code}) executing: ${cmd} ${args.join(' ')}`);
            } else {
                resolve(ps);
            }
        });
    });

const styleTypeSelect = (
    options = {
        placeHolder: 'Select style order',
        title: 'Reactium Component: Styles',
    },
) => {
    const choices = [
        {
            label: 'default',
            file: '_reactium-style.scss',
            picked: true,
            index: 0,
        },
        {
            label: 'mixins',
            file: '_reactium-style-mixins.scss',
            index: 1,
        },
        {
            label: 'variables',
            file: '_reactium-style-variables.scss',
            index: 2,
        },
        {
            label: 'base',
            file: '_reactium-style-base.scss',
            index: 3,
        },
        {
            label: 'atoms',
            file: '_reactium-style-atoms.scss',
            index: 4,
        },
        {
            label: 'molecules',
            file: '_reactium-style-molecules.scss',
            index: 5,
        },
        {
            label: 'organisms',
            file: '_reactium-style-organisms.scss',
            index: 6,
        },
        {
            label: 'overrides',
            file: '_reactium-style-overrides.scss',
            index: 7,
        },
    ];

    return vscode.window.showQuickPick(choices, options);
};

const workspaceSelect = async () => {
    const workspaces = vscode.workspace.workspaceFolders;

    if (!workspaces) return Promise.resolve();

    const wsp = workspaces.map(({ name: label, index }) => ({
        label,
        index,
    }));

    const selection =
        wsp.length < 2
            ? { index: 0 }
            : await vscode.window.showQuickPick(wsp, {
                  placeHolder: 'Select workspace',
              });

    if (!selection) {
        return Promise.resolve();
    }

    const { index } = selection;

    return op.get(workspaces, [index, 'uri', 'path']);
};

const Utils = {
    cc,
    componentFeatureSelect,
    componentGen,
    confirm,
    getWorkspace,
    input,
    inputToArray,
    isActinium,
    isFile,
    isReactium,
    isReactiumNative,
    normalize,
    progressOptions,
    runCommand,
    styleTypeSelect,
    workspaceSelect,
};

module.exports = Utils;
