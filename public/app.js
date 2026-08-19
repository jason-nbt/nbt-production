document.addEventListener("DOMContentLoaded", fetchTickets);

async function fetchTickets() {
    // Call the Netlify serverless function
    const response = await fetch('/.netlify/functions/getTickets');
    const data = await response.json();
    
    const queuedContainer = document.querySelector('#queued .ticket-container');
    queuedContainer.innerHTML = ''; // Clear loading states

    data.issues.forEach(issue => {
        const card = document.createElement('div');
        card.className = 'ticket-card';
        card.draggable = true;
        card.id = issue.key;
        card.ondragstart = drag;
        
        card.innerHTML = `
            <strong>${issue.key}</strong>
            <p>${issue.fields.summary}</p>
        `;
        
        // By default, place them in queued. You can add logic to place them based on sub-tasks or labels.
        queuedContainer.appendChild(card);
    });
}

// Drag and Drop Logic
function allowDrop(ev) {
    ev.preventDefault(); // Necessary to allow dropping
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

async function drop(ev) {
    ev.preventDefault();
    const issueKey = ev.dataTransfer.getData("text");
    const card = document.getElementById(issueKey);
    
    // Find the closest column the card was dropped into
    const dropZone = ev.target.closest('.column');
    if (!dropZone) return;

    dropZone.querySelector('.ticket-container').appendChild(card);
    
    // Get the Jira transition ID assigned to this column in the HTML data attribute
    const transitionId = dropZone.getAttribute('data-transition-id');
    
    // Send update to Jira via Netlify Function
    await updateJiraTicket(issueKey, transitionId);
}

async function updateJiraTicket(issueKey, transitionId) {
    await fetch('/.netlify/functions/moveTicket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueKey, transitionId })
    });
}