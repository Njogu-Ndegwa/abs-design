/**
 * Rider Module
 * Self-service Battery Swap Interface
 * Omnivoltaic Station App
 */

// =====================
// Loading States
// =====================
function showLoading(text) {
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading').classList.add('active');
}

function hideLoading() {
    document.getElementById('loading').classList.remove('active');
}

// =====================
// Initialize & Events
// =====================
document.addEventListener('DOMContentLoaded', () => {
    // Check splash and onboarding state
    checkSplash();
    
    // Add swipe support for onboarding
    const slidesContainer = document.querySelector('.onboarding-slides');
    if (slidesContainer) {
        let touchStartX = 0;
        let touchEndX = 0;
        
        slidesContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        slidesContainer.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });
        
        function handleSwipe() {
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) {
                if (diff > 0 && currentSlide < totalSlides - 1) {
                    // Swipe left - next
                    goToSlide(currentSlide + 1);
                } else if (diff < 0 && currentSlide > 0) {
                    // Swipe right - previous
                    goToSlide(currentSlide - 1);
                }
            }
        }
    }
    
    // Handle window resize for timeline scroll indicator
    window.addEventListener('resize', () => {
        checkTimelineScroll();
        checkSalesTimelineScroll();
    });
});

// Touch feedback for interactive elements
document.querySelectorAll('.btn, .toggle-btn, .scanner-area, .qr-scanner-area, .theme-toggle, .role-applet, .product-card, .vehicle-card, .rider-nav-item, .quick-action, .station-item, .activity-item, .menu-item, .activity-filter').forEach(el => {
    el.addEventListener('touchstart', function() { 
        if (!this.classList.contains('disabled')) {
            this.style.transform = 'scale(0.96)'; 
        }
    });
    el.addEventListener('touchend', function() { this.style.transform = ''; });
});

// Touch feedback for timeline steps
document.querySelectorAll('.timeline-step').forEach(el => {
    el.addEventListener('touchstart', function() { 
        if (!this.classList.contains('disabled')) {
            this.querySelector('.timeline-dot').style.transform = 'scale(0.9)';
        }
    });
    el.addEventListener('touchend', function() { 
        this.querySelector('.timeline-dot').style.transform = '';
    });
});

// System theme listener
// System preference listener - only applies if user hasn't set a preference
// App defaults to dark regardless of system preference
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only respond to system changes if no saved preference
    // Since we default to dark, we don't auto-switch based on system
});

// =====================
// Rider Module
// =====================
let riderCurrentScreen = 'home';

// Mock rider data
const riderData = {
    user: {
        name: 'James Mwangi',
        initials: 'JM',
        phone: '+228 91 234 567'
    },
    bike: {
        model: 'E-Trike 3X',
        vehicleId: 'VEH-2024-8847',
        lastSwap: '2h ago',
        totalSwaps: 47,
        status: 'active'
    },
    balance: {
        moneyBalance: 3100, // XOF
        swapsRemaining: 18
    },
    subscription: {
        plan: '7-Day Lux Plan',
        validUntil: 'Dec 9, 2025',
        status: 'active'
    }
};

// Mock stations data
const stationsData = [
    { id: 0, name: 'Lome Central Station', address: 'Rue du Commerce, Lome', distance: '0.8 km', batteries: 12, waitTime: '~3 min' },
    { id: 1, name: 'Tokoin Market Station', address: 'Avenue Tokoin, Lome', distance: '1.4 km', batteries: 3, waitTime: '~8 min' },
    { id: 2, name: 'Agoe Station', address: 'Route d\'Agoe, Lome', distance: '2.1 km', batteries: 8, waitTime: '~5 min' },
    { id: 3, name: 'Be Station', address: 'Quartier Be, Lome', distance: '2.8 km', batteries: 15, waitTime: '~2 min' },
    { id: 4, name: 'Adidogome Station', address: 'Adidogome, Lome', distance: '3.5 km', batteries: 6, waitTime: '~6 min' }
];

// Navigate between rider screens
function riderGoToScreen(screenName) {
    const module = document.getElementById('module-rider');
    module.querySelectorAll('.rider-screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`rider-screen-${screenName}`).classList.add('active');
    
    // Update navigation
    module.querySelectorAll('.rider-nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`rider-nav-${screenName}`).classList.add('active');
    
    riderCurrentScreen = screenName;
    
    // Hide station detail if switching away from map
    if (screenName !== 'map') {
        riderHideStationDetail();
    }
}

// Update battery gauge display
function riderUpdateBatteryGauge(percent) {
    const circumference = 2 * Math.PI * 42; // radius is 42
    const offset = circumference * (percent / 100);
    const gauge = document.getElementById('rider-battery-gauge');
    if (gauge) {
        gauge.style.strokeDasharray = `${offset} ${circumference}`;
        
        // Update color based on charge level
        gauge.classList.remove('good', 'warning', 'critical');
        if (percent >= 50) {
            gauge.classList.add('good');
        } else if (percent >= 20) {
            gauge.classList.add('warning');
        } else {
            gauge.classList.add('critical');
        }
    }
    
    // Update percent text
    const percentEl = document.getElementById('rider-battery-percent');
    if (percentEl) {
        percentEl.textContent = percent + '%';
    }
    
    // Update status badge
    const statusEl = document.getElementById('rider-battery-status');
    if (statusEl) {
        statusEl.classList.remove('charged', 'low', 'charging');
        if (percent >= 50) {
            statusEl.textContent = 'Good';
            statusEl.classList.add('charged');
        } else if (percent >= 20) {
            statusEl.textContent = 'Low';
            statusEl.classList.add('low');
        } else {
            statusEl.textContent = 'Critical';
            statusEl.classList.add('low');
        }
    }
}

// Update balance display (always shows money/XOF)
function riderUpdateBalanceDisplay() {
    const balanceValue = document.getElementById('rider-balance-value');
    if (balanceValue) {
        balanceValue.textContent = `XOF ${riderData.balance.moneyBalance.toLocaleString()}`;
    }
}

// Show QR Code Modal for transaction ID entry
function riderShowQRCode() {
    const modal = document.getElementById('qr-modal');
    modal.classList.add('active');
    // Reset to input view
    document.getElementById('qr-input-section').classList.remove('hidden');
    document.getElementById('qr-display-section').classList.add('hidden');
    document.getElementById('qr-transaction-id').value = '';
    document.getElementById('qr-transaction-id').focus();
}

// Close QR Modal
function closeQRModal() {
    const modal = document.getElementById('qr-modal');
    modal.classList.remove('active');
}

// Reset QR Modal to input state
function resetQRModal() {
    document.getElementById('qr-input-section').classList.remove('hidden');
    document.getElementById('qr-display-section').classList.add('hidden');
    document.getElementById('qr-transaction-id').value = '';
    document.getElementById('qr-transaction-id').focus();
}

// Generate QR code from transaction ID
function generateTransactionQR() {
    const transactionId = document.getElementById('qr-transaction-id').value.trim();
    
    if (!transactionId) {
        alert('Please enter your transaction ID');
        return;
    }
    
    // Show loading
    showLoading('Generating QR Code...');
    
    setTimeout(() => {
        hideLoading();
        
        // Generate a simple QR code pattern (SVG-based visual representation)
        const qrPattern = generateQRPattern(transactionId);
        document.getElementById('qr-code-display').innerHTML = qrPattern;
        document.getElementById('qr-transaction-display').textContent = transactionId;
        
        // Switch to display view
        document.getElementById('qr-input-section').classList.add('hidden');
        document.getElementById('qr-display-section').classList.remove('hidden');
    }, 600);
}

// Generate a visual QR pattern (simplified SVG representation)
function generateQRPattern(data) {
    // Create a deterministic pattern based on the input string
    const size = 21; // QR code module count
    const moduleSize = 156 / size;
    const hash = simpleHash(data);
    
    let svg = `<svg viewBox="0 0 156 156" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="156" height="156" fill="#ffffff"/>`;
    
    // Position detection patterns (corners)
    svg += drawFinderPattern(0, 0, moduleSize);
    svg += drawFinderPattern(14 * moduleSize, 0, moduleSize);
    svg += drawFinderPattern(0, 14 * moduleSize, moduleSize);
    
    // Generate data modules based on hash
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            // Skip finder pattern areas
            if ((row < 8 && col < 8) || (row < 8 && col > 12) || (row > 12 && col < 8)) continue;
            
            // Use hash to determine if module is filled
            const index = row * size + col;
            const shouldFill = ((hash >> (index % 32)) & 1) ^ ((row + col) % 2);
            
            if (shouldFill) {
                svg += `<rect x="${col * moduleSize}" y="${row * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="#000"/>`;
            }
        }
    }
    
    svg += `</svg>`;
    return svg;
}

// Draw QR finder pattern
function drawFinderPattern(x, y, moduleSize) {
    const s = moduleSize;
    return `
        <rect x="${x}" y="${y}" width="${7*s}" height="${7*s}" fill="#000"/>
        <rect x="${x+s}" y="${y+s}" width="${5*s}" height="${5*s}" fill="#fff"/>
        <rect x="${x+2*s}" y="${y+2*s}" width="${3*s}" height="${3*s}" fill="#000"/>
    `;
}

// Simple string hash function
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

// =====================
// Top-Up Flow Modal
// =====================
let topUpCurrentStep = 1;
let topUpSelectedAmount = 2000; // Default selected amount

// Show Top-up modal
function riderShowTopUp() {
    // Reset to step 1
    topUpCurrentStep = 1;
    topUpSelectedAmount = 2000;
    
    // Reset UI
    goToTopUpStep(1);
    
    // Reset amount selection
    document.querySelectorAll('.topup-amount-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.querySelectorAll('.topup-amount-btn')[1].classList.add('selected'); // Select 2000
    document.getElementById('topup-custom-input').classList.add('hidden');
    
    // Reset form fields
    document.getElementById('topup-transaction-id').value = '';
    document.getElementById('topup-payment-method').value = '';
    document.getElementById('topup-confirm-checkbox').checked = false;
    document.getElementById('topup-confirm-btn').disabled = true;
    
    // Update amount displays
    updateTopUpAmountDisplays();
    
    // Show modal
    const modal = document.getElementById('topup-modal');
    modal.classList.add('active');
}

// Close top-up modal
function closeTopUpModal() {
    const modal = document.getElementById('topup-modal');
    modal.classList.remove('active');
}

// Select top-up amount
function selectTopUpAmount(amount) {
    // Update selection UI
    document.querySelectorAll('.topup-amount-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');
    
    // Handle custom amount
    if (amount === 0) {
        document.getElementById('topup-custom-input').classList.remove('hidden');
        document.getElementById('topup-custom-amount').focus();
        topUpSelectedAmount = parseInt(document.getElementById('topup-custom-amount').value) || 0;
    } else {
        document.getElementById('topup-custom-input').classList.add('hidden');
        topUpSelectedAmount = amount;
    }
    
    updateTopUpAmountDisplays();
}

// Update custom amount
function updateCustomAmount() {
    topUpSelectedAmount = parseInt(document.getElementById('topup-custom-amount').value) || 0;
    updateTopUpAmountDisplays();
}

// Update all amount displays in the modal
function updateTopUpAmountDisplays() {
    const formattedAmount = `XOF ${topUpSelectedAmount.toLocaleString()}`;
    document.getElementById('topup-confirm-amount').textContent = formattedAmount;
    document.getElementById('topup-confirm-total').textContent = formattedAmount;
    document.getElementById('topup-confirm-label-amount').textContent = formattedAmount;
}

// Navigate to a specific step
function goToTopUpStep(step) {
    // Validate before proceeding
    if (step === 2 && topUpSelectedAmount <= 0) {
        alert('Please select or enter a valid top-up amount');
        return;
    }
    
    topUpCurrentStep = step;
    
    // Update step visibility
    document.querySelectorAll('.topup-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`topup-step-${step}`).classList.add('active');
    
    // Update progress dots
    document.querySelectorAll('.topup-step-dot').forEach((dot, index) => {
        dot.classList.remove('active', 'completed');
        if (index + 1 === step) {
            dot.classList.add('active');
        } else if (index + 1 < step) {
            dot.classList.add('completed');
        }
    });
    
    // Update modal title
    const titles = {
        1: 'Top Up Account',
        2: 'Confirm Payment',
        3: 'Success!'
    };
    document.getElementById('topup-modal-title').textContent = titles[step];
    
    // Update amount displays when entering step 2
    if (step === 2) {
        updateTopUpAmountDisplays();
        document.getElementById('topup-transaction-id').focus();
    }
}

// Toggle confirmation checkbox
function toggleTopUpConfirm() {
    const checkbox = document.getElementById('topup-confirm-checkbox');
    checkbox.checked = !checkbox.checked;
    validateTopUpForm();
}

// Validate top-up form
function validateTopUpForm() {
    const transactionId = document.getElementById('topup-transaction-id').value.trim();
    const paymentMethod = document.getElementById('topup-payment-method').value;
    const isConfirmed = document.getElementById('topup-confirm-checkbox').checked;
    
    const isValid = transactionId.length > 0 && paymentMethod && isConfirmed;
    document.getElementById('topup-confirm-btn').disabled = !isValid;
}

// Confirm top-up (submit)
function confirmTopUp() {
    const transactionId = document.getElementById('topup-transaction-id').value.trim();
    const paymentMethod = document.getElementById('topup-payment-method').value;
    
    if (!transactionId || !paymentMethod) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Show loading
    showLoading('Verifying payment...');
    
    // Simulate verification (in production, this would call an API)
    setTimeout(() => {
        hideLoading();
        
        // Update rider balance
        riderData.balance.moneyBalance += topUpSelectedAmount;
        
        // Update success display
        document.getElementById('topup-success-amount').textContent = `+XOF ${topUpSelectedAmount.toLocaleString()}`;
        document.getElementById('topup-new-balance').textContent = `XOF ${riderData.balance.moneyBalance.toLocaleString()}`;
        
        // Go to success step
        goToTopUpStep(3);
    }, 1500);
}

// Finish top-up flow
function finishTopUp() {
    // Update all balance displays
    riderUpdateBalanceDisplay();
    
    // Update profile balance if visible
    const subBalance = document.getElementById('rider-sub-balance');
    if (subBalance) {
        subBalance.textContent = `XOF ${riderData.balance.moneyBalance.toLocaleString()}`;
    }
    
    // Close modal
    closeTopUpModal();
}

// Copy to clipboard helper
function copyToClipboard(text, buttonEl) {
    navigator.clipboard.writeText(text).then(() => {
        // Show copied state
        buttonEl.classList.add('copied');
        buttonEl.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 6L9 17l-5-5"/>
            </svg>
        `;
        
        // Reset after 2 seconds
        setTimeout(() => {
            buttonEl.classList.remove('copied');
            buttonEl.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
            `;
        }, 2000);
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            buttonEl.classList.add('copied');
            setTimeout(() => buttonEl.classList.remove('copied'), 2000);
        } catch (err) {
            alert('Failed to copy. Please copy manually: ' + text);
        }
        document.body.removeChild(textArea);
    });
}

// Add event listeners for form validation
document.addEventListener('DOMContentLoaded', function() {
    const transactionInput = document.getElementById('topup-transaction-id');
    const paymentSelect = document.getElementById('topup-payment-method');
    const confirmCheckbox = document.getElementById('topup-confirm-checkbox');
    
    if (transactionInput) {
        transactionInput.addEventListener('input', validateTopUpForm);
    }
    if (paymentSelect) {
        paymentSelect.addEventListener('change', validateTopUpForm);
    }
    if (confirmCheckbox) {
        confirmCheckbox.addEventListener('change', validateTopUpForm);
    }
});

// Filter activity list
function riderFilterActivity(filter) {
    // Update filter buttons
    document.querySelectorAll('.activity-filter').forEach(f => f.classList.remove('active'));
    document.querySelector(`.activity-filter[onclick*="${filter}"]`).classList.add('active');
    
    // In production, this would filter the activity list
    // For now, just show all items
    const activityList = document.getElementById('rider-activity-list');
    const items = activityList.querySelectorAll('.activity-item');
    
    items.forEach(item => {
        const iconEl = item.querySelector('.activity-item-icon');
        let show = true;
        
        if (filter === 'swaps') {
            show = iconEl.classList.contains('swap');
        } else if (filter === 'payments') {
            show = iconEl.classList.contains('payment');
        } else if (filter === 'topups') {
            show = iconEl.classList.contains('topup');
        }
        
        item.style.display = show ? 'flex' : 'none';
    });
    
    // Also hide/show date headers appropriately (simplified)
    const headers = activityList.querySelectorAll('.activity-date-header');
    headers.forEach(h => {
        h.style.display = filter === 'all' ? 'block' : 'block';
    });
}

// Select station on map
function riderSelectStation(stationId) {
    const station = stationsData[stationId];
    if (!station) return;
    
    // Update detail card
    document.getElementById('station-detail-name').textContent = station.name;
    document.getElementById('station-detail-address').textContent = station.address;
    document.getElementById('station-detail-distance').textContent = station.distance;
    document.getElementById('station-detail-batteries').textContent = station.batteries;
    document.getElementById('station-detail-wait').textContent = station.waitTime;
    
    // Show detail card
    document.getElementById('rider-station-detail').style.display = 'block';
}

// Hide station detail card
function riderHideStationDetail() {
    const detail = document.getElementById('rider-station-detail');
    if (detail) detail.style.display = 'none';
}

// Navigate to station (would open maps app)
function riderNavigateToStation() {
    showLoading('Opening navigation...');
    setTimeout(() => {
        hideLoading();
        alert('Opening directions in Maps app...\n\nIn production, this would launch Google Maps or Apple Maps with directions to the selected station.');
    }, 800);
}

// Profile menu actions
function riderShowAccountDetails() {
    showLoading('Loading account details...');
    setTimeout(() => {
        hideLoading();
        alert('Account Details\n\nName: James Mwangi\nPhone: +228 91 234 567\nEmail: james.m@email.com\nCustomer ID: CUS-8847-KE\n\nJoined: November 2024');
    }, 600);
}

function riderShowVehicle() {
    showLoading('Loading vehicle info...');
    setTimeout(() => {
        hideLoading();
        alert('Vehicle Information\n\nType: E-Trike 3X\nVehicle ID: VEH-2024-8847\nBattery Type: 72V 40Ah\nPurchase Date: Nov 15, 2024\n\nTotal Swaps: 47\nTotal Spent: XOF 26,500');
    }, 600);
}

function riderShowPlanDetails() {
    showLoading('Loading plan details...');
    setTimeout(() => {
        hideLoading();
        alert('7-Day Lux Plan\n\nWeekly Budget: XOF 5,000\nSwap Limit: 21 swaps/week\nPer Swap: ~XOF 920\n\nValid: Dec 2 - Dec 9, 2025\nStatus: Active\nPayment: Current\n\nRenews automatically via MTN Mobile Money');
    }, 600);
}

function riderShowPaymentMethods() {
    showLoading('Loading payment methods...');
    setTimeout(() => {
        hideLoading();
        alert('Payment Methods\n\n✓ MTN Mobile Money (Primary)\n   +228 91 234 567\n\n+ Add payment method');
    }, 600);
}

function riderShowSupport() {
    showLoading('Loading support options...');
    setTimeout(() => {
        hideLoading();
        alert('Help & Support\n\n📞 Call: +228 22 123 456\n📧 Email: support@oves.com\n💬 WhatsApp: +228 91 000 001\n\nFAQ Topics:\n• How to swap a battery\n• Understanding your plan\n• Troubleshooting\n• Station locations');
    }, 600);
}

function riderLogout() {
    if (confirm('Are you sure you want to log out?')) {
        showLoading('Logging out...');
        setTimeout(() => {
            hideLoading();
            // Reset rider state
            riderCurrentScreen = 'home';
            // Go back to roles
            backToRoles();
        }, 800);
    }
}

// Initialize rider module
function initRiderModule() {
    // Update greeting based on time
    const hour = new Date().getHours();
    let greeting = 'Good evening';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';
    
    const greetingEl = document.querySelector('.rider-greeting');
    if (greetingEl) greetingEl.textContent = greeting + ',';
    
    // Update user name
    const nameEl = document.getElementById('rider-user-name');
    if (nameEl) nameEl.textContent = riderData.user.name;
    
    // Update bike display
    const bikeModelEl = document.getElementById('rider-bike-model');
    if (bikeModelEl) bikeModelEl.textContent = riderData.bike.model;
    
    const vehicleIdEl = document.getElementById('rider-vehicle-id');
    if (vehicleIdEl) vehicleIdEl.textContent = riderData.bike.vehicleId;
    
    const lastSwapEl = document.getElementById('rider-last-swap');
    if (lastSwapEl) lastSwapEl.textContent = riderData.bike.lastSwap;
    
    const totalSwapsEl = document.getElementById('rider-total-swaps');
    if (totalSwapsEl) totalSwapsEl.textContent = riderData.bike.totalSwaps;
    
    // Update balance (money display)
    const balanceValueEl = document.getElementById('rider-balance-value');
    if (balanceValueEl) balanceValueEl.textContent = 'XOF ' + riderData.balance.moneyBalance.toLocaleString();
    
    // Update profile
    document.getElementById('rider-profile-avatar').textContent = riderData.user.initials;
    document.getElementById('rider-profile-name').textContent = riderData.user.name;
    document.getElementById('rider-profile-phone').textContent = riderData.user.phone;
    
    // Update subscription stats (show money instead of energy)
    document.getElementById('rider-sub-balance').textContent = 'XOF ' + riderData.balance.moneyBalance.toLocaleString();
    document.getElementById('rider-sub-swaps').textContent = riderData.balance.swapsRemaining;
    
    // Reset to home screen
    riderGoToScreen('home');
}
