CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS alt_szaxofon (
                                            id INT AUTO_INCREMENT PRIMARY KEY,
                                            name VARCHAR(255) NOT NULL
    );

INSERT INTO alt_szaxofon (name) VALUES
                                    ('Yamaha YAS 280 Alt szaxofon'),
                                    ('Yamaha YAS-280 SET Alt szaxofon'),
                                    ('Yamaha YAS-480 SET Alt szaxofon');
