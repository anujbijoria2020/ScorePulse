import express from "express";

const app = express();
const port = 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "SportBroadcast server is running." });
});

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
