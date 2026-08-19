document.addEventListener("DOMContentLoaded", fetchTickets);

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

    // Clear existing tickets and totals
    Object.values(containers).forEach(container => container.innerHTML = '');
    document.querySelectorAll('.column-totals').forEach(el => el.innerHTML = '');

    // Object to hold our running tallies
    const totals = {
        'queued': {},
        'in-production': {},
        'produced': {}
    };

    // Helper function to tally up items safely
    function tallyItem(columnId, itemField, qtyField) {
        if (itemField && qtyField) {
            const itemName = itemField.value || itemField;
            const quantity = parseInt(qtyField, 10) || 0; // Convert string to integer
            
            if (!totals[columnId][itemName]) {
                totals[columnId][itemName] = 0;
            }
            totals[columnId][itemName] += quantity;
            
            return `<li>${itemName}: <strong>${qtyField}</strong></li>`;
        }
        return '';
    }

    data.issues.forEach(issue => {
        // NOTE: Determine which column this ticket belongs to. 
        // Assuming 'queued' by default unless you map Jira sub-statuses later.
        const columnId = 'queued'; 

        const card = document.createElement('div');
        card.className = 'ticket-card';
        
        const key = issue.key || issue.id;
        const summary = issue.fields?.summary || 'No Summary Provided';

        // --- REPLACE THESE IDs ONCE YOU FIND THEM IN THE CONSOLE ---
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
            <div class="production-items">
                ${productionItemsHtml}
            </div>
        `;
        
        containers[columnId].appendChild(card);
    });

    // Render the final totals into the UI
    Object.keys(totals).forEach(colId => {
        const totalDiv = document.querySelector(`#${colId} .column-totals`);
        const columnTotals = totals[colId];
        
        if (Object.keys(columnTotals).length === 0) return; // Skip if empty

        let totalsHtml = '<div class="totals-header">Total Required</div><ul>';
        for (const [itemName, totalQty] of Object.entries(columnTotals)) {
            totalsHtml += `<li>${itemName}: <strong>${totalQty}</strong></li>`;
        }
        totalsHtml += '</ul><hr>';
        
        totalDiv.innerHTML = totalsHtml;
    });
}