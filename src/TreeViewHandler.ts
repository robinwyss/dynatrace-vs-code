import { LoggingService } from "./LoggingService";
import { TreeItem, TreeView, TreeViewVisibilityChangeEvent, window } from "vscode";
import { VulnerabilityTreeDataProvider } from "./VulnerabilityTreeDataProvider";
import { VulnerabilityData, VulnerabilityType } from "./types";

export class TreeViewHandler {

    private tpvTreeDataProvider: VulnerabilityTreeDataProvider = new VulnerabilityTreeDataProvider(VulnerabilityType.thirdParty);
    private runtimeTreeDataProvider: VulnerabilityTreeDataProvider = new VulnerabilityTreeDataProvider(VulnerabilityType.runtime);
    private clvTreeDataProvider: VulnerabilityTreeDataProvider = new VulnerabilityTreeDataProvider(VulnerabilityType.codeLevel);

    private tpvTreeView: TreeView<TreeItem>;
    private runtimeTreeView: TreeView<TreeItem>;
    private clvTreeView: TreeView<TreeItem>;


    constructor(private logger: LoggingService) {
        this.clvTreeView = window.createTreeView('code-level-vulnerabilities', {
            treeDataProvider: this.clvTreeDataProvider
        });
        this.tpvTreeView = window.createTreeView('thid-party-vulnerabilities', {
            treeDataProvider: this.tpvTreeDataProvider
        });
        this.runtimeTreeView = window.createTreeView('runtime-vulnerabilities', {
            treeDataProvider: this.runtimeTreeDataProvider
        });
    }

    public updateView(vulnerabilityData: VulnerabilityData) {
        this.tpvTreeDataProvider.updateData(vulnerabilityData.thirdPartyVulnerabilities);
        this.runtimeTreeDataProvider.updateData(vulnerabilityData.runtimeVulnerabilities);
        this.clvTreeDataProvider.updateData(vulnerabilityData.codeLevelVulnerabilities);


        // this.tpvTreeView.onDidChangeVisibility(e => {
        //     if (e.visible) {
        //         updateDataIfOutdated(context, logger);
        //         enableAutoRefresh(context);
        //     } else {
        //         disableAutoRefresh(context);
        //     }
        // });
    }

    public registerVisibilityChangeHandler(handler: (e: TreeViewVisibilityChangeEvent) => void) {
        this.tpvTreeView.onDidChangeVisibility(handler);
    }
}