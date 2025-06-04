const { DatabaseSync } = require("node:sqlite");

function createDatabase() {
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
            name TEXT NOT NULL,
            rating INT NOT NULL,
            year INTEGER,
            genre_id INT,
            author_id INT,
            description TEXT,
            FOREIGN KEY (genre_id) REFERENCES categories(id),
            FOREIGN KEY (author_id) REFERENCES users(id)
        );
    `);

    console.log("Database and tables created successfully.");
    return db;
}

function readData(db, table) {
    const query = db.prepare(`SELECT * FROM ${table}`);

    const rows = query.all();
    // console.log(`Podaci iz ${table}:`);
    // console.log(rows);
    return rows;
}

function updateData(db, table, data) {
    if (!data.id) {
        throw new Error("Data must contain an id for update.");
    }

    const { id, ...fields } = data;

    const setClause = Object.keys(updatefields)
        .map((key) => `${key} = ?`)
        .join(", ");

    const values = Object.values(fields);

    const query = db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`);
    const statement = db.prepare(query);

    statement.run(...values);

    const slelect = db.prepare(`SELECT * FROM ${table} WHERE id = ?`);
    const insertedData = slelect.get(id);
    // console.log("Updated data:", insertedData);
    return insertedData;
}

function insertData(db, tableName, data) {
    const columns = Object.keys(data).join(", ");
    const values = Object.values(data);
    const placeholders = values.map(() => "?").join(", ");

    try {
        const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
        const validColumns = tableInfo.map((col) => col.name);

        for (const column of Object.keys(data)) {
            if (!validColumns.includes(column)) {
                throw new Error(`Error table ${tableName} has no column named ${column}`);
            }
        }

        const insert = db.prepare(`INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`);
        const result = insert.run(...values);
        const lastId = result.lastInsertRowid;

        const select = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
        const insertedRow = select.get(lastId);
        return insertedRow;
    } catch (error) {
        console.log(error.message);
        return { error: error.message };
    }
}

function deleteData(db, tableName, condition) {
    if (!condition) {
        throw new Error("Morate specificirati uslov za brisanje u formatu { 'stupac': 'vrednost' }.");
    }
    try {
        const [columnName, value] = Object.entries(condition)[0];

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
    if (!username || !password) {
        throw new Error("Username and password are required for verification.");
    }
    const query = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?");
    const user = query.get(username, password);
    return user;
}

module.exports = {
    createDatabase,
    readData,
    updateData,
    insertData,
    deleteData,
    verifyUser,
};
