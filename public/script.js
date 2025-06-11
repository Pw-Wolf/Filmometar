let cachedMovies = [];
let cachedCategories = [];
let userWatchedMovies = [];
let usersIds = [];

let currentFilter = "all";
let currentCategoryId = null;

const genresList = ["Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama", "Horror/Thriller", "Mystery", "Romance", "Sci-Fi", "Adult"];

async function fetchMovies() {
    try {
        const response = await fetch("/api/films");

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        cachedMovies = await response.json();
        userWatchedMovies = await fetchWatchedMovies(); // Fetch watched movies
        markWatchedMovies(cachedMovies, userWatchedMovies); // Mark watched movies
        displayMovies(cachedMovies);
        // Reset category display
        document.querySelector(".category-display").textContent = "All Movies";
    } catch (error) {
        console.error("Error fetching movies:", error);
    }
}

async function fetchCategories() {
    try {
        const response = await fetch("/api/categories");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        cachedCategories = await response.json();
    } catch (error) {
        console.error("Error fetching categories:", error);
    }
}

async function fetchIdsUsers() {
    try {
        const response = await fetch("/api/id_users");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        usersIds = await response.json();
    } catch (error) {
        console.error("Error fetching categories:", error);
    }
}

function showDeleteButton(movieCard) {
    const deleteButton = movieCard.querySelector(".delete-movie");
    deleteButton.classList.remove("hidden");
}

function hideDeleteButton(movieCard) {
    const deleteButton = movieCard.querySelector(".delete-movie");
    deleteButton.classList.add("hidden");
}

function displayMovies(movies) {
    const movieList = document.getElementById("movieList");
    movieList.innerHTML = "";

    let filtered = movies;
    if (currentFilter === "watched") {
        filtered = movies.filter((m) => (m.watched === 1 || m.watched === true) && (m.genre_id === currentCategoryId || currentCategoryId === null));
    } else if (currentFilter === "notwatched") {
        filtered = movies.filter((m) => (!m.watched || m.watched === 0) && (m.genre_id === currentCategoryId || currentCategoryId === null));
    }

    filtered.forEach((movie) => {
        if (movie.description === null) {
            movie.description = "No description available.";
        }

        if (movie.genre_id !== currentCategoryId && currentCategoryId !== null) {
            return; // Skip movies that don't match the current category
        }

        const category = cachedCategories.find((cat) => cat.id === movie.genre_id);
        const categoryName = category ? category.name : "Unknown Category";

        const username = localStorage.getItem("username") || sessionStorage.getItem("username");

        const movieCard = document.createElement("div");
        movieCard.className = "movie-card";
        movieCard.style.userSelect = "none"; // Dodaj ovo svojstvo
        if (movie.watched) {
            movieCard.classList.add("watched");
        }

        movieCard.innerHTML = `
            <h7 class="movie-id hidden">${movie.id}</h7>
            <div class="delete-movie hidden">&#x2715;</div>
            <h3>${movie.name}</h3>
            <div>
                <p>Year: ${movie.year}</p>
                <p>Rating: ${movie.rating}/10</p>
                <p>Genre: ${movie.genre}<p>
            </div>
            <div>
                <p>Category: ${categoryName}</p>
                <p>Added By: ${usersIds[movie.author_id]}</p>
            </div>
            <p class="movie-card-description">${movie.description}</p>
        `;
        const deleteButton = movieCard.querySelector(".delete-movie");
        deleteButton.addEventListener("click", (event) => {
            event.stopPropagation(); // Prevent click from triggering movie card click
            const movieId = movieCard.querySelector("h7").textContent;
            deleteMovie(movieId);
        });

        // Event listener za kratki klik/tap (prikaz/skrivanje delete gumba)
        // Dodajemo ga direktno na movieCard
        movieCard.addEventListener("click", (event) => {
            // Provjeri da li je klik bio na delete gumb, ako je, pusti delete gumb da odradi svoje
            if (event.target.classList.contains("delete-movie")) {
                return;
            }

            const movieId = parseInt(movieCard.querySelector("h7").textContent);
            const movie = cachedMovies.find((m) => m.id === movieId);

            // Prikazi/sakrij delete gumb samo ako je korisnik autor filma
            if (movie && username === usersIds[movie.author_id]) {
                const deleteButton = movieCard.querySelector(".delete-movie");
                if (deleteButton.classList.contains("hidden")) {
                    showDeleteButton(movieCard);
                } else {
                    hideDeleteButton(movieCard);
                }
            }
        });

        movieList.appendChild(movieCard);
    });
}

async function deleteMovie(movieId) {
    try {
        const response = await fetch(`/api/films`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ id: parseInt(movieId) }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        showPopupMessage("Movie deleted successfully!", true, 2000);
        await refreshCache();
    } catch (error) {
        console.error("Error deleting movie:", error);
        showPopupMessage("Error deleting movie.", false, 2000);
    }
}

async function fetchMoviesByCategory(categoryId) {
    const categoryDisplay = document.querySelector(".category-display");

    if (categoryId === null || categoryId === "null") {
        categoryDisplay.textContent = "All Movies";
        currentFilter = "all";
        currentCategoryId = null;
        displayMovies(cachedMovies);
    } else {
        const numericCategoryId = parseInt(categoryId);
        let filteredMovies = cachedMovies.filter((movie) => movie.genre_id === numericCategoryId);

        const category = cachedCategories.find((cat) => cat.id === numericCategoryId);
        categoryDisplay.textContent = category ? `Category: ${category.name}` : "Unknown Category";

        if (currentFilter === "watched") {
            filteredMovies = filteredMovies.filter((m) => m.watched === 1 || m.watched === true);
        } else if (currentFilter === "notwatched") {
            filteredMovies = filteredMovies.filter((m) => !m.watched || m.watched === 0);
        }
        currentCategoryId = numericCategoryId;
        displayMovies(filteredMovies);
    }
}

async function refreshCache() {
    await Promise.all([fetchMovies(), fetchCategories(), fetchIdsUsers()]);
    console.log(usersIds);
    displayMovies(cachedMovies);
    displayCategories(cachedCategories);
}

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

    const allCategoriesLink = document.createElement("a");
    allCategoriesLink.textContent = "All Movies";
    allCategoriesLink.href = "#";
    allCategoriesLink.dataset.category = null;
    categoryList.appendChild(allCategoriesLink);

    categories.forEach((category) => {
        const categoryLink = document.createElement("a");
        categoryLink.textContent = category.name;
        categoryLink.href = "#";
        categoryLink.dataset.category = category.id;
        categoryList.appendChild(categoryLink);
    });
}

const modal = document.getElementById("addMovieModal");
const addMovieBtn = document.getElementById("showAddFormBtn");
const closeBtn = document.getElementsByClassName("close")[0];
const addMovieForm = document.getElementById("addMovieForm");
const addMovieButton = document.querySelector("#addMovieModal .submit-btn");

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
function populateGenreSelect() {
    const select = document.getElementById("movieGenre");
    select.innerHTML = "";
    genresList.forEach((genre) => {
        const option = document.createElement("option");
        option.value = genre;
        option.textContent = genre;
        select.appendChild(option);
    });
}

addMovieBtn.onclick = function () {
    modal.style.display = "block";
    populateCategorySelect();
    populateGenreSelect();
};

closeBtn.onclick = function () {
    modal.style.display = "none";
};

window.onclick = function (event) {
    if (event.target == modal) modal.style.display = "none";
};

function showPopupMessage(message, type, duration = 4000) {
    const popup = document.createElement("div");

    if (type) {
        popup.classList.add("popupSuccess");
    } else {
        popup.classList.add("popupError");
    }

    popup.textContent = message;
    document.body.appendChild(popup);

    setTimeout(() => {
        popup.remove();
    }, duration);
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
    try {
        document.cookie = "sessionId=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
        localStorage.removeItem("user");
        sessionStorage.removeItem("user");
        window.location.href = "/login";
    } catch (error) {
        console.error("Logout error:", error);
    }
});

addMovieButton.addEventListener("click", async (e) => {
    e.preventDefault();
    let userId;
    let yearFilm = parseInt(document.getElementById("movieYear").value);

    let description = document.getElementById("movieDescription").value;
    let movieTitle = document.getElementById("movieTitle").value;

    if (description.trim() === "") description = "No description available.";

    userId = localStorage.getItem("id");
    if (!userId) userId = sessionStorage.getItem("id");

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
        genre: document.getElementById("movieGenre").value,
        author_id: parseInt(userId),
    };

    if (isNaN(movieData.year)) {
        showPopupMessage(`Year is not a valid number`, false, 2000);
        return;
    } else if (isNaN(movieData.rating)) {
        showPopupMessage(`Rating is not a valid number`, false, 2000);
        return;
    } else if (isNaN(movieData.genre_id)) {
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

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();

        document.getElementById("movieTitle").value = "";
        document.getElementById("movieYear").value = "";
        document.getElementById("movieDescription").value = "";
        document.getElementById("movieRating").value = "";
        document.getElementById("movieCategory").value = "";

        modal.style.display = "none";
        await refreshCache();
        showPopupMessage(`Succesfully uploaded the movie`, true, 2000);
    } catch (error) {
        console.error("Error adding movie:", error);
    }
});

function userRefresh() {
    usernameDisplay = document.getElementById("usernameDisplay");
    usernameDisplay.textContent = localStorage.getItem("username") || sessionStorage.getItem("username") || "Guest";
}

document.addEventListener("DOMContentLoaded", () => {
    refreshCache();
    userRefresh();

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.classList.add("nav-btn", "logout");

    const filterButton = document.getElementById("filterButton");
    const filters = ["all", "watched", "notwatched"];
    let currentFilterIndex = 0;

    function updateFilterButton() {
        const currentFilter = filters[currentFilterIndex];
        switch (currentFilter) {
            case "all":
                filterButton.textContent = "All Movies";
                break;
            case "watched":
                filterButton.textContent = "Watched";
                break;
            case "notwatched":
                filterButton.textContent = "Not Watched";
                break;
        }
        setActiveFilterBtn(currentFilter);
        displayMovies(cachedMovies);
    }

    if (filterButton) {
        filterButton.addEventListener("click", () => {
            currentFilterIndex = (currentFilterIndex + 1) % filters.length;
            currentFilter = filters[currentFilterIndex];
            updateFilterButton();
        });
        updateFilterButton();
    }

    function setActiveFilterBtn(filter) {
        currentFilter = filter;
    }
});

function setActiveFilterBtn(activeId) {
    ["filterAll", "filterWatched", "filterNotWatched"].forEach((id) => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.remove("active");
    });
    const activeBtn = document.getElementById(activeId);
    if (activeBtn) activeBtn.classList.add("active");
}

let longPressTimer;
let targetMovieCard;
let isLongPressDetected = false; // Koristimo jasniji naziv varijable

// *** Izmjene za touch događaje (dugi pritisak) ***
document.getElementById("movieList").addEventListener(
    "touchstart",
    (event) => {
        const movieCard = event.target.closest(".movie-card");
        if (movieCard) {
            // Prevent default ponašanje (npr. skrolanje, označavanje teksta) samo ako je target movie card
            // Ovo može spriječiti klik događaje ako se ne pazi
            // event.preventDefault(); // Oprezno s ovim!

            targetMovieCard = movieCard;
            isLongPressDetected = false; // Resetiraj na početku dodira

            longPressTimer = setTimeout(() => {
                isLongPressDetected = true; // Dugi pritisak detektiran
                // Izvrši logiku za "watched" status
                if (targetMovieCard.classList.contains("watched")) {
                    targetMovieCard.classList.remove("watched");
                    sendWatchedStatus(targetMovieCard, false);
                } else {
                    targetMovieCard.classList.add("watched");
                    sendWatchedStatus(targetMovieCard, true);
                }
                userWatchedMovies = fetchWatchedMovies();
                // Sakrij gumb za brisanje nakon promjene statusa dugim pritiskom
                hideDeleteButton(targetMovieCard);
            }, 500); // 500ms za dugi pritisak
        }
    },
    { passive: true }
); // passive: true je često bolje za touchstart radi performansi skrolanja

document.getElementById("movieList").addEventListener("touchend", (event) => {
    clearTimeout(longPressTimer);
    // Ako nije detektiran dugi pritisak, i ako je cilj bila kartica filma
    if (!isLongPressDetected && event.target.closest(".movie-card")) {
        // Ovdje se ne treba dogoditi ništa za kratki tap, jer to rješava 'click' listener na movieCard
        // koji je dodan u displayMovies funkciji.
    }
});

document.getElementById("movieList").addEventListener("touchcancel", (event) => {
    clearTimeout(longPressTimer);
});

// *** Izmjene za mouse događaje (dugi pritisak) ***
document.getElementById("movieList").addEventListener("mousedown", (event) => {
    const movieCard = event.target.closest(".movie-card");
    if (movieCard) {
        targetMovieCard = movieCard;
        isLongPressDetected = false; // Resetiraj na početku klika

        longPressTimer = setTimeout(() => {
            isLongPressDetected = true; // Dugi pritisak detektiran
            // Izvrši logiku za "watched" status
            if (targetMovieCard.classList.contains("watched")) {
                targetMovieCard.classList.remove("watched");
                sendWatchedStatus(targetMovieCard, false);
            } else {
                targetMovieCard.classList.add("watched");
                sendWatchedStatus(targetMovieCard, true);
            }
            userWatchedMovies = fetchWatchedMovies();
            hideDeleteButton(targetMovieCard);
        }, 500); // 500ms za dugi pritisak
    }
});

document.getElementById("movieList").addEventListener("mouseup", (event) => {
    clearTimeout(longPressTimer);
    // Ako nije detektiran dugi pritisak, i ako je cilj bila kartica filma
    if (!isLongPressDetected && event.target.closest(".movie-card")) {
        // Ovdje se ne treba dogoditi ništa za kratki klik, jer to rješava 'click' listener na movieCard
        // koji je dodan u displayMovies funkciji.
    }
});

document.getElementById("movieList").addEventListener("mouseleave", (event) => {
    clearTimeout(longPressTimer);
});

async function sendWatchedStatus(movieCard, watched) {
    const movieId = movieCard.querySelector("h7").textContent;
    userId = localStorage.getItem("id");
    if (!userId) userId = sessionStorage.getItem("id");

    let movieData = {
        user_id: parseInt(userId),
        film_id: parseInt(movieId),
        watched: watched ? 1 : 0,
    };

    fetch("/api/update-watched-status", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(movieData),
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            showPopupMessage("Watched status updated!", true, 2000);
            refreshCache();
        })
        .catch((error) => {
            console.error("Error updating watched status:", error);
            showPopupMessage("Failed to update watched status.", false, 2000);
        });
}

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

async function fetchWatchedMovies() {
    try {
        const userId = localStorage.getItem("id") || sessionStorage.getItem("id");
        if (!userId) {
            return [];
        }

        const response = await fetch(`/api/user_films`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const watchedMovies = await response.json();
        return watchedMovies;
    } catch (error) {
        console.error("Error fetching watched movies:", error);
        return [];
    }
}

function markWatchedMovies(movies, watchedMovies) {
    movies.forEach((movie) => {
        const isWatched = watchedMovies.some((watchedMovie) => watchedMovie.film_id === movie.id);
        movie.watched = isWatched;
    });
}
