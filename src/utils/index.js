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

const componentFeatureSelect = async (options = {}) => {
    const choices = [
        {
            key: 'hooks',
            label: 'Reactium hooks:',
            picked: true,
            description: 'Creates the reactium-hooks.js file',
        },
        {
            key: 'style',
            label: 'Stylesheet:',
            picked: true,
            description: 'Creates the _reactium-style.scss file',
        },
        {
            key: 'route',
            label: 'Route:',
            picked: true,
            value: true,
            description: 'Creates the route.js file',
        },
        {
            key: 'zone',
            label: 'Zone:',
            picked: true,
            value: true,
            description: 'Creates the domain.js file',
        },
    ];

    const selection = await vscode.window.showQuickPick(choices, {
        canPickMany: true,
        ...options,
    });

    return _.pluck(selection, 'key');
};

const componentGen = async params => {
    const cwd = params.workspace;

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
            create: params.zone,
        },
        route: {
            file: 'route.js',
            template: 'route.hbs',
            create: typeof params.route === 'string',
        },
        style: {
            file: params.styleType || '_reactium-style.scss',
            create: params.style,
        },
    };

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

const isActinium = cwd =>
    Boolean(
        glob.sync(['**/actinium-config.js'], {
            cwd,
            dot: true,
            onlyFiles: true,
        }).length > 0,
    );

const isFile = (...args) => fs.existsSync(normalize(...args));

const isReactium = cwd =>
    Boolean(
        glob.sync(['**/reactium-config.js'], {
            cwd,
            dot: true,
            onlyFiles: true,
        }).length > 0,
    );

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
        },
        {
            label: 'mixins',
            description: -1000,
            file: '_reactium-style-mixins.scss',
        },
        {
            label: 'variables',
            description: -900,
            file: '_reactium-style-variables.scss',
        },
        { label: 'base', description: -800, file: '_reactium-style-base.scss' },
        { label: 'atoms', description: 0, file: '_reactium-style-atoms.scss' },
        {
            label: 'molecules',
            description: 800,
            file: '_reactium-style-molecules.scss',
        },
        {
            label: 'organisms',
            description: 900,
            file: '_reactium-style-organisms.scss',
        },
        {
            label: 'overrides',
            description: 1000,
            file: '_reactium-style-overrides.scss',
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
    normalize,
    progressOptions,
    runCommand,
    styleTypeSelect,
    workspaceSelect,
};

module.exports = Utils;
