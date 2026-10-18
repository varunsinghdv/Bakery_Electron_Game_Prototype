const { ipcRenderer } = require('electron');

// =====================================================

// Audio Logic Layer (Continuous track and sound triggers)

// =====================================================

const bgMusic = new Audio('./assets/music_loop.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.4;

const dragSound = new Audio('./assets/drag_sound.mp3');
dragSound.volume = 0.5;

const cookSound = new Audio('./assets/cook_sound.mp3');
cookSound.volume = 0.6;


// Start continuous ambient audio on first user window interaction 

window.addEventListener('click', () => {
    if (bgMusic.paused) {
        bgMusic.play().catch(err => console.log("Audio waiting on interaction context:", err));
    }
}, { once: true});

//=====================================================

//Screen Router (Window Views state machine)

//=====================================================

// =========================================================================
// 🧭 SCREEN ROUTER (Window Views State Machine - Exposed Globally)
// =========================================================================
window.switchDashboard = function(screenId) {
    // Hide all view panels
    document.querySelectorAll('.game-view').forEach(view => {
        view.style.display = 'none';
    });
    // Render targeted frame panel
    const target = document.getElementById(`${screenId}-screen`);
    if (target) target.style.display = 'block';

    // Refresh core statistics when changing perspectives
    ipcRenderer.send('request-data-sync');
}

// Do the same for your other HTML button functions so they are globally visible:
window.triggerBakeAction = function() {
    ipcRenderer.send('trigger-bake-check');
}

window.triggerCustomerOrder = function(itemType) {
    ipcRenderer.send('customer-order', itemType);
}

window.triggerOrderService = function() {
    ipcRenderer.send('serve-order');
}

window.triggerEndShiftRoutine = function() {
    ipcRenderer.send('end-shift');
}

window.closePaymentModal = function() {
    document.getElementById('payment-modal').style.display = 'none';
    window.switchDashboard('entrance'); // Note the window. prefix here too
}



//=====================================================

//Drag and drop controller (5-Slot grid workspace)

//=====================================================

let activeDraggedIngredientId = null;
let currentTableSlots = [null, null, null, null, null];

//register source item node drag properties

document.querySelectorAll('.draggable-ingredient').forEach(item => {
    item.addEventListener('dragstart', (e) => {
        activeDraggedIngredientId = e.target.id;
        dragSound.currentTime = 0;
        dragSound.play();

    });
});



const dropZones = document.querySelectorAll('.table-drop-zone');

dropZones.forEach(zone => {
    // 1. Fixed parseInt typo
    const slotIndex = parseInt(zone.getAttribute('data-slot'));

    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
    });

    // 2. Fixed dragleave casing
    zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');

        if (activeDraggedIngredientId) {
            currentTableSlots[slotIndex] = activeDraggedIngredientId;

            // 3. Fixed span tag syntax
            // 4. Switched to backticks for template literals
            // 5. Fixed toUpperCase casing
            zone.innerHTML = `<span style="color:#fef3c7; font-weight:bold; font-size:12px;">${activeDraggedIngredientId.toUpperCase()}</span>`;
            
            ipcRenderer.send('update-slots', currentTableSlots);
        } // 6. Correctly closed the if statement and drop event here
    });
});

// =========================================================================
// 🧑‍🍳 ACTION INTERFACE IMPLEMENTATIONS (Baking, Customer, & Shift Routines)
// =========================================================================

function triggerBakeAction() {
    ipcRenderer.send('trigger-bake-check');
}

function triggerCustomerOrder(itemType) {
    ipcRenderer.send('customer-order', itemType);
}

function triggerOrderService() {
    ipcRenderer.send('serve-order');
}

function triggerEndShiftRoutine() {
    ipcRenderer.send('end-shift');
}

function closePaymentModal() {
    document.getElementById('payment-modal').style.display = 'none';
    switchDashboard('entrance');
}

// Show alert confirmation toast
function popSuccessToast(message) {
    const toast = document.getElementById('success-toast');
    document.getElementById('toast-text').innerText = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}


// =========================================================================
// 🔌 DATA SYNCHRONIZATION BRIDGE (IPC Inbound Broadcast Listeners)
// =========================================================================

ipcRenderer.on('data-sync-response', (event, state) => {
    // Update Kitchen HUD Data Nodes
    document.getElementById('days-count').innerText = state.daysCompleted;
    document.getElementById('register-coins').innerText = state.playerCoins;
    document.getElementById('order-queue-count').innerText = state.activeOrders.length;
    
    // Update Pantry Stock Labels
    document.getElementById('pantry-flour').innerText = state.pantry.flour;
    document.getElementById('pantry-sugar').innerText = state.pantry.sugar;
    document.getElementById('pantry-chocolate').innerText = state.pantry.chocolate;
    document.getElementById('pantry-butter').innerText = state.pantry.butter;

    // Update Customer Display Shelves Data Nodes
    document.getElementById('cust-cookie-stock').innerText = state.displayCase.cookie;
    document.getElementById('cust-cake-stock').innerText = state.displayCase.cake;
    document.getElementById('cust-croissant-stock').innerText = state.displayCase.croissant;

    // Update Modal Statement Metrics
    document.getElementById('vault-coins').innerText = state.accumulatedCoins;

    // Sync active local drag array to match persistent server layer
    currentTableSlots = state.tableSlots;
    dropZones.forEach((zone, idx) => {
        if (!currentTableSlots[idx]) {
            zone.innerHTML = ''; // Clear slot if server state is empty
        }
    });
});

// Capture successful bake calculations
ipcRenderer.on('bake-success', (event, product) => {
    cookSound.currentTime = 0;
    cookSound.play();
    
    popSuccessToast(`Successfully baked a delicious ${product}!`);
    ipcRenderer.send('request-data-sync');
});

// Capture invalid recipe errors
ipcRenderer.on('bake-error', (event, errorMessage) => {
    alert(errorMessage); 
});

// Boot Initializer Request
ipcRenderer.send('request-data-sync');


