document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login");
    const errorMessageDiv = document.getElementById("errorMessage");

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Get the password value
        let password = document.getElementById("password").value;

        // Convert password to ArrayBuffer for hashing
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
            rememberMe: document.getElementById("rememberMe").checked,
        };

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
                credentials: "include",
            });

            const data = await response.json();
            console.log("Response data:", data);
            console.log("Response cookies:", document.cookie);

            if (response.ok) {
                // Store sessionId in cookie
                if (data.sessionId) {
                    document.cookie = `sessionId=${data.sessionId}; path=/`;
                    console.log("Cookie after setting:", document.cookie);

                    // Store user data based on remember me choice
                    cookieData = data.user;
                    console.log(cookieData);

                    if (formData.rememberMe) {
                        for (var key in cookieData) {
                            if (cookieData.hasOwnProperty(key)) {
                                localStorage.setItem(key, JSON.stringify(cookieData[key]).replace(/['"]+/g, ""));
                            }
                        }
                        console.log("Stored in :", localStorage.getItem("user"));
                    } else {
                        for (var key in cookieData) {
                            if (cookieData.hasOwnProperty(key)) {
                                sessionStorage.setItem(key, JSON.stringify(cookieData[key]).replace(/['"]+/g, ""));
                            }
                        }
                    }

                    window.location.href = "/";
                } else {
                    console.error("No sessionId in response data:", data);
                    throw new Error("No session ID received");
                }
            } else {
                errorMessageDiv.textContent = data.error || "Login failed. Please try again.";
                errorMessageDiv.classList.remove("hidden");
            }
        } catch (error) {
            console.error("Login error:", error);
            errorMessageDiv.textContent = "Connection error. Please try again later.";
            errorMessageDiv.classList.remove("hidden");
        }
    });
});
