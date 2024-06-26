import * as https from 'https';
import { VulnerabilityType } from './types';
import { LoggingService } from './LoggingService';

const pageSize = 500;

export class DynatraceApiClient {
    constructor(private tenantUrl: string, private token: string, private filterType: string, private filter: string, private logger: LoggingService) { }

    async fetchAllVulnerabilities(vulnerabilityType: VulnerabilityType) {
        this.logger.logInfo(`Fetching ${vulnerabilityType} vulnerabilities, filtered by ${this.filterType}: ${this.filter}`);
        let securityProblems: any[] = [];
        let securityProblemSelector = this.getSelector(vulnerabilityType);
        let result = await this.callDynatraceAPI(`/api/v2/securityProblems?pageSize=${pageSize}&securityProblemSelector=${securityProblemSelector}&fields=%2BcodeLevelVulnerabilityDetails%2C%2BriskAssessment&sort=-riskAssessment.riskScore&from=now-10m`);
        securityProblems = securityProblems.concat(result.securityProblems);
        while (result.nextPageKey) {
            this.logger.logInfo(`fetching next page ${result.nextPageKey}`);
            result = await this.callDynatraceAPI('/api/v2/securityProblems?nextPageKey=' + result.nextPageKey);
            securityProblems = securityProblems.concat(result.securityProblems);
        }
        this.logger.logInfo(`Found ${securityProblems.length} entries for ${vulnerabilityType}`);
        return securityProblems;
    }

    async getVulnerabilityDetails(vulnerabilityId: string) {
        this.logger.logInfo(`Fetching details for ${vulnerabilityId}`);
        let result = await this.callDynatraceAPI(`/api/v2/securityProblems/${vulnerabilityId}?fields=%2Bdescription,%2BvulnerableComponents,%2BriskAssessment,%2BcodeLevelVulnerabilityDetails`);
        return result;
    }

    private getSelector(vulnerabilityType: VulnerabilityType) {
        let securityProblemSelector = 'vulnerabilityType("' + vulnerabilityType + '"),status("OPEN")';
        if (this.filterType === "Workload") {
            securityProblemSelector += `,relatedKubernetesWorkloadNames("${this.filter}")`;
        } else if (this.filterType === "Management Zone") {
            securityProblemSelector += `,managementZones("${this.filter}")`;
        } else if (this.filterType === "Tag") {
            securityProblemSelector += `,tags("${this.filter}")`;
        } else if (this.filterType === 'selector') {
            securityProblemSelector += ',' + this.filter;
        }
         return securityProblemSelector;
    }

    private async callDynatraceAPI(endpoint: string): Promise<any> {
        // const tenantUrl = getTenantUrl();
        const apiEndpoint = this.tenantUrl + endpoint;
        return new Promise((resolve, reject) => {
            this.logger.logInfo(`Querying Dynatrace API: ${apiEndpoint}`);
            https.get(apiEndpoint, {
                headers: {
                    "accept": "application/json; charset=utf-8",
                    "authorization": `Api-Token ${this.token}`
                }
            }, res => {
                this.logger.logInfo(`API response: ${res.statusCode}`);
                if (res.statusCode && res.statusCode > 299) {
                    this.logger.logError(`Could not retrieve data: ${res.statusCode} ${res.statusMessage}`);
                    reject(res.statusMessage);
                }
                let data: any[] = [];
                res.on('data', chunk => {
                    data.push(chunk);
                });
                res.on('error', error => {
                    this.logger.logError(`Error while reading response ${error}`);
                    reject(error);
                });
                res.on('end', () => {
                    try {
                        const result = JSON.parse(Buffer.concat(data).toString());
                        resolve(result);
                    } catch {
                        this.logger.logError(`Invalid response from ${endpoint}, verify Tenant URL `);
                        reject(`Invalid response from ${endpoint}, verify Tenant URL `);
                    }
                });
            });
        });
    }

    updateToken(newToken: string) {
        this.token = newToken;
    }

    updateTenantUrl(newUrl: string) {
        this.tenantUrl = newUrl;
    }
}