# Filmometar - Movie Rating App

## Description

Filmometar is a web application designed to allow users to rate, manage, and discover movies. It provides a personalized experience where users can create accounts, log in securely, add movies to the database, categorize them based on genre or personal preference, and mark them as watched. The application features a responsive and intuitive user interface, making it easy to browse and filter movies based on various criteria.

## Key Features

-   **Secure User Authentication:** Implements secure user registration and login processes, leveraging hashed passwords to protect user credentials.
-   **Comprehensive Movie Management:** Enables users to add, edit, and delete movies, complete with detailed information such as title, release year, rating, genre, category, and a descriptive synopsis.
-   **Advanced Category Filtering:** Allows users to browse movies by predefined categories and create custom categories to suit their viewing preferences.
-   **Personalized Watch Status Tracking:** Offers the ability to mark movies as watched or unwatched, helping users keep track of their viewing history and plan future watches.
-   **Responsive and Adaptive Design:** The user interface is designed to adapt seamlessly to different screen sizes and devices, ensuring an optimal viewing experience across desktops, tablets, and smartphones.
-   **Secure HTTPS Communication:** Utilizes HTTPS with SSL certificates to ensure secure communication between the client and server, protecting user data and privacy.
-   **Detailed Access Logging:** Employs access logs for monitoring request patterns, debugging potential issues, and gaining insights into application usage.
-   **User-Specific Data:** Movies are linked to specific users, allowing each user to maintain a personalized movie list.
-   **Genre Selection:** When adding or editing movies, users can select a genre from a predefined list.
-   **Dynamic Category Display:** The application dynamically displays the current category being viewed.
-   **Filtering by Watched/Unwatched Status:** Users can filter movies based on their watched or unwatched status.
-   **Edit and Delete Restrictions:** Only the user who added a movie can edit or delete it.
-   **Informative Pop-up Messages:** Provides real-time feedback to users through pop-up messages for successful actions and errors.
-   **Session Management:** Uses cookies to manage user sessions, enhancing security and user experience.

## Technologies Used

-   **Backend:** Node.js with Express
-   **Database:** PostgreSQL
-   **Frontend:** HTML, CSS, JavaScript
-   **Libraries:**
    -   cookie: For secure handling of HTTP cookies to manage user sessions.
    -   morgan: For logging HTTP requests to track application usage and debug issues.
    -   pg: For interfacing with the PostgreSQL database, enabling efficient data storage and retrieval.

## Setup Instructions

Follow these instructions to set up Filmometar on your local machine or server:

1.  **Clone the repository:**

    ```sh
    git clone <repository-url>
    ```

2.  **Navigate to the project directory:**

    ```sh
    cd Filmometar
    ```

3.  **Install dependencies:**

    ```sh
    npm install
    ```

4.  **Configure the database:**

    -   Create a PostgreSQL database instance.
    -   Update the database configuration in [`src/dbConfig.js`](src/dbConfig.js) with your database credentials, including host, port, user, password, and database name.

5.  **Generate SSL Certificates (Optional, for HTTPS):**

    -   If you plan to use HTTPS, generate self-signed SSL certificates using OpenSSL or another certificate generation tool.
    -   Place the `key.pem` (private key) and `cert.pem` (certificate) files in the `certs/` directory.

6.  **Run the application:**

    ```sh
    npm start
    ```

    This command starts the server. By default, the HTTPS server will run on port 8443, and the HTTP server will run on port 8080. You can then access the application in your web browser via `https://localhost:8443` or `http://localhost:8080` (if HTTPS is not configured).

## Environment Variables

The following environment variables can be configured to customize the application's behavior:

-   `PORT`: Specifies the port on which the HTTPS server will listen. Defaults to 8443 if not set.
-   `HTTP_PORT`: Defines the port for the HTTP server. Defaults to 8080 if not specified.
-   Database Configuration Variables: Configure database connection settings via environment variables or directly in [`src/dbConfig.js`](src/dbConfig.js). These include:
    -   `DB_HOST`: The hostname or IP address of the PostgreSQL server.
    -   `DB_PORT`: The port number for the PostgreSQL server.
    -   `DB_USER`: The username for connecting to the PostgreSQL database.
    -   `DB_PASSWORD`: The password for the PostgreSQL user.
    -   `DB_NAME`: The name of the PostgreSQL database to use.

## Directory Structure

├── .gitignore # Specifies intentionally untracked files that Git should ignore
├── package.json # Contains metadata about the app and its dependencies
├── README.md # Provides an overview of the project (this file)
├── certs/ # Directory for SSL certificates (key.pem, cert.pem)
├── logs/ # Directory for access logs
│ └── access.log # Access log file
├── models/ # Directory for database models (if any)
├── public/ # Directory for static assets
│ ├── [public/auth.js]auth.js ) # Authentication-related JavaScript
│ ├── favicon.ico # Favicon for the website
│ ├── [public/index.html]index.html ) # Main HTML file
│ ├── [public/login.html]login.html ) # Login page HTML
│ ├── [public/login.js]login.js ) # Login page JavaScript
│ ├── [public/register.html]register.html ) # Registration page HTML
│ ├── [public/register.js]register.js ) # Registration page JavaScript
│ ├── [public/script.js]script.js ) # Main JavaScript file for the app
│ └── [public/styles.css]styles.css ) # CSS stylesheet
└── src/ # Source code directory
│ ├── [src/database.js]database.js ) # Database interaction logic
│ ├── src/dbConfig.js # Database configuration
│ └── [src/server.js]server.js ) # Main server file

## API Endpoints

The Filmometar application exposes the following API endpoints for managing users, movies, and categories:

-   `GET /`: Serves the main application page. Requires user authentication.
-   `GET /login`: Displays the login page.
-   `GET /register`: Presents the user registration page.
-   `GET /api/films`: Retrieves a list of all movies in the database.
-   `POST /api/users`: Registers a new user account. Requires username, password, and email.
-   `POST /api/login`: Authenticates an existing user and establishes a session. Requires username and password.
-   `POST /api/films`: Adds a new movie to the database. Requires movie details such as title, year, rating, and genre.
-   `PUT /api/films`: Updates an existing movie's information. Requires the ID of the movie to be updated and the new details.
-   `DELETE /api/films`: Removes a movie from the database. Requires the ID of the movie to be deleted.
-   `POST /api/update-watched-status`: Updates the watched status of a movie for a specific user. Requires the user ID, movie ID, and watched status.
-   `GET /api/categories`: Fetches a list of all movie categories.
-   `GET /api/user_films`: Retrieves a list of movies watched by the currently logged-in user.
-   `GET /api/id_users`: Retrieves a list of all user IDs and usernames.

## .gitignore
