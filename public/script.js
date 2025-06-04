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

        const movieCard = `
            <div class="movie-card">
                <h3>${movie.name}</h3>
                <p>Year: ${movie.year}</p>
                <p>Rating: ${movie.rating}/10</p>
                <p>${movie.description}</p>
                <p>Category: ${categoryName}</p>
            </div>
        `;
        movieList.innerHTML += movieCard;
    });
}

async function fetchMoviesByCategory(categoryId) {
    const categoryDisplay = document.querySelector(".category-display");
    console.log(`Fetching movies for category ID: ${categoryId}`);

    if (categoryId) {
        // Važno: genre_id u bazi je numerički, pa moramo osigurati isti tip
        const numericCategoryId = parseInt(categoryId);
        const filteredMovies = cachedMovies.filter((movie) => movie.genre_id === numericCategoryId);

        const category = cachedCategories.find((cat) => cat.id === numericCategoryId);
        categoryDisplay.textContent = category ? `Category: ${category.name}` : "Unknown Category";

        displayMovies(filteredMovies);
    } else {
        categoryDisplay.textContent = "All Movies";
        displayMovies(cachedMovies);
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
    return; // Remove this line if you want to add the button
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
    allCategoriesLink.onclick = (e) => {
        e.preventDefault();
        fetchMoviesByCategory(null); // Explicitly pass null for all movies
    };
    categoryList.appendChild(allCategoriesLink);

    // Add individual categories
    categories.forEach((category) => {
        const categoryLink = document.createElement("a");
        categoryLink.textContent = category.name;
        categoryLink.href = "#";
        categoryLink.dataset.categoryId = category.id; // Store category ID in data attribute
        categoryLink.onclick = (e) => {
            e.preventDefault();
            fetchMoviesByCategory(category.id);
        };
        categoryList.appendChild(categoryLink);
    });
}

// Add movie modal functionality
const modal = document.getElementById("addMovieModal");
const addMovieBtn = document.getElementById("showAddFormBtn");
const closeBtn = document.getElementsByClassName("close")[0];
const addMovieForm = document.getElementById("addMovieForm");

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

// Handle form submission
addMovieForm.onsubmit = async function (e) {
    e.preventDefault();

    const formData = new FormData(addMovieForm);
    const movieData = Object.fromEntries(formData);

    // Convert string values to numbers where needed
    movieData.year = parseInt(movieData.year);
    movieData.rating = parseInt(movieData.rating);
    movieData.genre_id = parseInt(movieData.genre_id);

    try {
        const response = await fetch("http://localhost:8080/api/films", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(movieData),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Close modal and refresh movies list
        modal.style.display = "none";
        addMovieForm.reset();
        await refreshCache();
    } catch (error) {
        console.error("Error adding movie:", error);
        alert("Error adding movie. Please try again.");
    }
};

function userRefresh() {
    usernameDisplay = document.getElementById("usernameDisplay");
    usernameDisplay.textContent = localStorage.getItem("username") || sessionStorage.getItem("username") || "Guest";
}

document.addEventListener("DOMContentLoaded", () => {
    refreshCache();
    addRefreshButton();
    userRefresh();

    // Initialize logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.classList.add("nav-btn", "logout");
    }
});

document.getElementById("categoryDropdown").addEventListener("click", function (e) {
    e.preventDefault();
    const dropdown = document.getElementById("categoryList");
    dropdown.classList.toggle("show");
});

// Close dropdown when clicking outside
document.addEventListener("click", function (e) {
    if (!e.target.matches("#categoryDropdown")) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
        for (const dropdown of dropdowns) {
            if (dropdown.classList.contains("show")) {
                dropdown.classList.remove("show");
            }
        }
    }
});

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
