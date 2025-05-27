const htpp = require("http");
const url = require("url");
const fs = require("fs");
const path = require("path");

const { createDatabase, insertData, readData, updateData, deleteData } = require("./engine.js");

const db = createDatabase();

const port = 8080;

const server = htpp.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    const method = req.method;
    const pathname = parsedUrl.pathname;

    if (method === "GET") {
        if (pathname === "/") {
            console.log("Serving index.html");
            res.writeHead(200, { "Content-Type": "text/html" });
            const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
            res.end(html);
        } else if (pathname.startsWith("/public")) {
            const filepath = path.join(__dirname, "..", pathname);
            fs.readFile(filepath, (err, data) => {
                if (err) {
                    console.error(`Error reading file: ${err.message}`);
                    res.writeHead(404, { "Content-Type": "text/plain" });
                    res.end("File not found");
                    return;
                }

                const ext = path.extname(filepath).toLowerCase();
                const mimeType = {
                    ".html": "text/html",
                    ".js": "application/javascript",
                    ".css": "text/css",
                };

                const contentType = mimeType[ext] || "application/octet-stream";
                res.writeHead(200, { "Content-Type": contentType });
                res.end(data);
            });
        } else if (pathname.startsWith("/api")) {
            const resource = pathname.split("/").pop();
            console.log(`Fetching ${resource} from database`);
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
                const data = JSON.parse(body);
                console.log(`Inserting data into ${resource}`);
                console.log(data);
                insertData(db, resource, data);
                res.writeHead(201, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: `Successfully added ${resource}` }));
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
            req.on("data", (chunk) => {
                body += chunk.toString();
            });
            req.on("end", async () => {
                const data = JSON.parse(body);
                console.log(`Deleting data from ${resource}`);
                console.log(data);
                deleteData(db, resource, data.id);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: `Successfully deleted ${resource}` }));
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
