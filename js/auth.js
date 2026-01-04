// Get form elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegisterLink = document.getElementById('showRegister');
const showLoginLink = document.getElementById('showLogin');

// Toggle between login and register forms
showRegisterLink?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginForm').parentElement.style.display = 'none';
    document.getElementById('registerBox').style.display = 'block';
});

showLoginLink?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginForm').parentElement.style.display = 'block';
    document.getElementById('registerBox').style.display = 'none';
});

// Handle Registration
registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('regName').value;
    const clinic = document.getElementById('regClinic').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const errorMsg = document.getElementById('regErrorMsg');

    try {
        // Create user account
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Send verification email
        await user.sendEmailVerification();

        // Save doctor details to Firestore
        await db.collection('doctors').doc(user.uid).set({
            name: name,
            clinicName: clinic,
            email: email,
            emailVerified: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Sign out immediately (user must verify first)
        await auth.signOut();

        // Show success message
        showSuccess('Registration successful!\n\nA verification email has been sent to: ' + email + '\n\nPlease check your inbox (and spam folder) and click the verification link before logging in.');

        // Switch to login form
        document.getElementById('registerBox').style.display = 'none';
        document.getElementById('loginForm').parentElement.style.display = 'block';

    } catch (error) {
        errorMsg.textContent = 'Registration failed: ' + error.message;
    }
});

// Handle Login
loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorMsg = document.getElementById('errorMsg');

    try {
        // Sign in with Firebase
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Reload user data to get latest emailVerified status
        await user.reload();

        // Check if email is verified
        if (!user.emailVerified) {
            errorMsg.textContent = '⚠️ Please verify your email before logging in.';

            // Ask if they want to resend verification email
            const resend = confirm('Email not verified yet.\n\nWould you like us to resend the verification email?');
            if (resend) {
                await user.sendEmailVerification();
                showSuccess('Verification email sent! Please check your inbox and spam folder.');
            }

            // Sign them out - CRITICAL!
            await auth.signOut();
            return; // Stop here, don't redirect
        }

        // If we reach here, email IS verified
        // Update Firestore
        await db.collection('doctors').doc(user.uid).update({
            emailVerified: true
        });

        // Success! Redirect to dashboard
        window.location.href = 'dashboard.html';

    } catch (error) {
        errorMsg.textContent = 'Login failed: ' + error.message;
    }
});

// Auth state observer - protect pages
auth.onAuthStateChanged(async (user) => {
    const currentPage = window.location.pathname;
    const isLoginPage = currentPage.endsWith('login.html') || currentPage.endsWith('/');

    if (user) {
        // User is logged in

        // Reload to get latest verification status
        await user.reload();

        // If on login page and verified, go to dashboard
        if (isLoginPage && user.emailVerified) {
            window.location.href = 'dashboard.html';
        }

        // If on dashboard but NOT verified, kick them out
        if (!isLoginPage && !user.emailVerified) {
            showError('Please verify your email first!');
            await auth.signOut();
            window.location.href = 'login.html';
        }

    } else {
        // User is NOT logged in

        // If on protected page, redirect to login
        if (!isLoginPage) {
            window.location.href = 'login.html';
        }
    }
});