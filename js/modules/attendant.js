/**
 * Attendant Module
 * 6-Step Swap Flow Logic
 * Omnivoltaic Station App
 */

// =====================
// Attendant Module (6-Step Flow)
// =====================
let attCurrentScreen = 1;
let attHighestReached = 1; // Tracks furthest step reached for navigation

// State storage for each step's data
let attFlowData = {
    customer: null,
    oldBattery: null,
    newBattery: null,
    cost: null,
    payment: null
};

const attScreenConfig = {
    1: { btnText: 'Scan Customer', btnIcon: 'qr', showBack: false },
    2: { btnText: 'Scan Old Battery', btnIcon: 'scan', showBack: true },
    3: { btnText: 'Scan New Battery', btnIcon: 'scan', showBack: true },
    4: { btnText: 'Collect Payment', btnIcon: 'arrow', showBack: true },
    5: { btnText: 'Confirm Payment', btnIcon: 'qr', showBack: true },
    6: { btnText: 'New Swap', btnIcon: 'plus', showBack: false, btnClass: 'btn-success' }
};

const attIcons = {
    scan: `<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h.01M7 12h.01M7 17h.01M12 7h.01M12 12h.01M12 17h.01M17 7h.01M17 12h.01M17 17h.01"/>`,
    arrow: `<path d="M5 12h14M12 5l7 7-7 7"/>`,
    qr: `<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>`,
    plus: `<path d="M12 5v14M5 12h14"/>`
};

// Update the interactive timeline visual state
function attUpdateTimeline(screenNum) {
    const timeline = document.getElementById('att-timeline');
    if (!timeline) return;
    
    const steps = timeline.querySelectorAll('.timeline-step');
    const connectors = timeline.querySelectorAll('.timeline-connector');
    
    steps.forEach((step, index) => {
        const stepNum = index + 1;
        step.classList.remove('active', 'completed', 'disabled', 'success');
        
        if (stepNum < screenNum) {
            // Completed steps
            step.classList.add('completed');
        } else if (stepNum === screenNum) {
            // Current step
            if (screenNum === 6) {
                step.classList.add('success');
            } else {
                step.classList.add('active');
            }
        } else if (stepNum <= attHighestReached) {
            // Can navigate to (previously visited)
            step.classList.add('completed');
        } else {
            // Not yet reachable
            step.classList.add('disabled');
        }
    });
    
    // Update connectors
    connectors.forEach((connector, index) => {
        const afterStep = index + 1;
        connector.classList.remove('completed');
        if (afterStep < screenNum || afterStep < attHighestReached) {
            connector.classList.add('completed');
        }
    });
    
    // Scroll active step into view on mobile
    const activeStep = timeline.querySelector('.timeline-step.active, .timeline-step.success');
    if (activeStep) {
        setTimeout(() => {
            activeStep.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 100);
    }
    
    // Check if timeline can scroll (for scroll hint)
    checkTimelineScroll();
}

function checkTimelineScroll() {
    const timeline = document.getElementById('att-timeline');
    if (!timeline) return;
    const track = timeline.querySelector('.timeline-track');
    if (track && track.scrollWidth > timeline.clientWidth) {
        timeline.classList.add('can-scroll');
    } else {
        timeline.classList.remove('can-scroll');
    }
}

// Handle timeline step clicks for navigation
function attTimelineClick(stepNum) {
    // Can only navigate to completed steps or current step
    if (stepNum > attHighestReached) return;
    if (stepNum === attCurrentScreen) return;
    
    // Navigate to the step
    attGoToScreen(stepNum, true);
}

function attGoToScreen(screenNum, isNavigation = false) {
    const module = document.getElementById('module-attendant');
    module.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`att-screen-${attGetScreenName(screenNum)}`).classList.add('active');
    
    // Update highest reached (only when progressing forward, not navigating back)
    if (screenNum > attHighestReached && !isNavigation) {
        attHighestReached = screenNum;
    }
    
    // Update session current step
    SessionManager.updateCurrentStep(screenNum);
    
    // Update the interactive timeline
    attUpdateTimeline(screenNum);
    
    // Toggle customer state panel visibility (visible on screens 2-5)
    toggleCustomerStatePanel(screenNum);
    
    const config = attScreenConfig[screenNum];
    document.getElementById('att-btn-text').textContent = config.btnText;
    document.getElementById('att-btn-icon').innerHTML = attIcons[config.btnIcon];
    
    const btnBack = document.getElementById('att-btn-back');
    const btnMain = document.getElementById('att-btn-main');
    
    if (config.showBack) btnBack.classList.remove('hidden');
    else btnBack.classList.add('hidden');
    
    btnMain.className = 'btn ' + (config.btnClass || 'btn-primary');
    attCurrentScreen = screenNum;
    
    // Restore data for the screen if navigating back
    if (isNavigation) {
        attRestoreScreenData(screenNum);
    }
}

function attGetScreenName(num) {
    return { 
        1: 'customer',    // Scan Customer QR
        2: 'oldbattery',  // Scan Old Battery
        3: 'newbattery',  // Scan New Battery
        4: 'review',      // Review & Cost
        5: 'payment',     // Confirm Payment
        6: 'success'      // Complete
    }[num];
}

// Save data for current step
function attSaveStepData(step, data) {
    const dataKeys = ['', 'customer', 'oldBattery', 'newBattery', 'cost', 'payment'];
    if (dataKeys[step]) {
        attFlowData[dataKeys[step]] = data;
    }
    // Also save to SessionManager
    SessionManager.updateStepData(step, data);
}

// Restore data when navigating back to a step
function attRestoreScreenData(screenNum) {
    // Data is preserved in the DOM already for this demo
    // In a real app, you would repopulate form fields here
    // For now, the simulated data stays intact
}

// Reset flow when starting a new swap
function attResetFlow() {
    attHighestReached = 1;
    attFlowData = {
        customer: null,
        oldBattery: null,
        newBattery: null,
        cost: null,
        payment: null
    };
    // Reset manual entry fields
    document.getElementById('subscriptionId').value = '';
    document.getElementById('paymentId').value = '';
    // Reset to scan mode for both customer and payment
    toggleCustomerInput('scan');
    togglePaymentInput('scan');
    // Reset service plan data
    currentServicePlan = null;
    // Hide customer state panel when starting fresh
    hideCustomerStatePanel();
}

// Toggle between Scan QR and Manual Entry for Customer
function toggleCustomerInput(mode) {
    const scanMode = document.getElementById('customer-scan-mode');
    const manualMode = document.getElementById('customer-manual-mode');
    const toggleScan = document.getElementById('toggle-scan');
    const toggleManual = document.getElementById('toggle-manual');
    
    if (mode === 'scan') {
        scanMode.classList.remove('hidden');
        manualMode.classList.add('hidden');
        toggleScan.classList.add('active');
        toggleManual.classList.remove('active');
    } else {
        scanMode.classList.add('hidden');
        manualMode.classList.remove('hidden');
        toggleScan.classList.remove('active');
        toggleManual.classList.add('active');
        // Focus the input field
        setTimeout(() => document.getElementById('subscriptionId').focus(), 100);
    }
}

// Toggle between Scan QR and Manual Entry for Payment
function togglePaymentInput(mode) {
    const scanMode = document.getElementById('payment-scan-mode');
    const manualMode = document.getElementById('payment-manual-mode');
    const toggleScan = document.getElementById('toggle-payment-scan');
    const toggleManual = document.getElementById('toggle-payment-manual');
    
    if (mode === 'scan') {
        scanMode.classList.remove('hidden');
        manualMode.classList.add('hidden');
        toggleScan.classList.add('active');
        toggleManual.classList.remove('active');
    } else {
        scanMode.classList.add('hidden');
        manualMode.classList.remove('hidden');
        toggleScan.classList.remove('active');
        toggleManual.classList.add('active');
        // Focus the input field
        setTimeout(() => document.getElementById('paymentId').focus(), 100);
    }
}

// Confirm payment by manual ID entry
function attLookupPayment() {
    const paymentId = document.getElementById('paymentId').value.trim();
    if (!paymentId) {
        document.getElementById('paymentId').focus();
        return;
    }
    showLoading('Confirming payment...');
    // Save payment data
    attSaveStepData(5, {
        confirmed: true,
        txnId: paymentId.toUpperCase(),
        method: 'manual',
        timestamp: new Date().toISOString()
    });
    setTimeout(() => { hideLoading(); attGoToScreen(6); }, 1200);
}

// ===========================================
// Service Plan Display - Smart Quota Filtering
// ===========================================

// Simulated service plan data (would come from API in production)
let currentServicePlan = null;

// Filter services to only show meaningful consumption-based quotas
function getDisplayableServices(serviceStates) {
    if (!serviceStates || !Array.isArray(serviceStates)) return [];
    
    return serviceStates.filter(service => {
        // Skip access-based services with huge/unlimited quotas
        if (service.quota >= 1000000) return false;
        
        // Skip services with no quota tracking
        if (service.quota <= 0) return false;
        
        // Only keep consumption-based services (electricity, swap-count)
        const id = service.service_id?.toLowerCase() || '';
        return id.includes('electricity') || id.includes('swap-count');
    });
}

// Determine status color based on usage percentage
function getQuotaStatus(used, quota) {
    const usedPercent = (used / quota) * 100;
    if (usedPercent >= 90) return 'critical';
    if (usedPercent >= 70) return 'warning';
    return 'good';
}

// Update service plan data (now handled by customer state panel)
function updateServicePlanDisplay(servicePlanData) {
    if (!servicePlanData) return;
    currentServicePlan = servicePlanData;
    // All display is now handled by the pinned customer state panel
}

// ===========================================
// Customer State Panel - Sticky Summary
// ===========================================

// Show/hide the customer state panel based on current screen
function toggleCustomerStatePanel(screenNum) {
    const panel = document.getElementById('att-customer-state');
    const quotas = document.getElementById('state-quotas');
    if (!panel) return;
    
    // Show panel on screens 2-5 (after customer ID, before success)
    // Hide on screen 1 (identification) and screen 6 (success/complete)
    if (screenNum >= 2 && screenNum <= 5) {
        panel.classList.add('visible');
        if (quotas) quotas.classList.add('visible');
    } else {
        panel.classList.remove('visible');
        if (quotas) quotas.classList.remove('visible');
    }
}

// Populate the customer state panel with service plan data
function updateCustomerStatePanel(servicePlanData, customerData) {
    if (!servicePlanData) return;
    
    // Customer identity
    const avatar = document.getElementById('state-avatar');
    const customerName = document.getElementById('state-customer-name');
    const planName = document.getElementById('state-plan-name');
    const statusBadge = document.getElementById('state-status-badge');
    const paymentBadge = document.getElementById('state-payment-badge');
    
    // Set customer name and avatar
    if (customerData) {
        if (avatar) avatar.textContent = customerData.initials || 'CU';
        if (customerName) customerName.textContent = customerData.name || 'Customer';
    }
    
    // Extract plan name from template ID
    const templateId = servicePlanData.templateId || servicePlanData.servicePlanId || '';
    let displayPlanName = '7-Day Plan';
    if (templateId.includes('7day')) displayPlanName = '7-Day Lux';
    else if (templateId.includes('30day') || templateId.includes('month')) displayPlanName = '30-Day Plan';
    else if (templateId.includes('pay-per') || templateId.includes('payper')) displayPlanName = 'Pay-Per-Swap';
    if (planName) planName.textContent = displayPlanName;
    
    // Status badge
    if (statusBadge) {
        const status = servicePlanData.status || 'ACTIVE';
        statusBadge.textContent = status.charAt(0) + status.slice(1).toLowerCase();
        statusBadge.className = 'state-badge ' + status.toLowerCase();
    }
    
    // Payment state badge
    if (paymentBadge) {
        const paymentState = servicePlanData.paymentState || 'CURRENT';
        paymentBadge.textContent = paymentState.charAt(0) + paymentState.slice(1).toLowerCase();
        paymentBadge.className = 'state-badge ' + paymentState.toLowerCase();
    }
    
    // Current battery from service states
    const batteryContainer = document.getElementById('state-current-battery');
    const batteryId = document.getElementById('state-battery-id');
    const serviceStates = servicePlanData.serviceStates || [];
    
    // Find battery fleet service to get current asset
    const batteryService = serviceStates.find(s => 
        s.service_id?.toLowerCase().includes('battery-fleet') && s.current_asset
    );
    
    if (batteryService && batteryService.current_asset && batteryContainer) {
        const assetId = batteryService.current_asset;
        // Format battery ID for display (show last part)
        const shortId = assetId.includes('_') ? assetId.split('_').pop() : assetId.slice(-6);
        if (batteryId) batteryId.textContent = `BAT_${shortId}`;
        batteryContainer.style.display = 'flex';
    } else if (batteryContainer) {
        batteryContainer.style.display = 'none';
    }
    
    // Update quota displays
    const displayableServices = getDisplayableServices(serviceStates);
    let energyService = null;
    let swapService = null;
    
    displayableServices.forEach(service => {
        const id = service.service_id?.toLowerCase() || '';
        if (id.includes('electricity')) energyService = service;
        else if (id.includes('swap-count')) swapService = service;
    });
    
    // Energy quota
    const energyQuotaItem = document.getElementById('state-quota-energy');
    const energyRemaining = document.getElementById('state-energy-remaining');
    const energyFill = document.getElementById('state-energy-fill');
    
    if (energyService && energyQuotaItem) {
        const remaining = energyService.quota - energyService.used;
        const usedPercent = (energyService.used / energyService.quota) * 100;
        const status = getQuotaStatus(energyService.used, energyService.quota);
        
        if (energyRemaining) energyRemaining.textContent = remaining;
        if (energyFill) {
            energyFill.style.width = usedPercent + '%';
            energyFill.className = 'state-quota-fill ' + status;
        }
        energyQuotaItem.style.display = 'flex';
    } else if (energyQuotaItem) {
        energyQuotaItem.style.display = 'none';
    }
    
    // Swaps quota
    const swapsQuotaItem = document.getElementById('state-quota-swaps');
    const swapsRemaining = document.getElementById('state-swaps-remaining');
    const swapsFill = document.getElementById('state-swaps-fill');
    
    if (swapService && swapsQuotaItem) {
        const remaining = swapService.quota - swapService.used;
        const usedPercent = (swapService.used / swapService.quota) * 100;
        const status = getQuotaStatus(swapService.used, swapService.quota);
        
        if (swapsRemaining) swapsRemaining.textContent = remaining;
        if (swapsFill) {
            swapsFill.style.width = usedPercent + '%';
            swapsFill.className = 'state-quota-fill ' + status;
        }
        swapsQuotaItem.style.display = 'flex';
    } else if (swapsQuotaItem) {
        swapsQuotaItem.style.display = 'none';
    }
    
    // Note: quotas container visibility is handled by toggleCustomerStatePanel()
    // Individual quota items are hidden/shown based on service availability above
}

// Hide customer state panel (for reset)
function hideCustomerStatePanel() {
    const panel = document.getElementById('att-customer-state');
    const quotas = document.getElementById('state-quotas');
    if (panel) panel.classList.remove('visible');
    if (quotas) quotas.classList.remove('visible');
}

// Simulated API response data for demo
const mockServicePlanData = {
    servicePlanId: "bss-plan-togo-7day-lux-plan3",
    customerId: "customer-togo-002",
    status: "ACTIVE",
    serviceState: "BATTERY_ISSUED",
    paymentState: "CURRENT",
    templateId: "template-togo-lome-7day-lux-v2",
    serviceStates: [
        { service_id: "service-swap-station-network-togo-lux", used: 0, quota: 10000000, current_asset: null },
        { service_id: "service-battery-fleet-togo-lux", used: 0, quota: 10000000, current_asset: "BAT_NEW_004" },
        { service_id: "service-electricity-togo-lux", used: 8, quota: 70, current_asset: null },
        { service_id: "service-swap-count-togo-lux", used: 3, quota: 21, current_asset: null }
    ]
};

// Step 1a: Scan customer QR
function attScanCustomer() {
    showLoading('Identifying customer...');
    // Simulated subscription ID from QR code
    const subscriptionId = 'SUB-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    // Save customer data
    const customerData = {
        id: 'CUS-8847-KE',
        subscriptionId: subscriptionId,
        name: 'James Mwangi',
        initials: 'JM',
        plan: '7-Day Lux'
    };
    attSaveStepData(1, customerData);
    
    // Update service plan display with mock data (would be from API in production)
    updateServicePlanDisplay(mockServicePlanData);
    
    // Update the sticky customer state panel
    updateCustomerStatePanel(mockServicePlanData, customerData);
    
    setTimeout(() => { hideLoading(); attGoToScreen(2); }, 1200);
}

// Step 1b: Manual lookup by Subscription ID
function attLookupCustomer() {
    const subId = document.getElementById('subscriptionId').value.trim();
    if (!subId) {
        document.getElementById('subscriptionId').focus();
        return;
    }
    showLoading('Looking up customer...');
    // Save customer data with subscription ID
    const customerData = {
        id: 'CUS-8847-KE',
        subscriptionId: subId,
        name: 'James Mwangi',
        initials: 'JM',
        plan: '7-Day Lux'
    };
    attSaveStepData(1, customerData);
    
    // Update service plan display with mock data (would be from API in production)
    updateServicePlanDisplay(mockServicePlanData);
    
    // Update the sticky customer state panel
    updateCustomerStatePanel(mockServicePlanData, customerData);
    
    setTimeout(() => { hideLoading(); attGoToScreen(2); }, 1500);
}

// Step 2: Scan old battery (customer brought)
function attScanOldBattery() {
    showLoading('Scanning battery...');
    // Save old battery data
    attSaveStepData(2, {
        id: 'BAT-2024-7829',
        charge: 35,
        verified: true
    });
    setTimeout(() => { 
        hideLoading(); 
        showLoading('Verifying ownership...');
        setTimeout(() => { hideLoading(); attGoToScreen(3); }, 800);
    }, 1000);
}

// Step 3: Scan new battery (to give customer)
function attScanNewBattery() {
    showLoading('Scanning new battery...');
    // Save new battery data
    attSaveStepData(3, {
        id: 'BAT-2024-3156',
        charge: 100
    });
    setTimeout(() => { 
        hideLoading(); 
        showLoading('Calculating cost...');
        // Save cost data
        attSaveStepData(4, {
            energyDiff: 1.63,
            rate: 120,
            total: 196
        });
        setTimeout(() => { hideLoading(); attGoToScreen(4); }, 600);
    }, 1000);
}

// Step 5: Confirm payment by scanning customer QR
function attConfirmPayment() {
    showLoading('Confirming payment...');
    // Save payment data
    attSaveStepData(5, {
        confirmed: true,
        txnId: 'TXN-' + Math.floor(100000 + Math.random() * 900000),
        time: new Date().toLocaleTimeString('en-US', { hour12: false })
    });
    // Mark completion step
    attSaveStepData(6, {
        completed: true,
        timestamp: new Date().toISOString()
    });
    setTimeout(() => { hideLoading(); attGoToScreen(6); }, 1500);
}

function attHandleMainAction() {
    switch(attCurrentScreen) {
        case 1: attScanCustomer(); break;
        case 2: attScanOldBattery(); break;
        case 3: attScanNewBattery(); break;
        case 4: attGoToScreen(5); break;  // Go to payment confirmation
        case 5: attConfirmPayment(); break;
        case 6: 
            // Complete current session and start new swap
            SessionManager.completeSession();
            hideSessionModeUI('attendant');
            attResetFlow();
            attGoToScreen(1);
            // Start a fresh session
            startNewSession('attendant');
            break;
    }
}

function attGoBack() {
    if (attCurrentScreen > 1) attGoToScreen(attCurrentScreen - 1, true);
}

