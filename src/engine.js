const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");

function createDatabase() {
    const fileExists = fs.existsSync("./models/data.sqlite");
    const db = new DatabaseSync("./models/data.sqlite");
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            email TEXT
        );

        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT
        );

        CREATE TABLE IF NOT EXISTS films (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            rating INT NOT NULL,
            genre TEXT,
            year INTEGER,
            genre_id INT,
            author_id INT,
            description TEXT,
            FOREIGN KEY (genre_id) REFERENCES categories(id),
            FOREIGN KEY (author_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS user_films (
            id INTEGER,
            film_id INTEGER,
            watched BOOLEAN DEFAULT 0,
            PRIMARY KEY (id, film_id),
            FOREIGN KEY (id) REFERENCES users(id),
            FOREIGN KEY (film_id) REFERENCES films(id)
        );

        CREATE TABLE IF NOT EXISTS valid_id_sessions (
            id INTEGER PRIMARY KEY,
            session_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id) REFERENCES users(id)
        );
    `);
    if (!fileExists) {
        createDefualtCategories(db);
    }
    console.log("Database and tables created successfully.");
    return db;
}

function readData(db, table, condition) {
    let query = `SELECT * FROM ${table}`;

    if (condition) {
        const columnNames = Object.keys(condition);
        const whereClause = columnNames.map((column) => `${column} = ?`).join(" AND ");
        query += ` WHERE ${whereClause}`;
    }

    const statement = db.prepare(query);

    let values = [];
    if (condition) {
        values = Object.values(condition);
    }

    const rows = statement.all(...values);
    return rows;
}

function filmsWatched(db, data) {
    table = "user_films";
    const { id, film_id, watched } = data;
    console.log(data);

    try {
        // Check if the user_film entry already exists
        const existingUserFilm = readData(db, "user_films", { id: id, film_id: film_id });
        console.log("Existing user film entry:", existingUserFilm);

        if (existingUserFilm.length > 0) {
            // Update the existing entry
            const update = db.prepare(`UPDATE ${table} SET watched = ? WHERE id = ? AND film_id = ?`);
            update.run(watched, id, film_id);
            return { message: "Film watch status updated successfully." };
        } else {
            // Insert a new entry
            const insert = db.prepare(`INSERT INTO ${table} (id, film_id, watched) VALUES (?, ?, ?)`);
            insert.run(id, film_id, watched);
            return { message: "Film watch status added successfully." };
        }
    } catch (error) {
        console.log(error.message);
        console.log("Error updating data:", error);
        return { error: error.message };
    }
}

function filmsWatchedByUser(db, userId) {
    if (!userId) throw new Error("User ID is required to get watched films.");
    const query = db.prepare(`
        SELECT * FROM user_films
        WHERE id = ? AND watched = 1
    `);
    const watchedFilms = query.all(userId);
    console.log("Watched films for user:", userId, watchedFilms);
    return watchedFilms;
}

function updateData(db, table, data) {
    if (table === "user_films") {
        const { id, film_id, watched } = data;
        try {
            const update = db.prepare(`UPDATE ${table} SET watched = ? WHERE id = ? AND film_id = ?`);
            update.run(watched, id, film_id);
            return { message: "User film updated successfully." };
        } catch (error) {
            console.log(error.message);
            console.log("Error updating data:", error);
            return { error: error.message };
        }
    }
    if (table === "valid_id_sessions") {
        const { user_id, session_id } = data;
        try {
            const update = db.prepare(`UPDATE ${table} SET session_id = ? WHERE id = ?`);
            update.run(session_id, user_id);
            return { message: "Session updated successfully." };
        } catch (error) {
            console.log(error.message);
            console.log("Error updating data:", error);
            return { error: error.message };
        }
    }
    if (!data.id) {
        throw new Error("Data must contain an id for update.");
    }

    const { id, ...fields } = data;

    const setClause = Object.keys(fields)
        .map((key) => `${key} = ?`)
        .join(", ");

    const values = Object.values(fields);

    const query = db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`);
    const statement = db.prepare(query);

    statement.run(...values, id);

    const select = db.prepare(`SELECT * FROM ${table} WHERE id = ?`);
    const updatedData = select.get(id);
    // console.log("Updated data:", updatedData);
    return updatedData;
}

function insertData(db, tableName, data) {
    // Create a copy of the data to avoid modifying the original object
    const insertData = { ...data };

    // Remove the 'id' property if it exists
    if (insertData.hasOwnProperty("id") && tableName !== "user_films") {
        delete insertData.id;
    }

    const columns = Object.keys(insertData).join(", ");
    const values = Object.values(insertData);
    const placeholders = values.map(() => "?").join(", ");

    try {
        const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
        const validColumns = tableInfo.map((col) => col.name);

        for (const column of Object.keys(insertData)) {
            if (!validColumns.includes(column)) {
                throw new Error(`Error table ${tableName} has no column named ${column}`);
            }
        }

        // if (tableName !== "user_films") {
        //     const insert = db.prepare(`INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`);
        //     const result = insert.run(...values);
        //     const lastId = result.lastInsertRowid;

        //     const select = db.prepare(`SELECT * FROM ${tableName} WHERE id = ? AND WHERE film_id = ?`);
        //     const insertedRow = select.get(lastId);
        //     return insertedRow;
        // }

        const insert = db.prepare(`INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`);
        const result = insert.run(...values);
        const lastId = result.lastInsertRowid;

        const select = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
        const insertedRow = select.get(lastId);
        return insertedRow;
    } catch (error) {
        console.log(error.message, tableName, data);
        console.log("Error inserting data:", error);
        return { error: error.message };
    }
}

function deleteData(db, tableName, condition) {
    if (!condition) {
        throw new Error("Morate specificirati uslov za brisanje u formatu { 'stupac': 'vrednost' }.");
    }
    try {
        const [columnName, value] = Object.entries(condition)[0];

        if (tableName === "films") {
            const deleteUserFilmsQuery = `DELETE FROM user_films WHERE film_id = ?`;
            const deleteUserFilmsStatement = db.prepare(deleteUserFilmsQuery);
            deleteUserFilmsStatement.run(value);
        }

        const query = `DELETE FROM ${tableName} WHERE ${columnName} = ?`;
        const statement = db.prepare(query);

        // const deleteQuery = db.prepare(`DELETE FROM ${tableName} WHERE id = ?`);
        a = statement.run(value);

        if (a.changes === 0) {
            throw new Error(`Nema podataka za brisanje sa ${columnName} = ${value} u tabeli "${tableName}".`);
        }
        return { message: `Podaci sa ID ${value} su uspešno obrisani iz tabele "${tableName}".` };
    } catch (error) {
        console.log(error);
        return { error: error.message };
    }
}

function verifyUser(db, username, password) {
    try {
        const select = db.prepare(`SELECT * FROM users WHERE username = ?`);
        const user = select.get(username);

        if (!user) {
            console.log("User not found.");
            return null; // Or handle the case where the user is not found
        }

        if (user.password === password) {
            console.log("User verified successfully.");
            return {
                // Return a normal object
                id: user.id,
                username: user.username,
                password: user.password,
                email: user.email,
            };
        } else {
            console.log("Incorrect password.");
            return null; // Or handle the case where the password is incorrect
        }
    } catch (error) {
        console.error("Error verifying user:", error);
        return null; // Or handle the error appropriately
    }
}

function checkSession(db, sessionId) {
    if (!sessionId) {
        throw new Error("Session ID is required for verification.");
    }
    const query = db.prepare("SELECT * FROM valid_id_sessions WHERE session_id = ?");
    const session = query.get(sessionId) ? query.get(sessionId) : null;
    return session;
}

function getAllWatchedFilms(db, userId) {
    if (!userId) throw new Error("User ID is required to get watched films.");
    const query = db.prepare(`
        SELECT f.* FROM films f
        JOIN user_films uf ON f.id = uf.film_id
        WHERE uf.id = ? AND uf.watched = 1
    `);
    const watchedFilms = query.all(userId);
    return watchedFilms;
}

function getAllUserIds(db) {
    const query = db.prepare("SELECT id, username FROM users");
    const users = query.all();
    const userMap = {};
    users.forEach((user) => {
        userMap[parseInt(user.id)] = user.username; // Parse user.id to integer
    });
    return userMap;
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
};

function createDefualtCategories(db) {
    const categories = ["Excellent movies", "Good movies", "Bad movies", "Unwatchable"];
    categories.forEach((category) => {
        const data = { name: category };
        insertData(db, "categories", data);
    });
}

function createDefualtGeners(db) {
    const categories = ["Action", "Comedy", "Drama", "Horror", "Sci-Fi"];
    categories.forEach((category) => {
        const data = { name: category };
        insertData(db, "categories", data);
    });
}
