// ==================== CONFIGURATION ====================
const CONFIG = {
  API_ENDPOINT: 'https://your-api-endpoint.com/api/survey/submit',
  MAX_SELECTIONS: {
    languages: 5,
    frameworks: 5,
    challenges: 5,
    stayUpdated: 3,
    learningResources: 3,
    jobChangeReasons: 3
  },
  SURVEY_VERSION: '2026.1.0',
  DEBUG_MODE: true
};

// ==================== STATE MANAGEMENT ====================
const AppState = {
  currentSection: 1,
  totalSections: 11,
  formData: {},
  validationErrors: {},
  isSubmitting: false,
  checkboxCounts: {}
};

// ==================== DOM ELEMENTS ====================
const DOM = {
  surveyForm: null,
  loadingOverlay: null,
  successMessage: null,
  errorMessage: null,
  errorText: null,
  progressFill: null,
  progressText: null,
  submitButton: null,
  emailField: null,
  receiveReportSelect: null,
  consentCheckbox: null
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
  initializeDOM();
  setupEventListeners();
  setupCheckboxLimiters();
  setupEmailFieldToggle();
  setupProgressTracking();
  consoleWelcomeMessage();
  
  if (CONFIG.DEBUG_MODE) {
    enableDebugFeatures();
  }
});

function initializeDOM() {
  DOM.surveyForm = document.getElementById('surveyForm');
  DOM.loadingOverlay = document.getElementById('loadingOverlay');
  DOM.successMessage = document.getElementById('successMessage');
  DOM.errorMessage = document.getElementById('errorMessage');
  DOM.errorText = document.getElementById('errorText');
  DOM.progressFill = document.getElementById('progressFill');
  DOM.progressText = document.getElementById('progressText');
  DOM.submitButton = DOM.surveyForm?.querySelector('button[type="submit"]');
  DOM.emailField = document.getElementById('emailField');
  DOM.receiveReportSelect = document.querySelector('select[name="receiveReport"]');
  DOM.consentCheckbox = document.getElementById('consentCheck');
}

// ==================== PROGRESS TRACKING ====================
function setupProgressTracking() {
  if (!DOM.surveyForm || !DOM.progressFill || !DOM.progressText) return;
  
  const sections = DOM.surveyForm.querySelectorAll('.section-title');
  const totalSections = sections.length;
  const progressContainer = document.createElement('div');
  progressContainer.className = 'progress-container';
  progressContainer.innerHTML = `
    <div class="progress-bar">
      <div class="progress-fill" id="progressFill" style="width: 0%"></div>
    </div>
    <div class="progress-text" id="progressText">
      <span>Progress: <span id="progressPercent">0%</span></span>
      <span>Section <span id="currentSection">1</span> of ${totalSections}</span>
    </div>
  `;
  
  DOM.surveyForm.insertBefore(progressContainer, DOM.surveyForm.firstChild);
  
  DOM.progressFill = document.getElementById('progressFill');
  DOM.progressText = document.getElementById('progressText');
  
  updateProgress();
  
  // Update progress on scroll
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(updateProgress, 100);
  });
}

function updateProgress() {
  if (!DOM.progressFill) return;
  
  const sections = document.querySelectorAll('.section-title');
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight - windowHeight;
  const scrolled = window.scrollY;
  const scrollPercentage = Math.min((scrolled / documentHeight) * 100, 100);
  
  DOM.progressFill.style.width = `${scrollPercentage}%`;
  
  // Find current section based on scroll position
  let currentSection = 1;
  sections.forEach((section, index) => {
    const rect = section.getBoundingClientRect();
    if (rect.top <= windowHeight / 2) {
      currentSection = index + 1;
    }
  });
  
  const progressPercent = document.getElementById('progressPercent');
  const currentSectionEl = document.getElementById('currentSection');
  
  if (progressPercent) {
    progressPercent.textContent = `${Math.round(scrollPercentage)}%`;
  }
  if (currentSectionEl) {
    currentSectionEl.textContent = currentSection;
  }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  if (DOM.surveyForm) {
    DOM.surveyForm.addEventListener('submit', handleFormSubmit);
  }
  
  // Real-time validation for required fields
  const requiredFields = document.querySelectorAll('[required]');
  requiredFields.forEach(field => {
    field.addEventListener('blur', validateField);
    field.addEventListener('change', validateField);
  });
  
  // Section navigation
  const sectionTitles = document.querySelectorAll('.section-title');
  sectionTitles.forEach(title => {
    title.style.cursor = 'pointer';
    title.addEventListener('click', () => {
      title.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  
  // Save form state periodically
  setInterval(saveFormState, 10000);
  
  // Load saved state if exists
  loadFormState();
}

function setupEmailFieldToggle() {
  if (!DOM.receiveReportSelect || !DOM.emailField) return;
  
  DOM.receiveReportSelect.addEventListener('change', function() {
    if (this.value === 'Yes, please send me the report') {
      DOM.emailField.style.display = 'block';
      DOM.emailField.querySelector('input').setAttribute('required', 'required');
    } else {
      DOM.emailField.style.display = 'none';
      DOM.emailField.querySelector('input').removeAttribute('required');
    }
  });
}

// ==================== CHECKBOX LIMITERS ====================
function setupCheckboxLimiters() {
  Object.keys(CONFIG.MAX_SELECTIONS).forEach(groupName => {
    const checkboxes = document.querySelectorAll(`input[name="${groupName}"]`);
    const counter = document.createElement('span');
    counter.className = 'selection-counter';
    counter.textContent = `(0/${CONFIG.MAX_SELECTIONS[groupName]} selected)`;
    
    // Find the label for this group and append counter
    const label = document.querySelector(`label:has(~ br ~ .form-check input[name="${groupName}"])`);
    if (label) {
      label.appendChild(counter);
    }
    
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', function() {
        const checkedCount = document.querySelectorAll(`input[name="${groupName}"]:checked`).length;
        const maxSelections = CONFIG.MAX_SELECTIONS[groupName];
        
        counter.textContent = `(${checkedCount}/${maxSelections} selected)`;
        
        if (checkedCount > maxSelections) {
          this.checked = false;
          showNotification(`Please select only up to ${maxSelections} options for this question`, 'warning');
        }
      });
    });
  });
}

// ==================== FORM VALIDATION ====================
function validateField(e) {
  const field = e.target;
  const value = field.value;
  const isRequired = field.hasAttribute('required');
  const isEmpty = !value || value.trim() === '' || value === '';
  
  if (isRequired && isEmpty) {
    field.classList.add('is-invalid');
    showInlineError(field, 'This field is required');
    return false;
  } else {
    field.classList.remove('is-invalid');
    clearInlineError(field);
    return true;
  }
}

function validateForm() {
  const requiredFields = document.querySelectorAll('[required]');
  let isValid = true;
  const errors = [];
  
  requiredFields.forEach(field => {
    const value = field.value;
    const isEmpty = !value || value.trim() === '' || value === '';
    
    if (isEmpty) {
      field.classList.add('is-invalid');
      isValid = false;
      errors.push({
        field: field.name,
        message: 'This field is required'
      });
      
      // Scroll to first error
      if (errors.length === 1) {
        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
        field.focus();
      }
    } else {
      field.classList.remove('is-invalid');
    }
  });
  
  // Check consent
  if (!DOM.consentCheckbox.checked) {
    DOM.consentCheckbox.classList.add('is-invalid');
    isValid = false;
    errors.push({
      field: 'consent',
      message: 'You must agree to the terms before submitting'
    });
  } else {
    DOM.consentCheckbox.classList.remove('is-invalid');
  }
  
  return { isValid, errors };
}

function showInlineError(field, message) {
  let errorDiv = field.parentElement.querySelector('.invalid-feedback');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback';
    field.parentElement.appendChild(errorDiv);
  }
  errorDiv.textContent = message;
}

function clearInlineError(field) {
  const errorDiv = field.parentElement.querySelector('.invalid-feedback');
  if (errorDiv) {
    errorDiv.remove();
  }
}

// ==================== FORM SUBMISSION ====================
async function handleFormSubmit(e) {
  e.preventDefault();
  
  // Validate form
  const { isValid, errors } = validateForm();
  if (!isValid) {
    showNotification('Please fill in all required fields', 'error');
    return false;
  }
  
  // Show loading state
  showLoading(true);
  
  try {
    // Collect form data
    const formData = collectFormData();
    
    // Add metadata
    const metadata = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      surveyVersion: CONFIG.SURVEY_VERSION,
      submissionId: generateSubmissionId()
    };
    
    const submissionData = {
      ...formData,
      metadata
    };
    
    console.log('Submitting survey data:', submissionData);
    
    // Send to API
    const response = await fetch(CONFIG.API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Survey-Version': CONFIG.SURVEY_VERSION
      },
      body: JSON.stringify(submissionData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('API Response:', result);
    
    // Show success
    showSuccess();
    
    // Clear saved form state
    localStorage.removeItem('zimDevSurvey2026');
    
    // Reset form after delay
    setTimeout(() => {
      DOM.surveyForm.reset();
      showLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 2000);
    
  } catch (error) {
    console.error('Submission Error:', error);
    showError(`Failed to submit: ${error.message}. Please try again or contact support.`);
    showLoading(false);
  }
}

function collectFormData() {
  const formData = {};
  const form = DOM.surveyForm;
  
  // Collect all form elements
  const elements = form.elements;
  
  for (let element of elements) {
    if (!element.name) continue;
    
    if (element.type === 'checkbox') {
      if (!formData[element.name]) {
        formData[element.name] = [];
      }
      if (element.checked) {
        formData[element.name].push(element.value);
      }
    } else if (element.type === 'radio') {
      if (element.checked) {
        formData[element.name] = element.value;
      }
    } else if (element.type === 'select-multiple') {
      formData[element.name] = Array.from(element.selectedOptions).map(opt => opt.value);
    } else {
      formData[element.name] = element.value;
    }
  }
  
  // Filter out empty arrays and strings
  Object.keys(formData).forEach(key => {
    if (Array.isArray(formData[key]) && formData[key].length === 0) {
      delete formData[key];
    } else if (typeof formData[key] === 'string' && formData[key].trim() === '') {
      delete formData[key];
    }
  });
  
  return formData;
}

// ==================== UI FEEDBACK FUNCTIONS ====================
function showLoading(show) {
  if (show) {
    DOM.loadingOverlay.classList.add('show');
    if (DOM.submitButton) {
      DOM.submitButton.disabled = true;
      DOM.submitButton.querySelector('.submit-text').classList.add('d-none');
      DOM.submitButton.querySelector('.spinner-border').classList.remove('d-none');
    }
  } else {
    DOM.loadingOverlay.classList.remove('show');
    if (DOM.submitButton) {
      DOM.submitButton.disabled = false;
      DOM.submitButton.querySelector('.submit-text').classList.remove('d-none');
      DOM.submitButton.querySelector('.spinner-border').classList.add('d-none');
    }
  }
}

function showSuccess() {
  DOM.successMessage.classList.add('show');
  
  // Auto-hide after 10 seconds
  setTimeout(() => {
    DOM.successMessage.classList.remove('show');
  }, 10000);
}

function showError(message) {
  DOM.errorText.textContent = message;
  DOM.errorMessage.classList.add('show');
  
  // Auto-hide after 15 seconds
  setTimeout(() => {
    DOM.errorMessage.classList.remove('show');
  }, 15000);
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    min-width: 300px;
    max-width: 400px;
    animation: slideIn 0.3s ease;
  `;
  
  notification.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

// ==================== FORM STATE PERSISTENCE ====================
function saveFormState() {
  const formData = collectFormData();
  localStorage.setItem('zimDevSurvey2026', JSON.stringify({
    data: formData,
    timestamp: new Date().toISOString()
  }));
}

function loadFormState() {
  const saved = localStorage.getItem('zimDevSurvey2026');
  if (!saved) return;
  
  try {
    const { data, timestamp } = JSON.parse(saved);
    const savedDate = new Date(timestamp);
    const now = new Date();
    const hoursDiff = (now - savedDate) / (1000 * 60 * 60);
    
    // Only load if saved within 24 hours
    if (hoursDiff > 24) {
      localStorage.removeItem('zimDevSurvey2026');
      return;
    }
    
    // Restore form data
    Object.keys(data).forEach(name => {
      const element = DOM.surveyForm.querySelector(`[name="${name}"]`);
      if (!element) return;
      
      if (element.type === 'checkbox') {
        const values = Array.isArray(data[name]) ? data[name] : [data[name]];
        values.forEach(value => {
          const checkbox = DOM.surveyForm.querySelector(`[name="${name}"][value="${value}"]`);
          if (checkbox) checkbox.checked = true;
        });
      } else if (element.type === 'radio') {
        const radio = DOM.surveyForm.querySelector(`[name="${name}"][value="${data[name]}"]`);
        if (radio) radio.checked = true;
      } else {
        element.value = data[name];
      }
    });
    
    showNotification('Restored your previous progress', 'info');
  } catch (error) {
    console.error('Error loading saved state:', error);
    localStorage.removeItem('zimDevSurvey2026');
  }
}

// ==================== UTILITY FUNCTIONS ====================
function generateSubmissionId() {
  return 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function consoleWelcomeMessage() {
  console.log('%c🇿🇼 ZIMBABWE STATE OF DEVELOPERS SURVEY 2026', 'font-size: 24px; font-weight: bold; color: #198754;');
  console.log('%c📊 A comprehensive annual survey of Zimbabwe\'s tech community', 'font-size: 14px; color: #6c757d;');
  console.log('%c🔧 Debug mode:', CONFIG.DEBUG_MODE ? 'enabled' : 'disabled');
  console.log('%c📝 API Endpoint:', CONFIG.API_ENDPOINT);
  console.log('%c🔄 Form state autosave: every 10 seconds', 'color: #0d6efd;');
}

function enableDebugFeatures() {
  // Add debug info to page
  const debugInfo = document.createElement('div');
  debugInfo.className = 'alert alert-info position-fixed bottom-0 start-0 m-3';
  debugInfo.style.cssText = 'max-width: 300px; font-size: 12px; z-index: 1000;';
  debugInfo.innerHTML = `
    <strong>Debug Mode</strong><br>
    API: ${CONFIG.API_ENDPOINT}<br>
    Version: ${CONFIG.SURVEY_VERSION}<br>
    <button class="btn btn-sm btn-outline-primary mt-2" onclick="exportFormData()">Export Data</button>
  `;
  document.body.appendChild(debugInfo);
  
  // Expose utility functions globally
  window.exportFormData = exportFormData;
  window.clearFormData = () => {
    localStorage.removeItem('zimDevSurvey2026');
    showNotification('Form data cleared', 'info');
  };
}

function exportFormData() {
  const formData = collectFormData();
  const blob = new Blob([JSON.stringify(formData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zim-dev-survey-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showNotification('Data exported to JSON file', 'success');
}

// ==================== ERROR HANDLING ====================
window.addEventListener('error', function(e) {
  console.error('Global error:', e.error);
  if (CONFIG.DEBUG_MODE) {
    showNotification(`Error: ${e.message}`, 'error');
  }
});

window.addEventListener('unhandledrejection', function(e) {
  console.error('Unhandled promise rejection:', e.reason);
  if (CONFIG.DEBUG_MODE) {
    showNotification(`Promise error: ${e.reason.message || e.reason}`, 'error');
  }
});

// ==================== EXPORT FOR TESTING ====================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    collectFormData,
    validateForm,
    CONFIG,
    AppState
  };
}