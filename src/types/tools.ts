export interface CreateIssueArgs {
  projectKey: string;
  summary: string;
  description?: string;
  issueType?: string;
  priority?: string;
  assignee?: string;
  labels?: string[];
  components?: string[];
  customFields?: Record<string, any>;
  parentKey?: string;
}

export interface GetIssueArgs {
  issueKey: string;
  expand?: string[];
  fields?: string[];
}

export interface UpdateIssueArgs {
  issueKey: string;
  fields?: Record<string, any>;
  transition?: string;
  comment?: string;
}

export interface BulkUpdateIssuesArgs {
  issueKeys: string[];
  fields: Record<string, any>;
}

export interface LinkIssuesArgs {
  inwardIssue: string;
  outwardIssue: string;
  linkType: string;
  comment?: string;
}

export interface SearchIssuesArgs {
  jql: string;
  startAt?: number;
  maxResults?: number;
  fields?: string[];
  expand?: string[];
}

export interface CreateSprintArgs {
  boardId: number;
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
}

export interface MoveIssuesToSprintArgs {
  sprintId: number;
  issueKeys: string[];
}
