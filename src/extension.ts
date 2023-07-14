// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { rejects } from 'assert';
import { DynatraceVulnerabilityProvider } from './vulnerability-list';
import { DynatraceApiClient } from './dynatrace-api';
import { VulnerabilityData, VulnerabilityType } from './types';
// import fetch from 'node-fetch';

let statusBarItem: vscode.StatusBarItem;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('Extension "dynatrace" is now active!');

	if (getTenantUrl()) {
		loadData(context);
	}

	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('dynatrace.tenantUrl') && getTenantUrl()) {
			updateToken(context);
		}
		if (event.affectsConfiguration('dynatrace.tenantUrl') && getTenantUrl()) {
			updateToken(context);
		}
	}));

}

async function loadData(context: vscode.ExtensionContext) {
	const tenantUrl = getTenantUrl();
	const filterType = getFilterType();
	const filter = getFilter();
	getToken(context).then(async (token) => {
		if (token) {
			const apiClient = new DynatraceApiClient(tenantUrl, token);
			const tpv = await apiClient.fetchAllVulnerabilities(VulnerabilityType.thirdParty);
			const rv = await apiClient.fetchAllVulnerabilities(VulnerabilityType.runtime);
			const clv = await apiClient.fetchAllVulnerabilities(VulnerabilityType.codeLevel);
			return {
				"updated": new Date(),
				"thirdPartyVulnerabilities": tpv,
				"runtimeVulnerabilities": rv,
				"codeLevelVulnerabilities": clv
			};
			// return updateData(apiClient);
		}
	}).then(vulnerabilityData => {
		if (vulnerabilityData) {
			updateView(vulnerabilityData);
		}
	}).catch(error => {
		console.error(error);
	});
}

function updateView(vulnerabilityData: VulnerabilityData) {
	const tpvTreeView = vscode.window.createTreeView('thid-party-vulnerabilities', {
		treeDataProvider: new DynatraceVulnerabilityProvider(VulnerabilityType.thirdParty, vulnerabilityData.thirdPartyVulnerabilities)
	});
	const runtimeTreeView = vscode.window.createTreeView('runtime-vulnerabilities', {
		treeDataProvider: new DynatraceVulnerabilityProvider(VulnerabilityType.runtime, vulnerabilityData.runtimeVulnerabilities)
	});
	const clvTreeView = vscode.window.createTreeView('code-level-vulnerabilities', {
		treeDataProvider: new DynatraceVulnerabilityProvider(VulnerabilityType.codeLevel, vulnerabilityData.codeLevelVulnerabilities)
	});
}

function getTenantUrl() {
	return vscode.workspace.getConfiguration('dynatrace').get('tenantUrl') as string;
}

function getFilterType() {
	return vscode.workspace.getConfiguration('dynatrace').get('filterType') as string;
}
function getFilter() {
	return vscode.workspace.getConfiguration('dynatrace').get('tenantUrl') as string;
}

async function updateToken(context: vscode.ExtensionContext) {
	const secrets: vscode.SecretStorage = context.secrets;

	const userToken = await vscode.window.showInputBox({ title: 'Enter your Dynatrace API token', password: true });
	if (userToken !== undefined) {
		secrets.store("dynatrace-api-token", userToken as string);
	}
}

async function getToken(context: vscode.ExtensionContext) {
	const secrets: vscode.SecretStorage = context.secrets;
	let userToken = await secrets.get("dynatrace-api-token");
	if (!userToken) {
		userToken = await vscode.window.showInputBox({ title: 'Enter your Dynatrace API token', password: true });
		if (userToken !== undefined) {
			secrets.store("dynatrace-api-token", userToken as string);
		}
	}
	return userToken;
}

// This method is called when your extension is deactivated
export function deactivate() { }
