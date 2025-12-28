// Dark Mode Toggle Functionality

// Check for saved dark mode preference or default to light mode
const currentTheme = localStorage.getItem('theme') || 'light';

// Apply theme on page load
document.documentElement.setAttribute('data-theme', currentTheme);

// Update toggle icon based on current theme
function updateToggleIcon() {
    const toggleIcon = document.querySelector('.toggle-icon');
    if (toggleIcon) {
        if (document.documentElement.getAttribute('data-theme') === 'dark') {
            toggleIcon.textContent = '☀️'; // Sun icon for dark mode (click to go light)
        } else {
            toggleIcon.textContent = '🌙'; // Moon icon for light mode (click to go dark)
        }
    }
}

// Initialize icon on page load
updateToggleIcon();

// Toggle dark mode
function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Apply new theme
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Save preference
    localStorage.setItem('theme', newTheme);
    
    // Update icon
    updateToggleIcon();
    
    // Optional: Add smooth transition effect
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
}

// Attach event listener to toggle button
document.addEventListener('DOMContentLoaded', () => {
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }
});