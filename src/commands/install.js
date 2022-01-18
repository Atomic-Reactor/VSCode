const fs = require('fs-extra');
const vscode = require('vscode');
const op = require('object-path');
const Utils = require('../utils');

async function command(e) {
    let cwd = e ? op.get(e, 'path') : undefined;

    return vscode.window.withProgress(Utils.progressOptions(false), async progress => {
        if (!e || !cwd) {
            const workspace = await Utils.workspaceSelect();

            if (!workspace) {
                progress.report({ increment: 100 });
                return Promise.resolve();
            }

            cwd = Utils.normalize(workspace, 'Reactium');
        }

        if (Utils.isActinium(cwd)) {
            progress.report({ increment: 100 });
            return Promise.resolve();
        }

        const action = Utils.isReactium(cwd) ? 'update' : 'install';

        console.log('file: install.js : line 28 : command : action', action);

        // confirm action
        const confirmMsg =
            action === 'update' ? 'Update Reactium?' : 'Install Reactium?';

        const confirmed = await Utils.confirm(confirmMsg);

        if (!confirmed) {
            progress.report({ increment: 100 });
            return Promise.resolve();
        }

        fs.ensureDirSync(cwd);

        progress.report({
            increment: 10,
            message: 'installing dependencies (this may take awhile)...',
        });

        await Utils.runCommand('npx', [
            'npm',
            'install',
            '-g',
            '@atomic-reactor/cli',
        ]).catch(e => {
            progress.report({ increment: 100 });
            console.log(
                'file: install.js : line 51 : command : npm install',
                e,
            );
        });

        progress.report({
            increment: 40,
            message:
                action === 'install'
                    ? 'core installing...'
                    : 'core updating...',
        });

        await Utils.runCommand('arcli', ['reactium', action, '-o'], {
            cwd,
        }).catch(e => {
            progress.report({ increment: 100 });
            console.log('file: install.js : line 72 : command :', action, e);
        });

        progress.report({
            increment: 99,
            message: action === 'update' ? 'Updated!' : 'Installed!',
        });

        return new Promise(resolve => {
            setTimeout(() => {
                progress.report({ increment: 100 });
                resolve();
            }, 2000);
        });
    });
}

module.exports = command;
