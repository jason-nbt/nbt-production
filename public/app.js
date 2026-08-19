document.addEventListener("DOMContentLoaded", fetchTickets);

// Check if current user has an active admin session
const isAdmin = sessionStorage.getItem('isAdmin') === 'true';

async function fetchTickets() {
    const response = await fetch('/.netlify/functions/getTickets');
    const data = await response.json();
    
    if (!data.issues) {
        console.error("Failed to load tickets. The 'issues' array is missing.");
        return; 
    }

    const containers = {
        'queued': document.querySelector('#queued .ticket-container'),
        'in-production': document.querySelector('#in-production .ticket-container'),
        'produced': document.querySelector('#produced .ticket-container')
    };

    Object.values(containers).forEach(container => container.innerHTML = '');
    document.querySelectorAll('.column-totals').forEach(el => el.innerHTML = '');

    const totals = { 'queued': {}, 'in-production': {}, 'produced': {} };

    function tallyItem(columnId, itemField, qtyField) {
        if (itemField && qtyField) {
            const itemName = itemField.value || itemField;
            const quantity = parseInt(qtyField, 10) || 0; 
            
            if (!totals[columnId][itemName]) totals[columnId][itemName] = 0;
            totals[columnId][itemName] += quantity;
            
            return `<li>${itemName}: <strong>${qtyField}</strong></li>`;
        }
        return '';
    }

    data.issues.forEach(issue => {
        const key = issue.key || issue.id;
        
        // Check local storage to see if ticket was manually moved to "in-production"
        const columnId = localStorage.getItem(`status_${key}`) || 'queued'; 

        const card = document.createElement('div');
        card.className = 'ticket-card';
        
        // Enable dragging only if user is logged in as admin
        card.draggable = isAdmin;
        card.ondragstart = drag;
        
        const summary = issue.fields?.summary || 'No Summary Provided';
        const item1 = issue.fields.customfield_10215; 
        const qty1  = issue.fields.customfield_10216;
        const item2 = issue.fields.customfield_10217;
        const qty2  = issue.fields.customfield_10219;
        const item3 = issue.fields.customfield_10220; 
        const qty3  = issue.fields.customfield_10218;
        
        let productionItemsHtml = '<ul>';
        productionItemsHtml += tallyItem(columnId, item1, qty1);
        productionItemsHtml += tallyItem(columnId, item2, qty2);
        productionItemsHtml += tallyItem(columnId, item3, qty3);
        productionItemsHtml += '</ul>';

        card.id = key;
        card.innerHTML = `
            <strong>${key}</strong>
            <p>${summary}</p>
            <div class="production-items">${productionItemsHtml}</div>
        `;
        
        containers[columnId].appendChild(card);
    });

    Object.keys(totals).forEach(colId => {
        const totalDiv = document.querySelector(`#${colId} .column-totals`);
        const columnTotals = totals[colId];
        
        if (Object.keys(columnTotals).length === 0) return; 

        let totalsHtml = '<div class="totals-header">Total Required</div><ul>';
        for (const [itemName, totalQty] of Object.entries(columnTotals)) {
            totalsHtml += `<li>${itemName}: <strong>${totalQty}</strong></li>`;
        }
        totalsHtml += '</ul><hr>';
        
        totalDiv.innerHTML = totalsHtml;
    });

    // Update login button text based on status
    const loginBtn = document.getElementById('loginBtn');
    if(loginBtn) {
        loginBtn.textContent = isAdmin ? "Logout" : "Admin Login";
    }
}

// --- Auth & Drag/Drop Functions ---

function adminLogin() {
    if (isAdmin) {
        sessionStorage.removeItem('isAdmin'); // Logout
        location.reload();
        return;
    }

    const pw = prompt("Enter Admin Password:");
    if (pw === "ilovenbt") {
        sessionStorage.setItem('isAdmin', 'true');
        location.reload(); // Refresh to enable drag-and-drop
    } else if (pw) {
        alert("Incorrect password.");
    }
}

function allowDrop(ev) {
    if (isAdmin) ev.preventDefault();
}

function drag(ev) {
    if (isAdmin) ev.dataTransfer.setData("text", ev.target.id);
}

async function drop(ev) {
    ev.preventDefault();
    const issueKey = ev.dataTransfer.getData("text");
    const dropZone = ev.target.closest('.column');
    if (!dropZone) return;

    // Moving between Queued and In Production (Local State Only)
    if (dropZone.id === 'in-production' || dropZone.id === 'queued') {
        localStorage.setItem(`status_${issueKey}`, dropZone.id);
        location.reload(); // Instantly refresh to re-calculate top totals
    }

    // Dropping into Produced (Triggers Jira API)
    if (dropZone.id === 'produced') {
        const transitionId = dropZone.getAttribute('data-transition-id');
        
        // Ensure transition ID is set before calling API
        if (!transitionId || transitionId === "YOUR_TRANSITION_ID") {
            alert("Error: Please set your Jira transition ID in index.html");
            return;
        }

        // Optimistic UI Update while API calls
        dropZone.querySelector('.ticket-container').appendChild(document.getElementById(issueKey));
        
        try {
            await fetch('/.netlify/functions/moveTicket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ issueKey, transitionId })
            });
            
            // Clean up local storage and reload to grab fresh Jira data
            localStorage.removeItem(`status_${issueKey}`);
            location.reload(); 
        } catch (err) {
            alert("Failed to update Jira ticket status.");
        }
    }
}