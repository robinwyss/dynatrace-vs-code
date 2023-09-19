// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { rejects } from 'assert';
import { VulnerabilityTreeDataProvider } from './VulnerabilityTreeDataProvider';
import { DynatraceApiClient } from './dynatrace-api';
import { Configuration, SecurityProblem, VulnerabilityData, VulnerabilityType } from './types';
import { fileExists, getPath } from './utils';
import { LoggingService } from './LoggingService';
import { TreeViewHandler } from './TreeViewHandler';
import { UpdateHandler } from './UpdateHandler';
// import fetch from 'node-fetch';

let statusBarItem: vscode.StatusBarItem;

// // update at most every minute
// const minTimerinterval = 60 * 1000;
// // update every 3min when the view is active
// const autoRereshinterval = 3 * 60 * 1000;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const logger = new LoggingService();
	const treeViewHandler = new TreeViewHandler(logger);
	const updateHandler = new UpdateHandler(logger, context, treeViewHandler);

	treeViewHandler.registerVisibilityChangeHandler(e => {
		if (e.visible) {
			updateHandler.updateDataIfOutdated();
			updateHandler.enableAutoRefresh();
		} else {
			updateHandler.disableAutoRefresh();
		}
	});

	logger.logInfo('Extension is now active!');

	updateHandler.initializeData();

	// event to reload all vulnerabilities
	context.subscriptions.push(vscode.commands.registerCommand('vulnerabilities.reload', async () => {
		logger.logInfo('Reloading data');
		await updateHandler.updateData();
	}));

	// open vulnerability details in the Dynatrace UI
	context.subscriptions.push(vscode.commands.registerCommand('vulnerability.details', async args => {
		const securityProblem = args.securityProblem as SecurityProblem;
		vscode.commands.executeCommand('vscode.open', securityProblem.url);
	}));

	// Navigate to the details of a specific vulnerability (when possible, opens code location)
	context.subscriptions.push(vscode.commands.registerCommand('vulnerability.open', async args => {
		const securityProblem = args.securityProblem as SecurityProblem;
		if (securityProblem.vulnerabilityType === "CODE_LEVEL") {
			const codelocation = securityProblem.codeLevelVulnerabilityDetails.shortVulnerabilityLocation;
			const className = codelocation.split('.')[0];
			const line = codelocation.split(':')[1];
			vscode.commands.executeCommand('workbench.action.quickOpen', `${className}:${line}`);
		} else if (securityProblem.vulnerabilityType === "THIRD_PARTY") {
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

// This method is called when your extension is deactivated
export function deactivate() { }
