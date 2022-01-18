const path = require('path');
const vscode = require('vscode');
const op = require('object-path');
const Utils = require('../utils');

async function command(e) {
    const dir = e ? op.get(e, 'path') : undefined;
    if (!dir) return;

    const workspace = Utils.getWorkspace(dir);

    const isReactium = Utils.isReactium(workspace);
    if (!isReactium) {
        vscode.window.showErrorMessage('Workspace is not a Reactium project');
        return;
    }

    const params = {
        dir,
        index: false,
        name: Utils.cc(path.basename(dir)),
        workspace,
        domain: true,
    };

    return vscode.window.withProgress(Utils.progressOptions(false), async progress => {

        Utils.componentGen(params);

        return new Promise(resolve => {
            setTimeout(() => {
                progress.report({ increment: 100 });
                resolve();
            }, 2000);
        });
    });
}

module.exports = command;
