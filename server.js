require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/database");
const Movie = require("./models/Movie");
const Director = require("./models/director");

connectDB();

const app = express();
const PORT = process.env.PORT || 3300;

app.use(cors());
app.use(express.json());

// Endpoint CRUD untuk /movies
app.get("/movies", async (req, res, next) => {
  try {
    const movies = await Movie.find({});
    res.json(movies);
  } catch (err) {
    next(err);
  }
});

app.get("/movies/:id", async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ error: "Film tidak ditemukan" });
    }
    res.json(movie);
  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(400).json({ error: "Format ID tidak valid" });
    }
    next(err);
  }
});

app.post("/movies", async (req, res, next) => {
  try {
    const newMovie = new Movie(req.body);
    const savedMovie = await newMovie.save();
    res.status(201).json(savedMovie);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

app.put("/movies/:id", async (req, res, next) => {
  try {
    const updatedMovie = await Movie.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedMovie) {
      return res.status(404).json({ error: "Film tidak ditemukan" });
    }
    res.json(updatedMovie);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    if (err.kind === "ObjectId") {
      return res.status(400).json({ error: "Format ID tidak valid" });
    }
    next(err);
  }
});

app.delete("/movies/:id", async (req, res, next) => {
  try {
    const deletedMovie = await Movie.findByIdAndDelete(req.params.id);
    if (!deletedMovie) {
      return res.status(404).json({ error: "Film tidak ditemukan" });
    }
    res.status(204).send();
  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(400).json({ error: "Format ID tidak valid" });
    }
    next(err);
  }
});

//director
app.get("/director", async (req, res, next) => {
  try {
    const director = await Director.find({});
    res.json(director);
  } catch (err) {
    next(err);
  }
});

app.get("/director/:id", async (req, res, next) => {
  try {
    const director = await Director.findById(req.params.id);
    if (!director) {
      return res.status(404).json({ error: "director tidak ditemukan" });
    }
    res.json(director);
  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(400).json({ error: "Format ID tidak valid" });
    }
    next(err);
  }
});

app.post("/director", async (req, res, next) => {
  try {
    const newDirector = new Director(req.body);
    const savedDirector = await newDirector.save();
    res.status(201).json(savedDirector);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

app.put("/director/:id", async (req, res, next) => {
  try {
    const updatedDirector = await Director.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedDirector) {
      return res.status(404).json({ error: "director tidak ditemukan" });
    }
    res.json(updatedDirector);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    if (err.kind === "ObjectId") {
      return res.status(400).json({ error: "Format ID tidak valid" });
    }
    next(err);
  }
});

app.delete("/director/:id", async (req, res, next) => {
  try {
    const deletedDirector = await Director.findByIdAndDelete(req.params.id);
    if (!deletedDirector) {
      return res.status(404).json({ error: "director tidak ditemukan" });
    }
    res.status(204).send();
  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(400).json({ error: "Format ID tidak valid" });
    }
    next(err);
  }
});

// Fallback 404
app.use((req, res) => {
  res.status(404).json({ error: "Rute tidak ditemukan" });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Terjadi kesalahan pada server" });
});

app.listen(PORT, () => {
  console.log("Server aktif di http://localhost:${PORT}");
});
