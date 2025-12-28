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
        await loadPatientDetails(user.uid, patientId);
        await loadVisitHistory(user.uid, patientId);
    }
});

// Load patient details
async function loadPatientDetails(doctorId, patientId) {
    const patientInfoCard = document.getElementById('patientInfoCard');

    try {
        const patientDoc = await db.collection('patients').doc(patientId).get();

        if (!patientDoc.exists) {
            patientInfoCard.innerHTML = '<div class="error-message">Patient not found!</div>';
            return;
        }

        const patient = patientDoc.data();

        // Check if patient belongs to this doctor
        if (patient.doctorId !== doctorId) {
            patientInfoCard.innerHTML = '<div class="error-message">You do not have permission to view this patient.</div>';
            return;
        }

        // Store patient data globally
        currentPatient = { id: patientId, ...patient };

        // Display patient information
        displayPatientInfo(currentPatient);

    } catch (error) {
        console.error('Error loading patient:', error);
        patientInfoCard.innerHTML = '<div class="error-message">Error loading patient information.</div>';
    }
}

// Display patient information
function displayPatientInfo(patient) {
    const patientInfoCard = document.getElementById('patientInfoCard');

    const avatar = patient.name.charAt(0).toUpperCase();
    const age = patient.age || 'N/A';
    const gender = patient.gender || 'N/A';
    const contact = patient.contact || 'N/A';
    const address = patient.address || 'Not provided';
    const bloodGroup = patient.bloodGroup || 'Not specified';
    const emergencyContact = patient.emergencyContact || 'Not provided';
    const medicalHistory = patient.medicalHistory || 'No medical history recorded';

    patientInfoCard.innerHTML = `
        <div class="patient-header">
            <div class="patient-avatar-xlarge">${avatar}</div>
            <div class="patient-header-info">
                <h1>${patient.name}</h1>
                <div class="patient-meta-info">
                    <span class="meta-badge">👤 ${age} years</span>
                    <span class="meta-badge">⚥ ${gender}</span>
                    ${patient.bloodGroup ? `<span class="meta-badge blood-group-badge">🩸 ${bloodGroup}</span>` : ''}
                </div>
            </div>
            <div class="patient-actions">
                <button onclick="editPatient('${patient.id}')" class="btn-action btn-edit">✏️ Edit</button>
                 <button onclick="exportPatientPDF()" class="btn-action btn-export">📄 Export PDF</button>
                <button onclick="deletePatientFromDetail('${patient.id}', '${patient.name}')" class="btn-action btn-delete">🗑️ Delete</button>
            </div>
        </div>
        
        <div class="patient-details-grid">
            <div class="detail-item">
                <div class="detail-icon">📞</div>
                <div class="detail-content">
                    <label>Contact Number</label>
                    <p>${contact}</p>
                </div>
            </div>
            
            <div class="detail-item">
                <div class="detail-icon">🚨</div>
                <div class="detail-content">
                    <label>Emergency Contact</label>
                    <p>${emergencyContact}</p>
                </div>
            </div>
            
            <div class="detail-item full-width">
                <div class="detail-icon">📍</div>
                <div class="detail-content">
                    <label>Address</label>
                    <p>${address}</p>
                </div>
            </div>
            
            <div class="detail-item full-width">
                <div class="detail-icon">📋</div>
                <div class="detail-content">
                    <label>Medical History / Allergies</label>
                    <p>${medicalHistory}</p>
                </div>
            </div>
        </div>
    `;
}

// Load visit history
async function loadVisitHistory(doctorId, patientId) {
    const visitHistoryContainer = document.getElementById('visitHistoryContainer');

    try {
        const visitsSnapshot = await db.collection('visits')
            .where('doctorId', '==', doctorId)
            .where('patientId', '==', patientId)
            .orderBy('visitDate', 'desc')
            .get();

        if (visitsSnapshot.empty) {
            visitHistoryContainer.innerHTML = `
                <div class="no-visits">
                    <div class="no-visits-icon">📋</div>
                    <h3>No Visit Records Yet</h3>
                    <p>This patient hasn't had any visits recorded. Add the first visit!</p>
                    <button onclick="addNewVisit()" class="btn btn-primary">➕ Add First Visit</button>
                </div>
            `;
            return;
        }

        let html = '';
        visitsSnapshot.forEach(doc => {
            const visit = doc.data();
            html += createVisitCard(doc.id, visit);
        });

        visitHistoryContainer.innerHTML = html;

    } catch (error) {
        console.error('Error loading visits:', error);
        visitHistoryContainer.innerHTML = '<div class="error-message">Error loading visit history.</div>';
    }
}

// Create visit card HTML
function createVisitCard(visitId, visit) {
    const visitDate = visit.visitDate?.toDate ? visit.visitDate.toDate() : new Date();
    const formattedDate = visitDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
    const formattedTime = visitDate.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const symptoms = visit.symptoms || 'Not recorded';
    const diagnosis = visit.diagnosis || 'Not recorded';
    const notes = visit.notes || '';
    const medicines = visit.medicines || [];

    let medicinesHTML = '';
    if (medicines.length > 0) {
        medicinesHTML = '<div class="medicines-list"><h4>💊 Prescribed Medicines:</h4><ul>';
        medicines.forEach(med => {
            medicinesHTML += `
                <li>
                    <strong>${med.name}</strong>
                    ${med.dosage ? ` - ${med.dosage}` : ''}
                    ${med.duration ? ` for ${med.duration}` : ''}
                </li>
            `;
        });
        medicinesHTML += '</ul></div>';
    }

    return `
      <div class="visit-card-header">
    <div class="visit-date-info">
        <h3>📅 ${formattedDate}</h3>
        <span class="visit-time">🕐 ${formattedTime}</span>
    </div>
    <div class="visit-actions">
        <button onclick="editVisit('${visitId}')" class="btn-edit-small">✏️ Edit</button>
        <button onclick="printPrescription('${visitId}')" class="btn-print-small">🖨️ Print</button>
        <button onclick="deleteVisit('${visitId}', '${formattedDate}')" class="btn-delete-small">🗑️</button>
    </div>
</div>
            
            <div class="visit-card-body">
                <div class="visit-info-row">
                    <strong>Symptoms:</strong>
                    <p>${symptoms}</p>
                </div>
                
                <div class="visit-info-row">
                    <strong>Diagnosis:</strong>
                    <p>${diagnosis}</p>
                </div>
                
                ${notes ? `
                    <div class="visit-info-row">
                        <strong>Notes:</strong>
                        <p>${notes}</p>
                    </div>
                ` : ''}
                
                ${medicinesHTML}
            </div>
        </div>
    `;
}

// Add new visit
function addNewVisit() {
    if (currentPatient) {
        window.location.href = `add-visit.html?patientId=${currentPatient.id}`;
    }
}

// Setup add visit button
document.getElementById('addVisitBtn')?.addEventListener('click', addNewVisit);

// Edit patient
function editPatient(patientId) {
    window.location.href = `edit-patient.html?id=${patientId}`;
}

// Delete patient from detail page
async function deletePatientFromDetail(patientId, patientName) {
    const confirmDelete = confirm(
        `⚠️ Are you sure you want to delete patient "${patientName}"?\n\n` +
        `This will also delete all visit records!\n\n` +
        `This action CANNOT be undone!`
    );

    if (!confirmDelete) return;

    const doubleConfirm = confirm(`⚠️ FINAL CONFIRMATION\n\nPermanently delete "${patientName}"?`);

    if (!doubleConfirm) return;

    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('You must be logged in');
        }

        // Delete all visits
        const visitsSnapshot = await db.collection('visits')
            .where('patientId', '==', patientId)
            .where('doctorId', '==', user.uid)
            .get();

        const deletePromises = [];
        visitsSnapshot.forEach(doc => {
            deletePromises.push(doc.ref.delete());
        });

        if (deletePromises.length > 0) {
            await Promise.all(deletePromises);
        }

        // Delete patient
        await db.collection('patients').doc(patientId).delete();

        alert(`✅ Patient "${patientName}" deleted successfully!`);
        window.location.href = 'patients.html';

    } catch (error) {
        console.error('Error deleting patient:', error);
        alert('❌ Error: ' + error.message);
    }
}

// Delete single visit
async function deleteVisit(visitId, visitDate) {
    const confirmDelete = confirm(`Delete visit from ${visitDate}?`);

    if (!confirmDelete) return;

    try {
        await db.collection('visits').doc(visitId).delete();

        alert('✅ Visit deleted successfully!');

        // Reload visit history
        const user = auth.currentUser;
        if (user && currentPatient) {
            await loadVisitHistory(user.uid, currentPatient.id);
        }

    } catch (error) {
        console.error('Error deleting visit:', error);
        alert('❌ Error: ' + error.message);
    }
}

// Print prescription
async function printPrescription(visitId) {
    try {
        // Get visit data
        const visitDoc = await db.collection('visits').doc(visitId).get();

        if (!visitDoc.exists) {
            alert('Visit not found!');
            return;
        }

        const visit = visitDoc.data();

        // Create prescription data object
        const prescriptionData = {
            visit: visit,
            patient: currentPatient,
            visitId: visitId
        };

        // Store in sessionStorage to pass to print page
        sessionStorage.setItem('prescriptionData', JSON.stringify(prescriptionData));

        // Open print page in new window
        window.open('print-prescription.html', '_blank');

    } catch (error) {
        console.error('Error loading prescription:', error);
        alert('Error loading prescription: ' + error.message);
    }
}

// Edit visit
function editVisit(visitId) {
    window.location.href = `edit-visit.html?visitId=${visitId}&patientId=${currentPatient.id}`;
}


// Generate AI Summary button handler
document.getElementById('generateSummaryBtn')?.addEventListener('click', async () => {
    if (!currentPatient) {
        alert('Patient data not loaded yet!');
        return;
    }
    
    const generateBtn = document.getElementById('generateSummaryBtn');
    const generateBtnText = document.getElementById('generateBtnText');
    const generateBtnLoader = document.getElementById('generateBtnLoader');
    const aiSummaryContent = document.getElementById('aiSummaryContent');
    
    try {
        // Disable button and show loader
        generateBtn.disabled = true;
        generateBtnText.style.display = 'none';
        generateBtnLoader.style.display = 'inline';
        
        // Show loading state
        aiSummaryContent.innerHTML = `
            <div class="ai-summary-loading">
                <div class="loading-spinner-ai">🤖</div>
                <p>AI is analyzing patient data...</p>
                <small>This may take 5-10 seconds</small>
            </div>
        `;
        
        // Get all visits for this patient
        const user = auth.currentUser;
        if (!user) {
            throw new Error('You must be logged in');
        }
        
        const visitsSnapshot = await db.collection('visits')
            .where('doctorId', '==', user.uid)
            .where('patientId', '==', currentPatient.id)
            .orderBy('visitDate', 'desc')
            .get();
        
        const visits = [];
        visitsSnapshot.forEach(doc => {
            visits.push(doc.data());
        });
        
        if (visits.length === 0) {
            aiSummaryContent.innerHTML = `
                <div class="ai-summary-error">
                    <div class="error-icon">ℹ️</div>
                    <p>This patient has no visit history yet. Add at least one visit to generate an AI summary.</p>
                </div>
            `;
            return;
        }
        
        // Generate AI summary
        console.log('Generating AI summary...');
        const result = await generatePatientSummary(currentPatient, visits);
        
        if (result.success) {
            const formattedSummary = formatAISummary(result.summary);
            const timestamp = result.timestamp.toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            aiSummaryContent.innerHTML = `
                <div class="ai-summary-result">
                    <div class="ai-summary-badge">
                        <span class="ai-badge-icon">✨</span>
                        <span>AI Generated Summary</span>
                        <span class="ai-timestamp">${timestamp}</span>
                    </div>
                    <div class="ai-summary-text">
                        ${formattedSummary}
                    </div>
                    <div class="ai-summary-footer">
                        <small>⚠️ This summary is AI-generated and should be reviewed by the doctor. Not a substitute for professional medical judgment.</small>
                    </div>
                </div>
            `;
            
            console.log('AI summary generated successfully');
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('Error generating AI summary:', error);
        aiSummaryContent.innerHTML = `
            <div class="ai-summary-error">
                <div class="error-icon">❌</div>
                <p><strong>Error:</strong> ${error.message}</p>
                <small>Please check your API key and internet connection.</small>
            </div>
        `;
    } finally {
        // Re-enable button
        generateBtn.disabled = false;
        generateBtnText.style.display = 'inline';
        generateBtnLoader.style.display = 'none';
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