# Filmometar - Movie Rating App

## Description

Filmometar is a web application that allows users to rate and manage movies. Users can create accounts, log in, add movies, categorize them, and mark them as watched. The application provides a user-friendly interface for browsing and filtering movies based on categories and watch status.

## Features

-   **User Authentication:** Secure user registration and login using hashed passwords.
-   **Movie Management:** Add, edit, and delete movies with details like title, year, rating, category, and description.
-   **Category Filtering:** Browse movies by predefined categories.
-   **Watch Status:** Mark movies as watched or not watched.
-   **Responsive Design:** User interface adapts to different screen sizes for optimal viewing experience.
-   **HTTPS Support:** Secure communication using HTTPS with SSL certificates.
-   **Logging:** Access logs for request monitoring and debugging.

## Technologies Used

-   **Backend:** Node.js
-   **Database:** PostgreSQL
-   **Frontend:** HTML, CSS, JavaScript
-   **Libraries:**
    -   cookie: For handling cookies
    -   morgan: For request logging
    -   pg: For PostgreSQL database interaction

## Setup Instructions

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

    -   Create a PostgreSQL database.
    -   Update the database configuration in `src/dbConfig.js` with your database credentials.

5.  **Generate SSL Certificates:**

    -   Generate self-signed SSL certificates for HTTPS (or use existing ones). Place the `key.pem` and `cert.pem` files in the `certs/` directory.

6.  **Run the application:**

    ```sh
    npm start
    ```

    This will start the server, and you can access the application in your web browser.

## Environment Variables

The following environment variables can be configured:

-   `PORT`: The port on which the HTTPS server will listen (default: 8443).
-   `HTTP_PORT`: The port on which the HTTP server will listen (default: 8080).
-   Database configuration variables (as defined in `src/dbConfig.js`).

## Directory Structure
