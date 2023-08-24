export interface SecurityProblem {
    securityProblemId: string;
    displayId: string;
    status: string;
    muted: boolean;
    externalVulnerabilityId: string;
    vulnerabilityType: string;
    title: string;
    packageName: string;
    url: string;
    technology: string;
    firstSeenTimestamp: number;
    lastUpdatedTimestamp: number;
    lastOpenedTimestamp: number;
    riskAssessment: RiskAssessment;
    codeLevelVulnerabilityDetails: CodeLevelVulnerabilityDetails;
    cveIds?: (string)[] | null;
}
export interface RiskAssessment {
    riskLevel: string;
    riskScore: number;
    riskVector: string;
    baseRiskLevel: string;
    baseRiskScore: number;
    baseRiskVector: string;
    exposure: string;
    dataAssets: string;
    publicExploit: string;
    vulnerableFunctionUsage: string;
    assessmentAccuracy: string;
}

export interface CodeLevelVulnerabilityDetails {
    processGroupIds: string[];
    processGroups: string[];
    shortVulnerabilityLocation: string;
    type: string;
    vulnerabilityLocation: string;
    vulnerableFunction: string;
    vulnerableFunctionInput: VulnerableFunctionInput;
}

export interface VulnerableFunctionInput {
    type: string;
    inputSegments: InputSegment[];
}

export interface InputSegment {
    value: string;
    type: string;
}

export enum VulnerabilityType {
    thirdParty = "THIRD_PARTY",
    runtime = "RUNTIME",
    codeLevel = "CODE_LEVEL"
}

export interface VulnerabilityData {
    updated: Date;
    thirdPartyVulnerabilities: SecurityProblem[];
    runtimeVulnerabilities: SecurityProblem[];
    codeLevelVulnerabilities: SecurityProblem[];
}

export interface Configuration {
    tenantUrl: string,
    token: string,
    filterType: string,
    filter: string
}