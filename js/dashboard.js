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

        // NEW: Load enhanced statistics
        loadMonthlyStats(user.uid);
        loadTopDiagnoses(user.uid);
        loadPatientDemographics(user.uid);
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
        
        // Get ALL visits for this doctor (we'll filter in JavaScript)
        const allVisitsSnapshot = await db.collection('visits')
            .where('doctorId', '==', doctorId)
            .get();
        
        // Get today's date at midnight
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTime = today.getTime();
        
        // Get 7 days ago
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);
        const weekAgoTime = weekAgo.getTime();
        
        // Count visits manually based on visitDate
        let visitsTodayCount = 0;
        let visitsThisWeekCount = 0;
        
        allVisitsSnapshot.forEach(doc => {
            const visit = doc.data();
            if (visit.visitDate) {
                const visitDate = visit.visitDate.toDate();
                visitDate.setHours(0, 0, 0, 0);
                const visitTime = visitDate.getTime();
                
                // Check if visit is today
                if (visitTime === todayTime) {
                    visitsTodayCount++;
                }
                
                // Check if visit is within last 7 days
                if (visitTime >= weekAgoTime) {
                    visitsThisWeekCount++;
                }
            }
        });
        
        document.getElementById('visitsToday').textContent = visitsTodayCount;
        document.getElementById('visitsThisWeek').textContent = visitsThisWeekCount;
        
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

// Load monthly statistics
async function loadMonthlyStats(doctorId) {
    try {
        // Get current month dates
        const now = new Date();
        const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        firstDayThisMonth.setHours(0, 0, 0, 0);
        
        const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        lastDayThisMonth.setHours(23, 59, 59, 999);
        
        // Get last month dates
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        firstDayLastMonth.setHours(0, 0, 0, 0);
        
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        lastDayLastMonth.setHours(23, 59, 59, 999);
        
        // Get ALL visits for this doctor
        const allVisitsSnapshot = await db.collection('visits')
            .where('doctorId', '==', doctorId)
            .get();
        
        // Filter visits manually by visitDate
        let thisMonthCount = 0;
        let lastMonthCount = 0;
        const thisMonthVisits = [];
        
        const thisMonthStart = firstDayThisMonth.getTime();
        const thisMonthEnd = lastDayThisMonth.getTime();
        const lastMonthStart = firstDayLastMonth.getTime();
        const lastMonthEnd = lastDayLastMonth.getTime();
        
        allVisitsSnapshot.forEach(doc => {
            const visit = doc.data();
            if (visit.visitDate) {
                const visitDate = visit.visitDate.toDate();
                const visitTime = visitDate.getTime();
                
                // Check if visit is this month
                if (visitTime >= thisMonthStart && visitTime <= thisMonthEnd) {
                    thisMonthCount++;
                    thisMonthVisits.push({ ...visit, visitDate: visitDate });
                }
                
                // Check if visit is last month
                if (visitTime >= lastMonthStart && visitTime <= lastMonthEnd) {
                    lastMonthCount++;
                }
            }
        });
        
        document.getElementById('visitsThisMonth').textContent = thisMonthCount;
        
        // Calculate trend
        const monthlyTrendEl = document.getElementById('monthlyTrend');
        if (lastMonthCount > 0) {
            const percentChange = ((thisMonthCount - lastMonthCount) / lastMonthCount * 100).toFixed(1);
            if (percentChange > 0) {
                monthlyTrendEl.innerHTML = `📈 +${percentChange}% vs last month`;
                monthlyTrendEl.className = 'trend-indicator trend-up';
            } else if (percentChange < 0) {
                monthlyTrendEl.innerHTML = `📉 ${percentChange}% vs last month`;
                monthlyTrendEl.className = 'trend-indicator trend-down';
            } else {
                monthlyTrendEl.innerHTML = `➡️ Same as last month`;
                monthlyTrendEl.className = 'trend-indicator trend-neutral';
            }
        } else {
            monthlyTrendEl.innerHTML = `First month of data`;
            monthlyTrendEl.className = 'trend-indicator trend-neutral';
        }
        
        // Average visits per day (only count days that have passed)
        const daysInMonth = now.getDate(); // Current day of month
        const avgPerDay = daysInMonth > 0 ? (thisMonthCount / daysInMonth).toFixed(1) : 0;
        document.getElementById('avgVisitsPerDay').textContent = avgPerDay;
        
        // Find busiest day of week (from this month's visits)
        const dayCount = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        thisMonthVisits.forEach(visit => {
            const dayOfWeek = visit.visitDate.getDay();
            dayCount[dayOfWeek]++;
        });
        
        let maxDay = 0;
        let maxCount = 0;
        for (let day in dayCount) {
            if (dayCount[day] > maxCount) {
                maxCount = dayCount[day];
                maxDay = day;
            }
        }
        
        if (maxCount > 0) {
            document.getElementById('busiestDay').textContent = dayNames[maxDay];
            document.getElementById('busiestDayCount').textContent = `${maxCount} visits`;
        } else {
            document.getElementById('busiestDay').textContent = '-';
            document.getElementById('busiestDayCount').textContent = 'No data yet';
        }
        
        // New patients this month (still based on createdAt - this is correct)
        const newPatients = await db.collection('patients')
            .where('doctorId', '==', doctorId)
            .where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(firstDayThisMonth))
            .get();
        
        document.getElementById('newPatientsMonth').textContent = newPatients.size;
        
    } catch (error) {
        console.error('Error loading monthly stats:', error);
    }
}

// Load top diagnoses
async function loadTopDiagnoses(doctorId) {
    try {
        // Get all visits from last 3 months
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        const visits = await db.collection('visits')
            .where('doctorId', '==', doctorId)
            .where('visitDate', '>=', firebase.firestore.Timestamp.fromDate(threeMonthsAgo))
            .get();
        
        // Count diagnoses
        const diagnosisCount = {};
        visits.forEach(doc => {
            const visit = doc.data();
            if (visit.diagnosis) {
                const diagnosis = visit.diagnosis.toLowerCase().trim();
                diagnosisCount[diagnosis] = (diagnosisCount[diagnosis] || 0) + 1;
            }
        });
        
        // Sort and get top 5
        const sortedDiagnoses = Object.entries(diagnosisCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        const topDiagnosesEl = document.getElementById('topDiagnoses');
        
        if (sortedDiagnoses.length === 0) {
            topDiagnosesEl.innerHTML = '<p class="no-data">No diagnosis data yet</p>';
            return;
        }
        
        let html = '<ul class="diagnosis-list">';
        sortedDiagnoses.forEach(([diagnosis, count], index) => {
            const percentage = ((count / visits.size) * 100).toFixed(1);
            html += `
                <li class="diagnosis-item">
                    <div class="diagnosis-rank">${index + 1}</div>
                    <div class="diagnosis-details">
                        <span class="diagnosis-name">${capitalize(diagnosis)}</span>
                        <div class="diagnosis-bar">
                            <div class="diagnosis-bar-fill" style="width: ${percentage}%"></div>
                        </div>
                        <span class="diagnosis-count">${count} cases (${percentage}%)</span>
                    </div>
                </li>
            `;
        });
        html += '</ul>';
        
        topDiagnosesEl.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading diagnoses:', error);
        document.getElementById('topDiagnoses').innerHTML = '<p class="error-text">Error loading data</p>';
    }
}

// Load patient demographics
async function loadPatientDemographics(doctorId) {
    try {
        const patients = await db.collection('patients')
            .where('doctorId', '==', doctorId)
            .get();
        
        if (patients.empty) {
            document.getElementById('patientDemographics').innerHTML = '<p class="no-data">No patient data yet</p>';
            return;
        }
        
        // Count by gender
        const genderCount = { Male: 0, Female: 0, Other: 0 };
        
        // Count by age group
        const ageGroups = {
            '0-18': 0,
            '19-35': 0,
            '36-50': 0,
            '51-65': 0,
            '65+': 0
        };
        
        patients.forEach(doc => {
            const patient = doc.data();
            
            // Gender
            if (patient.gender) {
                genderCount[patient.gender] = (genderCount[patient.gender] || 0) + 1;
            }
            
            // Age groups
            const age = patient.age;
            if (age <= 18) ageGroups['0-18']++;
            else if (age <= 35) ageGroups['19-35']++;
            else if (age <= 50) ageGroups['36-50']++;
            else if (age <= 65) ageGroups['51-65']++;
            else ageGroups['65+']++;
        });
        
        const total = patients.size;
        
        let html = `
            <div class="demographics-section">
                <h4>Gender Distribution</h4>
                <div class="demo-bars">
        `;
        
        for (let gender in genderCount) {
            const count = genderCount[gender];
            const percentage = ((count / total) * 100).toFixed(1);
            if (count > 0) {
                html += `
                    <div class="demo-bar-item">
                        <span class="demo-label">${gender}</span>
                        <div class="demo-bar">
                            <div class="demo-bar-fill ${gender.toLowerCase()}" style="width: ${percentage}%"></div>
                        </div>
                        <span class="demo-value">${count} (${percentage}%)</span>
                    </div>
                `;
            }
        }
        
        html += `
                </div>
            </div>
            <div class="demographics-section">
                <h4>Age Groups</h4>
                <div class="demo-bars">
        `;
        
        for (let group in ageGroups) {
            const count = ageGroups[group];
            const percentage = ((count / total) * 100).toFixed(1);
            html += `
                <div class="demo-bar-item">
                    <span class="demo-label">${group} years</span>
                    <div class="demo-bar">
                        <div class="demo-bar-fill age-group" style="width: ${percentage}%"></div>
                    </div>
                    <span class="demo-value">${count} (${percentage}%)</span>
                </div>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
        
        document.getElementById('patientDemographics').innerHTML = html;
        
    } catch (error) {
        console.error('Error loading demographics:', error);
        document.getElementById('patientDemographics').innerHTML = '<p class="error-text">Error loading data</p>';
    }
}

// Helper function to capitalize text
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
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