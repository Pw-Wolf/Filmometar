const htpp = require("http");
const { parse } = require("url");
const fs = require("fs");
const path = require("path");
const cookie = require("cookie");

const { createDatabase, insertData, readData, updateData, deleteData, verifyUser, checkSession, filmsWatched, filmsWatchedByUser, getAllUserIds } = require("./engine.js");

const db = createDatabase();

const port = 8080;

function verifySession(req) {
    const cookies = cookie.parse(req.headers.cookie || "");
    return cookies.sessionId ? true : false;
}

const mimeType = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
};

const server = htpp.createServer((req, res) => {
    const { method } = req;
    const pathname = parse(req.url).pathname;

    const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");

    console.log(`Received ${method} request for ${pathname}`);

    // Add CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

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
                place = pathname.substring(1);
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
        let userVerify = true;
        if (!cookies.sessionId && pathname !== "/login") {
            console.log(`Unauthorized access attempt ${pathname}`);
            res.writeHead(302, { Location: "/login" });
            res.end();
            return;
        } else if (cookies.sessionId && pathname === "/") {
            returned = checkSession(db, cookies.sessionId);
            if (!returned) {
                userVerify = false;
                console.log(`Invalid session ID: ${cookies.sessionId}`);
                res.writeHead(302, { Location: "/login" });
                res.end();
                return;
            }
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(html);
            return;
        }
        // Handle protected routes
        if (pathname === "/") {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(html);
            return; // Add this line to stop further execution
        } else if (pathname.startsWith("/api")) {
            const resource = pathname.split("/").pop();
            const cookies = cookie.parse(req.headers.cookie || "");
            let userId = null;

            if (cookies.sessionId) {
                const sessionResult = checkSession(db, cookies.sessionId);
                if (sessionResult) {
                    // Assuming checkSession returns the user ID
                    userId = sessionResult.id;
                } else {
                    // Invalid session
                    res.writeHead(401, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "Unauthorized - Invalid Session" }));
                    return;
                }
            } else {
                // No session
                console.log(`Unauthorized access attempt ${pathname}`);
                res.writeHead(401, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Unauthorized - No Session" }));
                return;
            }

            if (resource === "films-watched") {
                if (!userId) {
                    res.writeHead(401, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "Unauthorized - No User ID" }));
                    return;
                }
                const watchedFilms = filmsWatchedByUser(db, userId);
                console.log("111111111111");
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(watchedFilms));
                return;
            } else if (resource === "user_films") {
                const watchedFilms = filmsWatchedByUser(db, userId);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(watchedFilms));
                return;
            } else if (resource === "id_users") {
                const data = getAllUserIds(db);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(data));
                return;
            }
            const read = readData(db, resource);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(read));
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
                try {
                    const data = JSON.parse(body);

                    if (resource === "users") {
                        // Check if username already exists
                        const existingUser = readData(db, "users").find((user) => user.username === data.username);

                        if (existingUser) {
                            res.writeHead(400, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ error: "Username already exists" }));
                            return;
                        }

                        // Insert new user
                        const result = insertData(db, "users", data);
                        if (result.error) {
                            res.writeHead(400, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ error: result.error }));
                        } else {
                            res.writeHead(201, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ message: "Registration successful" }));
                        }
                    } else if (resource === "login") {
                        const cTime = Date.now() + 2 * 60 * 60 * 1000; // GMT+2
                        const { username, password } = data;

                        const sessionId = btoa(`${username}${cTime}`);
                        const user = verifyUser(db, username, password);

                        // Check if a session already exists for this user
                        const existingSession = readData(db, "valid_id_sessions").find((session) => session.user_id === user.id);
                        // console.log(user);
                        const dataDB = { session_id: sessionId, id: user.id, created_at: cTime };
                        // console.log(dataDB);
                        if (existingSession) {
                            // Update the existing session with the new session ID
                            updateData(db, "valid_id_sessions", dataDB);
                            console.log(`Updated session ID for user ${user.id} to ${sessionId}`);
                        } else {
                            // Insert a new session
                            insertData(db, "valid_id_sessions", dataDB);
                            console.log(`Created new session for user ${user.id} with session ID ${sessionId}`);
                        }

                        if (!user) {
                            res.writeHead(401, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ error: "Invalid username or password" }));
                            return;
                        }

                        if (user) {
                            // Set session cookie
                            res.setHeader(
                                "Set-Cookie",
                                cookie.serialize("sessionId", sessionId, {
                                    httpOnly: true,
                                    maxAge: 60 * 60 * 24 * 30,
                                })
                            );
                            console.log(`Set-Cookie: sessionId=${sessionId}`);
                            res.writeHead(200, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ message: "Login successful", sessionId: sessionId, user }));
                        } else {
                            res.writeHead(401, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ error: "Invalid username or password" }));
                            return;
                        }
                    } else if (resource === "valid_id_sessions") {
                        const { session_id, user_id } = data;

                        const sessionData = {
                            session_id: session_id,
                            user_id: user_id,
                        };

                        const insertResult = insertData(db, "valid_id_sessions", sessionData);

                        if (insertResult.error) {
                            res.writeHead(500, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ error: insertResult.error }));
                        } else {
                            res.writeHead(201, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ message: "Session created successfully" }));
                        }
                    } else if (resource === "update-watched-status") {
                        const { user_id, film_id, watched } = data;
                        watchedData = { id: user_id, film_id: film_id, watched: watched ? 1 : 0 };
                        try {
                            filmsWatched(db, watchedData);
                            res.writeHead(201, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ message: "Watched status sucessfuly saved" }));
                        } catch (error) {
                            console.error(`Error updating watched status: ${error.message}`);
                        }
                    } else {
                        console.log(`Inserting data into ${resource}`);
                        console.log(data);
                        const result = insertData(db, resource, data);
                        if (result.error) {
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
                    console.error(`Error parsing JSON: ${error.message}`);
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
                const data = JSON.parse(body);
                console.log(`Updating data in ${resource}`);
                console.log(data);
                updateData(db, resource, data);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: `Successfully updated ${resource}` }));
            });
        } else {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not Found");
        }
    } else if (method === "DELETE") {
        if (pathname.startsWith("/api")) {
            const resource = pathname.split("/").pop();
            let body = "";
            let data = {};
            req.on("data", (chunk) => {
                body += chunk.toString();
            });
            req.on("end", async () => {
                try {
                    data = JSON.parse(body);
                } catch (error) {
                    console.error(`Error parsing JSON: ${error.message}`);
                    res.writeHead(400, { "Content-Type": "application/json" });

                    res.end(JSON.stringify({ error: "Invalid JSON format." }));
                    return;
                }
                console.log(`Deleting data from ${resource}`);
                console.log(data);
                returnedData = deleteData(db, resource, data);
                if (returnedData["error"]) {
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
