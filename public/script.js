async function fetchMovies() {
    try {
        const response = await fetch("http://localhost:8080/api/films");

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const movies = await response.json();
        displayMovies(movies);
    } catch (error) {
        console.error("Error fetching movies:", error);
        // Možete dodati prikaz error poruke korisniku
    }
}

function displayMovies(movies) {
    const movieList = document.getElementById("movieList");
    movieList.innerHTML = ""; // Clear existing content

    movies.forEach((movie) => {
        if (movie.description === null) {
            movie.description = "No description available.";
        }
        const movieCard = `
            <div class="movie-card">
                <h3>${movie.name}</h3>
                <p>Year: ${movie.year}</p>
                <p>Rating: ${movie.rating}/10</p>
                <p>${movie.description}</p>
            </div>
        `;
        movieList.innerHTML += movieCard;
    });
}

async function fetchCategories() {
    try {
        const response = await fetch("http://localhost:8080/api/categories");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const categories = await response.json();
        displayCategories(categories);
    } catch (error) {
        console.error("Error fetching categories:", error);
    }
}

function displayCategories(categories) {
    const categoryList = document.getElementById("categoryList");
    categoryList.innerHTML = "";

    // Add "All Categories" option
    const allCategoriesLink = document.createElement("a");
    allCategoriesLink.textContent = "All Categories";
    allCategoriesLink.onclick = () => fetchMovies();
    categoryList.appendChild(allCategoriesLink);

    categories.forEach((category) => {
        const categoryLink = document.createElement("a");
        categoryLink.textContent = category.name;
        categoryLink.onclick = () => fetchMoviesByCategory(category.id);
        categoryList.appendChild(categoryLink);
    });
}

// Call this when page loads
document.addEventListener("DOMContentLoaded", () => {
    fetchCategories();
    fetchMovies();
});
