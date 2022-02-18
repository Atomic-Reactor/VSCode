const vscode = require('vscode');
const op = require('object-path');
const Utils = require('../utils');
const slugify = require('slugify');
const path = require('path');

async function command(e) {
    const dir = e ? op.get(e, 'path') : undefined;
    if (!dir) return;

    const workspace = Utils.getWorkspace(dir);

    const isReactium = Utils.isReactium(dir);

    const isReactiumNative = Utils.isReactiumNative(dir);

    if (!isReactium && !isReactiumNative) {
        vscode.window.showErrorMessage('Workspace is not a Reactium project');
        return;
    }

    const params = {
        index: true,
        isReactium,
        isReactiumNative,
        parent: dir,
        workspace,
    };

    return vscode.window.withProgress(
        Utils.progressOptions(false),
        async progress => {
            params.name = await Utils.input({
                title: 'Reactium Component: Name',
                placeHolder: 'Component name',
                prompt: 'String used when including via useHookComponent',
            });

            if (!params.name) {
                params.name = path.basename(dir);
            }

            params.dir = Utils.normalize(dir, Utils.cc(params.name));

            progress.report({ increment: 25 });

            const features = await Utils.componentFeatureSelect(
                {
                    title: 'Reactium Component: Features',
                    placeHolder: 'Select features',
                },
                params,
            );

            if (Array.isArray(features) && features.length < 1) {
                progress.report({ increment: 100 });
                return Promise.resolve();
            } else {
                features.forEach(feature => {
                    params[feature] = true;
                });

                progress.report({ increment: 50 });
            }

            if (isReactiumNative) {
                params.domain = true;
            }

            if (params.route === true) {
                params.route = await Utils.input({
                    title: 'Reactium Component: Route',
                    placeHolder: isReactiumNative
                        ? 'home, signin, dashboard'
                        : '/route-1, /route-2, /route/with/:param',
                    prompt: 'Relative url path',
                });

                if (isReactiumNative) {
                    params.route = String(slugify(params.route)).toLowerCase();
                } else {
                    if (typeof params.route === 'string') {
                        params.route = JSON.stringify(
                            Utils.inputToArray(params.route)
                                .sort()
                                .reverse(),
                        )
                            .replace(/\"/g, "'")
                            .replace(/,/g, ', ');
                    }
                }
            }

            if (params.style === true) {
                if (isReactiumNative) {
                    params.styleType = 'react-native';
                } else {
                    const { file } = await Utils.styleTypeSelect();
                    params.styleType = file;
                    params.className = slugify(
                        String(params.name).toLowerCase(),
                    );
                }
            }

            progress.report({ increment: 75 });

            Utils.componentGen(params);

            progress.report({ increment: 99 });

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
