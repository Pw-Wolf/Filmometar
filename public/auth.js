// filepath: c:\Users\Admin\Documents\repos\Filmometar\public\auth.js
async function logout() {
    // Clear cookie by setting it to expire
    document.cookie = "sessionId=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";

    // Redirect to login page
    window.location.href = "/login";
}

function checkAuthStatus() {
    const cookies = document.cookie.split(";").reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split("=");
        acc[key] = value;
        return acc;
    }, {});
}

// Check auth status when page loads
document.addEventListener("DOMContentLoaded", checkAuthStatus);
