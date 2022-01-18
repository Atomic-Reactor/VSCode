const path = require('path');
const fs = require('fs-extra');
const vscode = require('vscode');
const op = require('object-path');
const Utils = require('../utils');
const slugify = require('slugify');

async function command(e) {
    const dir = e ? op.get(e, 'path') : undefined;
    if (!dir) return;

    const workspace = Utils.getWorkspace(dir);

    const isReactium = Utils.isReactium(workspace);
    if (!isReactium) {
        vscode.window.showErrorMessage('Workspace is not a Reactium project');
        return;
    }

    let name = path.basename(dir);

    const domainFilePath = Utils.normalize(dir, 'domain.js'); 
    if (fs.existsSync(domainFilePath)) {
        const domain = require(domainFilePath);
        name = domain.name;
    }

    const params = {
        dir,
        index: false,
        className: slugify(String(name).toLowerCase()),
        name: Utils.cc(name),
        style: true,
        workspace,
    };

    return vscode.window.withProgress(
        Utils.progressOptions(false),
        async progress => {
            const { file } = await Utils.styleTypeSelect();
            params.styleType = file;

            progress.report({ increment: 50 });

            Utils.componentGen(params);

            return new Promise(resolve => {
                setTimeout(() => {
                    progress.report({ increment: 100 });
                    resolve();
                }, 2000);
            });
        },
    );
}

module.exports = command;
