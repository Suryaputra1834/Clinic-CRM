// Get IDs from URL
const urlParams = new URLSearchParams(window.location.search);
const visitId = urlParams.get('visitId');
const patientId = urlParams.get('patientId');

let currentPatient = null;
let currentVisit = null;
let medicineCounter = 0;

// Check if IDs exist
if (!visitId || !patientId) {
    showError('Missing visit or patient ID!');
    window.location.href = 'patients.html';
}

// Wait for authentication
auth.onAuthStateChanged(async (user) => {
    if (user && user.emailVerified) {
        await loadPatientInfo(user.uid, patientId);
        await loadVisitData(user.uid, visitId);
    }
});

// Load patient information
async function loadPatientInfo(doctorId, patientId) {
    const patientQuickInfo = document.getElementById('patientQuickInfo');
    const backBtn = document.getElementById('backBtn');
    
    try {
        const patientDoc = await db.collection('patients').doc(patientId).get();
        
        if (!patientDoc.exists) {
            patientQuickInfo.innerHTML = '<div class="error-message">Patient not found!</div>';
            return;
        }
        
        const patient = patientDoc.data();
        
        // Check if patient belongs to this doctor
        if (patient.doctorId !== doctorId) {
            patientQuickInfo.innerHTML = '<div class="error-message">Access denied.</div>';
            return;
        }
        
        // Store patient data
        currentPatient = { id: patientId, ...patient };
        
        // Update back button
        backBtn.href = `patient-detail.html?id=${patientId}`;
        
        // Display patient quick info
        const avatar = patient.name.charAt(0).toUpperCase();
        patientQuickInfo.innerHTML = `
            <div class="quick-info-content">
                <div class="patient-avatar-medium">${avatar}</div>
                <div class="quick-info-details">
                    <h3>${patient.name}</h3>
                    <p>${patient.age} years • ${patient.gender} • ${patient.contact}</p>
                    ${patient.medicalHistory ? `<p class="medical-alert">⚠️ ${patient.medicalHistory}</p>` : ''}
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading patient:', error);
        patientQuickInfo.innerHTML = '<div class="error-message">Error loading patient information.</div>';
    }
}

// Load existing visit data
async function loadVisitData(doctorId, visitId) {
    try {
        const visitDoc = await db.collection('visits').doc(visitId).get();
        
        if (!visitDoc.exists) {
            showError('Visit not found!');
            window.location.href = `patient-detail.html?id=${patientId}`;
            return;
        }
        
        const visit = visitDoc.data();
        
        // Check if visit belongs to this doctor
        if (visit.doctorId !== doctorId) {
            showError('You do not have permission to edit this visit.');
            window.location.href = `patient-detail.html?id=${patientId}`;
            return;
        }
        
        // Store visit data
        currentVisit = { id: visitId, ...visit };
        
        // Fill form with existing data
        fillForm(visit);
        
    } catch (error) {
        console.error('Error loading visit:', error);
        showError('Error loading visit data: ' + error.message);
    }
}

// Fill form with visit data
function fillForm(visit) {
    // Visit date and time
    const visitDate = visit.visitDate?.toDate ? visit.visitDate.toDate() : new Date();
    const dateStr = visitDate.toISOString().split('T')[0];
    const timeStr = visitDate.toTimeString().slice(0, 5);
    
    document.getElementById('visitDate').value = dateStr;
    document.getElementById('visitTime').value = timeStr;
    
    // Symptoms and diagnosis
    document.getElementById('symptoms').value = visit.symptoms || '';
    document.getElementById('diagnosis').value = visit.diagnosis || '';
    
    // Notes
    document.getElementById('notes').value = visit.notes || '';
    
    // Follow-up
    if (visit.followUpRequired && visit.followUpDate) {
        document.getElementById('followUpRequired').value = 'yes';
        toggleFollowUpDate();
        const followUpDate = visit.followUpDate.toDate();
        const followUpDateStr = followUpDate.toISOString().split('T')[0];
        document.getElementById('followUpDate').value = followUpDateStr;
    } else {
        document.getElementById('followUpRequired').value = 'no';
    }
    
    // Medicines
    const medicinesContainer = document.getElementById('medicinesContainer');
    medicinesContainer.innerHTML = ''; // Clear container
    
    if (visit.medicines && visit.medicines.length > 0) {
        visit.medicines.forEach(med => {
            addMedicineRow(med.name, med.dosage, med.duration);
        });
    } else {
        // Add one empty row if no medicines
        addMedicineRow();
    }
}

// Toggle follow-up date field
function toggleFollowUpDate() {
    const followUpRequired = document.getElementById('followUpRequired').value;
    const followUpDateGroup = document.getElementById('followUpDateGroup');
    const followUpDateInput = document.getElementById('followUpDate');
    
    if (followUpRequired === 'yes') {
        followUpDateGroup.style.display = 'block';
        followUpDateInput.required = true;
        
        // Set minimum date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const minDate = tomorrow.toISOString().split('T')[0];
        followUpDateInput.min = minDate;
    } else {
        followUpDateGroup.style.display = 'none';
        followUpDateInput.required = false;
        followUpDateInput.value = '';
    }
}

// Add medicine row
function addMedicineRow(name = '', dosage = '', duration = '') {
    medicineCounter++;
    const medicinesContainer = document.getElementById('medicinesContainer');
    
    const medicineRow = document.createElement('div');
    medicineRow.className = 'medicine-row';
    medicineRow.id = `medicine-${medicineCounter}`;
    
    medicineRow.innerHTML = `
        <div class="medicine-row-number">${medicineCounter}</div>
        <div class="medicine-fields">
            <div class="medicine-field">
                <label>Medicine Name *</label>
                <input type="text" class="medicine-name" required placeholder="e.g., Paracetamol" value="${name}">
            </div>
            <div class="medicine-field">
                <label>Dosage</label>
                <input type="text" class="medicine-dosage" placeholder="e.g., 500mg, 2 times daily" value="${dosage}">
            </div>
            <div class="medicine-field">
                <label>Duration</label>
                <input type="text" class="medicine-duration" placeholder="e.g., 5 days, 1 week" value="${duration}">
            </div>
        </div>
        <button type="button" class="btn-remove-medicine" onclick="removeMedicineRow(${medicineCounter})">×</button>
    `;
    
    medicinesContainer.appendChild(medicineRow);
}

// Remove medicine row
function removeMedicineRow(id) {
    const row = document.getElementById(`medicine-${id}`);
    if (row) {
        row.remove();
        updateMedicineNumbers();
    }
}

// Update medicine row numbers
function updateMedicineNumbers() {
    const rows = document.querySelectorAll('.medicine-row');
    rows.forEach((row, index) => {
        const numberElement = row.querySelector('.medicine-row-number');
        if (numberElement) {
            numberElement.textContent = index + 1;
        }
    });
}

// Add medicine button event
document.getElementById('addMedicineBtn')?.addEventListener('click', () => addMedicineRow());

// Cancel button
document.getElementById('cancelBtn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
        window.location.href = `patient-detail.html?id=${patientId}`;
    }
});

// Handle form submission
document.getElementById('editVisitForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const submitBtnText = document.getElementById('submitBtnText');
    const submitLoader = document.getElementById('submitLoader');
    const errorMsg = document.getElementById('formError');
    const successMsg = document.getElementById('formSuccess');
    
    // Clear messages
    errorMsg.textContent = '';
    successMsg.textContent = '';
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtnText.style.display = 'none';
    submitLoader.style.display = 'inline';
    
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('You must be logged in');
        }
        
        // Get form values
        const visitDateStr = document.getElementById('visitDate').value;
        const visitTimeStr = document.getElementById('visitTime').value;
        const symptoms = document.getElementById('symptoms').value.trim();
        const diagnosis = document.getElementById('diagnosis').value.trim();
        const notes = document.getElementById('notes').value.trim();
        
        // Combine date and time
        const visitDateTime = new Date(`${visitDateStr}T${visitTimeStr}`);
        
        // Get medicines
        const medicines = [];
        const medicineRows = document.querySelectorAll('.medicine-row');
        
        medicineRows.forEach(row => {
            const name = row.querySelector('.medicine-name').value.trim();
            const dosage = row.querySelector('.medicine-dosage').value.trim();
            const duration = row.querySelector('.medicine-duration').value.trim();
            
            if (name) {
                medicines.push({
                    name: name,
                    dosage: dosage || '',
                    duration: duration || ''
                });
            }
        });
        
        // Get follow-up data
        const followUpRequired = document.getElementById('followUpRequired').value;
        let followUpDate = null;

        if (followUpRequired === 'yes') {
            const followUpDateStr = document.getElementById('followUpDate').value;
            if (followUpDateStr) {
                followUpDate = firebase.firestore.Timestamp.fromDate(new Date(followUpDateStr));
            }
        }
        
        // Create updated visit data
        const updatedData = {
            visitDate: firebase.firestore.Timestamp.fromDate(visitDateTime),
            symptoms: symptoms,
            diagnosis: diagnosis,
            medicines: medicines,
            notes: notes,
            followUpRequired: followUpRequired === 'yes',
            followUpDate: followUpDate,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Update in Firestore
        console.log('Updating visit data:', updatedData);
        await db.collection('visits').doc(visitId).update(updatedData);
        console.log('Visit updated successfully');
        
        // Show success message
        successMsg.textContent = '✅ Visit updated successfully!';
        
        // Redirect after 1.5 seconds
        setTimeout(() => {
            window.location.href = `patient-detail.html?id=${patientId}`;
        }, 1500);
        
    } catch (error) {
        console.error('Error updating visit:', error);
        errorMsg.textContent = 'Error: ' + error.message;
        
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtnText.style.display = 'inline';
        submitLoader.style.display = 'none';
    }
});

// Logout functionality
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    
    if (confirm('Are you sure you want to logout?')) {
        try {
            await auth.signOut();
            window.location.href = 'login.html';
        } catch (error) {
            showError('Error logging out: ' + error.message);
        }
    }
});