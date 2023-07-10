// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as https from 'https';
import { rejects } from 'assert';
// import fetch from 'node-fetch';

let statusBarItem: vscode.StatusBarItem;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('Extension "dynatrace" is now active!');

	const openTenantCommandId = 'dynatrace.openUrl';

	context.subscriptions.push(vscode.commands.registerCommand(openTenantCommandId, openDynatraceTenant));
	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('dynatrace.showVulnerabilityCount') && showVulnerabilityCount()) {
			updateToken(context);
			updateStatusBar(context);
		}
	}));

	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.command = openTenantCommandId;

	context.subscriptions.push(statusBarItem);

	updateStatusBar(context);

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
	if (showVulnerabilityCount()) {
		getToken(context).then(token => {
			fetchVulnerabiliyCount(token as string).then(result => {
				statusBarItem.text = `Vulnerabilities: $(error) ${result.critical} $(warning) ${result.high} `;
				statusBarItem.tooltip = `${result.critical} Critital and ${result.high} High vulnerabilities were found. Click to open Dynatrace and see all vulnerabilities`;
			});
		});
	} else {
		statusBarItem.text = 'Vulnerabilities';
	}
	statusBarItem.show();
}
async function fetchVulnerabiliyCount(token: string) {
	const result = await callDynatraceAPI('/api/v2/securityProblems?pageSize=500&securityProblemSelector=minRiskScore(%227.0%22),vulnerabilityType(%22THIRD_PARTY%22,%22RUNTIME%22)&fields=%2BriskAssessment&from=now-10m', token);
	const critical = result.securityProblems.filter((x: { riskAssessment: { riskScore: number; }; }) => x.riskAssessment.riskScore >= 9.0);
	const high = result.securityProblems.filter((x: { riskAssessment: { riskScore: number; }; }) => x.riskAssessment.riskScore >= 7.0 && x.riskAssessment.riskScore < 9.0);
	return { critical: critical.length, high: high.length };
}

async function callDynatraceAPI(endpoint: string, token: string): Promise<any> {
	const tenantUrl = getTenantUrl();
	const apiEndpoint = tenantUrl + endpoint;
	return new Promise((resolve, reject) => {
		https.get(apiEndpoint, {
			headers: {
				"Accept": "application/json; charset=utf-8",
				"Authorization": `Api-Token ${token}`
			}
		}, res => {
			if (res.statusCode && res.statusCode > 299) {
				console.log('Could not retrieve data from Dynatrace:' + res.statusMessage);
				reject(res.statusMessage);
			}
			let data: any[] = [];
			res.on('data', chunk => {
				data.push(chunk);
			});
			res.on('end', () => {
				console.log('Response ended: ');
				const result = JSON.parse(Buffer.concat(data).toString());
				// console.log(res);
				resolve(result);
			});
		});
	});
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
