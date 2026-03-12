import pg from "pg";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config({ path: ".env.local" });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});

const cuid = () => crypto.randomBytes(12).toString("base64url");

const dummies = [
  { name: "Sarah Chen", email: "sarah.chen@demo.ipop.com" },
  { name: "Marcus Johnson", email: "marcus.j@demo.ipop.com" },
  { name: "Priya Patel", email: "priya.p@demo.ipop.com" },
];

// Upsert dummy users
for (const d of dummies) {
  await pool.query(
    `INSERT INTO "User" (id, email, name, role, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, 'USER', NOW(), NOW())
     ON CONFLICT (email) DO UPDATE SET name = $3`,
    [cuid(), d.email, d.name]
  );
}

// Fetch their IDs
const { rows: users } = await pool.query(
  `SELECT id, name FROM "User" WHERE email = ANY($1)`,
  [dummies.map((d) => d.email)]
);
console.log("Users:", users.map((u: any) => u.name).join(", "));

// Current week Sun-Sat
const now = new Date();
const sunday = new Date(now);
sunday.setDate(now.getDate() - now.getDay());

const patterns = [
  { user: 0, days: [1, 2, 3, 4, 5], start: "06:00", end: "12:00", loc: "Burnaby" },
  { user: 1, days: [1, 2, 4, 5], start: "12:00", end: "18:00", loc: "Burnaby" },
  { user: 1, days: [3], start: "18:00", end: "00:00", loc: "Surrey" },
  { user: 2, days: [1, 3, 5], start: "18:00", end: "00:00", loc: "Burnaby" },
  { user: 2, days: [2, 4], start: "12:00", end: "18:00", loc: "Surrey" },
  { user: 0, days: [6], start: "06:00", end: "18:00", loc: "Burnaby", note: "Weekend coverage" },
  { user: 2, days: [0], start: "12:00", end: "00:00", loc: "Burnaby", note: "Sunday shift" },
];

// Clear old demo shifts
await pool.query(
  `DELETE FROM "Shift" WHERE "userId" = ANY($1)`,
  [users.map((u: any) => u.id)]
);

let count = 0;
for (const p of patterns) {
  for (const dayOffset of p.days) {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + dayOffset);
    const dateStr = date.toISOString().split("T")[0];
    await pool.query(
      `INSERT INTO "Shift" (id, "userId", date, "startTime", "endTime", location, note, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [cuid(), users[p.user].id, dateStr, p.start, p.end, p.loc, (p as any).note || null]
    );
    count++;
  }
}

console.log(`Created ${count} shifts for this week`);
await pool.end();
