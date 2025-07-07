// Test to get all tickets assigned to current user
import { Version3Client } from 'jira.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function getMyTickets() {
  console.log('🎫 Getting all tickets assigned to current user...\n');

  const client = new Version3Client({
    host: process.env.JIRA_HOST,
    authentication: {
      basic: {
        email: process.env.JIRA_EMAIL,
        apiToken: process.env.JIRA_API_TOKEN,
      },
    },
  });

  try {
    // First, confirm current user
    const currentUser = await client.myself.getCurrentUser();
    console.log(`👤 Confirmed user: ${currentUser.displayName} (${currentUser.emailAddress})`);
    console.log(`📧 Account ID: ${currentUser.accountId}\n`);

    // Get all assigned tickets with comprehensive search
    console.log('🔍 Searching for all assigned tickets...');
    const searchResults = await client.issueSearch.searchForIssuesUsingJql({
      jql: 'assignee = currentUser() ORDER BY updated DESC',
      maxResults: 100, // Get up to 100 tickets
      fields: [
        'summary', 'status', 'priority', 'issuetype', 'project',
        'created', 'updated', 'duedate', 'assignee', 'reporter',
        'description', 'labels', 'components', 'fixVersions',
        'attachment', 'comment', 'timetracking', 'resolution',
        'resolutiondate', 'environment'
      ],
      expand: ['renderedFields', 'changelog']
    });

    console.log(`✅ Found ${searchResults.total} total tickets assigned to you`);
    console.log(`📋 Showing details for ${searchResults.issues?.length || 0} tickets:\n`);

    if (!searchResults.issues || searchResults.issues.length === 0) {
      console.log('No tickets found.');
      return;
    }

    // Group tickets by project
    const ticketsByProject = {};
    searchResults.issues.forEach(issue => {
      const projectKey = issue.fields.project.key;
      if (!ticketsByProject[projectKey]) {
        ticketsByProject[projectKey] = [];
      }
      ticketsByProject[projectKey].push(issue);
    });

    // Display tickets organized by project
    for (const [projectKey, tickets] of Object.entries(ticketsByProject)) {
      const projectName = tickets[0].fields.project.name;
      console.log(`\n📁 Project: ${projectKey} - ${projectName} (${tickets.length} tickets)`);
      console.log('=' .repeat(80));

      tickets.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.key}: ${issue.fields.summary}`);
        console.log(`   Status: ${issue.fields.status?.name || 'Unknown'}`);
        console.log(`   Priority: ${issue.fields.priority?.name || 'Unknown'}`);
        console.log(`   Type: ${issue.fields.issuetype?.name || 'Unknown'}`);
        console.log(`   Created: ${new Date(issue.fields.created).toLocaleDateString()}`);
        console.log(`   Updated: ${new Date(issue.fields.updated).toLocaleDateString()}`);
        
        if (issue.fields.duedate) {
          console.log(`   Due Date: ${new Date(issue.fields.duedate).toLocaleDateString()}`);
        }
        
        if (issue.fields.labels && issue.fields.labels.length > 0) {
          console.log(`   Labels: ${issue.fields.labels.join(', ')}`);
        }
        
        if (issue.fields.components && issue.fields.components.length > 0) {
          const componentNames = issue.fields.components.map(c => c.name).join(', ');
          console.log(`   Components: ${componentNames}`);
        }
        
        if (issue.fields.attachment && issue.fields.attachment.length > 0) {
          console.log(`   Attachments: ${issue.fields.attachment.length} file(s)`);
        }
        
        // Show description preview if available
        if (issue.fields.description) {
          const desc = issue.renderedFields?.description || issue.fields.description;
          let descText = '';
          if (typeof desc === 'string') {
            descText = desc;
          } else if (desc && desc.content) {
            // Handle Atlassian Document Format
            descText = extractTextFromADF(desc);
          }
          if (descText && descText.length > 0) {
            const preview = descText.substring(0, 100).replace(/\n/g, ' ');
            console.log(`   Description: ${preview}${descText.length > 100 ? '...' : ''}`);
          }
        }
      });
    }

    // Summary statistics
    console.log('\n📊 SUMMARY STATISTICS');
    console.log('=' .repeat(50));
    console.log(`Total Tickets: ${searchResults.total}`);
    console.log(`Projects Involved: ${Object.keys(ticketsByProject).length}`);
    
    // Status breakdown
    const statusCounts = {};
    searchResults.issues.forEach(issue => {
      const status = issue.fields.status?.name || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log('\nBy Status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    // Priority breakdown
    const priorityCounts = {};
    searchResults.issues.forEach(issue => {
      const priority = issue.fields.priority?.name || 'Unknown';
      priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
    });
    
    console.log('\nBy Priority:');
    Object.entries(priorityCounts).forEach(([priority, count]) => {
      console.log(`  ${priority}: ${count}`);
    });

    // Project breakdown
    console.log('\nBy Project:');
    Object.entries(ticketsByProject).forEach(([project, tickets]) => {
      console.log(`  ${project}: ${tickets.length}`);
    });

    console.log('\n✅ Successfully retrieved all your assigned tickets!');
    console.log('\n💡 This demonstrates the MCP server can safely access all your Jira data.');

  } catch (error) {
    console.error('❌ Error retrieving tickets:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Helper function to extract text from Atlassian Document Format
function extractTextFromADF(adf) {
  if (!adf || !adf.content) return '';
  
  let text = '';
  
  function traverse(node) {
    if (node.type === 'text') {
      text += node.text || '';
    } else if (node.content) {
      node.content.forEach(traverse);
    }
  }
  
  adf.content.forEach(traverse);
  return text.trim();
}

getMyTickets();