const htpp = require("http");
const { parse } = require("url");
const fs = require("fs");
const path = require("path");
const cookie = require("cookie");

const { createDatabase, insertData, readData, updateData, deleteData, verifyUser } = require("./engine.js");

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
        if (!cookies.sessionId && pathname !== "/login") {
            console.log(`Unauthorized access attempt ${pathname}`);
            res.writeHead(302, { Location: "/login" });
            res.end();
            return;
        }
        // Handle protected routes
        if (pathname === "/") {
            res.writeHead(200, { "Content-Type": "text/html" });
            const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
            res.end(html);
        } else if (pathname.startsWith("/api")) {
            const resource = pathname.split("/").pop();
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
                        console.log("Login attempt");
                        const { username, password } = data;
                        const user = verifyUser(db, username, password);
                        console.log(`User verification result: ${JSON.stringify(user)}`);
                        if (!user) {
                            res.writeHead(401, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ error: "Invalid username or password" }));
                            return;
                        }
                        const cTime = Date.now();
                        const sessionId = btoa(`${username}${cTime}`);

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
                            console.log("dick");
                            res.writeHead(200, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ message: "Login successful", sessionId: sessionId, user }));
                        } else {
                            res.writeHead(401, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ error: "Invalid username or password" }));
                            return;
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
