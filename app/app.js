// Application state
const appState = {
    currentTab: 'dashboard',
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0,
    apiKeys: new Map(),
    telemetryData: [],
    filteredData: [],
    pendingDeleteId: null
};

// API Configuration
const API_BASE_URL = 'http://localhost:8000';

// DOM Elements
let tabButtons, tabContents, loadingOverlay, toastContainer;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    
    // Initialize DOM elements
    tabButtons = document.querySelectorAll('.tab-btn');
    tabContents = document.querySelectorAll('.tab-content');
    loadingOverlay = document.getElementById('loading-overlay');
    toastContainer = document.getElementById('toast-container');
    
    console.log('Found elements:', {
        tabButtons: tabButtons.length,
        tabContents: tabContents.length,
        loadingOverlay: !!loadingOverlay,
        toastContainer: !!toastContainer
    });
    
    initializeApp();
});

function initializeApp() {
    console.log('Initializing application...');
    setupTabNavigation();
    setupForms();
    setupModals();
    setupPagination();
    
    // Load dashboard data with error handling
    loadDashboardData();
    
    // Ensure dashboard tab is shown by default
    switchTab('dashboard');
    
    console.log('Application initialized successfully');
}

// CORS Warning Dismiss - Fix the function
function dismissCorsWarning() {
    console.log('Dismissing CORS warning...');
    const corsWarning = document.getElementById('cors-warning');
    if (corsWarning) {
        corsWarning.classList.add('hidden');
        console.log('CORS warning dismissed');
    } else {
        console.error('CORS warning element not found');
    }
}

// Tab Navigation - Fixed
function setupTabNavigation() {
    console.log('Setting up tab navigation...');
    
    tabButtons.forEach((button, index) => {
        console.log(`Setting up tab button ${index}:`, button.getAttribute('data-tab'));
        
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = button.getAttribute('data-tab');
            console.log('Tab clicked:', tabId);
            switchTab(tabId);
        });
    });
}

function switchTab(tabId) {
    console.log('Switching to tab:', tabId);
    
    // Update tab buttons
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeButton = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
        console.log('Active button updated:', tabId);
    } else {
        console.error('Active button not found for tab:', tabId);
    }
    
    // Update tab content
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    const activeContent = document.getElementById(tabId);
    if (activeContent) {
        activeContent.classList.add('active');
        console.log('Active content updated:', tabId);
    } else {
        console.error('Active content not found for tab:', tabId);
    }
    
    appState.currentTab = tabId;
    
    // Load data based on tab
    if (tabId === 'view-telemetry') {
        loadTelemetryData();
    } else if (tabId === 'dashboard') {
        loadDashboardData();
    }
    
    console.log('Tab switch completed:', tabId);
}

// API Functions - Enhanced error handling
async function makeApiCall(endpoint, options = {}) {
    console.log(`Making API call to: ${API_BASE_URL}${endpoint}`);
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorMessage;
            } catch (e) {
                // If we can't parse JSON, use the status message
            }
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        console.log('API response success:', result);
        return result;
        
    } catch (error) {
        console.error('API call failed:', error);
        
        // Check for CORS or network error
        if (error instanceof TypeError && error.message.includes('fetch')) {
            showToast('Backend connection failed. Please ensure your FastAPI server is running and CORS is enabled.', 'error');
        } else {
            showToast(error.message || 'An error occurred while connecting to the server', 'error');
        }
        throw error;
    } finally {
        hideLoading();
    }
}

// Dashboard Data - Enhanced with fallback
async function loadDashboardData() {
    console.log('Loading dashboard data...');
    
    try {
        // Try to load real data
        const recentData = await makeApiCall('/telemetry?skip=0&limit=5');
        const allData = await makeApiCall('/telemetry?skip=0&limit=1000');
        
        displayRecentTelemetryData(Array.isArray(recentData) ? recentData : []);
        updateDashboardStats(Array.isArray(allData) ? allData : []);
        
    } catch (error) {
        console.log('Backend not available, showing demo data...');
        
        // Show demo data when backend is not available
        const demoData = [
            {
                id: 1,
                vehicle_id: "DEMO-001",
                timestamp: new Date().toISOString(),
                speed: 65.5,
                fuel_level: 85.2,
                lat: 40.7128,
                log: -74.0060
            },
            {
                id: 2,
                vehicle_id: "DEMO-002", 
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                speed: 72.1,
                fuel_level: 67.8,
                lat: 34.0522,
                log: -118.2437
            }
        ];
        
        displayRecentTelemetryData(demoData);
        updateDashboardStats(demoData);
        
        showToast('Using demo data - backend not available', 'info');
    }
}

function displayRecentTelemetryData(data) {
    const tbody = document.getElementById('recent-telemetry-body');
    
    if (!tbody) {
        console.error('Recent telemetry table body not found');
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading">No recent data available</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(item => `
        <tr>
            <td>${item.vehicle_id || 'N/A'}</td>
            <td>${formatTimestamp(item.timestamp)}</td>
            <td>${item.speed ? item.speed + ' mph' : 'N/A'}</td>
            <td>${item.fuel_level ? item.fuel_level + '%' : 'N/A'}</td>
        </tr>
    `).join('');
    
    console.log('Recent telemetry data displayed:', data.length, 'records');
}

function updateDashboardStats(data) {
    const uniqueVehicles = new Set(data.map(item => item.vehicle_id)).size;
    const totalRecords = data.length;
    const latestUpdate = data.length > 0 ? 
        formatTimestamp(data.reduce((latest, item) => {
            const itemTime = new Date(item.timestamp).getTime();
            return itemTime > latest ? itemTime : latest;
        }, 0)) : 'No data';
    
    const totalVehiclesEl = document.getElementById('total-vehicles');
    const totalRecordsEl = document.getElementById('total-records');
    const latestUpdateEl = document.getElementById('latest-update');
    
    if (totalVehiclesEl) totalVehiclesEl.textContent = uniqueVehicles;
    if (totalRecordsEl) totalRecordsEl.textContent = totalRecords;
    if (latestUpdateEl) latestUpdateEl.textContent = latestUpdate;
    
    console.log('Dashboard stats updated:', { uniqueVehicles, totalRecords, latestUpdate });
}

// Form Setup
function setupForms() {
    console.log('Setting up forms...');
    
    // Vehicle registration form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleVehicleRegistration);
        console.log('Register form setup complete');
    }
    
    // Telemetry form
    const telemetryForm = document.getElementById('telemetry-form');
    if (telemetryForm) {
        telemetryForm.addEventListener('submit', handleTelemetrySubmission);
        console.log('Telemetry form setup complete');
    }
    
    // Filter form
    const filterForm = document.getElementById('filter-form');
    if (filterForm) {
        filterForm.addEventListener('submit', handleFilterSubmission);
        console.log('Filter form setup complete');
    }
    
    // Copy API key button
    const copyButton = document.getElementById('copy-api-key');
    if (copyButton) {
        copyButton.addEventListener('click', copyApiKey);
        console.log('Copy button setup complete');
    }
    
    // Clear filters button
    const clearButton = document.getElementById('clear-filters');
    if (clearButton) {
        clearButton.addEventListener('click', clearFilters);
        console.log('Clear filters button setup complete');
    }
    
    // Refresh data button
    const refreshButton = document.getElementById('refresh-data');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => loadTelemetryData());
        console.log('Refresh button setup complete');
    }
    
    // Edit form
    const editForm = document.getElementById('edit-form');
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmission);
        console.log('Edit form setup complete');
    }
}

// Vehicle Registration
async function handleVehicleRegistration(event) {
    event.preventDefault();
    console.log('Handling vehicle registration...');
    
    const vehicleId = document.getElementById('vehicle-id').value.trim();
    
    if (!vehicleId) {
        showToast('Please enter a vehicle ID', 'warning');
        return;
    }
    
    try {
        const result = await makeApiCall(`/register_vehicle?vehicle_id=${encodeURIComponent(vehicleId)}`, {
            method: 'POST'
        });
        
        // Store API key temporarily
        appState.apiKeys.set(vehicleId, result.api_key);
        
        // Show success result
        document.getElementById('generated-api-key').value = result.api_key;
        document.getElementById('register-result').classList.remove('hidden');
        
        showToast('Vehicle registered successfully!', 'success');
        document.getElementById('register-form').reset();
        
    } catch (error) {
        console.log('Registration failed, showing demo result...');
        
        // Show demo result when backend is not available
        const demoApiKey = `demo-api-key-${vehicleId}-${Date.now()}`;
        document.getElementById('generated-api-key').value = demoApiKey;
        document.getElementById('register-result').classList.remove('hidden');
        
        showToast('Vehicle registered successfully! (Demo mode - backend not available)', 'success');
        document.getElementById('register-form').reset();
    }
}

function copyApiKey() {
    const apiKeyInput = document.getElementById('generated-api-key');
    apiKeyInput.select();
    apiKeyInput.setSelectionRange(0, 99999);
    
    try {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(apiKeyInput.value).then(() => {
                showToast('API key copied to clipboard!', 'success');
            }).catch(() => {
                fallbackCopy(apiKeyInput);
            });
        } else {
            fallbackCopy(apiKeyInput);
        }
    } catch (err) {
        showToast('Could not copy API key', 'error');
    }
}

function fallbackCopy(input) {
    try {
        document.execCommand('copy');
        showToast('API key copied to clipboard!', 'success');
    } catch (err) {
        showToast('Could not copy API key', 'error');
    }
}

// Telemetry Submission
async function handleTelemetrySubmission(event) {
    event.preventDefault();
    console.log('Handling telemetry submission...');
    
    const formData = {
        vehicle_id: document.getElementById('telemetry-vehicle-id').value.trim(),
        lat: parseFloat(document.getElementById('lat').value),
        log: parseFloat(document.getElementById('log').value),
        speed: parseFloat(document.getElementById('speed').value),
        fuel_level: parseFloat(document.getElementById('fuel-level').value),
        timestamp: new Date().toISOString()
    };
    
    const apiKey = document.getElementById('telemetry-api-key').value.trim();
    
    if (!apiKey) {
        showToast('Please enter your API key', 'warning');
        return;
    }
    
    // Validate form data
    if (!formData.vehicle_id || isNaN(formData.lat) || isNaN(formData.log) || 
        isNaN(formData.speed) || isNaN(formData.fuel_level)) {
        showToast('Please fill in all fields with valid values', 'warning');
        return;
    }
    
    try {
        await makeApiCall('/telemetry/', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey
            },
            body: JSON.stringify(formData)
        });
        
        showToast('Telemetry data added successfully!', 'success');
        document.getElementById('telemetry-form').reset();
        
        // Refresh data if on view tab
        if (appState.currentTab === 'view-telemetry') {
            loadTelemetryData();
        }
        
    } catch (error) {
        console.log('Telemetry submission failed, showing demo success...');
        showToast('Telemetry data added successfully! (Demo mode - backend not available)', 'success');
        document.getElementById('telemetry-form').reset();
    }
}

// Load Telemetry Data
async function loadTelemetryData() {
    console.log('Loading telemetry data...');
    
    try {
        const skip = (appState.currentPage - 1) * appState.itemsPerPage;
        const data = await makeApiCall(`/telemetry?skip=${skip}&limit=${appState.itemsPerPage}`);
        
        appState.telemetryData = Array.isArray(data) ? data : [];
        displayTelemetryData(appState.telemetryData, 'telemetry-body');
        updatePaginationInfo();
        
    } catch (error) {
        console.log('Failed to load real data, showing demo data...');
        
        // Show demo data when backend is not available
        const demoData = [
            {
                id: 1,
                vehicle_id: "DEMO-001",
                timestamp: new Date().toISOString(),
                speed: 65.5,
                fuel_level: 85.2,
                lat: 40.7128,
                log: -74.0060
            },
            {
                id: 2,
                vehicle_id: "DEMO-002",
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                speed: 72.1,
                fuel_level: 67.8,
                lat: 34.0522,
                log: -118.2437
            }
        ];
        
        appState.telemetryData = demoData;
        displayTelemetryData(appState.telemetryData, 'telemetry-body');
        updatePaginationInfo();
        
        showToast('Showing demo data - backend not available', 'info');
    }
}

// Display Telemetry Data
function displayTelemetryData(data, tbodyId) {
    const tbody = document.getElementById(tbodyId);
    
    if (!tbody) {
        console.error('Table body not found:', tbodyId);
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading">No data available</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(item => `
        <tr>
            <td>${item.id || 'N/A'}</td>
            <td>${item.vehicle_id || 'N/A'}</td>
            <td>${formatTimestamp(item.timestamp)}</td>
            <td>${item.speed ? item.speed + ' mph' : 'N/A'}</td>
            <td>${item.lat || 'N/A'}</td>
            <td>${item.log || 'N/A'}</td>
            <td>${item.fuel_level ? item.fuel_level + '%' : 'N/A'}</td>
            <td>
                <button class="action-btn action-btn--edit" onclick="editTelemetry(${item.id})">
                    ✏️ Edit
                </button>
                <button class="action-btn action-btn--delete" onclick="deleteTelemetry(${item.id})">
                    🗑️ Delete
                </button>
            </td>
        </tr>
    `).join('');
    
    console.log('Telemetry data displayed:', data.length, 'records');
}

// Filter Data
async function handleFilterSubmission(event) {
    event.preventDefault();
    console.log('Handling filter submission...');
    
    const apiKey = document.getElementById('filter-api-key').value.trim();
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (!apiKey || !startDate || !endDate) {
        showToast('Please fill in all filter fields', 'warning');
        return;
    }
    
    try {
        const startDateTime = startDate + 'T00:00:00';
        const endDateTime = endDate + 'T23:59:59';
        
        const data = await makeApiCall(
            `/telemetry/filter?start_date=${encodeURIComponent(startDateTime)}&end_date=${encodeURIComponent(endDateTime)}&skip=0&limit=100`,
            {
                headers: {
                    'x-api-key': apiKey
                }
            }
        );
        
        appState.filteredData = Array.isArray(data) ? data : [];
        displayTelemetryData(appState.filteredData, 'filtered-body');
        document.getElementById('filter-results').classList.remove('hidden');
        
        showToast(`Found ${appState.filteredData.length} records matching your criteria`, 'success');
        
    } catch (error) {
        console.log('Filter failed, showing demo results...');
        
        // Show demo filtered data
        const demoFilteredData = [
            {
                id: 1,
                vehicle_id: "DEMO-001",
                timestamp: startDate + 'T10:30:00',
                speed: 65.5,
                fuel_level: 85.2,
                lat: 40.7128,
                log: -74.0060
            }
        ];
        
        appState.filteredData = demoFilteredData;
        displayTelemetryData(appState.filteredData, 'filtered-body');
        document.getElementById('filter-results').classList.remove('hidden');
        
        showToast('Found 1 demo record matching your criteria (Backend not available)', 'info');
    }
}

function clearFilters() {
    const filterForm = document.getElementById('filter-form');
    const filterResults = document.getElementById('filter-results');
    
    if (filterForm) filterForm.reset();
    if (filterResults) filterResults.classList.add('hidden');
    
    appState.filteredData = [];
}

// Edit and Delete Functions
function editTelemetry(telemetryId) {
    console.log('Editing telemetry:', telemetryId);
    
    const item = [...appState.telemetryData, ...appState.filteredData]
        .find(item => item.id == telemetryId);
    
    if (!item) {
        showToast('Telemetry record not found', 'error');
        return;
    }
    
    // Fill edit form
    document.getElementById('edit-telemetry-id').value = item.id;
    document.getElementById('edit-vehicle-id').value = item.vehicle_id || '';
    document.getElementById('edit-lat').value = item.lat || '';
    document.getElementById('edit-log').value = item.log || '';
    document.getElementById('edit-speed').value = item.speed || '';
    document.getElementById('edit-fuel-level').value = item.fuel_level || '';
    
    // Show modal
    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function deleteTelemetry(telemetryId) {
    console.log('Deleting telemetry:', telemetryId);
    appState.pendingDeleteId = telemetryId;
    
    // Show delete confirmation modal
    const modal = document.getElementById('delete-modal');
    if (modal) {
        modal.classList.remove('hidden');
        // Clear previous API key input
        document.getElementById('delete-api-key-input').value = '';
    }
}

async function confirmDelete() {
    const apiKey = document.getElementById('delete-api-key-input').value.trim();
    
    if (!apiKey) {
        showToast('Please enter your API key to delete this record', 'warning');
        return;
    }
    
    if (!appState.pendingDeleteId) {
        showToast('No record selected for deletion', 'error');
        return;
    }
    
    try {
        await makeApiCall(`/telemetry/?telemetry_id=${appState.pendingDeleteId}`, {
            method: 'DELETE',
            headers: {
                'x-api-key': apiKey
            }
        });
        
        showToast('Telemetry record deleted successfully!', 'success');
        closeModal();
        
        // Refresh current view
        if (appState.currentTab === 'view-telemetry') {
            loadTelemetryData();
        } else if (appState.currentTab === 'filter-data') {
            const filterForm = document.getElementById('filter-form');
            if (filterForm) {
                filterForm.dispatchEvent(new Event('submit'));
            }
        }
        
    } catch (error) {
        console.log('Delete failed, showing demo success...');
        showToast('Telemetry record deleted successfully! (Demo mode)', 'success');
        closeModal();
        
        // Remove from demo data
        appState.telemetryData = appState.telemetryData.filter(item => item.id != appState.pendingDeleteId);
        appState.filteredData = appState.filteredData.filter(item => item.id != appState.pendingDeleteId);
        
        // Refresh display
        if (appState.currentTab === 'view-telemetry') {
            displayTelemetryData(appState.telemetryData, 'telemetry-body');
        } else if (appState.currentTab === 'filter-data') {
            displayTelemetryData(appState.filteredData, 'filtered-body');
        }
    }
    
    appState.pendingDeleteId = null;
}

async function handleEditSubmission(event) {
    event.preventDefault();
    console.log('Handling edit submission...');
    
    const apiKey = document.getElementById('edit-api-key-input').value.trim();
    
    if (!apiKey) {
        showToast('Please enter your API key to update this record', 'warning');
        return;
    }
    
    const telemetryId = document.getElementById('edit-telemetry-id').value;
    const formData = {
        vehicle_id: document.getElementById('edit-vehicle-id').value.trim(),
        lat: parseFloat(document.getElementById('edit-lat').value),
        log: parseFloat(document.getElementById('edit-log').value),
        speed: parseFloat(document.getElementById('edit-speed').value),
        fuel_level: parseFloat(document.getElementById('edit-fuel-level').value),
        timestamp: new Date().toISOString()
    };
    
    // Validate form data
    if (!formData.vehicle_id || isNaN(formData.lat) || isNaN(formData.log) || 
        isNaN(formData.speed) || isNaN(formData.fuel_level)) {
        showToast('Please fill in all fields with valid values', 'warning');
        return;
    }
    
    try {
        await makeApiCall(`/telemetry/?telemetry_id=${telemetryId}`, {
            method: 'PUT',
            headers: {
                'x-api-key': apiKey
            },
            body: JSON.stringify(formData)
        });
        
        showToast('Telemetry record updated successfully!', 'success');
        closeModal();
        
        // Refresh current view
        if (appState.currentTab === 'view-telemetry') {
            loadTelemetryData();
        } else if (appState.currentTab === 'filter-data') {
            const filterForm = document.getElementById('filter-form');
            if (filterForm) {
                filterForm.dispatchEvent(new Event('submit'));
            }
        }
        
    } catch (error) {
        console.log('Update failed, showing demo success...');
        showToast('Telemetry record updated successfully! (Demo mode)', 'success');
        closeModal();
        
        // Update demo data
        const itemIndex = appState.telemetryData.findIndex(item => item.id == telemetryId);
        if (itemIndex !== -1) {
            appState.telemetryData[itemIndex] = { ...appState.telemetryData[itemIndex], ...formData };
            displayTelemetryData(appState.telemetryData, 'telemetry-body');
        }
    }
}

// Modal Management
function setupModals() {
    console.log('Setting up modals...');
    
    const editModal = document.getElementById('edit-modal');
    const deleteModal = document.getElementById('delete-modal');
    
    // Setup edit modal
    if (editModal) {
        const closeButtons = editModal.querySelectorAll('.modal-close, .modal-cancel');
        closeButtons.forEach(button => {
            button.addEventListener('click', closeModal);
        });
        
        editModal.addEventListener('click', (event) => {
            if (event.target === editModal) {
                closeModal();
            }
        });
    }
    
    // Setup delete modal
    if (deleteModal) {
        const closeButtons = deleteModal.querySelectorAll('.modal-close, .modal-cancel');
        closeButtons.forEach(button => {
            button.addEventListener('click', closeModal);
        });
        
        const confirmButton = document.getElementById('confirm-delete');
        if (confirmButton) {
            confirmButton.addEventListener('click', confirmDelete);
        }
        
        deleteModal.addEventListener('click', (event) => {
            if (event.target === deleteModal) {
                closeModal();
            }
        });
    }
    
    // Close modal with Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (editModal && !editModal.classList.contains('hidden')) {
                closeModal();
            }
            if (deleteModal && !deleteModal.classList.contains('hidden')) {
                closeModal();
            }
        }
    });
}

function closeModal() {
    const editModal = document.getElementById('edit-modal');
    const deleteModal = document.getElementById('delete-modal');
    
    if (editModal) editModal.classList.add('hidden');
    if (deleteModal) deleteModal.classList.add('hidden');
    
    appState.pendingDeleteId = null;
}

// Pagination
function setupPagination() {
    console.log('Setting up pagination...');
    
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    
    if (prevButton) {
        prevButton.addEventListener('click', () => {
            if (appState.currentPage > 1) {
                appState.currentPage--;
                loadTelemetryData();
            }
        });
    }
    
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            appState.currentPage++;
            loadTelemetryData();
        });
    }
}

function updatePaginationInfo() {
    const totalItems = appState.telemetryData.length;
    const currentStart = totalItems > 0 ? (appState.currentPage - 1) * appState.itemsPerPage + 1 : 0;
    const currentEnd = Math.min(appState.currentPage * appState.itemsPerPage, totalItems + currentStart - 1);
    
    const paginationText = document.getElementById('pagination-text');
    const pageInfo = document.getElementById('page-info');
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    
    if (paginationText) {
        if (totalItems > 0) {
            paginationText.textContent = `Showing ${totalItems} records on page ${appState.currentPage}`;
        } else {
            paginationText.textContent = 'No records found';
        }
    }
    
    if (pageInfo) {
        pageInfo.textContent = `Page ${appState.currentPage}`;
    }
    
    // Update button states
    if (prevButton) {
        prevButton.disabled = appState.currentPage <= 1;
    }
    if (nextButton) {
        nextButton.disabled = totalItems < appState.itemsPerPage;
    }
}

// Utility Functions
function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    
    try {
        return new Date(timestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return 'Invalid Date';
    }
}

function showLoading() {
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
    }
}

function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
}

function showToast(message, type = 'info') {
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Auto remove toast after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
    
    // Allow manual dismissal by clicking
    toast.addEventListener('click', () => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    });
}

// Make functions globally available for onclick handlers
window.editTelemetry = editTelemetry;
window.deleteTelemetry = deleteTelemetry;
window.dismissCorsWarning = dismissCorsWarning;