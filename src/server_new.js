const http = require("http"); // Popravio sam 'htpp' u 'http'
const { parse } = require("url");
const fs = require("fs");
const path = require("path");
const cookie = require("cookie");

// Uvozimo samo funkcije, 'db' objekt (pool) se ne prosljeđuje
// već ga funkcije u 'engine.js' koriste direktno
const {
    createDatabase,
    insertData,
    readData,
    updateData,
    deleteData,
    verifyUser,
    checkSession,
    filmsWatched,
    filmsWatchedByUser,
    getAllUserIds,
    pool, // Uvezite i pool za eventualno zatvaranje pri gašenju servera
} = require("./database.js");

// Inicijaliziramo bazu podataka JEDNOM na početku aplikacije
async function initializeDatabase() {
    try {
        await createDatabase();
        console.log("Database initialized successfully.");
    } catch (error) {
        console.error("Failed to initialize database:", error);
        process.exit(1); // Izlazimo iz procesa ako baza nije inicijalizirana
    }
}

initializeDatabase(); // Pozivamo inicijalizaciju pri pokretanju servera

const port = 8080;

// Funkcija verifySession mora biti asinkrona jer checkSession sada vraća Promise
async function verifySession(req) {
    const cookies = cookie.parse(req.headers.cookie || "");
    if (!cookies.sessionId) {
        return false;
    }
    // checkSession je sada asinkrona funkcija
    const session = await checkSession(cookies.sessionId);
    return !!session; // Vraća true ako sesija postoji, false inače
}

const mimeType = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".ico": "image/x-icon", // Dodao favicon tip
};

const server = http.createServer(async (req, res) => {
    // Server handler mora biti async
    const { method } = req;
    const pathname = parse(req.url).pathname;

    console.log(`Received ${method} request for ${pathname}`);

    // Add CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"); // Dodao PUT, DELETE, OPTIONS
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle OPTIONS preflight requests
    if (method === "OPTIONS") {
        res.writeHead(204); // No Content
        res.end();
        return;
    }

    if (method === "GET") {
        // Public routes that don't need authentication check
        if (pathname === "/login" || pathname === "/register" || pathname.startsWith("/public")) {
            // Handle public assets
            if (pathname.startsWith("/public")) {
                const filepath = `.${pathname}`;
                const ext = path.extname(filepath);

                fs.readFile(filepath, (err, data) => {
                    if (err) {
                        res.writeHead(404);
                        res.end("File not found");
                        return;
                    }
                    const contentType = mimeType[ext] || "application/octet-stream";
                    res.writeHead(200, { "Content-Type": contentType });
                    res.end(data);
                });
                return;
            } else {
                const place = pathname.substring(1);
                fs.readFile(`./public/${place}.html`, (err, data) => {
                    if (err) {
                        res.writeHead(500);
                        res.end(`Error loading ${place} page`);
                        return;
                    }
                    res.writeHead(200, { "Content-Type": "text/html" });
                    res.end(data);
                });
                return;
            }
        }
        if (pathname === "/favicon.ico") {
            fs.readFile(path.join(__dirname, "..", "public", "favicon.ico"), (err, data) => {
                if (err) {
                    res.writeHead(404);
                    res.end("Favicon not found");
                    return;
                }
                res.writeHead(200, { "Content-Type": "image/x-icon" });
                res.end(data);
            });
            return;
        }

        // Protected routes - check authentication
        const cookies = cookie.parse(req.headers.cookie || "");
        let isAuthenticated = false;
        let userSession = null;

        if (cookies.sessionId) {
            userSession = await checkSession(cookies.sessionId); // checkSession je asinkrona
            if (userSession) {
                isAuthenticated = true;
            }
        }

        if (!isAuthenticated && pathname !== "/login") {
            console.log(`Unauthorized access attempt ${pathname}`);
            res.writeHead(302, { Location: "/login" });
            res.end();
            return;
        }

        if (pathname === "/") {
            const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(html);
            return;
        } else if (pathname.startsWith("/api")) {
            const resource = pathname.split("/").pop();
            const userId = userSession ? userSession.id : null; // Dohvaćanje userId iz provjerene sesije

            if (!userId && resource !== "login" && resource !== "users") {
                // Ne provjeravamo userId za login i registraciju
                res.writeHead(401, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Unauthorized - No User ID or Invalid Session" }));
                return;
            }

            try {
                let data = null;
                if (resource === "films-watched" || resource === "user_films") {
                    data = await filmsWatchedByUser(userId); // Poziv asinkrone funkcije
                } else if (resource === "id_users") {
                    data = await getAllUserIds(); // Poziv asinkrone funkcije
                } else {
                    data = await readData(resource); // Poziv asinkrone funkcije
                }
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(data));
            } catch (error) {
                console.error(`Error handling GET /api/${resource}:`, error);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Internal Server Error" }));
            }
        } else {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not Found");
        }
    } else if (method === "POST") {
        if (pathname.startsWith("/api")) {
            const resource = pathname.split("/").pop();
            let body = "";

            req.on("data", (chunk) => {
                body += chunk.toString();
            });

            req.on("end", async () => {
                // Moramo čekati da se tijelo zahtjeva parsira prije nego što obradimo
                try {
                    const data = JSON.parse(body);

                    if (resource === "users") {
                        // Check if username already exists
                        const existingUser = await readData("users", { username: data.username }); // Asinkroni poziv
                        if (existingUser.length > 0) {
                            res.writeHead(400, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ error: "Username already exists" }));
                            return;
                        }

                        // Insert new user
                        const result = await insertData("users", data); // Asinkroni poziv
                        if (result && result.error) {
                            // Provjera greške
                            res.writeHead(400, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ error: result.error }));
                        } else {
                            res.writeHead(201, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ message: "Registration successful", user: result })); // Vratite i podatke o korisniku
                        }
                    } else if (resource === "login") {
                        const cTime = Date.now(); // Koristite trenutno vrijeme
                        const { username, password } = data;

                        const user = await verifyUser(username, password); // Asinkroni poziv

                        if (!user) {
                            res.writeHead(401, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ error: "Invalid username or password" }));
                            return;
                        }

                        const sessionId = btoa(`${username}${cTime}`); // Base64 encode
                        const sessionData = { id: user.id, session_id: sessionId, created_at: new Date(cTime).toISOString() }; // PostgreSQL voli ISO format

                        // Check if a session already exists for this user
                        const existingSession = await readData("valid_id_sessions", { id: user.id }); // Asinkroni poziv

                        if (existingSession.length > 0) {
                            // Update the existing session with the new session ID
                            await updateData("valid_id_sessions", { id: user.id, session_id: sessionId }); // Asinkroni poziv
                            console.log(`Updated session ID for user ${user.id} to ${sessionId}`);
                        } else {
                            // Insert a new session
                            await insertData("valid_id_sessions", sessionData); // Asinkroni poziv
                            console.log(`Created new session for user ${user.id} with session ID ${sessionId}`);
                        }

                        // Set session cookie
                        res.setHeader(
                            "Set-Cookie",
                            cookie.serialize("sessionId", sessionId, {
                                httpOnly: true,
                                maxAge: 60 * 60 * 24 * 30, // 30 dana
                                path: "/", // Važno: Cookie dostupan na cijeloj domeni
                            })
                        );
                        console.log(`Set-Cookie: sessionId=${sessionId}`);
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ message: "Login successful", sessionId: sessionId, user }));
                    } else if (resource === "update-watched-status") {
                        const { user_id, film_id, watched } = data;
                        const watchedStatus = watched ? true : false; // PostgreSQL boolean je true/false
                        const watchedData = { id: user_id, film_id: film_id, watched: watchedStatus };
                        try {
                            await filmsWatched(watchedData); // Asinkroni poziv
                            res.writeHead(201, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ message: "Watched status successfully saved" }));
                        } catch (error) {
                            console.error(`Error updating watched status: ${error.message}`);
                            res.writeHead(500, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ error: "Failed to update watched status" }));
                        }
                    } else {
                        // Opća ruta za insertData
                        console.log(`Inserting data into ${resource}`);
                        console.log(data);
                        const result = await insertData(resource, data); // Asinkroni poziv
                        if (result && result.error) {
                            res.writeHead(400, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ error: result.error }));
                        } else {
                            res.writeHead(201, { "Content-Type": "application/json" });
                            res.end(JSON.stringify(result));
                        }
                    }
                } catch (error) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "Invalid request format" }));
                    console.error(`Error parsing JSON or processing request: ${error.message}`);
                }
            });
        } else {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not Found");
        }
    } else if (method === "PUT") {
        if (pathname.startsWith("/api")) {
            const resource = pathname.split("/").pop();
            let body = "";
            req.on("data", (chunk) => {
                body += chunk.toString();
            });
            req.on("end", async () => {
                // Asinkrono rukovanje
                try {
                    const data = JSON.parse(body);
                    console.log(`Updating data in ${resource}`);
                    console.log(data);
                    const result = await updateData(resource, data); // Asinkroni poziv
                    if (result && result.error) {
                        res.writeHead(400, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ error: result.error }));
                    } else {
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ message: `Successfully updated ${resource}`, data: result }));
                    }
                } catch (error) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "Invalid request format or internal error" }));
                    console.error(`Error parsing JSON or processing PUT request: ${error.message}`);
                }
            });
        } else {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not Found");
        }
    } else if (method === "DELETE") {
        if (pathname.startsWith("/api")) {
            const resource = pathname.split("/").pop();
            let body = "";
            req.on("data", (chunk) => {
                body += chunk.toString();
            });
            req.on("end", async () => {
                // Asinkrono rukovanje
                let data = {};
                try {
                    data = JSON.parse(body);
                } catch (error) {
                    console.error(`Error parsing JSON for DELETE: ${error.message}`);
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "Invalid JSON format." }));
                    return;
                }
                console.log(`Deleting data from ${resource}`);
                console.log(data);
                const returnedData = await deleteData(resource, data); // Asinkroni poziv
                if (returnedData && returnedData.error) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify(returnedData));
                    return;
                } else {
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ message: `Successfully deleted ${resource}` }));
                }
            });
        } else {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not Found");
        }
    } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
    }
});

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// Dodajte rukovanje gašenjem servera kako biste ispravno zatvorili PG pool
process.on("SIGINT", async () => {
    console.log("Server shutting down, closing PostgreSQL connection pool...");
    await pool.end();
    console.log("PostgreSQL connection pool closed.");
    process.exit(0);
});
