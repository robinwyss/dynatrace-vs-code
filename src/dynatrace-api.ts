import * as https from 'https';
import { VulnerabilityType } from './types';

export class DynatraceApiClient {
    constructor(private tenantUrl: string, private token: string, private filterType: string, private filter: string) { }

    async fetchAllVulnerabilities(vulnerabilityType: VulnerabilityType) {
        console.log(`Dynatrace: fetching ${vulnerabilityType} vulnerabilities, filtered by ${this.filterType}: ${this.filter}`);
        let securityProblems: any[] = [];
        let securityProblemSelector = this.getSelector(vulnerabilityType);
        let result = await this.callDynatraceAPI(`/api/v2/securityProblems?pageSize=100&securityProblemSelector=${securityProblemSelector}&fields=%2BcodeLevelVulnerabilityDetails%2C%2BriskAssessment&sort=-riskAssessment.riskScore&from=now-10m`);
        securityProblems = securityProblems.concat(result.securityProblems);
        while (result.nextPageKey) {
            result = await this.callDynatraceAPI('/api/v2/securityProblems?nextPageKey=' + result.nextPageKey);
            securityProblems = securityProblems.concat(result.securityProblems);
        }
        console.log(`Dynatrace: return ${securityProblems.length} entries for ${vulnerabilityType}`);
        return securityProblems;
    }

    private getSelector(vulnerabilityType: VulnerabilityType) {
        let securityProblemSelector = 'vulnerabilityType(%22' + vulnerabilityType + '%22),status("OPEN")';
        if (this.filterType === "Workload") {
            securityProblemSelector += `,relatedKubernetesWorkloadNames("${this.filter}")`;
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
            https.get(apiEndpoint, {
                headers: {
                    "accept": "application/json; charset=utf-8",
                    "authorization": `Api-Token ${this.token}`
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
                res.on('error', error => {
                    reject(error);
                });
                res.on('end', () => {
                    try {
                        const result = JSON.parse(Buffer.concat(data).toString());
                        resolve(result);
                    } catch {
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