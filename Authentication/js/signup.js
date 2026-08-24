/* ============================================================
   signup.js
   Page:  pages/auth/signup.html
   Role:  Handles new user registration on the Register page.

   FLOW:
   1. Lottie animation (Login.json) is initialised inline in signup.html
   2. User fills: Name / Email / Password / Confirm Password
   3. handleRegister(event) fires on form submit:
        a. Prevent default form POST
        b. Read all four input field values
        c. GET /Users?email= — check if email already exists
        d. Guard: duplicate email → alert and stop
        e. Guard: passwords do not match → alert and stop
        f. Build new user object { name, email, password, role:'Reader' }
        g. POST to /Users (json-server writes to db.json)
        h. Alert success → redirect to login.html
   4. togglePassword(inputId, eyeId) — reusable eye toggle
      shared between both password fields
   ============================================================ */


/* ============================================================
   SECTION 1 — PASSWORD VISIBILITY TOGGLE
   togglePassword(inputId, eyeSymbolId)
   Called by the 👁️ eye-toggle buttons on both password fields.
   Params:
     inputId     — the ID of the password <input> element
     eyeSymbolId — the ID of the <span> holding the emoji
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


/* ============================================================
   SECTION 2 — REGISTRATION HANDLER: handleRegister(event)
   Triggered by: <form onsubmit="handleRegister(event)">

   Step-by-step:
   a. Prevent the default HTML form POST.
   b. Read name, email, password, confirmPassword from DOM.
   c. GET /Users?email=<value> — check if email already exists.
   d. Guard: duplicate email → alert + return.
   e. Guard: passwords do not match → alert + return.
   f. Build new user object with role hardcoded as "Reader".
      (Admins can only be created directly in db.json.)
   g. POST the new user to /Users (json-server → db.json).
   h. Alert success and redirect to login.html.
   ============================================================ */

let handleRegister = async (event) => {
    event.preventDefault();

    // Step b: Read all form field values
    let name            = document.getElementById("name");
    let email           = document.getElementById("email");
    let createPassword  = document.getElementById("password");
    let confirmPassword = document.getElementById("cpassword");

    // Step c: Check whether this email is already registered
    let response = await fetch("http://localhost:3000/Users?email=" + email.value);
    let data     = await response.json();

    // Step d: Guard — email already in use
    if (data.length > 0) {
        alert("This email is already registered");
        return;
    }

    // Step e1: Guard — password complexity rules
    // Rule: At least 8 chars, at least 1 letter, 1 number, and 1 special character
    let passVal    = createPassword.value;
    let hasLetter  = /[a-zA-Z]/.test(passVal);
    let hasDigit   = /[0-9]/.test(passVal);
    let hasSpecial = /[^a-zA-Z0-9]/.test(passVal);

    if (passVal.length < 8 || !hasLetter || !hasDigit || !hasSpecial) {
        alert("⚠️ Password must be at least 8 characters long and contain at least one letter, one number, and one special character (e.g. @, #, $, !).");
        return;
    }

    // Step e2: Guard — passwords do not match
    if (createPassword.value !== confirmPassword.value) {
        alert("Passwords do not match");
        return;
    }

    // Step f: Build the new user object
    let userObject = {
        name:     name.value,
        email:    email.value,
        password: createPassword.value,
        role:     "Reader"          // Self-registered accounts are always Readers
    };

    // Step g: POST to json-server to persist user in db.json
    await fetch("http://localhost:3000/Users", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(userObject)
    });

    // Step h: Registration successful — redirect to login
    alert("User registered");
    window.location.href = "login.html";
};
