require("dotenv").config();
const http = require("http");
const config = require("./config");
const { initApp } = require("./app");
const { initSocket } = require("./socket");

initApp()
  .then((app) => {
    const server = http.createServer(app);
    initSocket(server);
    server.listen(config.PORT, "0.0.0.0", () => {
      console.log(`Ticketing backend running on http://0.0.0.0:${config.PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
