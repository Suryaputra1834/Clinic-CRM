// Handle Add Patient Form Submission
const addPatientForm = document.getElementById('addPatientForm');

if (addPatientForm) {
    addPatientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = addPatientForm.querySelector('button[type="submit"]');
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
                throw new Error('You must be logged in to add patients');
            }
            
            // Get form values
            const patientData = {
                doctorId: user.uid,
                name: document.getElementById('patientName').value.trim(),
                age: parseInt(document.getElementById('patientAge').value),
                gender: document.getElementById('patientGender').value,
                contact: document.getElementById('patientContact').value.trim(),
                address: document.getElementById('patientAddress').value.trim() || '',
                bloodGroup: document.getElementById('patientBloodGroup').value || '',
                emergencyContact: document.getElementById('emergencyContact').value.trim() || '',
                medicalHistory: document.getElementById('medicalHistory').value.trim() || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Validate contact number
            if (!/^[0-9]{10}$/.test(patientData.contact)) {
                throw new Error('Contact number must be exactly 10 digits');
            }
            
            // Add patient to Firestore
            const docRef = await db.collection('patients').add(patientData);
            
            console.log('Patient added with ID:', docRef.id);
            
            // Show success message
            successMsg.textContent = '✅ Patient added successfully!';
            
            // Reset form
            addPatientForm.reset();
            
            // Redirect to patient detail page after 1.5 seconds
            setTimeout(() => {
                window.location.href = `patient-detail.html?id=${docRef.id}`;
            }, 1500);
            
        } catch (error) {
            console.error('Error adding patient:', error);
            errorMsg.textContent = 'Error: ' + error.message;
            
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtnText.style.display = 'inline';
            submitLoader.style.display = 'none';
        }
    });
}

// Logout functionality for this page
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