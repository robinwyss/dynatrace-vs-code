import * as vscode from 'vscode';
import { Configuration } from './types';

export async function fileExists(name: string) {
    if (vscode.workspace.workspaceFolders) {
        return asyncSome(vscode.workspace.workspaceFolders, async (folder) => {
            const fileUri = vscode.Uri.joinPath(folder.uri, name);
            try {
                const stats = await vscode.workspace.fs.stat(fileUri);
                return true;
            } catch {
                return false;
            }
        });
    }
    return false;
}

export function getPath(name: string): Promise<vscode.Uri | undefined> {
    if (vscode.workspace.workspaceFolders) {
        return asyncSome(vscode.workspace.workspaceFolders, async (folder) => {
            const fileUri = vscode.Uri.joinPath(folder.uri, name);
            try {
                const stats = await vscode.workspace.fs.stat(fileUri);
                return fileUri;
            } catch {
                return undefined;
            }
        });
    }
    return Promise.resolve(undefined);
}

export async function asyncSome<T, R>(arr: Readonly<Array<T>>, predicate: (element: T) => Promise<R>): Promise<R | undefined> {
    for (let e of arr) {
        const result = await predicate(e);
        if (result) { return result; }
    }
    return undefined;
};

export function getTenantUrl() {
    return vscode.workspace.getConfiguration('dynatrace').get('tenantUrl') as string;
}

export function getFilterType() {
    return vscode.workspace.getConfiguration('dynatrace').get('filterType') as string;
}
export function getFilter() {
    return vscode.workspace.getConfiguration('dynatrace').get('filter') as string;
}

export function getToken() {
    return vscode.workspace.getConfiguration('dynatrace').get('token') as string;
}

export function loadConfig(): Configuration | undefined {
    const tenantUrl = getTenantUrl();
    const filterType = getFilterType();
    const filter = getFilter();
    const token = getToken();
    if (tenantUrl && token) {
        return {
            tenantUrl,
            token,
            filterType,
            filter
        };
    } else {
        return undefined;
    }
}