document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("register");
    const errorMessageDiv = document.getElementById("errorMessage");

    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        let password = document.getElementById("password").value;
        const encoder = new TextEncoder();
        const data = encoder.encode(password);

        // Hash the password using SHA-256
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);

        // Convert hash to hex string
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashedPassword = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

        const formData = {
            username: document.getElementById("username").value,
            password: hashedPassword,
            email: document.getElementById("email").value,
        };

        try {
            const response = await fetch("/api/users", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                // Registration successful - redirect to login
                window.location.href = "/login";
            } else {
                errorMessageDiv.textContent = data.error || "Registration failed. Please try again.";
                errorMessageDiv.classList.remove("hidden");
            }
        } catch (error) {
            console.error("Registration error:", error);
            errorMessageDiv.textContent = "Connection error. Please try again later.";
            errorMessageDiv.classList.remove("hidden");
        }
    });
});
