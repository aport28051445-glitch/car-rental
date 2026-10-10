const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

const carsRouter = require("./routes/cars");
const bookingsRouter = require("./routes/bookings");

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "CarRent API работает!"
    });
});

app.use("/api/cars", carsRouter);
app.use("/api/bookings", bookingsRouter);
console.log("Bookings router подключён:", typeof bookingsRouter);

app.listen(PORT, () => {
    console.log(`CarRent API запущен: http://localhost:${PORT}`);
});