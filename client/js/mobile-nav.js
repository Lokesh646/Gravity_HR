document.addEventListener('DOMContentLoaded', () => {
    // Only add if not already present
    if (document.getElementById('mobileMenuBtn')) return;

    // Create a container for the hamburger
    const btn = document.createElement('button');
    btn.id = 'mobileMenuBtn';
    btn.innerHTML = '<i class="fa-solid fa-bars"></i>';
    btn.className = 'glass-panel btn-secondary'; // Using your generic classes

    // Insert into body (fixed position handles placement)
    document.body.appendChild(btn);

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    // Sidebar Reference
    const sidebar = document.querySelector('.sidebar');

    // Toggle Check
    if (!sidebar) {
        console.warn('No sidebar found for mobile nav');
        return;
    }

    // Handlers
    const toggleSidebar = () => {
        sidebar.classList.toggle('mobile-open');
        overlay.classList.toggle('active');
        btn.querySelector('i').classList.toggle('fa-bars');
        btn.querySelector('i').classList.toggle('fa-times');
    };

    const closeSidebar = () => {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
        btn.querySelector('i').classList.add('fa-bars');
        btn.querySelector('i').classList.remove('fa-times');
    };

    // Events
    btn.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', closeSidebar);

    // Close on navigation link click (if SPA-like)
    const navLinks = sidebar.querySelectorAll('a, .nav-item');
    navLinks.forEach(link => {
        link.addEventListener('click', closeSidebar);
    });
});
