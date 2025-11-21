require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./sqlite3_database.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
// import middleware baru (destructuring)
const { authenticateToken, authorizeRole } = require("./middleware/authMiddleware.js");

const app = express();
const PORT = process.env.PORT || 3200;

app.use(cors());
app.use(express.json());

app.get("/status", (req, res) => {
  res.json({ ok: true, service: "film-api" });
});

app.post("/auth/register", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password || password.length < 6) {
    return res
      .status(400)
      .json({ error: "Username dan password (min 6 char) harus diisi" });
  }

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error("Error hashing:", err);
      return res.status(500).json({ error: "Gagal memproses pendaftaran" });
    }

    const sql = "INSERT INTO users (username, password, role) VALUES (?,?,?)";
    const params = [username.toLowerCase(), hashedPassword, "user"];

    db.run(sql, params, function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(409).json({ error: "Username sudah digunakan" });
        }
        console.error("Error inserting user:", err);
        return res.status(500).json({ error: "Gagal menyimpan pengguna" });
      }
      res
        .status(201)
        .json({ message: "Registrasi berhasil", userId: this.lastID });
    });
  });
});

app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username dan password harus diisi" });
  }

  const sql = "SELECT * FROM users WHERE username = ?";
  db.get(sql, [username.toLowerCase()], (err, user) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ error: "Terjadi kesalahan server" });
    }
    if (!user) {
      return res.status(401).json({ error: "Kredensial tidak valid" });
    }

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error("Bcrypt error:", err);
        return res.status(500).json({ error: "Terjadi kesalahan server" });
      }
      if (!isMatch) {
        return res.status(401).json({ error: "Kredensial tidak valid" });
      }

      const payload = {
        user: {
          id: user.id,
          username: user.username,
          role: user.role, // sertakan role di payload
        },
      };

      jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" }, (err, token) => {
        if (err) {
          console.error("JWT sign error:", err);
          return res.status(500).json({ error: "Gagal membuat token" });
        }
        res.json({ message: "Login berhasil", token: token });
      });
    });
  });
});

// get semua publik
app.get("/movies", (req, res) => {
  const sql = "SELECT * FROM movies ORDER BY id ASC";
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// get film id publik
app.get("/movies/:id", (req, res) => {
  const sql = "SELECT * FROM movies WHERE id = ?";
  db.get(sql, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "Film tidak ditemukan" });
    }
    res.json(row);
  });
});

// post film baru dilindungi (cukup login)
app.post("/movies", authenticateToken, (req, res) => {
  const { title, director, year } = req.body;
  if (!title || !director || !year) {
    return res.status(400).json({ error: "title, director, year wajib diisi" });
  }

  console.log(
    `Pengguna '${req.user && req.user.username}' menambahkan film baru: ${title}`
  );

  const sql = "INSERT INTO movies (title, director, year) VALUES (?,?,?)";
  db.run(sql, [title, director, year], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, title, director, year });
  });
});

// put/update film dengan id dilindungi (harus admin)
app.put(
  "/movies/:id",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    const { title, director, year } = req.body;
    const sql =
      "UPDATE movies SET title = ?, director = ?, year = ? WHERE id = ?";
    db.run(sql, [title, director, year, req.params.id], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Film tidak ditemukan" });
      }
      console.log(
        `Pengguna '${req.user && req.user.username}' memperbarui film ID: ${req.params.id}`
      );
      res.json({ id: Number(req.params.id), title, director, year });
    });
  }
);

// delete film dilindungi (harus admin)
app.delete(
  "/movies/:id",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    const sql = "DELETE FROM movies WHERE id = ?";
    db.run(sql, [req.params.id], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Film tidak ditemukan" });
      }
      console.log(
        `Pengguna '${req.user && req.user.username}' menghapus film ID: ${req.params.id}`
      );
      res.status(204).send();
    });
  }
);

//director
// Get semua publik
app.get("/directors", (req, res) => {
  const sql = "SELECT * FROM directors ORDER BY id ASC";
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get director id public
app.get("/directors/:id", (req, res) => {
  const sql = "SELECT * FROM directors WHERE id = ?";
  db.get(sql, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "Director tidak ditemukan" });
    }
    res.json(row);
  });
});

// post director baru dilindungi (cukup login)
app.post("/directors", authenticateToken, (req, res) => {
  const { name, birthYear } = req.body;

  if (!name || !birthYear) {
    return res.status(400).json({ error: "name dan birthYear wajib diisi" });
  }

  console.log(
    `Pengguna '${req.user && req.user.username}' menambahkan director baru: ${name}`
  );

  const sql = "INSERT INTO directors (name, birthYear) VALUES (?, ?)";
  db.run(sql, [name, birthYear], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({
      id: this.lastID,
      name,
      birthYear,
    });
  });
});

// put/update director dengan id dilindungi (harus admin)
app.put(
  "/directors/:id",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    const { name, birthYear } = req.body;

    if (!name || !birthYear) {
      return res.status(400).json({ error: "name dan birthYear wajib diisi" });
    }

    const sql = "UPDATE directors SET name = ?, birthYear = ? WHERE id = ?";
    db.run(sql, [name, birthYear, req.params.id], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Director tidak ditemukan" });
      }
      console.log(
        `Pengguna '${req.user && req.user.username}' memperbarui director ID: ${req.params.id}`
      );
      res.json({
        id: Number(req.params.id),
        name,
        birthYear,
      });
    });
  }
);

// Delete director dengan id dilindungi (harus admin)
app.delete(
  "/directors/:id",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    const sql = "DELETE FROM directors WHERE id = ?";
    db.run(sql, [req.params.id], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Director tidak ditemukan" });
      }
      console.log(
        `Pengguna '${req.user && req.user.username}' menghapus director ID: ${req.params.id}`
      );
      res.status(204).send();
    });
  }
);

// BUAT ENDPOINT INI HANYA UNTUK PENGUJIAN, HAPUS DI PRODUKSI
app.post("/auth/register-admin", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password || password.length < 6) {
    return res
      .status(400)
      .json({ error: "Username dan password (min 6 char) harus diisi" });
  }

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error("Error hashing:", err);
      return res.status(500).json({ error: "Gagal memproses pendaftaran admin" });
    }

    const sql = "INSERT INTO users (username, password, role) VALUES (?,?,?)";
    const params = [username.toLowerCase(), hashedPassword, "admin"]; 

    db.run(sql, params, function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(409).json({ error: "admin sudah ada" });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ message: "Admin berhasil dibuat", userId: this.lastID });
    });
  });
});

// tambahkan server listener
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
