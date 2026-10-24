/* ============================================================
   signup.js
   Page:  pages/auth/signup.html
   Role:  Handles new user registration with rich popup alerts.
   ============================================================ */

function togglePassword(inputId, eyeSymbolId) {
    let passwordInput = document.getElementById(inputId);
    let eyeSymbol     = document.getElementById(eyeSymbolId);

    if (passwordInput.type === "password") {
        passwordInput.type    = "text";
        eyeSymbol.textContent = "🙈";
    } else {
        passwordInput.type    = "password";
        eyeSymbol.textContent = "👁️";
    }
}

function showAuthPopup(title, message, icon = "⚠️") {
    const existing = document.getElementById("authPopupOverlay");
    if (existing) existing.remove();

    // Dismiss banner on typing
    document.querySelectorAll("input").forEach(input => {
        input.addEventListener("input", () => {
            const banner = document.getElementById("signupErrorBanner");
            if (banner) banner.classList.add("hidden");
        }, { once: true });
    });

    const banner = document.getElementById("signupErrorBanner");
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
    const banner = document.getElementById("signupErrorBanner");
    if (banner) banner.classList.add("hidden");
}
window.closeAuthPopup = closeAuthPopup;

async function handleRegister(event) {
    if (event) event.preventDefault();

    try {
        let nameEl            = document.getElementById("name");
        let emailEl           = document.getElementById("email");
        let createPasswordEl  = document.getElementById("password");
        let confirmPasswordEl = document.getElementById("cpassword");

        const name = nameEl ? nameEl.value.trim() : "";
        const email = emailEl ? emailEl.value.trim() : "";
        const passVal = createPasswordEl ? createPasswordEl.value : "";
        const confirmPassVal = confirmPasswordEl ? confirmPasswordEl.value : "";

        if (!name) {
            showAuthPopup("MISSING NAME 👤", "Please enter your full or display name.");
            if (nameEl) nameEl.focus();
            return;
        }

        if (!email) {
            showAuthPopup("MISSING EMAIL ✉️", "Please provide a valid email address.");
            if (emailEl) emailEl.focus();
            return;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            showAuthPopup("INVALID EMAIL FORMAT ✉️", "Please enter a valid email address (e.g. name@example.com).");
            if (emailEl) emailEl.focus();
            return;
        }

        // Password complexity check
        let hasLetter  = /[a-zA-Z]/.test(passVal);
        let hasDigit   = /[0-9]/.test(passVal);
        let hasSpecial = /[^a-zA-Z0-9]/.test(passVal);

        if (passVal.length < 8 || !hasLetter || !hasDigit || !hasSpecial) {
            showAuthPopup(
                "WEAK PASSWORD 🔒", 
                "Password must be at least 8 characters long and contain at least one letter, one number, and one special character (e.g. @, #, $, !).",
                "⚠️"
            );
            if (createPasswordEl) createPasswordEl.focus();
            return;
        }

        if (passVal !== confirmPassVal) {
            showAuthPopup("PASSWORDS DO NOT MATCH ❌", "Your password confirmation does not match. Please re-enter both carefully.");
            if (confirmPasswordEl) confirmPasswordEl.focus();
            return;
        }

        let submitBtn = document.querySelector("input[type='submit']");
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.value = "REGISTERING...";
        }

        // Register with backend using bcrypt hashing in MongoDB Atlas
        await Auth.register(name, email, passVal);

        // Do NOT auto-login to stories! User must sign in through login page
        Auth.removeToken();
        localStorage.removeItem("user");

        // Set session message and redirect directly to login.html
        sessionStorage.setItem("signupSuccessMessage", "Account created successfully! Please sign in with your email and password.");
        sessionStorage.setItem("registeredEmail", email);
        window.location.href = "login.html?registered=true";
    } catch (err) {
        let submitBtn = document.querySelector("input[type='submit']");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.value = "REGISTER →";
        }
        console.error("handleRegister error:", err);
        showAuthPopup("REGISTRATION FAILED 🛑", err.message || "Failed to create account. Please try again.", "❌");
    }
}
window.handleRegister = handleRegister;
