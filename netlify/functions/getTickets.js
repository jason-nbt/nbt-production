const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const credentials = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    
    const jql = 'project = "NE" AND status = "PRODUCING"';
    
    // Explicitly requesting summary and key fields
    const url = `${process.env.JIRA_URL}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=summary,key`;

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