CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS trombitak_bb (
                                            id INT AUTO_INCREMENT PRIMARY KEY,
                                            name VARCHAR(255) NOT NULL
    );

INSERT INTO trombitak_bb (name) VALUES
                                    ('Latone LTR 4335 Bb trombita'),
                                    ('Yamaha YTR 2330 Bb trombita'),
                                    ('Roy Benson TR-202 Bb trombita');
