CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS bariton_szaxofon (
                                                id INT AUTO_INCREMENT PRIMARY KEY,
                                                name VARCHAR(255) NOT NULL
    );

INSERT INTO bariton_szaxofon (name) VALUES
                                        ('Yamaha YBS-480 Bariton szaxofon'),
                                        ('Roy Benson BS-302 Bariton szaxofon'),
                                        ('Yamaha YBS-82 Bariton szaxofon');
