// Get prescription data from sessionStorage
const prescriptionDataStr = sessionStorage.getItem('prescriptionData');

if (!prescriptionDataStr) {
    document.getElementById('prescriptionContent').innerHTML = 
        '<div class="error">No prescription data found. Please try again.</div>';
} else {
    const prescriptionData = JSON.parse(prescriptionDataStr);
    loadDoctorInfoAndRender(prescriptionData);
}

// Load doctor information and render prescription
async function loadDoctorInfoAndRender(prescriptionData) {
    try {
        // Wait for auth
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                // Get doctor info
                const doctorDoc = await db.collection('doctors').doc(user.uid).get();
                const doctorInfo = doctorDoc.exists ? doctorDoc.data() : {};
                
                // Render prescription
                renderPrescription(prescriptionData, doctorInfo);
            } else {
                document.getElementById('prescriptionContent').innerHTML = 
                    '<div class="error">Please log in to view prescription.</div>';
            }
        });
    } catch (error) {
        console.error('Error loading doctor info:', error);
        document.getElementById('prescriptionContent').innerHTML = 
            '<div class="error">Error loading prescription.</div>';
    }
}

// Render prescription
function renderPrescription(data, doctorInfo) {
    const { visit, patient } = data;
    
    // Format visit date
    const visitDate = visit.visitDate?.toDate ? visit.visitDate.toDate() : new Date();
    const formattedDate = visitDate.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
    const formattedTime = visitDate.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // Build medicines table
    let medicinesHTML = '';
    if (visit.medicines && visit.medicines.length > 0) {
        medicinesHTML = `
            <div class="section-title">℞ Prescribed Medicines</div>
            <table class="medicines-table">
                <thead>
                    <tr>
                        <th>Sr.</th>
                        <th>Medicine Name</th>
                        <th>Dosage</th>
                        <th>Duration</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        visit.medicines.forEach((med, index) => {
            medicinesHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${med.name}</strong></td>
                    <td>${med.dosage || '-'}</td>
                    <td>${med.duration || '-'}</td>
                </tr>
            `;
        });
        
        medicinesHTML += `
                </tbody>
            </table>
        `;
    } else {
        medicinesHTML = `
            <div class="section-title">℞ Prescribed Medicines</div>
            <div class="detail-box">No medicines prescribed</div>
        `;
    }
    
    // Build notes section
    let notesHTML = '';
    if (visit.notes) {
        notesHTML = `
            <div class="section-title">📝 Additional Notes</div>
            <div class="detail-box">${visit.notes}</div>
        `;
    }
    
    // Generate prescription HTML
    const prescriptionHTML = `
        <div class="prescription-container">
            <!-- Header -->
            <div class="prescription-header">
                <div class="clinic-name">${doctorInfo.clinicName || 'Medical Clinic'}</div>
                <div class="doctor-name">Dr. ${doctorInfo.name || 'Doctor'}</div>
                <div class="clinic-info">
                    ${doctorInfo.email || ''}
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="action-buttons">
                <button onclick="window.print()" class="btn btn-print">🖨️ Print Prescription</button>
                <button onclick="window.close()" class="btn btn-close">✕ Close</button>
            </div>

            <!-- Patient Information -->
            <div class="patient-section">
                <div class="info-row">
                    <span class="info-label">Patient Name:</span>
                    <span class="info-value">${patient.name}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Age / Gender:</span>
                    <span class="info-value">${patient.age} years / ${patient.gender}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Contact:</span>
                    <span class="info-value">${patient.contact}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Date:</span>
                    <span class="info-value">${formattedDate} at ${formattedTime}</span>
                </div>
                ${patient.bloodGroup ? `
                <div class="info-row">
                    <span class="info-label">Blood Group:</span>
                    <span class="info-value">${patient.bloodGroup}</span>
                </div>
                ` : ''}
            </div>

            <!-- Symptoms -->
            <div class="section-title">🩺 Chief Complaints / Symptoms</div>
            <div class="detail-box">${visit.symptoms || 'Not recorded'}</div>

            <!-- Diagnosis -->
            <div class="section-title">📋 Diagnosis</div>
            <div class="detail-box">${visit.diagnosis || 'Not recorded'}</div>

            <!-- Medicines -->
            ${medicinesHTML}

            <!-- Notes -->
            ${notesHTML}

            <!-- Footer -->
            <div class="prescription-footer">
                <div class="signature-line">
                    <div class="signature-text">Doctor's Signature</div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('prescriptionContent').innerHTML = prescriptionHTML;
}