    function togglePassword(inputId, eyeSymbolId) {
        let passwordInput = document.getElementById(inputId);
        let eyeSymbol = document.getElementById(eyeSymbolId);
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            eyeSymbol.textContent = "🙈";
        } else {
            passwordInput.type = "password";
            eyeSymbol.textContent = "👁️";
        }
    }

    let handleRegister=async(event)=>{
        event.preventDefault()

        let name = document.getElementById("name")
        let email =  document.getElementById("email")
        let createPassword = document.getElementById("password")
        let confirmPassword = document.getElementById("cpassword")

        let response = await fetch(`http://localhost:3000/Users?email=${email.value}`)

        let data = await response.json()

        if(data.length>0){
            alert("This email is already registered")
            return
        }

        if(createPassword.value!=confirmPassword.value){
            alert("Password does not match")
            return
        }

        let userObject ={
            name:name.value,
            email:email.value,
            password:createPassword.value,
            role:"Reader"
        }

        await fetch("http://localhost:3000/Users",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify(userObject)
        })

        alert("User registered")
        window.location.href="login.html"
    }