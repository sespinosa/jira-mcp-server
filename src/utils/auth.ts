import { z } from 'zod';

export const envSchema = z.object({
  JIRA_HOST: z.string().min(1),
  JIRA_EMAIL: z.string().email(),
  JIRA_API_TOKEN: z.string().min(1),
  JIRA_AUTH_TYPE: z.enum(['basic', 'oauth2']).default('basic'),
});

export type JiraConfig = z.infer<typeof envSchema>;

export function getJiraAuthentication(config: JiraConfig) {
  if (config.JIRA_AUTH_TYPE === 'oauth2') {
    return {
      oauth2: {
        accessToken: config.JIRA_API_TOKEN,
      },
    };
  }
  
  return {
    basic: {
      email: config.JIRA_EMAIL,
      apiToken: config.JIRA_API_TOKEN,
    },
  };
}

export function getJiraHost(config: JiraConfig): string {
  const host = config.JIRA_HOST;
  if (host.startsWith('http://') || host.startsWith('https://')) {
    return host;
  }
  return `https://${host}`;
}