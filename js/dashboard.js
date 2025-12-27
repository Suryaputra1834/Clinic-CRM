auth.onAuthStateChanged(async (user) => {
    if (user && user.emailVerified) {
        // Load doctor information
        loadDoctorInfo(user.uid);
        
        // Load statistics
        loadStats(user.uid);
        
        // Load follow-up reminders (NEW!)
        loadFollowUpReminders(user.uid);
        
        // Load recent patients
        loadRecentPatients(user.uid);
    }
});

// Load doctor name and clinic name
async function loadDoctorInfo(doctorId) {
    try {
        const doctorDoc = await db.collection('doctors').doc(doctorId).get();
        
        if (doctorDoc.exists) {
            const data = doctorDoc.data();
            document.getElementById('doctorName').textContent = data.name || 'Doctor';
            document.getElementById('clinicName').textContent = data.clinicName || 'Clinic';
        }
    } catch (error) {
        console.error('Error loading doctor info:', error);
    }
}

// Load statistics (patient count, visits)
async function loadStats(doctorId) {
    try {
        // Get total patients count
        const patientsSnapshot = await db.collection('patients')
            .where('doctorId', '==', doctorId)
            .get();
        
        document.getElementById('totalPatients').textContent = patientsSnapshot.size;
        
        // Get today's date at midnight
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get visits today
        const visitsToday = await db.collection('visits')
            .where('doctorId', '==', doctorId)
            .where('visitDate', '>=', today)
            .get();
        
        document.getElementById('visitsToday').textContent = visitsToday.size;
        
        // Get this week's date (last 7 days)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);
        
        const visitsThisWeek = await db.collection('visits')
            .where('doctorId', '==', doctorId)
            .where('visitDate', '>=', weekAgo)
            .get();
        
        document.getElementById('visitsThisWeek').textContent = visitsThisWeek.size;
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load recent patients (last 5)
async function loadRecentPatients(doctorId) {
    try {
        const recentPatients = await db.collection('patients')
            .where('doctorId', '==', doctorId)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        const container = document.getElementById('recentPatientsList');
        
        if (recentPatients.empty) {
            container.innerHTML = '<p class="no-data">No patients yet. Add your first patient!</p>';
            return;
        }
        
        let html = '';
        recentPatients.forEach(doc => {
            const patient = doc.data();
            html += `
                <div class="patient-card" onclick="window.location.href='patient-detail.html?id=${doc.id}'">
                    <div class="patient-avatar">${patient.name.charAt(0).toUpperCase()}</div>
                    <div class="patient-info">
                        <h4>${patient.name}</h4>
                        <p>${patient.age} years • ${patient.gender}</p>
                        <p class="patient-contact">${patient.contact}</p>
                    </div>
                    <div class="patient-arrow">→</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading recent patients:', error);
    }
}

// Load follow-up reminders
async function loadFollowUpReminders(doctorId) {
    const followUpContainer = document.getElementById('followUpReminders');
    
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get all visits that need follow-up and are not completed
        const followUpSnapshot = await db.collection('visits')
            .where('doctorId', '==', doctorId)
            .where('needsFollowUp', '==', true)
            .where('followUpCompleted', '==', false)
            .orderBy('followUpDate', 'asc')
            .get();
        
        if (followUpSnapshot.empty) {
            followUpContainer.innerHTML = `
                <div class="no-follow-ups">
                    <p>✅ No pending follow-ups. Great job staying on top of patient care!</p>
                </div>
            `;
            return;
        }
        
        let overdueHTML = '';
        let todayHTML = '';
        let upcomingHTML = '';
        
        let overdueCount = 0;
        let todayCount = 0;
        let upcomingCount = 0;
        
        followUpSnapshot.forEach(doc => {
            const visit = doc.data();
            const followUpDate = visit.followUpDate?.toDate();
            
            if (!followUpDate) return;
            
            const formattedDate = followUpDate.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            
            const daysDiff = Math.floor((followUpDate - today) / (1000 * 60 * 60 * 24));
            
            let statusClass = '';
            let statusText = '';
            let category = '';
            
            if (daysDiff < 0) {
                statusClass = 'overdue';
                statusText = `Overdue by ${Math.abs(daysDiff)} day${Math.abs(daysDiff) > 1 ? 's' : ''}`;
                category = 'overdue';
                overdueCount++;
            } else if (daysDiff === 0) {
                statusClass = 'today';
                statusText = 'Due Today';
                category = 'today';
                todayCount++;
            } else if (daysDiff <= 7) {
                statusClass = 'upcoming';
                statusText = `In ${daysDiff} day${daysDiff > 1 ? 's' : ''}`;
                category = 'upcoming';
                upcomingCount++;
            } else {
                return; // Don't show follow-ups more than 7 days away
            }
            
            const html = `
                <div class="follow-up-item ${statusClass}" onclick="window.location.href='patient-detail.html?id=${visit.patientId}'">
                    <div class="follow-up-patient">
                        <div class="patient-avatar-small">${visit.patientName.charAt(0).toUpperCase()}</div>
                        <div class="follow-up-details">
                            <h4>${visit.patientName}</h4>
                            <p class="follow-up-reason">${visit.followUpReason || 'Follow-up visit'}</p>
                        </div>
                    </div>
                    <div class="follow-up-date-info">
                        <span class="follow-up-date">${formattedDate}</span>
                        <span class="follow-up-status ${statusClass}">${statusText}</span>
                    </div>
                    <button onclick="markFollowUpComplete(event, '${doc.id}')" class="btn-mark-complete">✓ Done</button>
                </div>
            `;
            
            if (category === 'overdue') overdueHTML += html;
            else if (category === 'today') todayHTML += html;
            else upcomingHTML += html;
        });
        
        let finalHTML = '';
        
        if (overdueCount > 0) {
            finalHTML += `<div class="follow-up-category overdue-category">
                <h3>🚨 Overdue (${overdueCount})</h3>
                ${overdueHTML}
            </div>`;
        }
        
        if (todayCount > 0) {
            finalHTML += `<div class="follow-up-category today-category">
                <h3>⏰ Due Today (${todayCount})</h3>
                ${todayHTML}
            </div>`;
        }
        
        if (upcomingCount > 0) {
            finalHTML += `<div class="follow-up-category upcoming-category">
                <h3>📅 Upcoming This Week (${upcomingCount})</h3>
                ${upcomingHTML}
            </div>`;
        }
        
        followUpContainer.innerHTML = finalHTML || '<div class="no-follow-ups"><p>No follow-ups in the next 7 days.</p></div>';
        
    } catch (error) {
        console.error('Error loading follow-ups:', error);
        followUpContainer.innerHTML = '<div class="error-message">Error loading follow-ups.</div>';
    }
}

// Mark follow-up as complete
async function markFollowUpComplete(event, visitId) {
    event.stopPropagation(); // Prevent navigation to patient detail
    
    if (!confirm('Mark this follow-up as completed?')) {
        return;
    }
    
    try {
        await db.collection('visits').doc(visitId).update({
            followUpCompleted: true,
            followUpCompletedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Reload follow-ups
        const user = auth.currentUser;
        if (user) {
            await loadFollowUpReminders(user.uid);
        }
        
    } catch (error) {
        console.error('Error marking follow-up complete:', error);
        alert('Error: ' + error.message);
    }
}

// Logout functionality - ROBUST VERSION
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (!logoutBtn) {
        console.error('Logout button not found!');
        return;
    }
    
    console.log('Logout button found and event listener attached');
    
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('Logout clicked');
        
        const confirmLogout = confirm('Are you sure you want to logout?');
        
        if (confirmLogout) {
            try {
                console.log('Logging out...');
                await auth.signOut();
                console.log('Signed out successfully');
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Logout error:', error);
                alert('Error logging out: ' + error.message);
            }
        } else {
            console.log('Logout cancelled');
        }
    });
}

// Call the function when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupLogout);
} else {
    setupLogout();
}