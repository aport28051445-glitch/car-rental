const pool = require("../db");

async function getCars(req, res) {
    try {
        const result = await pool.query(
            "SELECT id, brand, model, year, price_per_day, status FROM cars ORDER BY id"
        );

        const cars = result.rows.map((car) => ({
            id: car.id,
            brand: car.brand,
            model: car.model,
            year: car.year,
            pricePerDay: Number(car.price_per_day),
            status: car.status
        }));

        res.json(cars);
    } catch (error) {
        console.error("Ошибка получения автомобилей:", error.message);

        res.status(500).json({
            message: "Не удалось получить список автомобилей"
        });
    }
}

module.exports = { getCars };