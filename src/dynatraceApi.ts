import * as https from 'https';
import { VulnerabilityType } from './types';

export class DynatraceApiClient {
    constructor(private tenantUrl: string, private token: string) { }

    async fetchVulnerabiliyCount() {
        const result = await this.callDynatraceAPI('/api/v2/securityProblems?pageSize=500&securityProblemSelector=minRiskScore(%227.0%22),vulnerabilityType(%22THIRD_PARTY%22,%22RUNTIME%22)&fields=%2BriskAssessment&from=now-10m');
        const critical = result.securityProblems.filter((x: { riskAssessment: { riskScore: number; }; }) => x.riskAssessment.riskScore >= 9.0);
        const high = result.securityProblems.filter((x: { riskAssessment: { riskScore: number; }; }) => x.riskAssessment.riskScore >= 7.0 && x.riskAssessment.riskScore < 9.0);
        return { critical: critical.length, high: high.length };
    }

    async fetchAllVulnerabilities(vulnerabilityType: VulnerabilityType) {
        let securityProblems: any[] = [];
        let result = await this.callDynatraceAPI('/api/v2/securityProblems?pageSize=100&securityProblemSelector=vulnerabilityType(%22' + vulnerabilityType + '%22)&fields=%2BcodeLevelVulnerabilityDetails%2C%2BriskAssessment&sort=-riskAssessment.riskScore&from=now-10m');
        securityProblems = securityProblems.concat(result.securityProblems);
        while (result.nextPageKey) {
            result = await this.callDynatraceAPI('/api/v2/securityProblems?nextPageKey=' + result.nextPageKey);
            securityProblems = securityProblems.concat(result.securityProblems);
        }
        return securityProblems;
    }

    private async callDynatraceAPI(endpoint: string): Promise<any> {
        // const tenantUrl = getTenantUrl();
        const apiEndpoint = this.tenantUrl + endpoint;
        return new Promise((resolve, reject) => {
            https.get(apiEndpoint, {
                headers: {
                    "Accept": "application/json; charset=utf-8",
                    "Authorization": `Api-Token ${this.token}`
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

    updateToken(newToken: string) {
        this.token = newToken;
    }

    updateTenantUrl(newUrl: string) {
        this.tenantUrl = newUrl;
    }
}