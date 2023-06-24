const { MongoClient } = require("mongodb");
const express = require("express");
const app = express();
const port = 3000;
let db; // Oh, no... a global variable! This code needs to be modularised (broken into different modules/files) asap...

// db.js
const connectToMongo = async () => {
  const url = "mongodb://127.0.0.1:27017/craftbox";
  const client = new MongoClient(url);
  console.log("connecting...");
  await client.connect();
  console.log("Connected successfully to MongoDB!");
  db = await client.db();

  return client;
};

// utils.js

// compare 2 file states - you get told what has been added/modified/deleted
const getFilesDiff = (oldFiles, newFiles) => {
  const addedFiles = newFiles.filter(
    (newFile) => !oldFiles.find((oldFile) => oldFile.id === newFile.id)
  );
  const modifiedFiles = newFiles.filter((newFile) =>
    oldFiles.find(
      (oldFile) =>
        oldFile.id === newFile.id && oldFile.checksum !== newFile.checksum
    )
  );
  const deletedFiles = oldFiles.filter(
    (oldFile) => !newFiles.find((newFile) => newFile.id === oldFile.id)
  );

  return {
    addedFiles,
    modifiedFiles,
    deletedFiles,
  };
};

// routes.js
const routes = () => {
  const defaultState = {
    files: [],
  };

  app.use(express.json());

  // createBucket.js
  app.post("/createBucket", async (req, res) => {
    try {
      const { bucketName } = req.body;

      if (!bucketName) {
        return res.status(400).end(`Please provide "bucketName"`);
      }

      console.log(await db.collection("bucketStates").findOne({ bucketName }));
      if (await db.collection("bucketStates").findOne({ bucketName })) {
        return res.status(409).end(`Bucket ${bucketName} already exists.`);
      }

      await db.collection("bucketStates").insertOne({
        ...defaultState,
        bucketName,
      });

      res.end();
    } catch (e) {
      console.log(e);
      res.status(500).end("Uh oh!");
      throw e;
    }
  });

  // download.js
  app.post("/buckets/:bucketName/download", async (req, res) => {
    try {
      const { bucketName } = req.params;
      const clientState = req.body; // yes, we also have bucketName inside "state", but the URL is cleaner by including /buckets/<bucketName> in it...

      const bucketState = await db
        .collection("bucketStates")
        .findOne({ bucketName });
      if (!bucketState) {
        return res.status(404).end(`Bucket "${bucketName} does not exist."`);
      }
      if (!clientState || !clientState.files) {
        return res
          .status(400)
          .end(
            `Please provide a proper "state" file in your request's body. (it must contain state.files)`
          );
      }

      const filesDiff = getFilesDiff(clientState.files, bucketState.files);

      console.log(filesDiff);

      res.end();
    } catch (e) {
      console.log(e);
      res.status(500).end("Uh oh!");
      throw e;
    }
  });

  // upload.js
  app.post("/buckets/:bucketId/upload", async (req, res) => {
    // <TODO>
  });
};

// main.js
const main = async () => {
  console.log("Connecting to MongoDB...");
  await connectToMongo();
  console.log("Setting up REST routes...");
  routes();

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
};
main();
