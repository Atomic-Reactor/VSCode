const fs = require('fs');
const _ = require('underscore');
const vscode = require('vscode');
const op = require('object-path');
const commands = require('./commands');

function activate(context) {
    const workspaces = vscode.workspace.workspaceFolders.map(space =>
        op.get(space, 'uri.path'),
    );

    const dirs = _.flatten(
        workspaces.map(space =>
            fs
                .readdirSync(space)
                .filter(f => Boolean(!String(f).startsWith('.'))),
        ),
    );

    vscode.commands.executeCommand('setContext', 'workspace.folders', dirs);

    Object.entries(commands).forEach(([id, cmd]) => {
        let disposable = vscode.commands.registerCommand(`reactium.${id}`, cmd);
        context.subscriptions.push(disposable);
    });
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
    activate,
    deactivate,
};
