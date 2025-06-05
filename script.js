document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    let dailySession = {
        active: false, startTime: null, totalEarnings: 0, orders: [], orderIdCounter: 1,
        stats: {
            totalOrders: 0, paid: 0, pending: 0, cancelled: 0,
            cashEarnings: 0, gcashEarnings: 0, cashCount: 0, gcashCount: 0,
        }
    };
    let menuData = { main: [], sides: [] };
    const MENU_STORAGE_KEY = 'iloiloBatchoyPOS_menuData';
    let currentOrderBuilder = {
        type: null, tableNumber: null, items: {},
        isEditingOrderId: null, 
        editMode: null, // null, 'addMore', or 'fullEdit'
        currentStep: null 
    };
    let editingMenuItem = { id: null, type: null };
    let currentOrderFilter = 'all'; // 'all', 'pending', 'paid'
    let confirmationCallback = null; // For custom confirmation modal

    // --- DOM ELEMENTS ---
    const screens = {
        startDay: document.getElementById('screen-start-day'),
        mainApp: document.getElementById('screen-main-app'),
        newOrderType: document.getElementById('screen-new-order-type'),
        tableNumber: document.getElementById('screen-table-number'),
        itemSelection: document.getElementById('screen-item-selection'),
        dailyReport: document.getElementById('screen-daily-report'),
        settings: document.getElementById('screen-settings'),
    };
    const modals = {
        orderDetails: document.getElementById('modal-order-details'),
        paymentMethod: document.getElementById('modal-payment-method'),
        editMenuItem: document.getElementById('modal-edit-menu-item'),
        confirmation: document.getElementById('modal-confirmation'),
    };

    // Buttons & Inputs
    const btnStartDay = document.getElementById('btn-start-day');
    const btnEndDay = document.getElementById('btn-end-day');
    const btnSettings = document.getElementById('btn-settings');
    const btnNewOrder = document.getElementById('btn-new-order');
    const btnViewReport = document.getElementById('btn-view-report');
    const orderTypeButtons = document.querySelectorAll('.order-type-btn');
    const btnCancelOrderCreation = document.getElementById('btn-cancel-order-creation');
    const inputTableNumber = document.getElementById('input-table-number');
    const btnConfirmTableNumber = document.getElementById('btn-confirm-table-number');
    const btnCancelTableNumber = document.getElementById('btn-cancel-table-number');
    const btnItemSelectionNext = document.getElementById('btn-item-selection-next');
    const btnItemSelectionBack = document.getElementById('btn-item-selection-back');
    const btnItemSelectionFinish = document.getElementById('btn-item-selection-finish');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnModalEditOrderItems = document.getElementById('btn-modal-edit-order-items');
    const btnModalAddMore = document.getElementById('btn-modal-add-more');
    const btnModalMarkPaid = document.getElementById('btn-modal-mark-paid');
    const btnModalCancelOrder = document.getElementById('btn-modal-cancel-order');
    const paymentMethodButtons = document.querySelectorAll('.btn-payment');
    const btnCancelPayment = document.getElementById('btn-cancel-payment');
    const btnReportBackToMain = document.getElementById('btn-report-back-to-main');
    const btnExportReport = document.getElementById('btn-export-report');
    const btnSettingsBackToMain = document.getElementById('btn-settings-back-to-main');
    const btnAddMainItem = document.getElementById('btn-add-main-item');
    const btnAddSideItem = document.getElementById('btn-add-side-item');
    const btnCloseEditMenuModal = document.getElementById('btn-close-edit-menu-modal');
    const formEditMenuItem = document.getElementById('form-edit-menu-item');
    const filterButtons = document.querySelectorAll('.btn-filter');
    const btnConfirmAction = document.getElementById('btn-confirm-action');
    const btnCancelAction = document.getElementById('btn-cancel-action');

    // Display Elements
    const dailyEarningsDisplay = document.getElementById('daily-earnings');
    const ordersListContainer = document.getElementById('orders-list-container');
    const noOrdersMessage = document.getElementById('no-orders-message');
    const itemSelectionTitle = document.getElementById('item-selection-title');
    const itemSelectionGrid = document.getElementById('item-selection-grid');
    const detailOrderId = document.getElementById('detail-order-id');
    const detailOrderStatus = document.getElementById('detail-order-status');
    const detailOrderDatetime = document.getElementById('detail-order-datetime');
    const detailOrderTable = document.getElementById('detail-order-table');
    const detailMainItemsList = document.getElementById('detail-main-items-list');
    const detailSideDishesList = document.getElementById('detail-side-dishes-list');
    const detailTotalPrice = document.getElementById('detail-total-price');
    const detailCustomerNote = document.getElementById('detail-customer-note');
    const reportDate = document.getElementById('report-date');
    const reportTotalOrders = document.getElementById('report-total-orders');
    const reportTotalEarnings = document.getElementById('report-total-earnings');
    const reportCashEarnings = document.getElementById('report-cash-earnings');
    const reportGCashEarnings = document.getElementById('report-gcash-earnings');
    const reportCashCount = document.getElementById('report-cash-count');
    const reportGCashCount = document.getElementById('report-gcash-count');
    const reportPaidOrders = document.getElementById('report-paid-orders');
    const reportPendingOrders = document.getElementById('report-pending-orders');
    const reportCancelledOrders = document.getElementById('report-cancelled-orders');
    const mainMenuItemsList = document.getElementById('main-menu-items-list');
    const sideMenuItemsList = document.getElementById('side-menu-items-list');
    const editMenuItemModalTitle = document.getElementById('edit-menu-item-modal-title');
    const editItemIdInput = document.getElementById('edit-item-id');
    const editItemTypeInput = document.getElementById('edit-item-type');
    const editItemNameInput = document.getElementById('edit-item-name');
    const editItemPriceInput = document.getElementById('edit-item-price');
    const confirmationTitle = document.getElementById('confirmation-title');
    const confirmationMessage = document.getElementById('confirmation-message');

    // --- LOCAL STORAGE & SESSION ---
    const SESSION_STORAGE_KEY = 'iloiloBatchoyPOS_session';
    function saveSession() { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(dailySession)); }
    function loadSession() {
        const saved = localStorage.getItem(SESSION_STORAGE_KEY);
        if (saved) {
            const loadedSession = JSON.parse(saved);
            if (loadedSession.active) { 
                dailySession = loadedSession;
                dailySession.stats = { ...{ cashEarnings: 0, gcashEarnings: 0, cashCount: 0, gcashCount: 0 }, ...dailySession.stats };
                return true;
            }
        } return false;
    }
    function clearSessionStorage() { localStorage.removeItem(SESSION_STORAGE_KEY); }
    function loadMenuData() {
        const savedMenu = localStorage.getItem(MENU_STORAGE_KEY);
        if (savedMenu) { menuData = JSON.parse(savedMenu); }
        else {
            menuData = {
                main: [ { id: `main_${Date.now()}_1`, name: 'Sutanghon Batchoy', price: 100 }, { id: `main_${Date.now()}_2`, name: 'Regular Batchoy', price: 75 }, { id: `main_${Date.now()}_3`, name: 'Special Batchoy', price: 95 }],
                sides: [ { id: `side_${Date.now()}_1`, name: 'Boiled Egg', price: 10 }, { id: `side_${Date.now()}_2`, name: 'Chicharon', price: 15 }, { id: `side_${Date.now()}_3`, name: 'Cabbage', price: 5 }, { id: `side_${Date.now()}_4`, name: 'Onion Greens', price: 10 }]
            }; saveMenuData(); 
        }
    }
    function saveMenuData() { localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(menuData)); }

    // --- UI NAVIGATION & MODALS ---
    function showScreen(screenId) { Object.values(screens).forEach(s => s.classList.remove('active')); if (screens[screenId]) screens[screenId].classList.add('active'); }
    function showModal(modalId) { if (modals[modalId]) modals[modalId].classList.add('active'); }
    function closeModal(modalId) { if (modals[modalId]) modals[modalId].classList.remove('active'); }

    function showConfirmationModal(title, message, onConfirm) {
        confirmationTitle.textContent = title;
        confirmationMessage.textContent = message;
        confirmationCallback = onConfirm; // Store the callback
        showModal('confirmation');
    }

    // --- INITIALIZATION ---
    function init() {
        loadMenuData(); 
        if (loadSession()) { startDay(true); } else { showScreen('startDay'); }
        attachEventListeners(); renderMenuForSettings();
    }
    
    // --- DAILY SESSION ---
    function startDay(isContinuingSession = false) {
        if (!isContinuingSession) {
            dailySession = {
                active: true, startTime: new Date().toISOString(), totalEarnings: 0, orders: [], orderIdCounter: 1,
                stats: { totalOrders: 0, paid: 0, pending: 0, cancelled: 0, cashEarnings: 0, gcashEarnings: 0, cashCount: 0, gcashCount: 0 }
            };
        } else { dailySession.active = true; }
        updateDailyEarningsDisplay(); renderOrdersList(); showScreen('mainApp'); saveSession();
    }
    function endDayAction() { // Renamed from endDay to avoid conflict with button ID if any
        dailySession.active = false; dailySession.endTime = new Date().toISOString();
        calculateDailyTotals(); saveSession(); 
        populateDailyReport(); showScreen('dailyReport');
    }
    function populateDailyReport() {
        reportDate.textContent = new Date(dailySession.startTime).toLocaleDateString();
        reportTotalOrders.textContent = dailySession.stats.totalOrders;
        reportTotalEarnings.textContent = `₱${dailySession.totalEarnings.toFixed(2)}`;
        reportCashEarnings.textContent = `₱${dailySession.stats.cashEarnings.toFixed(2)}`;
        reportGCashEarnings.textContent = `₱${dailySession.stats.gcashEarnings.toFixed(2)}`;
        reportCashCount.textContent = dailySession.stats.cashCount;
        reportGCashCount.textContent = dailySession.stats.gcashCount;
        reportPaidOrders.textContent = dailySession.stats.paid;
        reportPendingOrders.textContent = dailySession.stats.pending;
        reportCancelledOrders.textContent = dailySession.stats.cancelled;
    }
    function updateDailyEarningsDisplay() { dailyEarningsDisplay.textContent = `₱${dailySession.totalEarnings.toFixed(2)}`; }
    function calculateDailyTotals() {
        dailySession.totalEarnings = 0;
        dailySession.stats = { ...dailySession.stats, paid: 0, pending: 0, cancelled: 0, cashEarnings: 0, gcashEarnings: 0, cashCount: 0, gcashCount: 0 };
        dailySession.stats.totalOrders = dailySession.orders.length;
        dailySession.orders.forEach(order => {
            if (order.status === 'Paid') {
                dailySession.totalEarnings += order.totalPrice; dailySession.stats.paid++;
                if (order.paymentMethod === 'Cash') { dailySession.stats.cashEarnings += order.totalPrice; dailySession.stats.cashCount++; }
                else if (order.paymentMethod === 'GCash') { dailySession.stats.gcashEarnings += order.totalPrice; dailySession.stats.gcashCount++; }
            } else if (order.status === 'Pending') { dailySession.stats.pending++; }
            else if (order.status === 'Cancelled') { dailySession.stats.cancelled++; }
        });
        updateDailyEarningsDisplay();
    }

    // --- ORDER CREATION & MANAGEMENT ---
    function resetOrderBuilder() {
        currentOrderBuilder = { type: null, tableNumber: null, items: {}, isEditingOrderId: null, editMode: null, currentStep: null };
    }
    function startNewOrder() { resetOrderBuilder(); showScreen('newOrderType'); }
    function handleOrderTypeSelection(type) {
        currentOrderBuilder.type = type;
        if (type === 'dine-in') { inputTableNumber.value = ''; showScreen('tableNumber'); }
        else { currentOrderBuilder.tableNumber = 'Take-out'; proceedToItemSelection('batchoy'); }
    }
    function handleTableNumberConfirm() {
        const tableNum = inputTableNumber.value.trim();
        if (tableNum && !isNaN(tableNum) && parseInt(tableNum) > 0) {
            currentOrderBuilder.tableNumber = `Table ${tableNum}`; proceedToItemSelection('batchoy');
        } else { alert('Please enter a valid table number.'); }
    }

    function proceedToItemSelection(step) { 
        currentOrderBuilder.currentStep = step;
        let titlePrefix = "";
        if(currentOrderBuilder.isEditingOrderId) {
            titlePrefix = currentOrderBuilder.editMode === 'fullEdit' ? `Editing Order #${String(currentOrderBuilder.isEditingOrderId).padStart(4, '0')}` : `Adding to Order #${String(currentOrderBuilder.isEditingOrderId).padStart(4, '0')}`;
            titlePrefix += " - ";
        }
        itemSelectionTitle.textContent = titlePrefix + (step === 'batchoy' ? 'BATCHOY' : 'ADD ONS');
        
        const itemsToDisplay = step === 'batchoy' ? menuData.main : menuData.sides;
        if (itemsToDisplay.length === 0 && step === 'batchoy') {
            alert(`No Batchoy items configured. Please add some in Settings.`);
            showScreen('mainApp'); return;
        }
        if (itemsToDisplay.length === 0 && step === 'addons') { // If no addons, skip to finalize
            finalizeOrder(); return;
        }

        populateItemSelectionGrid(itemsToDisplay, step); 
        
        if (step === 'batchoy') {
            btnItemSelectionNext.textContent = menuData.sides.length > 0 ? 'Add Sides' : 'Review Order';
            btnItemSelectionFinish.style.display = 'inline-flex'; 
        } else { 
            btnItemSelectionNext.textContent = 'Review Order';
            btnItemSelectionFinish.style.display = 'none'; 
        }
        showScreen('itemSelection');
    }

    function populateItemSelectionGrid(items, itemCategory) { 
        itemSelectionGrid.innerHTML = '';
        items.forEach(item => {
            const currentQuantity = currentOrderBuilder.items[item.name]?.quantity || 0;
            const card = document.createElement('div');
            card.className = 'item-card-select';
            const itemTypeAttribute = itemCategory === 'batchoy' ? 'main' : 'side';
            card.innerHTML = `
                <span class="item-name">${item.name}</span>
                <span class="item-price">₱${item.price.toFixed(2)}</span>
                <div class="quantity-controls">
                    <button class="btn-qty minus" data-item-id="${item.id}" data-item-name="${item.name}" data-item-price="${item.price}" data-item-type="${itemTypeAttribute}">-</button>
                    <input type="number" class="item-quantity-input" id="qty-input-${item.id}" value="${currentQuantity}" min="0" data-item-id="${item.id}" data-item-name="${item.name}" data-item-price="${item.price}" data-item-type="${itemTypeAttribute}">
                    <button class="btn-qty plus" data-item-id="${item.id}" data-item-name="${item.name}" data-item-price="${item.price}" data-item-type="${itemTypeAttribute}">+</button>
                </div>
            `;
            itemSelectionGrid.appendChild(card);
        });

        itemSelectionGrid.querySelectorAll('.btn-qty').forEach(btn => btn.addEventListener('click', handleQuantityButtonClick));
        itemSelectionGrid.querySelectorAll('.item-quantity-input').forEach(input => input.addEventListener('change', handleQuantityInputChange));
    }
    
    function updateItemQuantityInBuilder(itemName, newQuantity, itemPrice, itemType, itemId) {
        newQuantity = Math.max(0, parseInt(newQuantity) || 0); // Ensure valid number, min 0
        
        if (newQuantity > 0) {
            currentOrderBuilder.items[itemName] = { quantity: newQuantity, price: itemPrice, type: itemType };
        } else {
            delete currentOrderBuilder.items[itemName];
        }
        // Update the corresponding input field if it wasn't the source of the change
        const inputField = document.getElementById(`qty-input-${itemId}`);
        if (inputField && parseInt(inputField.value) !== newQuantity) {
            inputField.value = newQuantity;
        }
    }

    function handleQuantityButtonClick(event) {
        const button = event.target.closest('.btn-qty');
        const itemId = button.dataset.itemId;
        const inputField = document.getElementById(`qty-input-${itemId}`);
        let currentVal = parseInt(inputField.value) || 0;

        if (button.classList.contains('plus')) {
            currentVal++;
        } else if (button.classList.contains('minus') && currentVal > 0) {
            currentVal--;
        }
        inputField.value = currentVal;
        // Trigger change event to consolidate update logic
        inputField.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function handleQuantityInputChange(event) {
        const inputField = event.target;
        const itemName = inputField.dataset.itemName;
        const itemPrice = parseFloat(inputField.dataset.itemPrice);
        const itemType = inputField.dataset.itemType;
        const itemId = inputField.dataset.itemId;
        let newQuantity = parseInt(inputField.value) || 0;

        if (newQuantity < 0) { // Prevent negative quantities
            newQuantity = 0;
            inputField.value = 0;
        }
        updateItemQuantityInBuilder(itemName, newQuantity, itemPrice, itemType, itemId);
    }
    
    function handleItemSelectionNext() {
        if (currentOrderBuilder.currentStep === 'batchoy') {
            if (menuData.sides.length > 0) { proceedToItemSelection('addons'); }
            else { finalizeOrder(); }
        } else { finalizeOrder(); }
    }

    function handleItemSelectionBack() {
        // Clear items for the current step before going back
        const itemTypeToClear = currentOrderBuilder.currentStep === 'batchoy' ? 'main' : 'side';
        for (const itemName in currentOrderBuilder.items) {
            if (currentOrderBuilder.items[itemName].type === itemTypeToClear) {
                delete currentOrderBuilder.items[itemName];
            }
        }

        if (currentOrderBuilder.currentStep === 'addons') { proceedToItemSelection('batchoy'); }
        else { 
            if (currentOrderBuilder.type === 'dine-in') { showScreen('tableNumber'); }
            else { showScreen('newOrderType'); }
        }
    }

    function finalizeOrder() {
        const orderItems = Object.entries(currentOrderBuilder.items)
            .filter(([, details]) => details.quantity > 0)
            .map(([name, details]) => ({ name, quantity: details.quantity, price: details.price, type: details.type }));

        if (orderItems.length === 0) {
            alert('Please select at least one item.');
            proceedToItemSelection(currentOrderBuilder.currentStep || 'batchoy'); // Stay or go back
            return;
        }

        if (currentOrderBuilder.isEditingOrderId !== null) {
            const order = dailySession.orders.find(o => o.id === currentOrderBuilder.isEditingOrderId);
            if (order) {
                if (currentOrderBuilder.editMode === 'fullEdit') {
                    order.items = orderItems; // Replace all items
                } else { // 'addMore' or if editMode is not explicitly 'fullEdit'
                    orderItems.forEach(newItem => { // Merge/add items
                        const existingItem = order.items.find(item => item.name === newItem.name);
                        if (existingItem) { existingItem.quantity += newItem.quantity; } 
                        else { order.items.push(newItem); }
                    });
                }
                order.totalPrice = calculateOrderTotal(order.items);
                if (modals.orderDetails.classList.contains('active')) closeModal('orderDetails');
                openOrderDetails(order.id); // Re-open to show changes
            }
        } else {
            const newOrder = {
                id: dailySession.orderIdCounter++, type: currentOrderBuilder.type, tableNumber: currentOrderBuilder.tableNumber,
                items: orderItems, totalPrice: calculateOrderTotal(orderItems), status: 'Pending', 
                timestamp: new Date().toISOString(), customerNote: ''
            };
            dailySession.orders.unshift(newOrder); 
            dailySession.stats.totalOrders++; dailySession.stats.pending++;
        }
        renderOrdersList(); calculateDailyTotals(); saveSession();
        resetOrderBuilder(); showScreen('mainApp');
    }
    
    function calculateOrderTotal(items) { return items.reduce((sum, item) => sum + (item.price * item.quantity), 0); }

    function renderOrdersList() {
        ordersListContainer.innerHTML = ''; 
        const filteredOrders = dailySession.orders.filter(order => {
            if (currentOrderFilter === 'all') return true;
            if (currentOrderFilter === 'pending') return order.status === 'Pending';
            if (currentOrderFilter === 'paid') return order.status === 'Paid'; // Could refine to "paid today" if needed
            return true;
        });

        if (filteredOrders.length === 0) {
            noOrdersMessage.textContent = currentOrderFilter === 'all' ? 'No active orders yet.' : `No ${currentOrderFilter} orders.`;
            noOrdersMessage.style.display = 'block'; return;
        }
        noOrdersMessage.style.display = 'none';

        filteredOrders.forEach(order => {
            const card = document.createElement('div');
            card.className = `order-card status-${order.status.toLowerCase()}`; card.dataset.orderId = order.id;
            const orderTime = new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            const orderDate = new Date(order.timestamp).toLocaleDateString([], { year: 'numeric', month: 'numeric', day: 'numeric' });
            const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
            let statusText = order.status;
            if (order.status === 'Paid' && order.paymentMethod) { statusText += ` (${order.paymentMethod})`; }
            card.innerHTML = `
                <div class="order-card-header"><span class="status-badge ${order.status.toLowerCase()}">${statusText}</span><span class="order-id">#${String(order.id).padStart(4, '0')}</span></div>
                <div class="order-card-info"><span>${orderDate}</span><span>${orderTime}</span>${order.type === 'dine-in' ? `<span class="table-chip">${order.tableNumber}</span>` : '<span>Take-out</span>'}</div>
                <div class="order-card-summary">Items: ${itemsCount} | <strong>₱${order.totalPrice.toFixed(2)}</strong></div>`;
            card.addEventListener('click', () => openOrderDetails(order.id));
            ordersListContainer.appendChild(card);
        });
    }
    
    function openOrderDetails(orderId) {
        const order = dailySession.orders.find(o => o.id === orderId); if (!order) return;
        currentOrderBuilder.isEditingOrderId = order.id; 
        detailOrderId.textContent = `Order ID: #${String(order.id).padStart(4, '0')}`;
        let statusText = order.status;
        if (order.status === 'Paid' && order.paymentMethod) { statusText += ` (${order.paymentMethod})`; }
        detailOrderStatus.textContent = statusText; detailOrderStatus.className = `status-badge ${order.status.toLowerCase()}`; 
        detailOrderDatetime.textContent = `${new Date(order.timestamp).toLocaleDateString()} ${new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        detailOrderTable.textContent = order.type === 'dine-in' ? order.tableNumber : 'Take-out';
        detailMainItemsList.innerHTML = ''; detailSideDishesList.innerHTML = '';
        order.items.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `<span>• ${item.name}</span><span>x${item.quantity}</span><span>₱${(item.price * item.quantity).toFixed(2)}</span>`;
            if (item.type === 'main') { detailMainItemsList.appendChild(li); } else { detailSideDishesList.appendChild(li); }
        });
        if (detailMainItemsList.children.length === 0) detailMainItemsList.innerHTML = '<li>No main items.</li>';
        if (detailSideDishesList.children.length === 0) detailSideDishesList.innerHTML = '<li>No side dishes.</li>';
        detailTotalPrice.textContent = `₱${order.totalPrice.toFixed(2)}`;
        detailCustomerNote.value = order.customerNote || '';
        detailCustomerNote.onchange = (e) => { order.customerNote = e.target.value; saveSession(); };

        const isPending = order.status === 'Pending';
        btnModalEditOrderItems.style.display = isPending ? 'block' : 'none';
        btnModalAddMore.style.display = isPending ? 'block' : 'none';
        btnModalMarkPaid.style.display = isPending ? 'block' : 'none';
        btnModalCancelOrder.style.display = isPending ? 'block' : 'none';
        showModal('orderDetails');
    }
    
    function startEditOrderItems() {
        const orderId = currentOrderBuilder.isEditingOrderId; if (orderId === null) return;
        const order = dailySession.orders.find(o => o.id === orderId); if (!order) return;
        resetOrderBuilder(); // Clear previous builder state but keep order context
        currentOrderBuilder.isEditingOrderId = order.id;
        currentOrderBuilder.editMode = 'fullEdit'; // Set mode to full edit
        currentOrderBuilder.type = order.type; // Preserve order type and table
        currentOrderBuilder.tableNumber = order.tableNumber;
        // Pre-populate builder with existing items
        order.items.forEach(item => {
            currentOrderBuilder.items[item.name] = { quantity: item.quantity, price: item.price, type: item.type };
        });
        closeModal('orderDetails');
        proceedToItemSelection('batchoy'); 
    }

    function addMoreItemsToOrder() {
        const orderId = currentOrderBuilder.isEditingOrderId; if (orderId === null) return;
        const order = dailySession.orders.find(o => o.id === orderId); if (!order) return;
        // Don't reset all of currentOrderBuilder, just items part for adding
        currentOrderBuilder.items = {}; 
        currentOrderBuilder.editMode = 'addMore';
        // isEditingOrderId is already set from openOrderDetails
        currentOrderBuilder.type = order.type; // Preserve order type and table
        currentOrderBuilder.tableNumber = order.tableNumber;
        closeModal('orderDetails');
        proceedToItemSelection('batchoy'); 
    }

    let orderToPayId = null; 
    function initiatePayment() {
        orderToPayId = currentOrderBuilder.isEditingOrderId; closeModal('orderDetails'); showModal('paymentMethod'); 
    }
    function processPayment(method) {
        if (orderToPayId === null) return;
        const order = dailySession.orders.find(o => o.id === orderToPayId);
        if (order && order.status === 'Pending') {
            order.status = 'Paid'; order.paymentMethod = method;
            calculateDailyTotals(); renderOrdersList(); saveSession();
            alert(`Order #${String(order.id).padStart(4, '0')} marked as Paid with ${method}.`);
        }
        closeModal('paymentMethod'); orderToPayId = null; currentOrderBuilder.isEditingOrderId = null; 
    }
    function cancelOrderAction() { // Renamed
        const orderId = currentOrderBuilder.isEditingOrderId; if (orderId === null) return;
        const order = dailySession.orders.find(o => o.id === orderId);
        if (order && order.status === 'Pending') {
            order.status = 'Cancelled';
            calculateDailyTotals(); renderOrdersList(); saveSession();
            alert(`Order #${String(order.id).padStart(4, '0')} has been cancelled.`);
        }
        closeModal('orderDetails'); currentOrderBuilder.isEditingOrderId = null;
    }
    function exportDailyReportCSV() {
        let csv = "Order ID,Timestamp,Type,Table/Ref,Status,Payment Method,Total Price,Items (Main),Items (Sides),Customer Note\n";
        dailySession.orders.forEach(o => {
            const main = o.items.filter(i=>i.type==='main').map(i=>`${i.name}(x${i.quantity})`).join('; ');
            const side = o.items.filter(i=>i.type==='side').map(i=>`${i.name}(x${i.quantity})`).join('; ');
            csv += [o.id,new Date(o.timestamp).toLocaleString(),o.type,o.tableNumber||'N/A',o.status,o.paymentMethod||'N/A',o.totalPrice.toFixed(2),`"${main.replace(/"/g,'""')}"`,`"${side.replace(/"/g,'""')}"`,`"${(o.customerNote||'').replace(/"/g,'""')}"`].join(',')+"\n";
        });
        csv += `\nSummary\nDate,${new Date(dailySession.startTime).toLocaleDateString()}\nTotal Orders,${dailySession.stats.totalOrders}\nTotal Earnings,${dailySession.totalEarnings.toFixed(2)}\nCash Earnings,${dailySession.stats.cashEarnings.toFixed(2)}\nCash Order Count,${dailySession.stats.cashCount}\nGCash Earnings,${dailySession.stats.gcashEarnings.toFixed(2)}\nGCash Order Count,${dailySession.stats.gcashCount}\nPaid Orders,${dailySession.stats.paid}\nPending Orders,${dailySession.stats.pending}\nCancelled Orders,${dailySession.stats.cancelled}\n`;
        const link = document.createElement("a"); link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8,"+csv));
        link.setAttribute("download", `IloiloBatchoy_Report_${new Date(dailySession.startTime).toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }

    // --- MENU CRUD ---
    function renderMenuForSettings() {
        mainMenuItemsList.innerHTML = ''; sideMenuItemsList.innerHTML = '';
        menuData.main.forEach(item => mainMenuItemsList.appendChild(createMenuItemEntryDOM(item, 'main')));
        if (menuData.main.length === 0) mainMenuItemsList.innerHTML = '<p>No main menu items.</p>';
        menuData.sides.forEach(item => sideMenuItemsList.appendChild(createMenuItemEntryDOM(item, 'side')));
        if (menuData.sides.length === 0) sideMenuItemsList.innerHTML = '<p>No side dishes.</p>';
    }
    function createMenuItemEntryDOM(item, type) {
        const div = document.createElement('div'); div.className = 'menu-item-entry';
        div.innerHTML = `<div class="menu-item-info"><span class="name">${item.name}</span><span class="price">₱${item.price.toFixed(2)}</span></div><div class="menu-item-actions"><button class="btn btn-edit-item" data-id="${item.id}" data-type="${type}"><i class="fas fa-edit"></i></button><button class="btn btn-delete-item" data-id="${item.id}" data-type="${type}"><i class="fas fa-trash"></i></button></div>`;
        div.querySelector('.btn-edit-item').addEventListener('click', () => openEditMenuItemModal(type, item.id));
        div.querySelector('.btn-delete-item').addEventListener('click', () => deleteMenuItem(type, item.id));
        return div;
    }
    function openEditMenuItemModal(type, itemId = null) {
        editingMenuItem.type = type; editingMenuItem.id = itemId; formEditMenuItem.reset();
        if (itemId) {
            const item = menuData[type].find(i => i.id === itemId); if (!item) return;
            editMenuItemModalTitle.textContent = `Edit ${type==='main'?'Batchoy':'Side Dish'}`;
            editItemIdInput.value = item.id; editItemNameInput.value = item.name; editItemPriceInput.value = item.price;
        } else { editMenuItemModalTitle.textContent = `Add New ${type==='main'?'Batchoy':'Side Dish'}`; editItemIdInput.value = ''; }
        editItemTypeInput.value = type; showModal('editMenuItem');
    }
    formEditMenuItem.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = editItemIdInput.value, type = editItemTypeInput.value, name = editItemNameInput.value.trim(), price = parseFloat(editItemPriceInput.value);
        if (!name || isNaN(price) || price < 0) { alert('Valid name and price required.'); return; }
        if (id) { const idx = menuData[type].findIndex(i=>i.id===id); if(idx>-1) menuData[type][idx]={...menuData[type][idx],name,price};}
        else { menuData[type].push({id:`${type}_${Date.now()}`,name,price});}
        saveMenuData(); renderMenuForSettings(); closeModal('editMenuItem');
    });
    function deleteMenuItem(type, itemId) {
        showConfirmationModal(
            `Delete Item`,
            `Are you sure you want to delete this ${type === 'main' ? 'menu' : 'side dish'} item? This cannot be undone.`,
            () => {
                menuData[type] = menuData[type].filter(item => item.id !== itemId);
                saveMenuData(); renderMenuForSettings();
                closeModal('confirmation'); // Close confirmation after action
            }
        );
    }

    // --- EVENT LISTENERS ---
    function attachEventListeners() {
        btnStartDay.addEventListener('click', () => { clearSessionStorage(); startDay(); });
        btnEndDay.addEventListener('click', () => showConfirmationModal('End Day', 'Are you sure you want to end the day?', endDayAction));
        btnSettings.addEventListener('click', () => showScreen('settings'));
        btnNewOrder.addEventListener('click', startNewOrder);
        btnViewReport.addEventListener('click', () => {
             if (!dailySession.active && dailySession.startTime) { populateDailyReport(); showScreen('dailyReport'); }
             else if (dailySession.active) { alert("End day first to view final report."); }
             else { alert("No session data. Start a day."); }
        });
        orderTypeButtons.forEach(btn => btn.addEventListener('click', () => handleOrderTypeSelection(btn.dataset.type)));
        btnCancelOrderCreation.addEventListener('click', () => showScreen('mainApp'));
        btnConfirmTableNumber.addEventListener('click', handleTableNumberConfirm);
        btnCancelTableNumber.addEventListener('click', () => showScreen('newOrderType'));
        btnItemSelectionNext.addEventListener('click', handleItemSelectionNext);
        btnItemSelectionBack.addEventListener('click', handleItemSelectionBack);
        btnItemSelectionFinish.addEventListener('click', finalizeOrder);
        btnCloseModal.addEventListener('click', () => { closeModal('orderDetails'); currentOrderBuilder.isEditingOrderId = null; });
        btnModalEditOrderItems.addEventListener('click', startEditOrderItems);
        btnModalAddMore.addEventListener('click', addMoreItemsToOrder);
        btnModalMarkPaid.addEventListener('click', initiatePayment); 
        btnModalCancelOrder.addEventListener('click', () => showConfirmationModal('Cancel Order', `Cancel Order #${String(currentOrderBuilder.isEditingOrderId).padStart(4, '0')}?`, cancelOrderAction));
        paymentMethodButtons.forEach(btn => btn.addEventListener('click', () => processPayment(btn.dataset.method)));
        btnCancelPayment.addEventListener('click', () => { closeModal('paymentMethod'); orderToPayId = null; });
        btnReportBackToMain.addEventListener('click', () => { if (dailySession.active) showScreen('mainApp'); else showScreen('startDay'); });
        btnExportReport.addEventListener('click', exportDailyReportCSV);
        btnSettingsBackToMain.addEventListener('click', () => showScreen('mainApp'));
        btnAddMainItem.addEventListener('click', () => openEditMenuItemModal('main'));
        btnAddSideItem.addEventListener('click', () => openEditMenuItemModal('side'));
        btnCloseEditMenuModal.addEventListener('click', () => closeModal('editMenuItem'));
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                currentOrderFilter = button.dataset.filter;
                renderOrdersList();
            });
        });
        btnConfirmAction.addEventListener('click', () => {
            if (typeof confirmationCallback === 'function') {
                confirmationCallback();
            }
            confirmationCallback = null; // Reset callback
            closeModal('confirmation');
        });
        btnCancelAction.addEventListener('click', () => {
            confirmationCallback = null; // Reset callback
            closeModal('confirmation');
        });
    }
    init();
});