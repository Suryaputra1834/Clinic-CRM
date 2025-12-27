// Get patient ID from URL
const urlParams = new URLSearchParams(window.location.search);
const patientId = urlParams.get('id');

let currentPatient = null;

// Check if patient ID exists
if (!patientId) {
    alert('No patient ID provided!');
    window.location.href = 'patients.html';
}

// Wait for authentication
auth.onAuthStateChanged(async (user) => {
    if (user && user.emailVerified) {
        await loadPatientData(user.uid, patientId);
    }
});

// Load existing patient data
async function loadPatientData(doctorId, patientId) {
    try {
        const patientDoc = await db.collection('patients').doc(patientId).get();
        
        if (!patientDoc.exists) {
            alert('Patient not found!');
            window.location.href = 'patients.html';
            return;
        }
        
        const patient = patientDoc.data();
        
        // Check if patient belongs to this doctor
        if (patient.doctorId !== doctorId) {
            alert('You do not have permission to edit this patient.');
            window.location.href = 'patients.html';
            return;
        }
        
        // Store patient data
        currentPatient = { id: patientId, ...patient };
        
        // Update back button
        document.getElementById('backBtn').href = `patient-detail.html?id=${patientId}`;
        
        // Fill form with existing data
        fillForm(patient);
        
    } catch (error) {
        console.error('Error loading patient:', error);
        alert('Error loading patient data: ' + error.message);
    }
}

// Fill form with patient data
function fillForm(patient) {
    document.getElementById('patientName').value = patient.name || '';
    document.getElementById('patientAge').value = patient.age || '';
    document.getElementById('patientGender').value = patient.gender || '';
    document.getElementById('patientContact').value = patient.contact || '';
    document.getElementById('patientAddress').value = patient.address || '';
    document.getElementById('patientBloodGroup').value = patient.bloodGroup || '';
    document.getElementById('emergencyContact').value = patient.emergencyContact || '';
    document.getElementById('medicalHistory').value = patient.medicalHistory || '';
}

// Handle form submission
const editPatientForm = document.getElementById('editPatientForm');

editPatientForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = editPatientForm.querySelector('button[type="submit"]');
    const submitBtnText = document.getElementById('submitBtnText');
    const submitLoader = document.getElementById('submitLoader');
    const errorMsg = document.getElementById('formError');
    const successMsg = document.getElementById('formSuccess');
    
    // Clear previous messages
    errorMsg.textContent = '';
    successMsg.textContent = '';
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtnText.style.display = 'none';
    submitLoader.style.display = 'inline';
    
    try {
        // Get current user
        const user = auth.currentUser;
        
        if (!user) {
            throw new Error('You must be logged in to edit patients');
        }
        
        // Get form values
        const updatedData = {
            name: document.getElementById('patientName').value.trim(),
            age: parseInt(document.getElementById('patientAge').value),
            gender: document.getElementById('patientGender').value,
            contact: document.getElementById('patientContact').value.trim(),
            address: document.getElementById('patientAddress').value.trim() || '',
            bloodGroup: document.getElementById('patientBloodGroup').value || '',
            emergencyContact: document.getElementById('emergencyContact').value.trim() || '',
            medicalHistory: document.getElementById('medicalHistory').value.trim() || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Validate contact number
        if (!/^[0-9]{10}$/.test(updatedData.contact)) {
            throw new Error('Contact number must be exactly 10 digits');
        }
        
        // Update patient in Firestore
        console.log('Updating patient data:', updatedData);
        await db.collection('patients').doc(patientId).update(updatedData);
        console.log('Patient updated successfully');
        
        // Show success message
        successMsg.textContent = '✅ Patient information updated successfully!';
        
        // Redirect to patient detail page after 1.5 seconds
        setTimeout(() => {
            window.location.href = `patient-detail.html?id=${patientId}`;
        }, 1500);
        
    } catch (error) {
        console.error('Error updating patient:', error);
        errorMsg.textContent = 'Error: ' + error.message;
        
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtnText.style.display = 'inline';
        submitLoader.style.display = 'none';
    }
});

// Cancel button
document.getElementById('cancelBtn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
        window.location.href = `patient-detail.html?id=${patientId}`;
    }
});

// Logout functionality
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    
    if (confirm('Are you sure you want to logout?')) {
        try {
            await auth.signOut();
            window.location.href = 'index.html';
        } catch (error) {
            alert('Error logging out: ' + error.message);
        }
    }
});