const { Pool } = require("pg");
const dbConfig = require("./dbConfig"); // Load database configuration

const pool = new Pool(dbConfig);

// Helper function to execute queries
async function query(text, params) {
    const client = await pool.connect();
    try {
        const res = await client.query(text, params);
        return res;
    } finally {
        client.release();
    }
}

async function createDatabase() {
    try {
        // SQL for creating tables in PostgreSQL
        // SERIAL automatically creates a sequence for the ID and sets it as the default value
        await query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                email TEXT
            );

            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                description TEXT
            );

            CREATE TABLE IF NOT EXISTS films (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                rating INT NOT NULL,
                genre TEXT,
                year INTEGER,
                genre_id INT,
                author_id INT,
                description TEXT,
                FOREIGN KEY (genre_id) REFERENCES categories(id) ON DELETE SET NULL,
                FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS user_films (
                id INTEGER,
                film_id INTEGER,
                watched BOOLEAN DEFAULT FALSE, -- BOOLEAN in PostgreSQL is TRUE/FALSE
                PRIMARY KEY (id, film_id),
                FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS valid_id_sessions (
                id INTEGER PRIMARY KEY,
                session_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        console.log("Database and tables created successfully (or already exist).");

        // Check if categories have already been added
        const categoryCount = await query(`SELECT COUNT(*) FROM categories`);
        console.log(categoryCount.rows);
        if (parseInt(categoryCount.rows[0].count) === 0) {
            await createDefaultCategories();
        }
    } catch (error) {
        console.error("Error creating database and tables:", error);
        throw error;
    }
}

async function readData(table, condition) {
    let queryText = `SELECT * FROM ${table}`;
    let values = [];

    if (condition) {
        const columnNames = Object.keys(condition);
        const whereClause = columnNames.map((column, index) => `${column} = $${index + 1}`).join(" AND ");
        queryText += ` WHERE ${whereClause}`;
        values = Object.values(condition);
    }

    try {
        const res = await query(queryText, values);
        return res.rows;
    } catch (error) {
        console.error(`Error reading data from ${table}:`, error);
        throw error;
    }
}

async function filmsWatched(data) {
    const table = "user_films";
    const { id, film_id, watched } = data;
    console.log(data);

    try {
        // Check if the user_film entry already exists
        const existingUserFilm = await readData("user_films", { id: id, film_id: film_id });
        console.log("Existing user film entry:", existingUserFilm);

        if (existingUserFilm.length > 0) {
            // Update the existing entry
            await query(`UPDATE ${table} SET watched = $1 WHERE id = $2 AND film_id = $3`, [watched, id, film_id]);
            return { message: "Film watch status updated successfully." };
        } else {
            // Insert a new entry
            await query(`INSERT INTO ${table} (id, film_id, watched) VALUES ($1, $2, $3)`, [id, film_id, watched]);
            return { message: "Film watch status added successfully." };
        }
    } catch (error) {
        console.error("Error updating/inserting film watch status:", error);
        return { error: error.message };
    }
}

async function filmsWatchedByUser(userId) {
    if (!userId) throw new Error("User ID is required to get watched films.");
    try {
        const res = await query(
            `
            SELECT * FROM user_films
            WHERE id = $1 AND watched = TRUE
        `,
            [userId]
        );
        console.log("Watched films for user:", userId, res.rows);
        return res.rows;
    } catch (error) {
        console.error("Error getting watched films by user:", error);
        throw error;
    }
}

async function updateData(table, data) {
    if (table === "user_films") {
        const { id, film_id, watched } = data;
        try {
            await query(`UPDATE ${table} SET watched = $1 WHERE id = $2 AND film_id = $3`, [watched, id, film_id]);
            return { message: "User film updated successfully." };
        } catch (error) {
            console.error("Error updating user_films:", error);
            return { error: error.message };
        }
    }
    if (table === "valid_id_sessions") {
        const { id, session_id } = data; // Assuming "id" is the key for the user
        try {
            await query(`UPDATE ${table} SET session_id = $1 WHERE id = $2`, [session_id, id]);
            return { message: "Session updated successfully." };
        } catch (error) {
            console.error("Error updating valid_id_sessions:", error);
            return { error: error.message };
        }
    }

    if (!data.id) {
        throw new Error("Data must contain an id for update.");
    }

    const { id, ...fields } = data;
    const setClause = Object.keys(fields)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(", ");
    const values = Object.values(fields);

    try {
        await query(`UPDATE ${table} SET ${setClause} WHERE id = $${values.length + 1}`, [...values, id]);
        const updatedData = await readData(table, { id: id });
        return updatedData[0]; // Returns the first (and only) row
    } catch (error) {
        console.error(`Error updating data in ${table}:`, error);
        throw error;
    }
}

async function insertData(tableName, data) {
    const insertData = { ...data };
    // The commented out line below was the original:
    // if (insertData.hasOwnProperty("id") && tableName !== "user_films") {
    //     delete insertData.id;
    // }
    // Modified to include valid_id_sessions so 'id' is NOT deleted for it
    if (insertData.hasOwnProperty("id") && tableName !== "user_films" && tableName !== "valid_id_sessions") {
        delete insertData.id;
    }

    const columns = Object.keys(insertData).join(", ");
    const values = Object.values(insertData);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");

    try {
        // Check for column existence (optional but good practice)
        const tableInfo = await query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [tableName]);
        const validColumns = tableInfo.rows.map((col) => col.column_name);

        for (const column of Object.keys(insertData)) {
            if (!validColumns.includes(column)) {
                throw new Error(`Error table ${tableName} has no column named ${column}`);
            }
        }

        // RETURNING * returns the inserted row, including the generated ID
        const res = await query(`INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) RETURNING *`, values);
        return res.rows[0]; // Returns the first (and only) inserted row
    } catch (error) {
        console.error(`Error inserting data into ${tableName}:`, error);
        return { error: error.message };
    }
}

async function deleteData(tableName, condition) {
    if (!condition) {
        throw new Error("You must specify a condition for deletion in the format { 'column': 'value' }.");
    }
    try {
        const [columnName, value] = Object.entries(condition)[0];

        if (tableName === "films") {
            // Delete references from the user_films table before deleting the film
            await query(`DELETE FROM user_films WHERE film_id = $1`, [value]);
        }

        const res = await query(`DELETE FROM ${tableName} WHERE ${columnName} = $1 RETURNING *`, [value]);

        if (res.rowCount === 0) {
            throw new Error(`No data to delete with ${columnName} = ${value} in table "${tableName}".`);
        }
        return { message: `Data with ID ${value} successfully deleted from table "${tableName}".` };
    } catch (error) {
        console.error(`Error deleting data from ${tableName}:`, error);
        return { error: error.message };
    }
}

async function verifyUser(username, password) {
    try {
        const res = await query(`SELECT * FROM users WHERE username = $1`, [username]);
        const user = res.rows[0];

        if (!user) {
            console.log("User not found.");
            return null;
        }

        if (user.password === password) {
            // In a real application, use password hashing (e.g., bcrypt)
            console.log("User verified successfully.");
            return {
                id: user.id,
                username: user.username,
                password: user.password,
                email: user.email,
            };
        } else {
            console.log("Incorrect password.");
            return null;
        }
    } catch (error) {
        console.error("Error verifying user:", error);
        return null;
    }
}

async function checkSession(sessionId) {
    if (!sessionId) {
        throw new Error("Session ID is required for verification.");
    }
    try {
        const res = await query("SELECT * FROM valid_id_sessions WHERE session_id = $1", [sessionId]);
        return res.rows[0] || null;
    } catch (error) {
        console.error("Error checking session:", error);
        throw error;
    }
}

async function getAllWatchedFilms(userId) {
    if (!userId) throw new Error("User ID is required to get watched films.");
    try {
        const res = await query(
            `
            SELECT f.* FROM films f
            JOIN user_films uf ON f.id = uf.film_id
            WHERE uf.id = $1 AND uf.watched = TRUE
        `,
            [userId]
        );
        return res.rows;
    } catch (error) {
        console.error("Error getting all watched films:", error);
        throw error;
    }
}

async function getAllUserIds() {
    try {
        const res = await query("SELECT id, username FROM users");
        const userMap = {};
        res.rows.forEach((user) => {
            userMap[parseInt(user.id)] = user.username;
        });
        return userMap;
    } catch (error) {
        console.error("Error getting all user IDs:", error);
        throw error;
    }
}

async function createDefaultCategories() {
    const categories = ["Excellent movies", "Good movies", "Bad movies", "Unwatchable"];
    for (const category of categories) {
        // Use for...of for async operations
        const data = { name: category };
        await insertData("categories", data);
    }
    console.log("Default categories created.");
}

module.exports = {
    createDatabase,
    readData,
    updateData,
    insertData,
    deleteData,
    verifyUser,
    checkSession,
    getAllWatchedFilms,
    filmsWatched,
    filmsWatchedByUser,
    getAllUserIds,
    pool, // Export the pool so it can be closed at the end of the application
};
