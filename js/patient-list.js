// Global variables
let allPatients = [];
let filteredPatients = [];

// Wait for authentication
auth.onAuthStateChanged(async (user) => {
    if (user && user.emailVerified) {
        await loadAllPatients(user.uid);
    }
});

// Load all patients for the doctor
async function loadAllPatients(doctorId) {
    const patientsGrid = document.getElementById('patientsGrid');
    const patientCount = document.getElementById('patientCount');
    
    try {
        patientsGrid.innerHTML = '<div class="loading-spinner">Loading patients...</div>';
        
        // Fetch all patients for this doctor
        const snapshot = await db.collection('patients')
            .where('doctorId', '==', doctorId)
            .orderBy('createdAt', 'desc')
            .get();
        
        // Store patients in global array
        allPatients = [];
        snapshot.forEach(doc => {
            allPatients.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Initially show all patients
        filteredPatients = [...allPatients];
        
        // Update count
        patientCount.textContent = allPatients.length;
        
        // Display patients
        displayPatients(filteredPatients);
        
    } catch (error) {
        console.error('Error loading patients:', error);
        patientsGrid.innerHTML = '<div class="error-message">Error loading patients. Please try again.</div>';
    }
}

// Display patients in the grid
function displayPatients(patients) {
    const patientsGrid = document.getElementById('patientsGrid');
    
    if (patients.length === 0) {
        patientsGrid.innerHTML = `
            <div class="no-patients">
                <div class="no-patients-icon">👥</div>
                <h3>No patients found</h3>
                <p>Add your first patient to get started!</p>
                <a href="add-patient.html" class="btn btn-primary">➕ Add Patient</a>
            </div>
        `;
        return;
    }
    
    let html = '';
    patients.forEach(patient => {
        const avatar = patient.name.charAt(0).toUpperCase();
        const bloodGroup = patient.bloodGroup ? `<span class="blood-badge">${patient.bloodGroup}</span>` : '';
        
        html += `
            <div class="patient-card-large">
                <div class="patient-card-header">
                    <div class="patient-avatar-large">${avatar}</div>
                    <div class="patient-basic-info">
                        <h3>${patient.name}</h3>
                        <p class="patient-meta">${patient.age} years • ${patient.gender}</p>
                    </div>
                    ${bloodGroup}
                </div>
                <div class="patient-card-body">
                    <div class="patient-detail-row">
                        <span class="detail-icon">📞</span>
                        <span>${patient.contact}</span>
                    </div>
                    ${patient.address ? `
                        <div class="patient-detail-row">
                            <span class="detail-icon">📍</span>
                            <span>${patient.address}</span>
                        </div>
                    ` : ''}
                    ${patient.medicalHistory ? `
                        <div class="patient-detail-row">
                            <span class="detail-icon">📋</span>
                            <span class="medical-note">${patient.medicalHistory.substring(0, 80)}${patient.medicalHistory.length > 80 ? '...' : ''}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="patient-card-footer">
                    <button class="btn-view-details" onclick="viewPatient('${patient.id}')">
                        View Details →
                    </button>
                    <button class="btn-delete-patient" onclick="deletePatient('${patient.id}', '${patient.name}', event)">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    });
    
    patientsGrid.innerHTML = html;
}

// View patient details
function viewPatient(patientId) {
    window.location.href = `patient-detail.html?id=${patientId}`;
}

// Delete patient function
async function deletePatient(patientId, patientName, event) {
    // Prevent event bubbling
    if (event) {
        event.stopPropagation();
    }
    
    // Confirm deletion
    const confirmDelete = confirm(
        `⚠️ Are you sure you want to delete patient "${patientName}"?\n\n` +
        `This will also delete:\n` +
        `• All visit records\n` +
        `• Medical history\n` +
        `• All associated data\n\n` +
        `This action CANNOT be undone!`
    );
    
    if (!confirmDelete) {
        return;
    }
    
    // Double confirmation for safety
    const doubleConfirm = confirm(
        `⚠️ FINAL CONFIRMATION\n\n` +
        `Are you absolutely sure you want to permanently delete "${patientName}"?`
    );
    
    if (!doubleConfirm) {
        return;
    }
    
    // Store reference to button
    let deleteBtn = null;
    let originalText = '';
    
    if (event && event.target) {
        deleteBtn = event.target;
        originalText = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '⏳ Deleting...';
        deleteBtn.disabled = true;
    }
    
    try {
        console.log('Deleting patient:', patientId);
        
        // Get current user
        const user = auth.currentUser;
        if (!user) {
            throw new Error('You must be logged in to delete patients');
        }
        
        // Delete all visits for this patient first
        const visitsSnapshot = await db.collection('visits')
            .where('patientId', '==', patientId)
            .where('doctorId', '==', user.uid)
            .get();
        
        console.log(`Found ${visitsSnapshot.size} visits to delete`);
        
        // Delete each visit
        const deletePromises = [];
        visitsSnapshot.forEach(doc => {
            deletePromises.push(doc.ref.delete());
        });
        
        if (deletePromises.length > 0) {
            await Promise.all(deletePromises);
            console.log('All visits deleted');
        }
        
        // Delete the patient document
        await db.collection('patients').doc(patientId).delete();
        console.log('Patient deleted successfully');
        
        // Show success message
        showSuccess(`✅ Patient "${patientName}" has been permanently deleted.`);
        
        // Reload the patient list
        await loadAllPatients(user.uid);
        
    } catch (error) {
        console.error('Error deleting patient:', error);
        showError('❌ Error deleting patient: ' + error.message);
        
        // Restore button
        if (deleteBtn) {
            deleteBtn.innerHTML = originalText;
            deleteBtn.disabled = false;
        }
    }
}

// Search functionality
const searchInput = document.getElementById('searchInput');
searchInput?.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        // Show all patients if search is empty
        filteredPatients = [...allPatients];
    } else {
        // Filter patients
        filteredPatients = allPatients.filter(patient => {
            return (
                patient.name.toLowerCase().includes(searchTerm) ||
                patient.contact.includes(searchTerm) ||
                (patient.bloodGroup && patient.bloodGroup.toLowerCase().includes(searchTerm)) ||
                (patient.address && patient.address.toLowerCase().includes(searchTerm))
            );
        });
    }
    
    // Update display
    displayPatients(filteredPatients);
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