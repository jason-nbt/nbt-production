document.addEventListener("DOMContentLoaded", fetchTickets);

async function fetchTickets() {
    const response = await fetch('/.netlify/functions/getTickets');
    const data = await response.json();
    
    console.log("Jira API Response:", data);
    
    if (!data.issues) {
        console.error("Failed to load tickets. The 'issues' array is missing from the data.");
        return; 
    }

    const queuedContainer = document.querySelector('#queued .ticket-container');
    queuedContainer.innerHTML = ''; // Clear loading state

    data.issues.forEach(issue => {
        const card = document.createElement('div');
        card.className = 'ticket-card';
        card.draggable = true;
        
        // Fallback to issue.id if issue.key is undefined
        const key = issue.key || issue.id;
        const summary = issue.fields?.summary || 'No Summary Provided';

        card.id = key;
        card.ondragstart = drag;
        
        card.innerHTML = `
            <strong>${key}</strong>
            <p>${summary}</p>
        `;
        
        queuedContainer.appendChild(card);
    });
}

// Drag and Drop Logic
function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

async function drop(ev) {
    ev.preventDefault();
    const issueKey = ev.dataTransfer.getData("text");
    const card = document.getElementById(issueKey);
    
    const dropZone = ev.target.closest('.column');
    if (!dropZone) return;

    dropZone.querySelector('.ticket-container').appendChild(card);
    
    const transitionId = dropZone.getAttribute('data-transition-id');
    await updateJiraTicket(issueKey, transitionId);
}

async function updateJiraTicket(issueKey, transitionId) {
    await fetch('/.netlify/functions/moveTicket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueKey, transitionId })
    });
}