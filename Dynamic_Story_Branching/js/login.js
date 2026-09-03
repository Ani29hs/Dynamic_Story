/* ============================================================
   login.js
   Page:  pages/auth/login.html
   Role:  Handles user authentication on the Login page.

   FLOW:
   1. Page loads → Lottie animation initialises (Welcome.json)
   2. User types email + password and submits the form
   3. handleLogin() fires:
        a. Prevent default form submission
        b. Fetch user record from json-server by email
        c. If not found → redirect to signup page
        d. Validate password — if wrong → alert and stop
        e. Ensure xp (default 100) and completedStories ([]) defaults
        f. Save user object to localStorage under key "user"
        g. Redirect by role:
             Admin  → pages/admin/admin.html
             Reader → pages/reader/stories.html
   4. toggleEye() — switches password field between text/password
   ============================================================ */


/* ============================================================
   SECTION 1 — LOTTIE ANIMATION
   Initialises the Welcome.json animation inside #lottieContainer
   on the left decorative panel of the login card.
   Runs after DOM is ready; fails silently if lottie is missing.
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
});


/* ============================================================
   SECTION 2 — PASSWORD VISIBILITY TOGGLE
   Called by the 👁️ eye-toggle button inside the password field.
   Switches input[type] between "password" and "text"
   and swaps the emoji label accordingly.
   ============================================================ */

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


/* ============================================================
   SECTION 3 — LOGIN HANDLER: handleLogin(event)
   Triggered by: <form onsubmit="handleLogin(event)">

   Step-by-step:
   a. Prevent the default HTML form POST.
   b. Read email and password values from DOM inputs.
   c. GET /Users?email=<value> from json-server (port 3000).
   d. If no matching user → alert + redirect to signup.html.
   e. Compare entered password against stored password.
   f. If mismatch → alert and return early.
   g. Apply safe defaults for xp and completedStories
      (these may be missing for accounts created before those
       fields were added to the schema).
   h. Persist the complete user object in localStorage ("user").
   i. Role-based redirect:
        "Admin"  → ../admin/admin.html
        "Reader" → ../reader/stories.html
   ============================================================ */

let handleLogin = async (event) => {
    event.preventDefault();

    // Step b: Read email and password from the form
    let email    = document.getElementById("email");
    let password = document.getElementById("password");

    // Step c: Look up user by email in the database
    let response = await fetch(`${API_BASE}/Users?email=${email.value}`);
    let data     = await response.json();

    // Step d: Guard — email not registered
    if (data.length === 0) {
        alert("User is not Registered!!");
        window.location.href = "../auth/signup.html";
        return;
    }

    let user = data[0];

    // Step e: Guard — wrong password
    if (user.password !== password.value) {
        alert("Incorrect password");
        return;
    }

    // Step g: Apply safe defaults for fields added after registration
    if (user.xp === undefined) {
        user.xp = 100;
    }
    if (!user.completedStories) {
        user.completedStories = [];
    }

    // Step h: Persist authenticated user to browser localStorage
    localStorage.setItem("user", JSON.stringify(user));

    // Step i: Role-based page redirect
    if (user.role === "Admin") {
        window.location.href = "../admin/admin.html";
    } else {
        window.location.href = "../reader/stories.html";
    }
};
