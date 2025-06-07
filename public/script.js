let cachedMovies = [];
let cachedCategories = [];

async function fetchMovies() {
    try {
        const response = await fetch("http://localhost:8080/api/films");

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        cachedMovies = await response.json();
        displayMovies(cachedMovies);
        // Reset category display
        document.querySelector(".category-display").textContent = "All Movies";
    } catch (error) {
        console.error("Error fetching movies:", error);
    }
}

async function fetchCategories() {
    try {
        const response = await fetch("http://localhost:8080/api/categories");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        cachedCategories = await response.json();
    } catch (error) {
        console.error("Error fetching categories:", error);
    }
}

function displayMovies(movies) {
    const movieList = document.getElementById("movieList");
    movieList.innerHTML = "";

    movies.forEach((movie) => {
        if (movie.description === null) {
            movie.description = "No description available.";
        }

        // Pronađi kategoriju za film
        const category = cachedCategories.find((cat) => cat.id === movie.genre_id);
        const categoryName = category ? category.name : "Unknown Category";

        let username;
        try {
            username = localStorage.getItem("username");
        } catch (error) {
            username = sessionStorage.getItem("username");
        }

        const movieCard = `
            <div class="movie-card">
                <h3>${movie.name}</h3>
                <div>
                <p>Year: ${movie.year}</p>
                <p>Rating: ${movie.rating}/10</p>
                </div>
                <div>
                <p>Category: ${categoryName}</p>
                <p>Added By: ${username}</p>
                </div>
                <p class="movie-card-description">${movie.description}</p>
            </div>
        `;
        movieList.innerHTML += movieCard;
    });
}

async function fetchMoviesByCategory(categoryId) {
    const categoryDisplay = document.querySelector(".category-display");

    if (categoryId === null || categoryId === "null") {
        // Check for null or "null" string
        categoryDisplay.textContent = "All Movies";
        displayMovies(cachedMovies);
    } else {
        // Važno: genre_id u bazi je numerički, pa moramo osigurati isti tip
        const numericCategoryId = parseInt(categoryId);
        const filteredMovies = cachedMovies.filter((movie) => movie.genre_id === numericCategoryId);

        const category = cachedCategories.find((cat) => cat.id === numericCategoryId);
        categoryDisplay.textContent = category ? `Category: ${category.name}` : "Unknown Category";

        displayMovies(filteredMovies);
    }
}

// Add a function to refresh the cache if needed
async function refreshCache() {
    await Promise.all([fetchMovies(), fetchCategories()]);
    displayMovies(cachedMovies);
    displayCategories(cachedCategories);
}

// Add a refresh button handler if you want to manually refresh
function addRefreshButton() {
    const refreshBtn = document.createElement("button");
    refreshBtn.className = "nav-btn";
    refreshBtn.textContent = "↻ Refresh";
    refreshBtn.onclick = refreshCache;
    document.querySelector("nav").appendChild(refreshBtn);
}

function displayCategories(categories) {
    const categoryList = document.getElementById("categoryList");
    categoryList.innerHTML = "";

    // Add "All Categories" option
    const allCategoriesLink = document.createElement("a");
    allCategoriesLink.textContent = "All Movies";
    allCategoriesLink.href = "#";
    allCategoriesLink.dataset.category = null;
    categoryList.appendChild(allCategoriesLink);

    // Add individual categories
    categories.forEach((category) => {
        const categoryLink = document.createElement("a");
        categoryLink.textContent = category.name;
        categoryLink.href = "#";
        categoryLink.dataset.category = category.id; // Store category ID in data attribute
        categoryList.appendChild(categoryLink);
    });
}

// Add movie modal functionality
const modal = document.getElementById("addMovieModal");
const addMovieBtn = document.getElementById("showAddFormBtn");
const closeBtn = document.getElementsByClassName("close")[0];
const addMovieForm = document.getElementById("addMovieForm"); // Corrected selector
const addMovieButton = document.querySelector("#addMovieModal .submit-btn"); // Select the button inside the modal

// Populate category select when modal opens
function populateCategorySelect() {
    const select = document.getElementById("movieCategory");
    select.innerHTML = "";
    cachedCategories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
    });
}

// Show modal
addMovieBtn.onclick = function () {
    modal.style.display = "block";
    populateCategorySelect();
};

// Close modal
closeBtn.onclick = function () {
    modal.style.display = "none";
};

// Close modal when clicking outside
window.onclick = function (event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
};

function showPopupMessage(message, type, duration = 4000) {
    const popup = document.createElement("div");

    if (type) {
        popup.classList.add("popupSuccess"); // Add specific success class
    } else {
        popup.classList.add("popupError"); // Add specific error class
    }

    popup.textContent = message;
    document.body.appendChild(popup);

    setTimeout(() => {
        popup.remove();
    }, duration);
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
    try {
        // Clear the session cookie
        document.cookie = "sessionId=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";

        // Clear any stored user data
        localStorage.removeItem("user");
        sessionStorage.removeItem("user");

        // Redirect to login page
        window.location.href = "/login";
    } catch (error) {
        console.error("Logout error:", error);
    }
});

addMovieButton.addEventListener("click", async (e) => {
    e.preventDefault(); // Prevent any default button behavior
    let userId;
    let yearFilm = parseInt(document.getElementById("movieYear").value);

    let description = document.getElementById("movieDescription").value;
    let movieTitle = document.getElementById("movieTitle").value;

    if (description.trim() === "") {
        description = "No description available."; // Set to null if description is empty
    }

    try {
        userId = localStorage.getItem("id");
    } catch (error) {
        userId = sessionStorage.getItem("id");
    }

    if (movieTitle.trim() === "") {
        showPopupMessage(`Title cannot be empty`, false, 2000);
        return;
    }

    const movieData = {
        name: document.getElementById("movieTitle").value,
        year: yearFilm,
        description: description,
        rating: parseInt(document.getElementById("movieRating").value),
        genre_id: parseInt(document.getElementById("movieCategory").value),
        author_id: parseInt(userId),
    };

    // Check if year, rating, and genre_id are valid numbers
    if (isNaN(movieData.year)) {
        console.log("Year is not a valid number");
        showPopupMessage(`Year is not a valid number`, false, 2000);
        return;
    } else if (isNaN(movieData.rating)) {
        console.log("Rating is not a valid number");
        showPopupMessage(`Rating is not a valid number`, false, 2000);
        return;
    } else if (isNaN(movieData.genre_id)) {
        console.log("Genre ID is not a valid number");
        showPopupMessage(`Genre ID is not a valid number`, false, 2000);
        return;
    } else if (yearFilm < 1900 || yearFilm > new Date().getFullYear()) {
        showPopupMessage(`Year must be between 1900 and the current year`, false, 2000);
        return;
    } else if (movieData.rating < 0 || movieData.rating > 10) {
        showPopupMessage(`Rating must be between 0 and 10`, false, 2000);
        return;
    }

    try {
        const response = await fetch("/api/films", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(movieData),
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        // Close modal and refresh movies list
        document.getElementById("movieTitle").value = "";
        document.getElementById("movieYear").value = "";
        document.getElementById("movieDescription").value = "";
        document.getElementById("movieRating").value = "";
        document.getElementById("movieCategory").value = "";

        modal.style.display = "none";
        // document.addEventListener("DOMContentLoaded", function () {
        //     document.getElementById("addMovieForm").reset(); // Reset the form
        // });
        await refreshCache();
        showPopupMessage(`Succesfully uploaded the movie`, true, 2000);
    } catch (error) {
        console.error("Error adding movie:", error);
        // alert("Error adding movie. Please try again.");
    }
});

function userRefresh() {
    usernameDisplay = document.getElementById("usernameDisplay");
    usernameDisplay.textContent = localStorage.getItem("username") || sessionStorage.getItem("username") || "Guest";
}

document.addEventListener("DOMContentLoaded", () => {
    refreshCache();
    userRefresh();

    // Initialize logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.classList.add("nav-btn", "logout");
    }
});

let longPressTimer;
let targetMovieCard;

document.getElementById("movieList").addEventListener("mousedown", (event) => {
    if (event.target.closest(".movie-card")) {
        targetMovieCard = event.target.closest(".movie-card");
        longPressTimer = setTimeout(() => {
            // Add a class to change the background color
            if (targetMovieCard.classList.contains("watched")) {
                targetMovieCard.classList.remove("watched");
            } else {
                targetMovieCard.classList.add("watched");
            }
        }, 1000); // 1 second
    }
});

document.getElementById("movieList").addEventListener("mouseup", (event) => {
    clearTimeout(longPressTimer);
});

document.getElementById("movieList").addEventListener("mouseleave", (event) => {
    clearTimeout(longPressTimer);
});

document.addEventListener("click", (event) => {
    const target = event.target;

    // Category Dropdown
    if (target.id === "categoryDropdown") {
        event.preventDefault();
        const dropdown = document.getElementById("categoryList");
        dropdown.classList.toggle("show");
    }
    // Category Links
    else if (target.closest("#categoryList a")) {
        event.preventDefault();
        const categoryId = target.dataset.category;
        fetchMoviesByCategory(categoryId);
        document.getElementById("categoryList").classList.remove("show");
    }
    // Movie Card
    else if (target.closest(".movie-card")) {
        const movieCard = target.closest(".movie-card");
        const movieTitle = movieCard.querySelector("h3").textContent;
        // showPopupMessage(`You clicked on: ${movieTitle}`, "success", 2000);
    }
    // Close dropdown when clicking outside
    if (!target.matches("#categoryDropdown")) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
        for (const dropdown of dropdowns) {
            if (dropdown.classList.contains("show")) {
                dropdown.classList.remove("show");
            }
        }
    }
});
