/**
 * Session Management Module
 * Handles workflow sessions, recovery, and tracking
 * Omnivoltaic Station App
 */

// =====================================================
// SESSION MANAGEMENT SYSTEM
// =====================================================
// Manages workflow sessions for tracking, recovery, and issue resolution

// Flag to track if user has made a session choice (resume/new)
let sessionChoiceMade = false;

const SessionManager = {
    // Storage key prefix
    STORAGE_KEY: 'oves-sessions',
    CURRENT_SESSION_KEY: 'oves-current-session',
    
    // Session statuses
    STATUS: {
        IN_PROGRESS: 'in-progress',
        PAUSED: 'paused',
        COMPLETED: 'completed',
        ABANDONED: 'abandoned'
    },
    
    // Session modes (for UI display)
    MODE: {
        ACTIVE: 'active',      // New session being created
        RESUMING: 'resuming',  // Continuing a paused session
        REVIEW: 'review'       // Viewing historical session (read-only)
    },
    
    // Current active session state
    currentSession: null,
    currentMode: null,
    currentWorkflow: null, // 'attendant' or 'sales'
    
    // Generate unique session ID
    generateId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `SES-${timestamp}-${random}`.toUpperCase();
    },
    
    // Get all sessions from storage
    getAllSessions() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading sessions:', e);
            return [];
        }
    },
    
    // Save all sessions to storage
    saveSessions(sessions) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
        } catch (e) {
            console.error('Error saving sessions:', e);
        }
    },
    
    // Create a new session
    createSession(workflowType, initialData = {}) {
        const session = {
            id: this.generateId(),
            type: workflowType, // 'attendant-swap' or 'sales-registration'
            status: this.STATUS.IN_PROGRESS,
            currentStep: 1,
            highestStep: 1,
            customerId: initialData.customerId || null,
            subscriptionId: initialData.subscriptionId || null,
            customerName: initialData.customerName || null,
            data: {
                step1: null,
                step2: null,
                step3: null,
                step4: null,
                step5: null,
                step6: null
            },
            timestamps: {
                created: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                completed: null
            },
            metadata: {
                attendantId: 'ATT-001', // Would come from auth in production
                stationId: 'STN-LOME-001' // Would come from config in production
            }
        };
        
        // Save to sessions list
        const sessions = this.getAllSessions();
        sessions.unshift(session); // Add to beginning
        
        // Limit stored sessions (keep last 100)
        if (sessions.length > 100) {
            sessions.splice(100);
        }
        
        this.saveSessions(sessions);
        this.currentSession = session;
        this.currentMode = this.MODE.ACTIVE;
        this.currentWorkflow = workflowType.split('-')[0]; // 'attendant' or 'sales'
        
        // Save current session reference
        localStorage.setItem(this.CURRENT_SESSION_KEY, JSON.stringify({
            id: session.id,
            workflow: this.currentWorkflow
        }));
        
        return session;
    },
    
    // Update session data for a step
    updateStepData(step, data) {
        if (!this.currentSession || this.currentMode === this.MODE.REVIEW) return;
        
        this.currentSession.data[`step${step}`] = data;
        this.currentSession.currentStep = step;
        if (step > this.currentSession.highestStep) {
            this.currentSession.highestStep = step;
        }
        this.currentSession.timestamps.lastUpdated = new Date().toISOString();
        
        // Extract customer info if available
        if (step === 1 && data) {
            if (data.id) this.currentSession.customerId = data.id;
            if (data.subscriptionId) this.currentSession.subscriptionId = data.subscriptionId;
            if (data.name) this.currentSession.customerName = data.name;
        }
        
        this.persistCurrentSession();
    },
    
    // Update session's current step
    updateCurrentStep(step) {
        if (!this.currentSession || this.currentMode === this.MODE.REVIEW) return;
        
        this.currentSession.currentStep = step;
        this.currentSession.timestamps.lastUpdated = new Date().toISOString();
        this.persistCurrentSession();
    },
    
    // Persist current session to storage
    persistCurrentSession() {
        if (!this.currentSession) return;
        
        const sessions = this.getAllSessions();
        const index = sessions.findIndex(s => s.id === this.currentSession.id);
        
        if (index >= 0) {
            sessions[index] = this.currentSession;
        } else {
            sessions.unshift(this.currentSession);
        }
        
        this.saveSessions(sessions);
    },
    
    // Complete a session
    completeSession() {
        if (!this.currentSession || this.currentMode === this.MODE.REVIEW) return;
        
        this.currentSession.status = this.STATUS.COMPLETED;
        this.currentSession.timestamps.completed = new Date().toISOString();
        this.currentSession.timestamps.lastUpdated = new Date().toISOString();
        
        this.persistCurrentSession();
        
        // Clear current session reference
        localStorage.removeItem(this.CURRENT_SESSION_KEY);
        
        const completedSession = this.currentSession;
        this.currentSession = null;
        this.currentMode = null;
        
        return completedSession;
    },
    
    // Pause/abandon current session
    pauseSession() {
        if (!this.currentSession || this.currentMode === this.MODE.REVIEW) return;
        
        this.currentSession.status = this.STATUS.PAUSED;
        this.currentSession.timestamps.lastUpdated = new Date().toISOString();
        
        this.persistCurrentSession();
    },
    
    // Abandon current session
    abandonSession() {
        if (!this.currentSession) return;
        
        if (this.currentMode !== this.MODE.REVIEW) {
            this.currentSession.status = this.STATUS.ABANDONED;
            this.currentSession.timestamps.lastUpdated = new Date().toISOString();
            this.persistCurrentSession();
        }
        
        // Clear current session reference
        localStorage.removeItem(this.CURRENT_SESSION_KEY);
        
        this.currentSession = null;
        this.currentMode = null;
    },
    
    // Get session by ID
    getSessionById(sessionId) {
        const sessions = this.getAllSessions();
        return sessions.find(s => s.id === sessionId);
    },
    
    // Search sessions by subscription ID
    searchBySubscriptionId(subscriptionId) {
        const sessions = this.getAllSessions();
        const searchTerm = subscriptionId.toLowerCase().trim();
        
        return sessions.filter(s => {
            const subId = (s.subscriptionId || '').toLowerCase();
            const custId = (s.customerId || '').toLowerCase();
            const custName = (s.customerName || '').toLowerCase();
            
            return subId.includes(searchTerm) || 
                   custId.includes(searchTerm) || 
                   custName.includes(searchTerm);
        });
    },
    
    // Get sessions by workflow type
    getSessionsByType(workflowType) {
        const sessions = this.getAllSessions();
        return sessions.filter(s => s.type === workflowType);
    },
    
    // Get sessions by status
    getSessionsByStatus(status) {
        const sessions = this.getAllSessions();
        return sessions.filter(s => s.status === status);
    },
    
    // Load session for resuming (modifiable)
    resumeSession(sessionId) {
        const session = this.getSessionById(sessionId);
        if (!session) return null;
        
        // Update status to in-progress
        session.status = this.STATUS.IN_PROGRESS;
        session.timestamps.lastUpdated = new Date().toISOString();
        
        this.currentSession = session;
        this.currentMode = this.MODE.RESUMING;
        this.currentWorkflow = session.type.split('-')[0];
        
        // Update current session reference
        localStorage.setItem(this.CURRENT_SESSION_KEY, JSON.stringify({
            id: session.id,
            workflow: this.currentWorkflow
        }));
        
        this.persistCurrentSession();
        
        return session;
    },
    
    // Load session for review (read-only)
    reviewSession(sessionId) {
        const session = this.getSessionById(sessionId);
        if (!session) return null;
        
        this.currentSession = session;
        this.currentMode = this.MODE.REVIEW;
        this.currentWorkflow = session.type.split('-')[0];
        
        // Don't update current session reference for review mode
        
        return session;
    },
    
    // Exit current session mode
    exitSession() {
        if (this.currentMode === this.MODE.ACTIVE || this.currentMode === this.MODE.RESUMING) {
            this.pauseSession();
        }
        
        localStorage.removeItem(this.CURRENT_SESSION_KEY);
        this.currentSession = null;
        this.currentMode = null;
        this.currentWorkflow = null;
    },
    
    // Check for recoverable session on load
    getRecoverableSession(workflowType) {
        try {
            const currentRef = localStorage.getItem(this.CURRENT_SESSION_KEY);
            if (!currentRef) return null;
            
            const ref = JSON.parse(currentRef);
            const expectedWorkflow = workflowType.split('-')[0];
            
            if (ref.workflow !== expectedWorkflow) return null;
            
            const session = this.getSessionById(ref.id);
            if (!session) return null;
            
            // Only recover in-progress or paused sessions
            if (session.status === this.STATUS.IN_PROGRESS || 
                session.status === this.STATUS.PAUSED) {
                return session;
            }
            
            return null;
        } catch (e) {
            console.error('Error checking recoverable session:', e);
            return null;
        }
    },
    
    // Format session for display
    formatSessionForDisplay(session) {
        const stepNames = session.type === 'attendant-swap' 
            ? ['Customer', 'Old Battery', 'New Battery', 'Review', 'Payment', 'Complete']
            : ['Registration', 'Product', 'Subscription', 'Payment', 'Battery', 'Complete'];
        
        return {
            ...session,
            stepName: stepNames[session.currentStep - 1] || 'Unknown',
            totalSteps: 6,
            formattedDate: this.formatDate(session.timestamps.created),
            formattedLastUpdate: this.formatDate(session.timestamps.lastUpdated),
            displayStatus: this.formatStatus(session.status),
            displayType: session.type === 'attendant-swap' ? 'Battery Swap' : 'Registration'
        };
    },
    
    formatDate(isoString) {
        if (!isoString) return 'N/A';
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    formatStatus(status) {
        const statusMap = {
            'in-progress': 'In Progress',
            'paused': 'Paused',
            'completed': 'Completed',
            'abandoned': 'Abandoned'
        };
        return statusMap[status] || status;
    }
};

// =====================================================
// SESSION UI FUNCTIONS
// =====================================================

let currentSessionFilter = 'all';
let currentSessionModalWorkflow = null;

// Open session search modal
function openSessionModal(workflow) {
    currentSessionModalWorkflow = workflow;
    document.getElementById('session-modal').classList.add('active');
    document.getElementById('session-search-input').value = '';
    document.getElementById('session-search-input').focus();
    
    // Load sessions for current workflow
    loadSessionList(workflow);
}

// Close session modal
function closeSessionModal() {
    document.getElementById('session-modal').classList.remove('active');
    currentSessionModalWorkflow = null;
}

// Set session filter
function setSessionFilter(filter) {
    currentSessionFilter = filter;
    
    // Update filter buttons
    document.querySelectorAll('.session-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    // Reload list
    if (currentSessionModalWorkflow) {
        loadSessionList(currentSessionModalWorkflow);
    }
}

// Filter sessions based on search input
function filterSessions() {
    if (currentSessionModalWorkflow) {
        loadSessionList(currentSessionModalWorkflow);
    }
}

// Search sessions
function searchSessions() {
    if (currentSessionModalWorkflow) {
        loadSessionList(currentSessionModalWorkflow);
    }
}

// Generate dummy session data for demo purposes
function generateDummySessions(workflowType) {
    const dummySessions = [];
    const now = new Date();
    
    const customerNames = [
        'Kofi Mensah', 'Ama Owusu', 'Kwame Asante', 'Akua Boateng', 'Yaw Darko',
        'Abena Osei', 'Kojo Appiah', 'Adwoa Mensah', 'Kwesi Agyeman', 'Efua Nyamaa'
    ];
    
    const statuses = [
        SessionManager.STATUS.COMPLETED,
        SessionManager.STATUS.COMPLETED,
        SessionManager.STATUS.COMPLETED,
        SessionManager.STATUS.PAUSED,
        SessionManager.STATUS.COMPLETED,
        SessionManager.STATUS.COMPLETED,
        SessionManager.STATUS.IN_PROGRESS,
        SessionManager.STATUS.COMPLETED,
        SessionManager.STATUS.PAUSED,
        SessionManager.STATUS.COMPLETED
    ];
    
    for (let i = 0; i < 10; i++) {
        const hoursAgo = i * 4 + Math.floor(Math.random() * 3);
        const createdDate = new Date(now.getTime() - hoursAgo * 3600000);
        const status = statuses[i];
        const currentStep = status === SessionManager.STATUS.COMPLETED ? 6 : Math.floor(Math.random() * 4) + 2;
        
        dummySessions.push({
            id: `SES-${String(1000 + i).slice(1)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            type: workflowType,
            status: status,
            currentStep: currentStep,
            highestStep: currentStep,
            customerId: `CUS-${8800 + i}-KE`,
            subscriptionId: `SUB-${String(7700 + i)}-${['WK', 'MO', 'LX'][i % 3]}`,
            customerName: customerNames[i],
            data: {
                step1: { name: customerNames[i], id: `CUS-${8800 + i}-KE` },
                step2: null,
                step3: null,
                step4: null,
                step5: null,
                step6: null
            },
            timestamps: {
                created: createdDate.toISOString(),
                lastUpdated: new Date(createdDate.getTime() + Math.random() * 3600000).toISOString(),
                completed: status === SessionManager.STATUS.COMPLETED ? new Date(createdDate.getTime() + 1800000).toISOString() : null
            },
            metadata: {
                attendantId: 'ATT-001',
                stationId: 'STN-LOME-001'
            }
        });
    }
    
    return dummySessions;
}

// Load and display session list
function loadSessionList(workflow) {
    const workflowType = workflow === 'attendant' ? 'attendant-swap' : 'sales-registration';
    const searchTerm = document.getElementById('session-search-input').value.trim();
    
    let sessions = SessionManager.getSessionsByType(workflowType);
    
    // If no real sessions, use dummy data
    if (sessions.length === 0) {
        sessions = generateDummySessions(workflowType);
    }
    
    // Filter by search term
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        sessions = sessions.filter(s => {
            const subId = (s.subscriptionId || '').toLowerCase();
            const custId = (s.customerId || '').toLowerCase();
            const custName = (s.customerName || '').toLowerCase();
            return subId.includes(term) || custId.includes(term) || custName.includes(term);
        });
    }
    
    // Apply status filter
    if (currentSessionFilter !== 'all') {
        sessions = sessions.filter(s => s.status === currentSessionFilter);
    }
    
    // Sort by last updated
    sessions.sort((a, b) => new Date(b.timestamps.lastUpdated) - new Date(a.timestamps.lastUpdated));
    
    // Limit to 10 most recent
    sessions = sessions.slice(0, 10);
    
    renderSessionList(sessions, workflow);
}

// Render session list HTML
function renderSessionList(sessions, workflow) {
    const listEl = document.getElementById('session-list');
    const emptyEl = document.getElementById('session-list-empty');
    
    if (sessions.length === 0) {
        emptyEl.style.display = 'block';
        listEl.innerHTML = '';
        listEl.appendChild(emptyEl);
        return;
    }
    
    emptyEl.style.display = 'none';
    
    const html = sessions.map(session => {
        const formatted = SessionManager.formatSessionForDisplay(session);
        const canResume = session.status === SessionManager.STATUS.IN_PROGRESS || 
                          session.status === SessionManager.STATUS.PAUSED;
        
        return `
            <div class="session-card" onclick="selectSession('${session.id}', '${workflow}')">
                <div class="session-card-header">
                    <span class="session-card-id">${session.id}</span>
                    <span class="session-card-status ${session.status}">${formatted.displayStatus}</span>
                </div>
                <div class="session-card-body">
                    <div class="session-card-row">
                        <span class="session-card-label">Customer</span>
                        <span class="session-card-value">${session.customerName || session.customerId || 'Unknown'}</span>
                    </div>
                    <div class="session-card-row">
                        <span class="session-card-label">Subscription ID</span>
                        <span class="session-card-value mono">${session.subscriptionId || 'N/A'}</span>
                    </div>
                    <div class="session-card-row">
                        <span class="session-card-label">Progress</span>
                        <span class="session-card-value">Step ${session.currentStep} of ${formatted.totalSteps} (${formatted.stepName})</span>
                    </div>
                    <div class="session-card-date">${formatted.formattedLastUpdate}</div>
                </div>
                <div class="session-card-actions" onclick="event.stopPropagation()">
                    <button class="session-card-btn secondary" onclick="reviewSessionFromList('${session.id}', '${workflow}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                        Review
                    </button>
                    ${canResume ? `
                        <button class="session-card-btn primary" onclick="resumeSessionFromList('${session.id}', '${workflow}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polygon points="5 3 19 12 5 21 5 3"/>
                            </svg>
                            Resume
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    listEl.innerHTML = html;
}

// Select a session (defaults to review for completed, resume for in-progress)
function selectSession(sessionId, workflow) {
    const session = SessionManager.getSessionById(sessionId);
    if (!session) return;
    
    if (session.status === SessionManager.STATUS.COMPLETED || 
        session.status === SessionManager.STATUS.ABANDONED) {
        reviewSessionFromList(sessionId, workflow);
    } else {
        resumeSessionFromList(sessionId, workflow);
    }
}

// Resume session from list
function resumeSessionFromList(sessionId, workflow) {
    const session = SessionManager.resumeSession(sessionId);
    if (!session) return;
    
    closeSessionModal();
    sessionChoiceMade = true;
    
    // Hide any choice prompt
    hideSessionChoicePrompt(workflow);
    
    // Update UI mode
    updateSessionModeUI(workflow, SessionManager.MODE.RESUMING, session);
    
    // Update timeline styling
    updateTimelineForSessionMode(workflow, 'resuming');
    
    // Restore workflow state
    restoreWorkflowState(workflow, session);
}

// Review session from list
function reviewSessionFromList(sessionId, workflow) {
    const session = SessionManager.reviewSession(sessionId);
    if (!session) return;
    
    closeSessionModal();
    sessionChoiceMade = true;
    
    // Hide any choice prompt
    hideSessionChoicePrompt(workflow);
    
    // Update UI mode
    updateSessionModeUI(workflow, SessionManager.MODE.REVIEW, session);
    
    // Update timeline styling
    updateTimelineForSessionMode(workflow, 'review');
    
    // Restore workflow state (read-only)
    restoreWorkflowState(workflow, session);
}

// Update session mode UI indicator
function updateSessionModeUI(workflow, mode, session) {
    const prefix = workflow === 'attendant' ? 'att' : 'sales';
    const indicator = document.getElementById(`${prefix}-session-indicator`);
    const badge = document.getElementById(`${prefix}-session-badge`);
    const modeText = document.getElementById(`${prefix}-session-mode-text`);
    const sessionIdEl = document.getElementById(`${prefix}-session-id`);
    const closeBtn = document.getElementById(`${prefix}-session-close`);
    
    // Show indicator
    indicator.classList.add('visible');
    
    // Update badge
    badge.className = 'session-mode-badge ' + mode;
    
    // Update text
    const modeLabels = {
        'active': 'New Session',
        'resuming': 'Resuming',
        'review': 'Review Mode'
    };
    modeText.textContent = modeLabels[mode] || 'Session';
    
    // Update session ID
    sessionIdEl.textContent = session ? session.id : '--';
    
    // Show/hide close button (show for review mode)
    if (closeBtn) {
        closeBtn.style.display = (mode === SessionManager.MODE.REVIEW) ? 'flex' : 'none';
    }
}

// Hide session mode indicator
function hideSessionModeUI(workflow) {
    const prefix = workflow === 'attendant' ? 'att' : 'sales';
    const indicator = document.getElementById(`${prefix}-session-indicator`);
    indicator.classList.remove('visible');
}

// Exit session mode (for review mode - returns to fresh state)
function exitSessionMode(workflow) {
    SessionManager.exitSession();
    hideSessionModeUI(workflow);
    
    // Reset timeline styling
    updateTimelineForSessionMode(workflow, 'active');
    
    // Reset workflow to fresh state
    if (workflow === 'attendant') {
        attResetFlow();
        attGoToScreen(1);
        // Start fresh session
        startNewSession('attendant');
    } else if (workflow === 'sales') {
        salesResetFlow();
        salesGoToScreen(1);
        // Start fresh session
        startNewSession('sales');
    }
}

// Start a new session for workflow
function startNewSession(workflow) {
    const workflowType = workflow === 'attendant' ? 'attendant-swap' : 'sales-registration';
    const session = SessionManager.createSession(workflowType);
    updateSessionModeUI(workflow, SessionManager.MODE.ACTIVE, session);
    updateTimelineForSessionMode(workflow, 'active');
    sessionChoiceMade = true;
    return session;
}

// Restore workflow state from session
function restoreWorkflowState(workflow, session) {
    if (workflow === 'attendant') {
        restoreAttendantWorkflow(session);
    } else if (workflow === 'sales') {
        restoreSalesWorkflow(session);
    }
}

// Restore attendant workflow from session
function restoreAttendantWorkflow(session) {
    // Reset first
    attResetFlow();
    
    // Restore flow data
    if (session.data.step1) {
        attFlowData.customer = session.data.step1;
        // Update customer panel if needed
        if (session.data.step1.name) {
            updateCustomerStatePanel(mockServicePlanData, session.data.step1);
        }
    }
    if (session.data.step2) attFlowData.oldBattery = session.data.step2;
    if (session.data.step3) attFlowData.newBattery = session.data.step3;
    if (session.data.step4) attFlowData.cost = session.data.step4;
    if (session.data.step5) attFlowData.payment = session.data.step5;
    
    // Set highest reached
    attHighestReached = session.highestStep;
    
    // Navigate to current step
    attGoToScreen(session.currentStep);
}

// Restore sales workflow from session
function restoreSalesWorkflow(session) {
    // Reset first
    salesResetFlow();
    
    // Restore form data
    if (session.data.step1) {
        const d = session.data.step1;
        if (d.name) document.getElementById('customerName').value = d.name;
        if (d.email) document.getElementById('customerEmail').value = d.email;
        if (d.phone) document.getElementById('customerPhone').value = d.phone;
        if (d.city) document.getElementById('customerCity').value = d.city;
        if (d.zip) document.getElementById('customerZip').value = d.zip;
        if (d.street) document.getElementById('customerStreet').value = d.street;
    }
    
    if (session.data.step2 && session.data.step2.vehicle) {
        selectedVehicle = session.data.step2.vehicle;
        // Update vehicle UI
        document.querySelectorAll('.vehicle-card').forEach(card => card.classList.remove('selected'));
        const vehicleCard = document.querySelector(`.vehicle-card[onclick*="${selectedVehicle}"]`);
        if (vehicleCard) vehicleCard.classList.add('selected');
    }
    
    if (session.data.step3 && session.data.step3.plan) {
        selectedPlan = session.data.step3.plan;
        // Update plan UI
        document.querySelectorAll('#sales-screen-subscription .product-card').forEach(card => card.classList.remove('selected'));
        const planCard = document.querySelector(`#sales-screen-subscription .product-card[onclick*="${selectedPlan}"]`);
        if (planCard) planCard.classList.add('selected');
    }
    
    // Navigate to current step
    salesGoToScreen(session.currentStep);
}

// Sales reset flow (to be called from session management)
function salesResetFlow() {
    document.getElementById('customerName').value = '';
    document.getElementById('customerEmail').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerStreet').value = '';
    document.getElementById('customerCity').value = '';
    document.getElementById('customerZip').value = '';
    selectedVehicle = 'tuktuk2';
    selectedPlan = 'weekly';
    // Reset vehicle selection UI
    document.querySelectorAll('.vehicle-card').forEach(card => card.classList.remove('selected'));
    const defaultVehicle = document.querySelector('.vehicle-card[onclick*="tuktuk2"]');
    if (defaultVehicle) defaultVehicle.classList.add('selected');
    // Reset plan selection UI
    document.querySelectorAll('#sales-screen-subscription .product-card').forEach(card => card.classList.remove('selected'));
    const defaultPlan = document.querySelector('#sales-screen-subscription .product-card[onclick*="weekly"]');
    if (defaultPlan) defaultPlan.classList.add('selected');
}

// =====================================================
// SESSION RECOVERY/CHOICE PROMPT (In-Role)
// =====================================================

let pendingRecoverySession = null;
let pendingRecoveryWorkflow = null;

// Check for recoverable session and show choice prompt within role
function checkSessionRecovery(workflow) {
    const workflowType = workflow === 'attendant' ? 'attendant-swap' : 'sales-registration';
    const session = SessionManager.getRecoverableSession(workflowType);
    
    if (session) {
        pendingRecoverySession = session;
        pendingRecoveryWorkflow = workflow;
        sessionChoiceMade = false;
        showSessionChoicePrompt(workflow, session);
        return true;
    }
    
    // No recoverable session - mark choice as made and start fresh
    sessionChoiceMade = true;
    return false;
}

// Show session choice prompt within the role module
function showSessionChoicePrompt(workflow, session) {
    const prefix = workflow === 'attendant' ? 'att' : 'sales';
    const promptEl = document.getElementById(`${prefix}-session-choice`);
    
    if (promptEl) {
        const formatted = SessionManager.formatSessionForDisplay(session);
        
        // Update prompt content
        const customerIdEl = document.getElementById(`${prefix}-choice-customer-id`);
        const stepEl = document.getElementById(`${prefix}-choice-step`);
        
        if (customerIdEl) {
            customerIdEl.textContent = session.subscriptionId || session.customerId || session.id;
        }
        if (stepEl) {
            stepEl.textContent = session.currentStep;
        }
        
        // Show the prompt
        promptEl.classList.add('visible');
    }
}

// Hide session choice prompt within the role module
function hideSessionChoicePrompt(workflow) {
    const prefix = workflow === 'attendant' ? 'att' : 'sales';
    const promptEl = document.getElementById(`${prefix}-session-choice`);
    
    if (promptEl) {
        promptEl.classList.remove('visible');
    }
}

// Hide the old bottom recovery prompt (keeping for backwards compatibility)
function hideSessionRecovery() {
    const oldPrompt = document.getElementById('session-recovery-prompt');
    if (oldPrompt) {
        oldPrompt.classList.remove('visible');
    }
    
    // Also hide the in-role prompts
    hideSessionChoicePrompt('attendant');
    hideSessionChoicePrompt('sales');
    
    pendingRecoverySession = null;
    pendingRecoveryWorkflow = null;
}

// Start fresh session (from choice prompt)
function startFreshSession(workflow) {
    sessionChoiceMade = true;
    
    if (pendingRecoverySession) {
        // Mark the old session as paused
        SessionManager.currentSession = pendingRecoverySession;
        SessionManager.currentMode = SessionManager.MODE.RESUMING;
        SessionManager.pauseSession();
        SessionManager.currentSession = null;
        SessionManager.currentMode = null;
        localStorage.removeItem(SessionManager.CURRENT_SESSION_KEY);
    }
    
    hideSessionChoicePrompt(workflow);
    
    // Start a new session
    startNewSession(workflow);
    
    // Update timeline to show new session color
    updateTimelineForSessionMode(workflow, 'active');
}

// Resume the pending recovery session (from choice prompt)
function resumePendingSession(workflow) {
    if (!pendingRecoverySession) return;
    
    sessionChoiceMade = true;
    
    const session = SessionManager.resumeSession(pendingRecoverySession.id);
    if (!session) return;
    
    hideSessionChoicePrompt(workflow);
    
    // Update UI mode
    updateSessionModeUI(workflow, SessionManager.MODE.RESUMING, session);
    
    // Update timeline to show resuming color
    updateTimelineForSessionMode(workflow, 'resuming');
    
    // Restore workflow state
    restoreWorkflowState(workflow, session);
    
    pendingRecoverySession = null;
    pendingRecoveryWorkflow = null;
}

// Legacy function - now redirects to new flow
function dismissSessionRecovery(startFresh = false) {
    if (startFresh && pendingRecoveryWorkflow) {
        startFreshSession(pendingRecoveryWorkflow);
    } else {
        hideSessionRecovery();
    }
}

// Legacy function - now redirects to new flow
function resumeSession() {
    if (pendingRecoveryWorkflow) {
        resumePendingSession(pendingRecoveryWorkflow);
    }
}

// Update timeline styling based on session mode
function updateTimelineForSessionMode(workflow, mode) {
    const prefix = workflow === 'attendant' ? 'att' : 'sales';
    const timelineEl = document.getElementById(`${prefix}-timeline`);
    
    if (timelineEl) {
        // Remove any existing mode classes
        timelineEl.classList.remove('session-mode-active', 'session-mode-resuming', 'session-mode-review');
        
        // Add the appropriate class
        if (mode === 'active') {
            timelineEl.classList.add('session-mode-active');
        } else if (mode === 'resuming') {
            timelineEl.classList.add('session-mode-resuming');
        } else if (mode === 'review') {
            timelineEl.classList.add('session-mode-review');
        }
    }
}

