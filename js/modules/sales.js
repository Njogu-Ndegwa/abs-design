/**
 * Sales Module
 * Customer Registration Flow Logic
 * Omnivoltaic Station App
 */

// =====================
// Sales Rep Module
// =====================
let salesCurrentScreen = 1;
let selectedPlan = 'weekly';
let selectedVehicle = 'tuktuk2';

const vehicleData = {
    'tuktuk2': { name: 'Oves Tuk-Tuk', type: 'Electric Tuk-Tuk', price: 1175000 },
    'etrike': { name: 'E-Trike 3X', type: 'Electric Tricycle', price: 565000 },
    'etrike-cargo': { name: 'E-Trike Cargo', type: 'Cargo Tricycle', price: 680000 },
    'tuktuk': { name: 'Oves Tuk-Tuk', type: 'Passenger Vehicle', price: 1315000 }
};

const planData = {
    'daily': { name: 'Daily Pass', price: 705 },
    'weekly': { name: 'Weekly Plan', price: 3760 },
    'monthly': { name: 'Monthly Plan', price: 11750 },
    'payperswap': { name: 'Pay-Per-Swap', price: 0 }
};

const salesScreenConfig = {
    1: { btnText: 'Continue', btnIcon: 'arrow', showBack: false },
    2: { btnText: 'Continue', btnIcon: 'arrow', showBack: true },
    3: { btnText: 'Continue', btnIcon: 'arrow', showBack: true },
    4: { btnText: 'Confirm Payment', btnIcon: 'qr', showBack: true },
    5: { btnText: 'Scan Battery', btnIcon: 'scan', showBack: true },
    6: { btnText: 'New Registration', btnIcon: 'plus', showBack: false, btnClass: 'btn-success' }
};

const salesIcons = {
    arrow: `<path d="M5 12h14M12 5l7 7-7 7"/>`,
    scan: `<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h.01M7 12h.01M7 17h.01M12 7h.01M12 12h.01M12 17h.01M17 7h.01M17 12h.01M17 17h.01"/>`,
    qr: `<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>`,
    plus: `<path d="M12 5v14M5 12h14"/>`
};

function salesGoToScreen(screenNum) {
    const module = document.getElementById('module-sales');
    module.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`sales-screen-${salesGetScreenName(screenNum)}`).classList.add('active');
    
    // Update session current step
    SessionManager.updateCurrentStep(screenNum);
    
    // Update the interactive timeline
    salesUpdateTimeline(screenNum);
    
    const config = salesScreenConfig[screenNum];
    document.getElementById('sales-btn-text').textContent = config.btnText;
    document.getElementById('sales-btn-icon').innerHTML = salesIcons[config.btnIcon];
    
    const btnBack = document.getElementById('sales-btn-back');
    const btnMain = document.getElementById('sales-btn-main');
    
    if (config.showBack) btnBack.classList.remove('hidden');
    else btnBack.classList.add('hidden');
    
    btnMain.className = 'btn ' + (config.btnClass || 'btn-primary');
    salesCurrentScreen = screenNum;

    // Update payment amounts on screen 4
    if (screenNum === 4) {
        updateSalesPaymentAmount();
    }

    // Update preview on screen 5
    if (screenNum === 5) {
        updateSalesPreview();
    }
}

// Update the interactive timeline visual state for sales
function salesUpdateTimeline(screenNum) {
    const timeline = document.getElementById('sales-timeline');
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
                // Final step shows success state
                step.classList.add('success');
            } else {
                step.classList.add('active');
            }
        } else {
            // Future steps
            step.classList.add('disabled');
        }
    });

    // Update connectors
    connectors.forEach((conn) => {
        const afterStep = parseInt(conn.getAttribute('data-after'));
        conn.classList.remove('completed');
        if (afterStep < screenNum) {
            conn.classList.add('completed');
        }
    });

    // Scroll active step into view
    const activeStep = timeline.querySelector('.timeline-step.active, .timeline-step.success');
    if (activeStep) {
        activeStep.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    // Check if timeline can scroll (for scroll hint)
    checkSalesTimelineScroll();
}

function checkSalesTimelineScroll() {
    const timeline = document.getElementById('sales-timeline');
    if (!timeline) return;
    const track = timeline.querySelector('.timeline-track');
    if (track && track.scrollWidth > timeline.clientWidth) {
        timeline.classList.add('can-scroll');
    } else {
        timeline.classList.remove('can-scroll');
    }
}

// Handle timeline step clicks for navigation in sales
function salesTimelineClick(stepNum) {
    // Only allow clicking on completed steps or current step
    const timeline = document.getElementById('sales-timeline');
    const step = timeline.querySelector(`.timeline-step[data-step="${stepNum}"]`);
    
    if (!step || step.classList.contains('disabled')) {
        return; // Can't navigate to disabled steps
    }
    
    salesGoToScreen(stepNum);
}

function salesGetScreenName(num) {
    return { 1: 'register', 2: 'product', 3: 'subscription', 4: 'payment', 5: 'battery', 6: 'checkout' }[num];
}

function selectVehicle(element, vehicle) {
    document.querySelectorAll('.vehicle-card').forEach(card => card.classList.remove('selected'));
    element.classList.add('selected');
    selectedVehicle = vehicle;
}

function selectPlan(element, plan) {
    document.querySelectorAll('#sales-screen-subscription .product-card').forEach(card => card.classList.remove('selected'));
    element.classList.add('selected');
    selectedPlan = plan;
}

function updateSalesPreview() {
    const name = document.getElementById('customerName').value || 'ABC Customer Ltd';
    const email = document.getElementById('customerEmail').value || 'customer@example.com';
    const phone = document.getElementById('customerPhone').value || '+254712345678';
    const city = document.getElementById('customerCity').value || 'Nairobi';
    const zip = document.getElementById('customerZip').value || '00100';
    
    // Create initials from name (first letter of first two words)
    const words = name.split(' ').filter(w => w.length > 0);
    const initials = words.length >= 2 
        ? (words[0][0] + words[1][0]).toUpperCase()
        : name.substring(0, 2).toUpperCase();
    
    document.getElementById('sales-avatar').textContent = initials;
    document.getElementById('sales-customer-name').textContent = name;
    document.getElementById('sales-customer-phone').textContent = phone;
    document.getElementById('sales-email').textContent = email;
    document.getElementById('sales-location').textContent = city + ', ' + zip;
    
    // Show vehicle + plan info
    const vehicle = vehicleData[selectedVehicle];
    const plan = planData[selectedPlan];
    document.getElementById('sales-plan-badge').textContent = vehicle.name + ' • ' + plan.name;
}

function salesSimulateBatteryScan() {
    showLoading('Scanning battery...');
    setTimeout(() => {
        hideLoading();
        // Save battery assignment data
        salesSaveStepData(5, {
            batteryId: 'BAT-2024-' + Math.floor(1000 + Math.random() * 9000),
            assignedAt: new Date().toISOString()
        });
        // Mark completion
        salesSaveStepData(6, {
            completed: true,
            timestamp: new Date().toISOString()
        });
        updateCheckoutSummary();
        salesGoToScreen(6); // Go to checkout screen
    }, 1500);
}

function updateCheckoutSummary() {
    const name = document.getElementById('customerName').value || 'ABC Customer Ltd';
    const email = document.getElementById('customerEmail').value || 'customer@example.com';
    const phone = document.getElementById('customerPhone').value || '+254712345678';
    const city = document.getElementById('customerCity').value || 'Nairobi';
    const zip = document.getElementById('customerZip').value || '00100';
    
    const vehicle = vehicleData[selectedVehicle];
    const plan = planData[selectedPlan];
    const total = vehicle.price + plan.price;
    
    document.getElementById('checkout-name').textContent = name;
    document.getElementById('checkout-email').textContent = email;
    document.getElementById('checkout-phone').textContent = phone;
    document.getElementById('checkout-address').textContent = city + ', ' + zip;
    document.getElementById('checkout-product').textContent = vehicle.name;
    document.getElementById('checkout-plan').textContent = plan.name;
    document.getElementById('checkout-amount').textContent = 'XOF ' + total.toLocaleString();
    document.getElementById('sales-reg-id').textContent = '#REG-' + Math.floor(100000 + Math.random() * 900000);
    document.getElementById('checkout-battery').textContent = 'BAT-2024-' + Math.floor(1000 + Math.random() * 9000);
}

function salesHandleMainAction() {
    switch(salesCurrentScreen) {
        case 1: 
            // Save registration data
            salesSaveStepData(1, {
                name: document.getElementById('customerName').value || 'ABC Customer Ltd',
                email: document.getElementById('customerEmail').value || 'customer@example.com',
                phone: document.getElementById('customerPhone').value || '+254712345678',
                street: document.getElementById('customerStreet').value || '',
                city: document.getElementById('customerCity').value || 'Nairobi',
                zip: document.getElementById('customerZip').value || '00100'
            });
            salesGoToScreen(2); 
            break;
        case 2: 
            // Save vehicle selection
            salesSaveStepData(2, { vehicle: selectedVehicle });
            salesGoToScreen(3); 
            break;
        case 3: 
            // Save plan selection
            salesSaveStepData(3, { plan: selectedPlan });
            salesGoToScreen(4); 
            break;
        case 4: salesConfirmPayment(); break;
        case 5: salesSimulateBatteryScan(); break;
        case 6: 
            // Complete session and start fresh
            SessionManager.completeSession();
            hideSessionModeUI('sales');
            salesResetFlow();
            salesGoToScreen(1);
            // Start a fresh session
            startNewSession('sales');
            break;
    }
}

// Save data for current sales step
function salesSaveStepData(step, data) {
    SessionManager.updateStepData(step, data);
}

function salesGoBack() {
    if (salesCurrentScreen > 1) salesGoToScreen(salesCurrentScreen - 1);
}

// Sales Payment Functions
function updateSalesPaymentAmount() {
    const vehicle = vehicleData[selectedVehicle];
    const plan = planData[selectedPlan];
    const total = vehicle.price + plan.price;
    
    // Update breakdown
    document.getElementById('sales-product-label').textContent = vehicle.name;
    document.getElementById('sales-product-price').textContent = 'XOF ' + vehicle.price.toLocaleString();
    document.getElementById('sales-plan-label').textContent = plan.name;
    document.getElementById('sales-plan-price').textContent = 'XOF ' + plan.price.toLocaleString();
    
    // Update totals
    document.getElementById('sales-payment-amount').textContent = 'XOF ' + total.toLocaleString();
    document.getElementById('sales-payment-display').textContent = 'XOF ' + total.toLocaleString();
    document.getElementById('sales-payment-display-manual').textContent = 'XOF ' + total.toLocaleString();
}

function toggleSalesPaymentInput(mode) {
    const scanBtn = document.getElementById('toggle-sales-payment-scan');
    const manualBtn = document.getElementById('toggle-sales-payment-manual');
    const scanMode = document.getElementById('sales-payment-scan-mode');
    const manualMode = document.getElementById('sales-payment-manual-mode');
    
    if (mode === 'scan') {
        scanBtn.classList.add('active');
        manualBtn.classList.remove('active');
        scanMode.classList.remove('hidden');
        manualMode.classList.add('hidden');
    } else {
        manualBtn.classList.add('active');
        scanBtn.classList.remove('active');
        manualMode.classList.remove('hidden');
        scanMode.classList.add('hidden');
    }
}

function salesConfirmPayment() {
    showLoading('Confirming payment...');
    // Save payment data
    const vehicle = vehicleData[selectedVehicle];
    const plan = planData[selectedPlan];
    const total = vehicle.price + plan.price;
    
    salesSaveStepData(4, {
        confirmed: true,
        txnId: 'TXN-' + Math.floor(100000 + Math.random() * 900000),
        amount: total,
        timestamp: new Date().toISOString()
    });
    
    setTimeout(() => {
        hideLoading();
        salesGoToScreen(5); // Go to battery screen
    }, 1500);
}

function salesLookupPayment() {
    const paymentId = document.getElementById('salesPaymentId').value;
    if (!paymentId) {
        alert('Please enter a payment/transaction ID');
        return;
    }
    salesConfirmPayment();
}

