/* ============================================================
   login.js
   Page:  pages/auth/login.html
   Role:  Handles user authentication with high-visibility popup alerts.
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    let container = document.getElementById("lottieContainer");
    if (container && typeof lottie !== "undefined") {
        lottie.loadAnimation({
            container: container,
            renderer:  "svg",
            loop:      true,
            autoplay:  true,
            path:      "../../css/Welcome.json"
        });
    }

    // Check if redirected from registration
    const urlParams = new URLSearchParams(window.location.search);
    const signupMsg = sessionStorage.getItem("signupSuccessMessage");
    if (urlParams.get("registered") === "true" || signupMsg) {
        sessionStorage.removeItem("signupSuccessMessage");
        const banner = document.getElementById("loginErrorBanner");
        if (banner) {
            banner.className = "auth-success-banner";
            banner.innerHTML = `<span class="banner-icon">🎉</span> <span class="banner-text">Account created successfully! Please sign in with your email and password.</span>`;
            banner.classList.remove("hidden");
        }
        const savedEmail = sessionStorage.getItem("registeredEmail");
        if (savedEmail) {
            sessionStorage.removeItem("registeredEmail");
            const emailInput = document.getElementById("email");
            if (emailInput) {
                emailInput.value = savedEmail;
                const passwordInput = document.getElementById("password");
                if (passwordInput) passwordInput.focus();
            }
        }
    }

    // Dismiss banners on typing
    document.querySelectorAll("input").forEach(input => {
        input.addEventListener("input", () => {
            const banner = document.getElementById("loginErrorBanner");
            if (banner && banner.classList.contains("auth-error-banner")) {
                banner.classList.add("hidden");
            }
        });
    });
});

function toggleEye() {
    let passwordInput = document.getElementById("password");
    let eyeSymbol     = document.getElementById("eyeSymbol");

    if (passwordInput.type === "password") {
        passwordInput.type    = "text";
        eyeSymbol.textContent = "🙈";
    } else {
        passwordInput.type    = "password";
        eyeSymbol.textContent = "👁️";
    }
}

/**
 * Show a high-contrast Cyber / Neo-Brutalist banner inside the card
 */
function showAuthPopup(title, message, icon = "⚠️") {
    const existing = document.getElementById("authPopupOverlay");
    if (existing) existing.remove();

    // Update inline banner
    const banner = document.getElementById("loginErrorBanner");
    if (banner) {
        banner.className = "auth-error-banner";
        banner.innerHTML = `<span class="banner-icon">${icon}</span> <span class="banner-text">${message}</span>`;
        banner.classList.remove("hidden");
        banner.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
}

function closeAuthPopup() {
    const existing = document.getElementById("authPopupOverlay");
    if (existing) existing.remove();
    const banner = document.getElementById("loginErrorBanner");
    if (banner) banner.classList.add("hidden");
}
window.closeAuthPopup = closeAuthPopup;

let handleLogin = async (event) => {
    if (event) event.preventDefault();

    let emailEl    = document.getElementById("email");
    let passwordEl = document.getElementById("password");

    const email = emailEl ? emailEl.value.trim() : "";
    const password = passwordEl ? passwordEl.value : "";

    // 1. Client-Side Validations with Immediate Popups
    if (!email) {
        showAuthPopup("MISSING EMAIL ✉️", "Please enter your email address to log in.");
        if (emailEl) emailEl.focus();
        return;
    }

    // Basic email format check
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        showAuthPopup("INVALID EMAIL FORMAT ✉️", "Please enter a valid email address (e.g. name@example.com).");
        if (emailEl) emailEl.focus();
        return;
    }

    if (!password) {
        showAuthPopup("MISSING PASSWORD 🔑", "Please enter your account password to continue.");
        if (passwordEl) passwordEl.focus();
        return;
    }

    try {
        let submitBtn = document.querySelector("input[type='submit']");
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.value = "LOGGING IN...";
        }

        let data = await Auth.login(email, password);
        let user = data.user;

        // Role-based page redirect
        if (user.role === "Admin") {
            window.location.href = "../admin/admin.html";
        } else {
            window.location.href = "../reader/stories.html";
        }
    } catch (err) {
        let submitBtn = document.querySelector("input[type='submit']");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.value = "LOG IN →";
        }

        const msg = err.message || "Login failed. Please check your credentials.";
        if (msg.includes("Email does not exist")) {
            showAuthPopup("ACCOUNT NOT FOUND 🔍", "No account registered with this email. Please check your spelling or register as a new user.", "❌");
        } else if (msg.includes("Password does not match")) {
            showAuthPopup("INCORRECT PASSWORD 🔒", "The password you entered is incorrect. Please check for typos and try again.", "⚠️");
            if (passwordEl) {
                passwordEl.value = "";
                passwordEl.focus();
            }
        } else {
            showAuthPopup("AUTHENTICATION FAILED 🛑", msg, "⚠️");
        }
    }
};
