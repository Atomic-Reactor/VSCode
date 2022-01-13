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
    };

    return vscode.window.withProgress(Utils.progressOptions(false), async progress => {
        params.route = await Utils.input({
            title: 'Reactium Component: Route',
            placeHolder: '/route-1, /route-2, /route/with/:param',
            prompt: 'Relative url path',
        });

        if (typeof params.route === 'string') {
            params.route = JSON.stringify(
                Utils.inputToArray(params.route)
                    .sort()
                    .reverse(),
            )
                .replace(/\"/g, "'")
                .replace(/,/g, ', ');
        }

        progress.report({ increment: 25 });

        Utils.componentGen(params);

        progress.report({ increment: 99 });

        return new Promise(resolve => {
            setTimeout(() => {
                progress.report({ increment: 100 });
                resolve();
            }, 2000);
        });
    });
}

module.exports = command;
