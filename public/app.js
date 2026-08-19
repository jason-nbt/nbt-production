document.addEventListener("DOMContentLoaded", fetchTickets);

async function fetchTickets() {
    const response = await fetch('/.netlify/functions/getTickets');
    const data = await response.json();
    
    if (!data.issues) {
        console.error("Failed to load tickets. The 'issues' array is missing.");
        return; 
    }

    // Inspect the first ticket to find your custom field IDs
    console.log("Look inside this 'fields' object to find the customfield_ IDs for Items 1-3 and Qty 1-3:", data.issues[0].fields);

    const queuedContainer = document.querySelector('#queued .ticket-container');
    queuedContainer.innerHTML = ''; 

    data.issues.forEach(issue => {
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
        
        // Item 1
        if (item1 && qty1) {
            const itemName = item1.value || item1; 
            productionItemsHtml += `<li>${itemName}: <strong>${qty1}</strong></li>`;
        }
        
        // Item 2
        if (item2 && qty2) {
            const itemName = item2.value || item2; 
            productionItemsHtml += `<li>${itemName}: <strong>${qty2}</strong></li>`;
        }

        // Item 3
        if (item3 && qty3) {
            const itemName = item3.value || item3; 
            productionItemsHtml += `<li>${itemName}: <strong>${qty3}</strong></li>`;
        }
        
        productionItemsHtml += '</ul>';

        card.id = key;
        
        card.innerHTML = `
            <strong>${key}</strong>
            <p>${summary}</p>
            <div class="production-items">
                ${productionItemsHtml}
            </div>
        `;
        
        queuedContainer.appendChild(card);
    });
}