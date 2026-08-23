
        function toggleEye() {
            let passwordInput = document.getElementById("password");
            let eyeSymbol = document.getElementById("eyeSymbol");
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                eyeSymbol.textContent = "🙈";
            } else {
                passwordInput.type = "password";
                eyeSymbol.textContent = "👁️";
            }
        }

        let handleLogin=async(event)=>{
            event.preventDefault()

            let email =  document.getElementById("email")
            let password = document.getElementById("password")

            let response = await fetch(`http://localhost:3000/Users?email=${email.value}`)

            let data = await response.json()

            if(data.length === 0){
                alert("User is not Registered!!")
                window.location.href = "../auth/signup.html"
                return;
            }

            let user = data[0]

            if(user.password !== password.value){
                alert("Incorrect password")
                return;
            }

            // alert(`Welcome ${user.name}`)

            if (user.xp === undefined) {
                user.xp = 100;
            }
            if (!user.completedStories) {
                user.completedStories = [];
            }

            localStorage.setItem("user", JSON.stringify(user));

            if (user.role === "Admin") {
                window.location.href = "../admin/admin.html";
            } else {
                window.location.href = "../reader/stories.html";
            }
        }

/* =====================================================
   LOTTIE ANIMATION INITIALIZATION (css/Login.json)
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
    let container = document.getElementById("lottieContainer");
    if (container && typeof lottie !== "undefined") {
        lottie.loadAnimation({
            container: container,
            renderer: "svg",
            loop: true,
            autoplay: true,
            path: "../../css/Welcome.json"
        });
    }
});
