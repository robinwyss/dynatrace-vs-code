import { ExtensionContext } from "vscode";
import { LoggingService } from "./LoggingService";
import { DynatraceApiClient } from "./dynatrace-api";
import { Configuration, VulnerabilityData, VulnerabilityType } from "./types";
import { loadConfig } from "./utils";
import { TreeViewHandler } from "./TreeViewHandler";


export class UpdateHandler {


    // update at most every minute
    private minTimerinterval = 60 * 1000;
    // update every 3min when the view is active
    private autoRereshinterval = 3 * 60 * 1000;

    constructor(private logger: LoggingService, private context: ExtensionContext, private treeViewHandler: TreeViewHandler) {

    }

    public async updateData() {
        const config = loadConfig();
        if (config) {
            const vulnerabilityData = await this.getVulnerabilities(config);
            this.treeViewHandler.updateView(vulnerabilityData);
            await this.context.workspaceState.update('dynatrace.lastupdate', new Date().getTime());
        } else {
            this.logger.logInfo('Configuration not set');
        }
    }

    public async updateDataIfOutdated() {
        const lastupdate = await this.context.workspaceState.get('dynatrace.lastupdate');
        if (!lastupdate || (lastupdate as number) < (new Date().getTime() - this.minTimerinterval)) {
            this.updateData();
        }
    }

    public async initializeData() {
        this.updateData();
        // checks at a fixed interval if the content needs to be reloaded
        setInterval(async () => {
            const autorefresh = await this.context.workspaceState.get('dynatrace.autorefresh');
            if (autorefresh) {
                this.updateDataIfOutdated();
            }

        }, this.autoRereshinterval);

    }

    private async getVulnerabilities(config: Configuration): Promise<VulnerabilityData> {
        const apiClient = new DynatraceApiClient(config.tenantUrl, config.token, config.filterType, config.filter, this.logger);
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

    public async enableAutoRefresh() {
        await this.context.workspaceState.update('dynatrace.autorefresh', true);
    }

    public async disableAutoRefresh() {
        await this.context.workspaceState.update('dynatrace.autorefresh', false);
    }
}