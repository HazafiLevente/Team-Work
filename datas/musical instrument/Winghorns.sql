CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS szarnykurtok (
                                            id INT AUTO_INCREMENT PRIMARY KEY,
                                            name VARCHAR(255) NOT NULL
    );

INSERT INTO szarnykurtok (name) VALUES
                                    ('Yamaha YFH 631 G Szárnykürt'),
                                    ('Yamaha YFH 8310 ZS Szárnykürt'),
                                    ('Yamaha YFH 8310 Z Szárnykürt');
