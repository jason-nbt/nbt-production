const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const credentials = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    
    // Ensure you replace YOUR_PROJECT_KEY with your actual Jira project key
    const jql = 'project = "NE" AND status = "PRODUCING"';
    
    // UPDATED: Using the new Atlassian search/jql endpoint
    const url = `${process.env.JIRA_URL}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Accept': 'application/json'
            }
        });
        const data = await response.json();
        return { statusCode: 200, body: JSON.stringify(data) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed fetching Jira data' }) };
    }
};