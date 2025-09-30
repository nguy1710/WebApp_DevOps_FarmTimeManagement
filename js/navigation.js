// Shared Navigation Component
class Navigation {
  constructor() {
    this.currentPage = this.getCurrentPage();
  }

  getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop();
    
    switch(filename) {
      case 'dashboard.html':
        return 'staff';
      case 'devices.html':
        return 'devices';
      case 'schedule.html':
        return 'schedule';
      case 'biometrics.html':
        return 'biometrics';
      case 'attendance.html':
        return 'attendance';
      case 'history.html':
        return 'history';
      default:
        return 'staff';
    }
  }

  render() {
    const navHtml = `
      <nav class="navbar navbar-dark bg-primary">
        <div class="container-fluid">
          <a class="navbar-brand" href="dashboard.html">
            <img
              src="./assets/flinderslogo.png"
              alt="Farm Time Management"
              height="50"
            />
          </a>
          <div class="d-flex align-items-center gap-2">
            <a href="attendance.html" class="btn ${this.currentPage === 'attendance' ? 'btn-light' : 'btn-warning'} btn-sm">
              Attendance
            </a>
            <a href="schedule.html" class="btn ${this.currentPage === 'schedule' ? 'btn-light' : 'btn-warning'} btn-sm">
              Schedule
            </a>
            <a href="devices.html" class="btn ${this.currentPage === 'devices' ? 'btn-light' : 'btn-warning'} btn-sm">
              Devices
            </a>
            <a href="biometrics.html" class="btn ${this.currentPage === 'biometrics' ? 'btn-light' : 'btn-warning'} btn-sm">
              Biometrics
            </a>
            <a href="dashboard.html" class="btn ${this.currentPage === 'staff' ? 'btn-light' : 'btn-warning'} btn-sm">
              Staff
            </a>
            <a href="history.html" class="btn ${this.currentPage === 'history' ? 'btn-light' : 'btn-warning'} btn-sm">
              History Log
            </a>
            <span id="userWelcome" class="ms-2 me-2 text-white small"></span>
            <button id="btnLogout" class="btn btn-outline-light btn-sm">
              Logout
            </button>
          </div>
        </div>
      </nav>
    `;
    
    return navHtml;
  }

  // Method to initialize navigation and user session
  init() {
    // Check if user is logged in
    const farmUser = localStorage.getItem('farm_user');
    console.log('Navigation init - farm_user:', farmUser);
    
    if (!farmUser) {
      console.log('No farm_user found, redirecting to login');
      window.location.href = 'login.html';
      return;
    }

    // Display user welcome message
    const userData = JSON.parse(farmUser);
    console.log('Navigation init - userData:', userData);
    
    const userWelcome = document.getElementById('userWelcome');
    if (userWelcome && userData.staff && userData.staff.firstName) {
      userWelcome.textContent = `Hello ${userData.staff.firstName}`;
    }

    // Setup logout functionality
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        localStorage.removeItem('farm_user');
        window.location.href = 'login.html';
      });
    }
  }
}

// Auto-initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  const nav = new Navigation();
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
window.Navigation = Navigation;
