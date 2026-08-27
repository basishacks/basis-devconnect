export type ApplicationClientType = "public" | "confidential";

export interface ApplicationSummary {
  name: string;
  clientId: string;
  clientType: ApplicationClientType;
  updatedAt: string;
  canManage: boolean;
}

export interface ApplicationDetail extends ApplicationSummary {
  redirectUris: string[];
  scopes: string[];
  resources: string[];
  requireConsent: boolean;
  filterMode: "whitelist" | "blacklist" | null;
  filterContent: string[];
}

export interface ApplicationsResponse {
  items: ApplicationSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApplicationInput {
  name: string;
  clientType: ApplicationClientType;
  redirectUris: string[];
}

export interface ApplicationMutationResponse {
  application: ApplicationDetail;
  clientSecret?: string;
}
