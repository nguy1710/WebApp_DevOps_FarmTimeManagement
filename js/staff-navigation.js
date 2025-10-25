// Staff Navigation Component
class StaffNavigation {
  constructor() {
    this.currentPage = this.getCurrentPage();
    this.staffSession = this.getStaffSession();
  }

  getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop();
    
    switch(filename) {
      case 'staff-event.html':
        return 'staff-event';
      case 'staff-schedule.html':
        return 'staff-schedule';
      case 'staff-payslip.html':
        return 'staff-payslip';
      default:
        return 'staff-event';
    }
  }

  getStaffSession() {
    try {
      const session = localStorage.getItem('staff_session');
      return session ? JSON.parse(session) : null;
    } catch (error) {
      console.error('Error parsing staff session:', error);
      return null;
    }
  }

  render() {
    if (!this.staffSession) {
      return this.renderLoginPrompt();
    }

    const navHtml = `
      <nav class="navbar navbar-dark bg-success">
        <div class="container-fluid">
          <a class="navbar-brand" href="staff-event.html">
            <img
              src="./assets/flinderslogo.png"
              alt="Farm Time Management"
              height="40"
            />
            <span class="ms-2">Staff Portal</span>
          </a>
          <div class="d-flex align-items-center gap-2">
            <a href="staff-event.html" class="btn ${this.currentPage === 'staff-event' ? 'btn-light' : 'btn-warning'} btn-sm">
              My Events
            </a>
            <a href="staff-schedule.html" class="btn ${this.currentPage === 'staff-schedule' ? 'btn-light' : 'btn-warning'} btn-sm">
              My Schedule
            </a>
            <a href="staff-payslip.html" class="btn ${this.currentPage === 'staff-payslip' ? 'btn-light' : 'btn-warning'} btn-sm">
              My Payslips
            </a>
            <span id="staffWelcome" class="ms-2 me-2 text-white small">
              ${this.staffSession.firstName} ${this.staffSession.lastName} (ID: ${this.staffSession.staffId})
            </span>
            <button id="btnStaffLogout" class="btn btn-outline-light btn-sm">
              Logout
            </button>
          </div>
        </div>
      </nav>
    `;
    
    return navHtml;
  }

  renderLoginPrompt() {
    return `
      <nav class="navbar navbar-dark bg-danger">
        <div class="container-fluid">
          <a class="navbar-brand" href="staff-login.html">
            <img
              src="./assets/flinderslogo.png"
              alt="Farm Time Management"
              height="40"
            />
            <span class="ms-2">Staff Portal</span>
          </a>
          <div class="d-flex align-items-center">
            <span class="text-white me-3">Please login to access staff portal</span>
            <a href="staff-login.html" class="btn btn-light btn-sm">
              Login
            </a>
          </div>
        </div>
      </nav>
    `;
  }

  // Method to initialize navigation and staff session
  init() {
    // Check if staff is logged in
    if (!this.staffSession) {
      console.log('No staff session found, redirecting to login');
      window.location.href = 'staff-login.html';
      return;
    }

    // Check session expiry (8 hours)
    const loginTime = new Date(this.staffSession.loginTime);
    const now = new Date();
    const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
    
    if (hoursDiff >= 8) {
      console.log('Staff session expired, redirecting to login');
      localStorage.removeItem('staff_session');
      window.location.href = 'staff-login.html';
      return;
    }

    // Setup logout functionality
    const btnStaffLogout = document.getElementById('btnStaffLogout');
    if (btnStaffLogout) {
      btnStaffLogout.addEventListener('click', () => {
        localStorage.removeItem('staff_session');
        window.location.href = 'staff-login.html';
      });
    }
  }
}

// Auto-initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  const nav = new StaffNavigation();
  const navContainer = document.getElementById('navigation-container');
  if (navContainer) {
    navContainer.innerHTML = nav.render();
    // Small delay to ensure DOM is fully ready
    setTimeout(() => {
      nav.init();
    }, 10);
  }
});

// Export for use in other scripts
window.StaffNavigation = StaffNavigation;
