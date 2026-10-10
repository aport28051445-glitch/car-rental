const pool = require("../db");

async function createBooking(req, res) {
    const { user_id, car_id, start_date, end_date } = req.body;

    // Проверяем обязательные поля
    if (
        !Number.isInteger(Number(user_id)) ||
        Number(user_id) <= 0 ||
        !Number.isInteger(Number(car_id)) ||
        Number(car_id) <= 0 ||
        !isValidDate(start_date) ||
        !isValidDate(end_date)
    ) {
        return res.status(400).json({
            message: "Укажите корректные user_id, car_id и даты аренды"
        });
    }

    // Проверяем порядок дат
    if (end_date <= start_date) {
        return res.status(400).json({
            message: "Дата окончания должна быть позже даты начала"
        });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Блокируем строку автомобиля на время проверки бронирования
        const carResult = await client.query(
            `SELECT id, price_per_day, status
             FROM cars
             WHERE id = $1
             FOR UPDATE`,
            [Number(car_id)]
        );

        if (carResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                message: "Автомобиль не найден"
            });
        }

        const car = carResult.rows[0];

        if (car.status !== "available") {
            await client.query("ROLLBACK");
            return res.status(409).json({
                message: "Автомобиль недоступен для аренды"
            });
        }

        // Проверяем пересечение дат с другими бронированиями
        const overlap = await client.query(
            `SELECT id
             FROM bookings
             WHERE car_id = $1
               AND start_date < $3::date
               AND end_date > $2::date
               AND COALESCE(status, 'pending')
                   NOT IN ('cancelled', 'rejected')
             LIMIT 1`,
            [Number(car_id), start_date, end_date]
        );

        if (overlap.rows.length > 0) {
            await client.query("ROLLBACK");
            return res.status(409).json({
                message: "Автомобиль уже забронирован на эти даты"
            });
        }

        // Считаем дни и полную стоимость в PostgreSQL
        const priceResult = await client.query(
            `SELECT ($2::date - $1::date)::integer AS days`,
            [start_date, end_date]
        );

        const days = priceResult.rows[0].days;
        const totalPrice = days * Number(car.price_per_day);

        // Создаём бронирование
        const bookingResult = await client.query(
            `INSERT INTO bookings
                (user_id, car_id, start_date, end_date, total_price, status)
             VALUES ($1, $2, $3, $4, $5, 'pending')
             RETURNING id, user_id, car_id, start_date,
                       end_date, total_price, status, created_at`,
            [
                Number(user_id),
                Number(car_id),
                start_date,
                end_date,
                totalPrice
            ]
        );

        await client.query("COMMIT");

        return res.status(201).json({
            message: "Бронирование успешно создано",
            booking: bookingResult.rows[0],
            days,
            totalPrice
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Ошибка создания бронирования:", error.message);

        if (error.code === "23503") {
            return res.status(400).json({
                message: "Пользователь или автомобиль не найден"
            });
        }

        return res.status(500).json({
            message: "Не удалось создать бронирование"
        });
    } finally {
        client.release();
    }
}

function isValidDate(value) {
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return false;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    );
}

module.exports = { createBooking };