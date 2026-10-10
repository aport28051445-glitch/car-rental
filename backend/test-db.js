const pool = require("./db");

async function testConnection() {
    try {
        const result = await pool.query(
            "SELECT current_database() AS database, NOW() AS time"
        );

        console.log("Подключение успешно:", result.rows[0]);
    } catch (error) {
        console.error("Ошибка подключения:", error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

testConnection();