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
	
	// --- NEW SORTING LOGIC ---
    // Sort issues in ascending numerical order based on their ID
    data.issues.sort((a, b) => {
        const keyA = a.key || a.id;
        const keyB = b.key || b.id;
        
        // Strip out the prefix letters (e.g., "NE-") and convert to integers
        const numA = parseInt(keyA.replace(/\D/g, ''), 10);
        const numB = parseInt(keyB.replace(/\D/g, ''), 10);
        
        return numA - numB; // Ascending order
    });
    // -------------------------

    const containers = {
        'queued': document.querySelector('#queued .ticket-container'),
        'in-production': document.querySelector('#in-production .ticket-container'),
        'produced': document.querySelector('#produced .ticket-container')
    };

    Object.values(containers).forEach(container => container.innerHTML = '');
    document.querySelectorAll('.column-totals').forEach(el => el.innerHTML = '');

    // --- UPDATED TOTALS STRUCTURE ---
    // Now tracking individual items AND the combined Bitumen MT
    const totals = { 
        'queued': { items: {}, bitumenMT: 0 }, 
        'in-production': { items: {}, bitumenMT: 0 }, 
        'produced': { items: {}, bitumenMT: 0 } 
    };
	
	// Note: Order matters here. "RS-1K (50%)" must be checked before "RS-1K"
    const bitumenRates = [
        { name: 'RS-1K (50%)', pct: 0.50 },
        { name: 'RS-1K', pct: 0.43 },
        { name: 'RS-3K', pct: 0.60 },
        { name: 'K1-40', pct: 0.35 },
        { name: 'SS-1K', pct: 0.53 },
        { name: 'Neomad', pct: 0.57 }
    ];

    function getBitumenMT(itemName, quantity) {
        let percentage = 0;
        
        for (const rate of bitumenRates) {
            if (itemName.includes(rate.name)) {
                percentage = rate.pct;
                break;
            }
        }
        if (percentage === 0) return 0; // Fallback if no match

        // If it's a drum, convert to MT first (1 MT = 5.2 Drums)
        const isDrum = itemName.toLowerCase().includes('drum');
        const emulsionMT = isDrum ? (quantity / 5.2) : quantity;

        // Multiply total emulsion MT by the bitumen percentage
        return emulsionMT * percentage;
    }

    function tallyItem(columnId, itemField, qtyField) {
        if (itemField && qtyField) {
            const itemName = itemField.value || itemField;
            const quantity = parseInt(qtyField, 10) || 0; 
            
            // Tally physical quantity
            if (!totals[columnId].items[itemName]) {
                totals[columnId].items[itemName] = 0;
            }
            totals[columnId].items[itemName] += quantity;
            
            // Calculate and add Bitumen MT
            totals[columnId].bitumenMT += getBitumenMT(itemName, quantity);
            
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
        // Use consistent variable naming (columnData)
        const columnData = totals[colId]; 
        
        // Check if the actual items list is empty, not the parent object
        if (Object.keys(columnData.items).length === 0) return; 

        let totalsHtml = '<div class="totals-header">Total Required</div><ul>';
        
        // Loop through the regular items
        for (const [itemName, totalQty] of Object.entries(columnData.items)) {
            totalsHtml += `<li>${itemName}: <strong>${totalQty}</strong></li>`;
        }
        
        // Append the Final Bitumen MT
        totalsHtml += `<li class="bitumen-total">Bitumen Req: <strong>${columnData.bitumenMT.toFixed(2)} MT</strong></li>`;
        
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