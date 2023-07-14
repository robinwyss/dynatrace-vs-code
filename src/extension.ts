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
	const dynatraceTpvVulnerabilityProvider = new DynatraceVulnerabilityProvider(VulnerabilityType.thirdParty);
	const dynatraceRuntimeVulnerabilityProvider = new DynatraceVulnerabilityProvider(VulnerabilityType.runtime);
	const dynatraceClvVulnerabilityProvider = new DynatraceVulnerabilityProvider(VulnerabilityType.codeLevel);
	const tpvTreeView = vscode.window.createTreeView('thid-party-vulnerabilities', { treeDataProvider: dynatraceTpvVulnerabilityProvider });
	const runtimeTreeView = vscode.window.createTreeView('runtime-vulnerabilities', { treeDataProvider: dynatraceRuntimeVulnerabilityProvider });
	const clvTreeView = vscode.window.createTreeView('code-level-vulnerabilities', { treeDataProvider: dynatraceClvVulnerabilityProvider });

	// tpvTreeView.message = "Loading...";
	// runtimeTreeView.message = "Loading...";
	// clvTreeView.message = "Loading...";

	const tenantUrl = getTenantUrl();
	if (tenantUrl) {
		getToken(context).then((token) => {
			if (token) {
				const apiClient = new DynatraceApiClient(tenantUrl, token);
				return updateData(apiClient);
			}
		}).then(vulnerabilityData => {
			if(vulnerabilityData){
				dynatraceTpvVulnerabilityProvider.updateData(vulnerabilityData.thirdPartyVulnerabilities);
				dynatraceRuntimeVulnerabilityProvider.updateData(vulnerabilityData.runtimeVulnerabilities);
				dynatraceClvVulnerabilityProvider.updateData(vulnerabilityData.codeLevelVulnerabilities);
			}
		});
	}

	const openTenantCommandId = 'dynatrace.openUrl';
	context.subscriptions.push(vscode.commands.registerCommand(openTenantCommandId, openDynatraceTenant));
	context.subscriptions.push(vscode.commands.registerCommand('dynatrace.showVulnerability', url => {
		console.log(url);
		vscode.commands.executeCommand('vscode.open', url);
	}));
	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('dynatrace.dynatrace.tenantUrl') && getTenantUrl()) {
			updateToken(context);
		}
	}));

	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.command = openTenantCommandId;

	context.subscriptions.push(statusBarItem);

	updateStatusBar(context);

}

async function updateData(apiClient: DynatraceApiClient):Promise<VulnerabilityData> {
	const tpv = await apiClient.fetchAllVulnerabilities(VulnerabilityType.thirdParty);
	const rv = await apiClient.fetchAllVulnerabilities(VulnerabilityType.runtime);
	const clv = await apiClient.fetchAllVulnerabilities(VulnerabilityType.codeLevel);
	return {
		"updated": new Date(),
		"thirdPartyVulnerabilities": tpv, 
		"runtimeVulnerabilities": rv, 
		"codeLevelVulnerabilities": clv
	};
}

function showVulnerabilityCount() {
	return vscode.workspace.getConfiguration('dynatrace').get('showVulnerabilityCount');
}

function getTenantUrl() {
	return vscode.workspace.getConfiguration('dynatrace').get('tenantUrl') as string;
}

function openDynatraceTenant() {
	const tenantUrl = getTenantUrl();
	vscode.commands.executeCommand('vscode.open', tenantUrl + '/ui/security/vulnerabilities');

}

function updateStatusBar(context: vscode.ExtensionContext): void {
	statusBarItem.text = 'Vulnerabilities: $(error) 3 $(warning) 5 ';
	statusBarItem.show();
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
