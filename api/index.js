const serverless = require("serverless-http");

let handlerPromise;

async function getHandler() {
  if (!handlerPromise) {
    handlerPromise = (async () => {
      const { initApp } = require("../backend/src/app");
      const app = await initApp();
      return serverless(app);
    })();
  }
  return handlerPromise;
}

module.exports = async (req, res) => {
  const handler = await getHandler();
  return handler(req, res);
};
