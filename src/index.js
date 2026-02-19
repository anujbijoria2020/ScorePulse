import express from "express";
import {matchRouter} from "./routes/matches.js";

const app = express();
const port = 3000;

app.use(express.json());
app.use((req, res, next) => {
  console.log("Incoming:", req.method, req.url);
  next();
});


app.get("/", (req, res) => {
  res.json({ message: "SportBroadcast server is running." });
});

console.log("matchRouter value:", matchRouter);
app.use("/api/matches",matchRouter);

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
