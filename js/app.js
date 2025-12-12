/**
 * Main Application JavaScript
 * Theme, Splash, Onboarding, Roles, Login
 * Omnivoltaic Station App
 */

// =====================
// Theme Management
// =====================
function initTheme() {
    const savedTheme = localStorage.getItem('swapflow-theme');
    
    // Default to dark theme, only use light if explicitly saved
    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    }
    // Dark is default (no data-theme attribute needed)
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    
    html.classList.add('theme-transition');
    
    if (currentTheme === 'light') {
        html.removeAttribute('data-theme');
        localStorage.setItem('swapflow-theme', 'dark');
    } else {
        html.setAttribute('data-theme', 'light');
        localStorage.setItem('swapflow-theme', 'light');
    }
    
    setTimeout(() => {
        html.classList.remove('theme-transition');
    }, 300);
}

initTheme();

// =====================
// Splash Screen
// =====================
function showSplashAndProceed() {
    const splash = document.getElementById('splash-screen');
    const onboardingSeen = localStorage.getItem('swapflow-onboarding-seen');
    
    // Show splash for 2.5 seconds then proceed
    setTimeout(() => {
        splash.classList.add('hidden');
        
        if (onboardingSeen === 'true') {
            // Go straight to roles
            document.getElementById('module-roles').classList.add('active');
        } else {
            // Show onboarding
            document.getElementById('module-onboarding').classList.add('active');
        }
    }, 2500);
}

function checkSplash() {
    // Always show splash on page load (it's a loading screen)
    showSplashAndProceed();
}

// =====================
// Onboarding Carousel
// =====================
let currentSlide = 0;
const totalSlides = 4;

function goToSlide(index) {
    const slides = document.querySelectorAll('.onboarding-slide');
    const dots = document.querySelectorAll('.onboarding-dot');
    
    // Update previous slide
    slides[currentSlide].classList.remove('active');
    slides[currentSlide].classList.add('prev');
    dots[currentSlide].classList.remove('active');
    
    // Small delay then remove prev class
    setTimeout(() => {
        slides[currentSlide].classList.remove('prev');
        currentSlide = index;
        
        // Activate new slide
        slides[currentSlide].classList.add('active');
        dots[currentSlide].classList.add('active');
        
        // Update button text
        updateOnboardingButton();
    }, 50);
}

function nextSlide() {
    if (currentSlide < totalSlides - 1) {
        goToSlide(currentSlide + 1);
    } else {
        // Last slide - go to role selection
        finishOnboarding();
    }
}

function updateOnboardingButton() {
    const btnText = document.getElementById('onboarding-btn-text');
    if (currentSlide === totalSlides - 1) {
        btnText.textContent = 'Get Started';
    } else {
        btnText.textContent = 'Next';
    }
}

function skipOnboarding() {
    finishOnboarding();
}

function finishOnboarding() {
    // Mark onboarding as seen
    localStorage.setItem('swapflow-onboarding-seen', 'true');
    
    // Switch to role selection
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    document.getElementById('module-roles').classList.add('active');
}

// Check if user has seen onboarding (called after splash)
function checkOnboarding() {
    const seen = localStorage.getItem('swapflow-onboarding-seen');
    if (seen === 'true') {
        document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
        document.getElementById('module-roles').classList.add('active');
    }
}

// =====================
// Role Selection
// =====================
let currentRole = null;
let selectedRole = null;

function toggleRoleSelection(element, role) {
    // Remove selection from all applets
    document.querySelectorAll('.role-applet').forEach(applet => {
        applet.classList.remove('selected');
    });
    
    // Select clicked applet
    element.classList.add('selected');
    selectedRole = role;
    
    // Enable continue button
    const continueBtn = document.getElementById('role-continue-btn');
    continueBtn.disabled = false;
    continueBtn.classList.add('ready');
}

function proceedWithRole() {
    if (!selectedRole) return;
    
    currentRole = selectedRole;
    
    // Roles that require login
    const requiresLogin = ['attendant', 'sales', 'rider'];
    
    if (requiresLogin.includes(currentRole)) {
        // Check if user is already logged in (shared login for attendant and sales)
        const loginKey = 'oves-staff-login';
        const savedLogin = localStorage.getItem(loginKey);
        
        if (savedLogin) {
            // User has logged in before - show continue option
            showLoginScreen(true, JSON.parse(savedLogin));
        } else {
            // First time - show full login form
            showLoginScreen(false);
        }
    } else {
        // Other roles don't need login - go directly
        goToRoleModule();
    }
}

function showLoginScreen(hasExistingLogin, userData = null) {
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    document.getElementById('module-login').classList.add('active');
    
    const loginForm = document.querySelector('.login-form');
    const loggedInInfo = document.getElementById('logged-in-info');
    const loginTitle = document.getElementById('login-title');
    const loginSubtitle = document.getElementById('login-subtitle');
    
    // Set title based on role
    const roleNames = {
        'attendant': 'Attendant',
        'sales': 'Sales Rep',
        'rider': 'Rider'
    };
    loginTitle.textContent = `${roleNames[currentRole]} Login`;
    
    if (hasExistingLogin && userData) {
        // Show continue as existing user
        loginForm.style.display = 'none';
        loggedInInfo.classList.remove('hidden');
        loginSubtitle.textContent = 'Welcome back!';
        
        document.getElementById('logged-user-avatar').textContent = userData.initials;
        document.getElementById('logged-user-name').textContent = userData.name;
        document.getElementById('logged-user-role').textContent = roleNames[currentRole];
    } else {
        // Show login form
        loginForm.style.display = 'block';
        loggedInInfo.classList.add('hidden');
        loginSubtitle.textContent = 'Sign in to access your workspace';
        
        // Clear form
        document.getElementById('login-email').value = '';
        document.getElementById('login-pin').value = '';
    }
}

function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pin = document.getElementById('login-pin').value.trim();
    
    if (!email) {
        document.getElementById('login-email').focus();
        return;
    }
    if (!pin || pin.length < 4) {
        document.getElementById('login-pin').focus();
        return;
    }
    
    showLoading('Signing in...');
    
    // Simulate authentication
    setTimeout(() => {
        hideLoading();
        
        // Save login state (shared for attendant and sales)
        const userData = {
            name: 'James Mwangi',
            initials: 'JM',
            email: email,
            loginTime: Date.now()
        };
        
        const loginKey = 'oves-staff-login';
        localStorage.setItem(loginKey, JSON.stringify(userData));
        
        // Go to role module
        goToRoleModule();
    }, 1500);
}

function continueAsUser() {
    showLoading('Loading workspace...');
    setTimeout(() => {
        hideLoading();
        goToRoleModule();
    }, 800);
}

function switchUser() {
    // Clear current login and show form
    const loginKey = 'oves-staff-login';
    localStorage.removeItem(loginKey);
    showLoginScreen(false);
}

function goToRoleModule() {
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    
    if (currentRole === 'attendant') {
        document.getElementById('module-attendant').classList.add('active');
        // Reset flow state when entering module fresh
        attResetFlow();
        attGoToScreen(1);
        // Check timeline scroll after a brief delay for DOM update
        setTimeout(checkTimelineScroll, 100);
        
        // Check for recoverable session
        const hasRecoverable = checkSessionRecovery('attendant');
        if (!hasRecoverable) {
            // Start a new session
            startNewSession('attendant');
        }
    } else if (currentRole === 'sales') {
        document.getElementById('module-sales').classList.add('active');
        salesResetFlow();
        salesGoToScreen(1);
        // Check timeline scroll after a brief delay for DOM update
        setTimeout(checkSalesTimelineScroll, 100);
        
        // Check for recoverable session
        const hasRecoverable = checkSessionRecovery('sales');
        if (!hasRecoverable) {
            // Start a new session
            startNewSession('sales');
        }
    } else if (currentRole === 'rider') {
        document.getElementById('module-rider').classList.add('active');
        // Initialize rider module with data
        initRiderModule();
    }
}

function backToRoles() {
    currentRole = null;
    // Keep selectedRole so it stays highlighted when going back
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    document.getElementById('module-roles').classList.add('active');
    // Hide any session recovery prompts
    hideSessionRecovery();
}

