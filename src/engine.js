const { DatabaseSync } = require("node:sqlite");

function createDatabase() {
    const db = new DatabaseSync("./models/data.sqlite");
    db.exec(`
        CREATE TABLE IF NOT EXISTS films (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            rating INT NOT NULL,
            author TEXT NOT NULL,
            category TEXT NOT NULL,
            year INTEGER,
            genre TEXT,
            description TEXT
        );

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT
        );
    `);

    console.log("Database and tables created successfully.");
    return db;
}

function readData(db, table) {
    const query = db.prepare(`SELECT * FROM ${table}`);

    const rows = query.all();
    console.log(`Podaci iz ${table}:`);
    console.log(rows);
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
    console.log("Updated data:", insertedData);
    return insertedData;
}

function insertData(db, tableName, data) {
    const columns = Object.keys(data).join(", ");
    const values = Object.values(data);
    const placeholders = values.map(() => "?").join(", ");

    const insert = db.prepare(`INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`);

    const result = insert.run(...values);
    const lastId = result.lastInsertRowid;

    const select = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
    const insertedRow = select.get(lastId);
    console.log(`Podaci su uspešno uneti u tabelu "${tableName}".`);
    return insertedRow;
}

function deleteData(db, tableName, id) {
    if (!id) {
        throw new Error("ID must be provided for deletion.");
    }

    const deleteQuery = db.prepare(`DELETE FROM ${tableName} WHERE id = ?`);
    deleteQuery.run(id);

    console.log(`Podaci sa ID ${id} su uspešno obrisani iz tabele "${tableName}".`);
}

module.exports = {
    createDatabase,
    readData,
    updateData,
    insertData,
    deleteData,
};
