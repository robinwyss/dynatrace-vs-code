// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { rejects } from 'assert';
import { DynatraceVulnerabilityProvider } from './vulnerability-list';
import { DynatraceApiClient } from './dynatrace-api';
import { Configuration, SecurityProblem, VulnerabilityData, VulnerabilityType } from './types';
import { fileExists, getPath } from './utils';
// import fetch from 'node-fetch';

let statusBarItem: vscode.StatusBarItem;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('Extension "dynatrace" is now active!');

	if (getTenantUrl()) { // get the tenant URL to check if the extension is configured
		updateData(context);
	}

	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('dynatrace.tenantUrl') && getTenantUrl()) {
			updateToken(context);
		}
		if (event.affectsConfiguration('dynatrace.tenantUrl') && getTenantUrl()) {
			updateToken(context);
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('vulnerabilities.reload', () => {
		console.log('Dynatrace: reloading data');
		updateData(context);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('dynatrace.showVulnerability', async args => {
		const securityProblem = args as SecurityProblem;
		if (securityProblem.vulnerabilityType === "CODE_LEVEL") {
			const codelocation = securityProblem.codeLevelVulnerabilityDetails.shortVulnerabilityLocation;
			const className = codelocation.split('.')[0];
			const line = codelocation.split(':')[1];
			vscode.commands.executeCommand('workbench.action.quickOpen', `${className}:${line}`);
		} else if(securityProblem.vulnerabilityType === "THIRD_PARTY") {
			const success = await openJavaDependencies();
			if (!success) {
				vscode.commands.executeCommand('vscode.open', securityProblem.url);
			}
		} else {
			vscode.commands.executeCommand('vscode.open', securityProblem.url);
		}
	}));
}

async function openJavaDependencies(): Promise<boolean> {
	const pomUri = await getPath('pom.xml');
	if (pomUri) {
		const result = vscode.commands.executeCommand('vscode.open', pomUri);
		return true;
	}
	const gradleUri = await getPath('build.gradle');
	if (gradleUri) {
		const result = vscode.commands.executeCommand('vscode.open', gradleUri);
		return true;
	}
	return false;
}


async function updateData(context: vscode.ExtensionContext) {
	const config = await loadConfig(context);
	if (config) {
		const vulnerabilityData = await getVulnerabilities(config);
		updateView(vulnerabilityData);
	}
}

async function loadConfig(context: vscode.ExtensionContext): Promise<Configuration | undefined> {
	const tenantUrl = getTenantUrl();
	const filterType = getFilterType();
	const filter = getFilter();
	const token = await getToken(context);
	if (token) {
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

async function getVulnerabilities(config: Configuration): Promise<VulnerabilityData> {
	const apiClient = new DynatraceApiClient(config.tenantUrl, config.token, config.filterType, config.filter);
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
	return vscode.workspace.getConfiguration('dynatrace').get('filter') as string;
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
