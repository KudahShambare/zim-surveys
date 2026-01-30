// ==================== CONFIGURATION ====================
const CONFIG = {
  API_ENDPOINT: "http://localhost:3000/api/create/survey",
  
  // Server required fields - MUST be present
  REQUIRED_FIELDS: ['age', 'employment_status'],
  
  // Maximum selections for checkbox groups
  MAX_SELECTIONS: {
    learned_coding: 5,
    languages: 5,
    frameworks: 5,
    databases: 3,
    cloud: 3,
    dev_tools: 5,
    version_control: 2,
    ai_tools: 5,
    stay_updated: 3,
    learning_resources: 3,
    certifications: 5,
    payment_method: 3,
    benefits: 5,
    challenges: 5
  },
  
  SURVEY_VERSION: '2026.1.0',
  DEBUG_MODE: true,
  AUTOSAVE_INTERVAL: 30000,
  SAVED_STATE_EXPIRY: 24 * 60 * 60 * 1000
};

// ==================== STATE MANAGEMENT ====================
const AppState = {
  currentSection: 1,
  totalSections: 11,
  formData: {},
  validationErrors: {},
  isSubmitting: false,
  checkboxCounts: {},
  lastSaved: null
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
  setupConditionalFields();
  setupProgressTracking();
  loadFormState();
  consoleWelcomeMessage();
  
  if (CONFIG.DEBUG_MODE) {
    enableDebugFeatures();
  }
  
  setInterval(saveFormState, CONFIG.AUTOSAVE_INTERVAL);
});

function initializeDOM() {
  DOM.surveyForm = document.getElementById('surveyForm');
  DOM.loadingOverlay = document.getElementById('loadingOverlay');
  DOM.successMessage = document.getElementById('successMessage');
  DOM.errorMessage = document.getElementById('errorMessage');
  DOM.errorText = document.getElementById('errorText');
  DOM.submitButton = DOM.surveyForm?.querySelector('button[type="submit"]');
  DOM.emailField = document.getElementById('emailField');
  DOM.receiveReportSelect = document.querySelector('select[name="receive_report"]');
  
  // Find consent checkbox - try multiple selectors
  DOM.consentCheckbox = document.getElementById('consentCheck') || 
                        document.querySelector('input[name="consent"]') ||
                        document.querySelector('input[type="checkbox"][required]');
  
  if (!DOM.surveyForm) {
    console.error('Survey form not found!');
    return;
  }
  
  if (!DOM.consentCheckbox) {
    console.warn('⚠️ Consent checkbox not found! Looking for: #consentCheck or input[name="consent"]');
    console.log('Available checkboxes:', document.querySelectorAll('input[type="checkbox"]'));
  } else {
    console.log('✅ Consent checkbox found:', DOM.consentCheckbox);
  }
}

// ==================== PROGRESS TRACKING ====================
function setupProgressTracking() {
  if (!DOM.surveyForm) return;
  
  const sections = DOM.surveyForm.querySelectorAll('.section-title');
  const totalSections = sections.length;
  
  const progressContainer = document.createElement('div');
  progressContainer.className = 'progress-container sticky-top bg-white shadow-sm';
  progressContainer.style.cssText = 'top: 0; z-index: 1000; padding: 15px 0;';
  progressContainer.innerHTML = `
    <div class="container">
      <div class="progress-bar" style="height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden;">
        <div class="progress-fill" id="progressFill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #198754, #20c997); transition: width 0.3s ease;"></div>
      </div>
      <div class="progress-text d-flex justify-content-between mt-2" id="progressText" style="font-size: 14px; color: #6c757d;">
        <span>Progress: <strong id="progressPercent">0%</strong></span>
        <span>Section <strong id="currentSection">1</strong> of <strong>${totalSections}</strong></span>
      </div>
    </div>
  `;
  
  DOM.surveyForm.insertBefore(progressContainer, DOM.surveyForm.firstChild);
  
  DOM.progressFill = document.getElementById('progressFill');
  DOM.progressText = document.getElementById('progressText');
  
  updateProgress();
  
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(updateProgress, 100);
  });
  
  DOM.surveyForm.addEventListener('change', updateProgress);
}

function updateProgress() {
  if (!DOM.progressFill) return;
  
  const sections = document.querySelectorAll('.section-title');
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight - windowHeight;
  const scrolled = window.scrollY;
  const scrollPercentage = Math.min((scrolled / documentHeight) * 100, 100);
  
  const requiredFields = DOM.surveyForm.querySelectorAll('[required]');
  let filledRequired = 0;
  
  requiredFields.forEach(field => {
    if (field.type === 'checkbox' || field.type === 'radio') {
      const name = field.name;
      if (document.querySelector(`input[name="${name}"]:checked`)) {
        filledRequired++;
      }
    } else if (field.value && field.value.trim() !== '') {
      filledRequired++;
    }
  });
  
  const completionPercentage = requiredFields.length > 0 
    ? Math.round((filledRequired / requiredFields.length) * 100)
    : 0;
  
  const displayPercentage = Math.max(scrollPercentage, completionPercentage);
  DOM.progressFill.style.width = `${displayPercentage}%`;
  
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
    progressPercent.textContent = `${Math.round(displayPercentage)}%`;
  }
  if (currentSectionEl) {
    currentSectionEl.textContent = currentSection;
  }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  if (!DOM.surveyForm) return;
  
  DOM.surveyForm.addEventListener('submit', handleFormSubmit);
  
  const requiredFields = document.querySelectorAll('[required]');
  requiredFields.forEach(field => {
    field.addEventListener('blur', () => validateField(field));
    field.addEventListener('change', () => validateField(field));
  });
  
  const sectionTitles = document.querySelectorAll('.section-title');
  sectionTitles.forEach(title => {
    title.style.cursor = 'pointer';
    title.addEventListener('click', () => {
      title.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges()) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  });
}

function setupConditionalFields() {
  const provinceSelect = document.querySelector('select[name="province"]');
  const diasporaFields = document.getElementById('diasporaFields');
  
  if (provinceSelect && diasporaFields) {
    provinceSelect.addEventListener('change', function() {
      if (this.value === 'Diaspora' || this.value === 'diaspora') {
        diasporaFields.style.display = 'block';
        diasporaFields.querySelectorAll('input, select').forEach(field => {
          if (field.name === 'diaspora_country' || field.name === 'diaspora_city') {
            field.setAttribute('required', 'required');
          }
        });
      } else {
        diasporaFields.style.display = 'none';
        diasporaFields.querySelectorAll('input, select').forEach(field => {
          field.removeAttribute('required');
          field.value = '';
        });
      }
    });
  }
  
  if (DOM.receiveReportSelect && DOM.emailField) {
    DOM.receiveReportSelect.addEventListener('change', function() {
      const emailInput = DOM.emailField.querySelector('input[type="email"]');
      if (this.value === 'Yes' || this.value.includes('Yes')) {
        DOM.emailField.style.display = 'block';
        if (emailInput) emailInput.setAttribute('required', 'required');
      } else {
        DOM.emailField.style.display = 'none';
        if (emailInput) {
          emailInput.removeAttribute('required');
          emailInput.value = '';
        }
      }
    });
  }
  
  const jobTitleSelect = document.querySelector('select[name="job_title"]');
  const jobTitleOtherField = document.getElementById('jobTitleOtherField');
  
  if (jobTitleSelect && jobTitleOtherField) {
    jobTitleSelect.addEventListener('change', function() {
      if (this.value === 'Other') {
        jobTitleOtherField.style.display = 'block';
        const otherInput = jobTitleOtherField.querySelector('input');
        if (otherInput) otherInput.setAttribute('required', 'required');
      } else {
        jobTitleOtherField.style.display = 'none';
        const otherInput = jobTitleOtherField.querySelector('input');
        if (otherInput) {
          otherInput.removeAttribute('required');
          otherInput.value = '';
        }
      }
    });
  }
}

// ==================== CHECKBOX LIMITERS ====================
function setupCheckboxLimiters() {
  Object.keys(CONFIG.MAX_SELECTIONS).forEach(groupName => {
    const checkboxes = document.querySelectorAll(`input[name="${groupName}"]`);
    if (checkboxes.length === 0) return;
    
    const counter = document.createElement('span');
    counter.className = 'selection-counter ms-2 badge bg-secondary';
    counter.textContent = `0/${CONFIG.MAX_SELECTIONS[groupName]}`;
    
    const firstCheckbox = checkboxes[0];
    const questionLabel = firstCheckbox.closest('.mb-3, .mb-4')?.querySelector('label:first-child');
    
    if (questionLabel) {
      questionLabel.appendChild(counter);
    }
    
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', function() {
        const checkedCount = document.querySelectorAll(`input[name="${groupName}"]:checked`).length;
        const maxSelections = CONFIG.MAX_SELECTIONS[groupName];
        
        counter.textContent = `${checkedCount}/${maxSelections}`;
        
        if (checkedCount <= maxSelections) {
          counter.classList.remove('bg-danger');
          counter.classList.add('bg-secondary');
        }
        
        if (checkedCount > maxSelections) {
          this.checked = false;
          counter.classList.add('bg-danger');
          showNotification(`Maximum ${maxSelections} selections allowed`, 'warning');
          
          setTimeout(() => {
            counter.classList.remove('bg-danger');
            counter.classList.add('bg-secondary');
          }, 2000);
        }
      });
    });
  });
}

// ==================== FORM VALIDATION ====================
function validateField(field) {
  if (!field) return false;
  
  const value = field.value?.trim() || '';
  const isRequired = field.hasAttribute('required');
  const fieldType = field.type;
  const fieldName = field.name;
  
  field.classList.remove('is-invalid', 'is-valid');
  clearInlineError(field);
  
  if (isRequired) {
    if (fieldType === 'checkbox' || fieldType === 'radio') {
      const checkedCount = document.querySelectorAll(`input[name="${fieldName}"]:checked`).length;
      if (checkedCount === 0) {
        field.classList.add('is-invalid');
        showInlineError(field, 'Please select at least one option');
        return false;
      }
    } else if (field.tagName === 'SELECT') {
      // Special validation for select dropdowns
      // Check if value is empty OR if it's a placeholder value
      const selectedOption = field.options[field.selectedIndex];
      const isPlaceholder = !value || 
                           value === '' || 
                           value === 'Select...' || 
                           value === 'Choose...' ||
                           value === '--Select--' ||
                           selectedOption?.disabled;
      
      if (isPlaceholder) {
        field.classList.add('is-invalid');
        showInlineError(field, 'Please select an option');
        console.warn(`⚠️ Select field "${fieldName}" has invalid value:`, {
          value: value,
          selectedIndex: field.selectedIndex,
          selectedText: selectedOption?.text
        });
        return false;
      }
    } else if (!value) {
      field.classList.add('is-invalid');
      showInlineError(field, 'This field is required');
      return false;
    }
  }
  
  if (fieldType === 'email' && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      field.classList.add('is-invalid');
      showInlineError(field, 'Please enter a valid email address');
      return false;
    }
  }
  
  if (value || (fieldType === 'checkbox' || fieldType === 'radio')) {
    field.classList.add('is-valid');
  }
  
  return true;
}

function validateForm() {
  let isValid = true;
  const errors = [];
  let firstErrorField = null;
  
  // Clear all previous validation states
  DOM.surveyForm.querySelectorAll('.is-invalid').forEach(el => {
    el.classList.remove('is-invalid');
  });
  DOM.surveyForm.querySelectorAll('.invalid-feedback').forEach(el => {
    el.remove();
  });
  
  // Validate server required fields FIRST
  CONFIG.REQUIRED_FIELDS.forEach(fieldName => {
    const field = DOM.surveyForm.querySelector(`[name="${fieldName}"]`);
    if (!field) {
      console.error(`❌ Required field "${fieldName}" not found in form!`);
      isValid = false;
      errors.push({
        field: fieldName,
        message: `Field "${fieldName}" is missing from the form`,
        element: null
      });
      return;
    }
    
    let hasValue = false;
    
    if (field.type === 'checkbox' || field.type === 'radio') {
      hasValue = document.querySelector(`input[name="${fieldName}"]:checked`) !== null;
    } else {
      hasValue = field.value && field.value.trim() !== '';
    }
    
    if (!hasValue) {
      field.classList.add('is-invalid');
      showInlineError(field, `⚠️ ${getFieldLabel(field)} is required`);
      isValid = false;
      if (!firstErrorField) firstErrorField = field;
      errors.push({
        field: fieldName,
        message: `${getFieldLabel(field)} is required by the server`,
        element: field
      });
      
      // Add visual highlight to parent container
      highlightErrorField(field);
    }
  });
  
  // Validate all other required fields
  const requiredFields = document.querySelectorAll('[required]');
  requiredFields.forEach(field => {
    // Skip if already validated as server required field
    if (CONFIG.REQUIRED_FIELDS.includes(field.name)) return;
    
    if (!validateField(field)) {
      isValid = false;
      if (!firstErrorField) firstErrorField = field;
      errors.push({
        field: field.name,
        message: `${getFieldLabel(field)} is required`,
        element: field
      });
      highlightErrorField(field);
    }
  });
  
  // Check consent
  if (DOM.consentCheckbox && !DOM.consentCheckbox.checked) {
    const consentLabel = document.querySelector('label[for="consentCheck"]') || DOM.consentCheckbox.parentElement;
    if (consentLabel) {
      consentLabel.classList.add('text-danger');
      consentLabel.style.fontWeight = 'bold';
    }
    DOM.consentCheckbox.classList.add('is-invalid');
    showInlineError(DOM.consentCheckbox, '⚠️ You must agree to the terms');
    isValid = false;
    if (!firstErrorField) firstErrorField = DOM.consentCheckbox;
    errors.push({
      field: 'consent',
      message: 'You must check the consent box to submit the survey',
      element: DOM.consentCheckbox
    });
    highlightErrorField(DOM.consentCheckbox);
  } else if (DOM.consentCheckbox) {
    DOM.consentCheckbox.classList.remove('is-invalid');
    const consentLabel = document.querySelector('label[for="consentCheck"]') || DOM.consentCheckbox.parentElement;
    if (consentLabel) {
      consentLabel.classList.remove('text-danger');
      consentLabel.style.fontWeight = '';
    }
  }
  
  // Validate checkbox limits
  Object.keys(CONFIG.MAX_SELECTIONS).forEach(groupName => {
    const checkedCount = document.querySelectorAll(`input[name="${groupName}"]:checked`).length;
    const maxSelections = CONFIG.MAX_SELECTIONS[groupName];
    
    if (checkedCount > maxSelections) {
      isValid = false;
      const firstCheckbox = document.querySelector(`input[name="${groupName}"]`);
      errors.push({
        field: groupName,
        message: `Maximum ${maxSelections} selections allowed`,
        element: firstCheckbox
      });
    }
  });
  
  // Show error summary
  if (!isValid) {
    showErrorSummary(errors);
  }
  
  // Scroll to first error
  if (firstErrorField) {
    setTimeout(() => {
      firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstErrorField.focus();
    }, 300);
  }
  
  return { isValid, errors };
}

function getFieldLabel(field) {
  // Try to find associated label
  const label = document.querySelector(`label[for="${field.id}"]`);
  if (label) return label.textContent.trim().replace(/\*$/, '');
  
  // Try to find parent label
  const parentLabel = field.closest('label');
  if (parentLabel) return parentLabel.textContent.trim().replace(/\*$/, '');
  
  // Fallback to field name
  return field.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function highlightErrorField(field) {
  const container = field.closest('.mb-3, .mb-4, .form-group, .col-md-6');
  if (container) {
    container.style.border = '2px solid #dc3545';
    container.style.borderRadius = '4px';
    container.style.padding = '10px';
    container.style.backgroundColor = '#fff5f5';
    container.style.transition = 'all 0.3s ease';
    
    // Remove highlight after 5 seconds
    setTimeout(() => {
      container.style.border = '';
      container.style.backgroundColor = '';
      container.style.padding = '';
    }, 5000);
  }
}

function showErrorSummary(errors) {
  // Remove existing error summary
  const existingSummary = document.getElementById('errorSummary');
  if (existingSummary) existingSummary.remove();
  
  const errorSummary = document.createElement('div');
  errorSummary.id = 'errorSummary';
  errorSummary.className = 'alert alert-danger alert-dismissible fade show';
  errorSummary.style.cssText = `
    position: fixed;
    top: 100px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10001;
    max-width: 600px;
    width: 90%;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  `;
  
  let errorListHTML = '<ul class="mb-0">';
  errors.forEach((error, index) => {
    const clickable = error.element ? `style="cursor: pointer; text-decoration: underline;"` : '';
    errorListHTML += `<li ${clickable} data-error-index="${index}">${error.message}</li>`;
  });
  errorListHTML += '</ul>';
  
  errorSummary.innerHTML = `
    <h5 class="alert-heading">⚠️ Please fix ${errors.length} error(s):</h5>
    ${errorListHTML}
    <button type="button" class="btn-close" aria-label="Close"></button>
  `;
  
  // Add click handlers to scroll to errors
  errorSummary.querySelectorAll('li[data-error-index]').forEach(li => {
    li.addEventListener('click', function() {
      const index = parseInt(this.dataset.errorIndex);
      const error = errors[index];
      if (error.element) {
        error.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        error.element.focus();
      }
    });
  });
  
  const closeBtn = errorSummary.querySelector('.btn-close');
  closeBtn.addEventListener('click', () => errorSummary.remove());
  
  document.body.appendChild(errorSummary);
  
  // Auto-remove after 30 seconds
  setTimeout(() => {
    if (errorSummary.parentNode) {
      errorSummary.remove();
    }
  }, 30000);
}

function showInlineError(field, message) {
  let errorDiv = field.parentElement.querySelector('.invalid-feedback');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback';
    errorDiv.style.display = 'block';
    errorDiv.style.fontSize = '14px';
    errorDiv.style.fontWeight = 'bold';
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
  
  if (AppState.isSubmitting) {
    showNotification('Submission in progress...', 'info');
    return false;
  }
  
  console.log('🔍 Starting form validation...');
  
  // Validate form
  const { isValid, errors } = validateForm();
  
  if (!isValid) {
    console.error('❌ Validation failed with errors:', errors);
    showNotification(`Please fix ${errors.length} error(s) before submitting`, 'error');
    return false;
  }
  
  console.log('✅ Validation passed');
  
  AppState.isSubmitting = true;
  showLoading(true);
  
  try {
    const formData = collectFormData();
    
    console.log('📦 Collected form data:', formData);
    
    // Final check for required fields
    if (!formData.age || !formData.employment_status) {
      throw new Error('Missing required fields: age and employment_status are mandatory');
    }
    
    formData.user_agent = navigator.userAgent;
    
    console.log('🚀 Sending to server:', formData);
    
    const response = await fetch(CONFIG.API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });
    
    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      throw new Error('Invalid response from server');
    }
    
    console.log('📥 Server response:', result);
    
    if (!response.ok) {
      console.error('❌ Server error:', result);
      throw new Error(result.error || result.details || `Server error: ${response.status}`);
    }
    
    console.log('✅ Submission successful!');
    
    showSuccess();
    
    // Clear saved state
    localStorage.removeItem('zimDevSurvey2026');
    AppState.lastSaved = null;
    
    // Reset form immediately on success
    DOM.surveyForm.reset();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Hide success message after 5 seconds
    setTimeout(() => {
      if (DOM.successMessage) {
        DOM.successMessage.classList.remove('show');
        DOM.successMessage.style.display = 'none';
      }
    }, 5000);
    
  } catch (error) {
    console.error('❌ Submission Error:', error);
    showError(`Failed to submit: ${error.message}`);
    // Don't reset form on error - let user fix and retry
  } finally {
    AppState.isSubmitting = false;
    showLoading(false);
  }
}

function collectFormData() {
  const formData = {};
  const form = DOM.surveyForm;
  
  if (!form) return formData;
  
  const elements = form.elements;
  
  for (let element of elements) {
    if (!element.name) continue;
    if (element.type === 'submit') continue;
    
    // Skip consent checkbox - it's for validation only, not data collection
    if (element.name === 'consent' || element.id === 'consentCheck') continue;
    
    const fieldName = element.name;
    
    if (element.type === 'checkbox') {
      if (!formData[fieldName]) {
        formData[fieldName] = [];
      }
      if (element.checked) {
        formData[fieldName].push(element.value);
      }
    } else if (element.type === 'radio') {
      if (element.checked) {
        formData[fieldName] = element.value;
      }
    } else if (element.type === 'select-multiple') {
      formData[fieldName] = Array.from(element.selectedOptions).map(opt => opt.value);
    } else if (element.tagName === 'SELECT') {
      // Special handling for select dropdowns
      const value = element.value?.trim();
      // Include value even if it looks like a placeholder, let validation handle it
      if (value !== undefined && value !== null) {
        formData[fieldName] = value;
      }
      
      // Debug logging for required fields
      if (CONFIG.REQUIRED_FIELDS.includes(fieldName)) {
        console.log(`📋 Collecting required field "${fieldName}":`, {
          value: value,
          selectedIndex: element.selectedIndex,
          selectedOption: element.options[element.selectedIndex]?.text
        });
      }
    } else {
      // Text inputs, textareas, etc.
      const value = element.value?.trim();
      if (value) {
        formData[fieldName] = value;
      }
    }
  }
  
  // Clean up empty values but keep empty strings for validation
  Object.keys(formData).forEach(key => {
    if (Array.isArray(formData[key]) && formData[key].length === 0) {
      formData[key] = null;
    }
    // Don't delete empty strings for required fields - let validation catch them
    if (!CONFIG.REQUIRED_FIELDS.includes(key)) {
      if (formData[key] === '' || formData[key] === undefined) {
        delete formData[key];
      }
    }
  });
  
  console.log('📦 Final collected data:', formData);
  
  return formData;
}

// ==================== UI FEEDBACK ====================
function showLoading(show) {
  console.log(`${show ? '⏳' : '✅'} Loading overlay ${show ? 'shown' : 'hidden'}`);
  
  if (show) {
    if (DOM.loadingOverlay) {
      DOM.loadingOverlay.classList.add('show');
      DOM.loadingOverlay.style.display = 'flex';
    } else {
      console.warn('⚠️ Loading overlay element not found!');
    }
    
    if (DOM.submitButton) {
      DOM.submitButton.disabled = true;
      const submitText = DOM.submitButton.querySelector('.submit-text');
      const spinner = DOM.submitButton.querySelector('.spinner-border');
      if (submitText) submitText.classList.add('d-none');
      if (spinner) spinner.classList.remove('d-none');
    }
  } else {
    if (DOM.loadingOverlay) {
      DOM.loadingOverlay.classList.remove('show');
      DOM.loadingOverlay.style.display = 'none';
    }
    
    if (DOM.submitButton) {
      DOM.submitButton.disabled = false;
      const submitText = DOM.submitButton.querySelector('.submit-text');
      const spinner = DOM.submitButton.querySelector('.spinner-border');
      if (submitText) submitText.classList.remove('d-none');
      if (spinner) spinner.classList.add('d-none');
    }
  }
}

function showSuccess() {
  console.log('🎉 SUCCESS! Showing success message');
  
  if (!DOM.successMessage) {
    console.error('❌ Success message element not found! Looking for #successMessage');
    // Fallback to alert
    alert('✅ Survey submitted successfully! Thank you for your participation.');
    return;
  }
  
  DOM.successMessage.classList.add('show');
  DOM.successMessage.style.display = 'flex';
  
  setTimeout(() => {
    DOM.successMessage.classList.remove('show');
    DOM.successMessage.style.display = 'none';
  }, 10000);
}

function showError(message) {
  console.error('❌ ERROR! Showing error message:', message);
  
  if (!DOM.errorMessage || !DOM.errorText) {
    console.error('❌ Error message elements not found! Looking for #errorMessage and #errorText');
    // Fallback to alert
    alert('❌ Error: ' + message);
    return;
  }
  
  DOM.errorText.textContent = message;
  DOM.errorMessage.classList.add('show');
  DOM.errorMessage.style.display = 'flex';
  
  setTimeout(() => {
    DOM.errorMessage.classList.remove('show');
    DOM.errorMessage.style.display = 'none';
  }, 15000);
}

function showNotification(message, type = 'info') {
  const typeMap = {
    'error': 'danger',
    'success': 'success',
    'warning': 'warning',
    'info': 'info'
  };
  
  const alertType = typeMap[type] || 'info';
  
  const notification = document.createElement('div');
  notification.className = `alert alert-${alertType} alert-dismissible fade show`;
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 10000;
    min-width: 300px;
    max-width: 400px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  `;
  
  notification.innerHTML = `
    <strong>${type.charAt(0).toUpperCase() + type.slice(1)}:</strong> ${message}
    <button type="button" class="btn-close" aria-label="Close"></button>
  `;
  
  const closeBtn = notification.querySelector('.btn-close');
  closeBtn.addEventListener('click', () => notification.remove());
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

// ==================== STATE PERSISTENCE ====================
function saveFormState() {
  if (AppState.isSubmitting) return;
  
  try {
    const formData = collectFormData();
    const hasData = Object.keys(formData).length > 0;
    if (!hasData) return;
    
    const savedState = {
      data: formData,
      timestamp: new Date().toISOString(),
      version: CONFIG.SURVEY_VERSION
    };
    
    localStorage.setItem('zimDevSurvey2026', JSON.stringify(savedState));
    AppState.lastSaved = new Date();
    
    if (CONFIG.DEBUG_MODE) {
      console.log('💾 Form state saved:', AppState.lastSaved);
    }
  } catch (error) {
    console.error('Error saving form state:', error);
  }
}

function loadFormState() {
  try {
    const saved = localStorage.getItem('zimDevSurvey2026');
    if (!saved) return;
    
    const { data, timestamp } = JSON.parse(saved);
    
    const savedDate = new Date(timestamp);
    const now = new Date();
    const timeDiff = now - savedDate;
    
    if (timeDiff > CONFIG.SAVED_STATE_EXPIRY) {
      localStorage.removeItem('zimDevSurvey2026');
      return;
    }
    
    let restoredFields = 0;
    
    Object.keys(data).forEach(name => {
      const value = data[name];
      
      if (Array.isArray(value)) {
        value.forEach(val => {
          const element = DOM.surveyForm.querySelector(`input[name="${name}"][value="${val}"]`);
          if (element) {
            element.checked = true;
            restoredFields++;
          }
        });
      } else {
        const radioElement = DOM.surveyForm.querySelector(`input[type="radio"][name="${name}"][value="${value}"]`);
        if (radioElement) {
          radioElement.checked = true;
          restoredFields++;
          return;
        }
        
        const element = DOM.surveyForm.querySelector(`[name="${name}"]`);
        if (element) {
          element.value = value;
          restoredFields++;
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    
    if (restoredFields > 0) {
      showNotification(`Restored ${restoredFields} fields`, 'success');
      AppState.lastSaved = savedDate;
      updateProgress();
    }
    
  } catch (error) {
    console.error('Error loading saved state:', error);
    localStorage.removeItem('zimDevSurvey2026');
  }
}

function hasUnsavedChanges() {
  const currentData = collectFormData();
  return Object.keys(currentData).length > 0;
}

// ==================== UTILITIES ====================
function consoleWelcomeMessage() {
  console.log('%c🇿🇼 ZIMBABWE DEV SURVEY 2026', 'font-size: 20px; font-weight: bold; color: #198754;');
  console.log('%c📋 Required fields:', 'font-weight: bold;', CONFIG.REQUIRED_FIELDS);
  console.log('%c🌐 API Endpoint:', CONFIG.API_ENDPOINT);
}

function enableDebugFeatures() {
  window.exportFormData = function() {
    const formData = collectFormData();
    console.log('📦 Current Form Data:', formData);
    const blob = new Blob([JSON.stringify(formData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `survey-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  window.validateFormDebug = function() {
    const { isValid, errors } = validateForm();
    console.log('✅ Valid:', isValid);
    console.log('❌ Errors:', errors);
    return { isValid, errors };
  };
  
  window.checkRequiredFields = function() {
    const formData = collectFormData();
    const missing = CONFIG.REQUIRED_FIELDS.filter(field => !formData[field]);
    const present = CONFIG.REQUIRED_FIELDS.filter(field => formData[field]);
    
    console.log('❌ Missing required fields:', missing);
    console.log('✅ Present required fields:', present);
    console.log('📊 Field values:', CONFIG.REQUIRED_FIELDS.reduce((acc, field) => {
      acc[field] = formData[field] || 'NOT SET';
      return acc;
    }, {}));
    
    return { missing, present };
  };
  
  window.testSuccessMessage = function() {
    console.log('🧪 Testing success message...');
    showSuccess();
  };
  
  window.testErrorMessage = function() {
    console.log('🧪 Testing error message...');
    showError('This is a test error message');
  };
  
  window.testLoadingOverlay = function() {
    console.log('🧪 Testing loading overlay...');
    showLoading(true);
    setTimeout(() => showLoading(false), 3000);
  };
  
  window.checkFeedbackElements = function() {
    console.log('🔍 Checking feedback elements:');
    console.log('  loadingOverlay:', DOM.loadingOverlay ? '✅ Found' : '❌ Missing');
    console.log('  successMessage:', DOM.successMessage ? '✅ Found' : '❌ Missing');
    console.log('  errorMessage:', DOM.errorMessage ? '✅ Found' : '❌ Missing');
    console.log('  errorText:', DOM.errorText ? '✅ Found' : '❌ Missing');
    
    if (!DOM.loadingOverlay) console.error('Add element with id="loadingOverlay"');
    if (!DOM.successMessage) console.error('Add element with id="successMessage"');
    if (!DOM.errorMessage) console.error('Add element with id="errorMessage"');
    if (!DOM.errorText) console.error('Add element with id="errorText"');
  };
  
  console.log('%c🔧 Debug functions available:', 'color: #0d6efd; font-weight: bold;');
  console.log('- exportFormData()');
  console.log('- validateFormDebug()');
  console.log('- checkRequiredFields()');
  console.log('- testSuccessMessage()');
  console.log('- testErrorMessage()');
  console.log('- testLoadingOverlay()');
  console.log('- checkFeedbackElements()');
}

// ==================== ERROR HANDLING ====================
window.addEventListener('error', function(e) {
  console.error('Global error:', e.error);
  if (CONFIG.DEBUG_MODE) {
    showNotification(`Error: ${e.message}`, 'error');
  }
});

window.addEventListener('unhandledrejection', function(e) {
  console.error('Unhandled rejection:', e.reason);
  if (CONFIG.DEBUG_MODE) {
    showNotification(`Promise error: ${e.reason?.message || e.reason}`, 'error');
  }
});