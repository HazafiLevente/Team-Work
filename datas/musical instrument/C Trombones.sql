CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS c_trombitak (
                                           id INT AUTO_INCREMENT PRIMARY KEY,
                                           name VARCHAR(255) NOT NULL
    );

INSERT INTO c_trombitak (name) VALUES
                                   ('Roy Benson TR-402C C trombita'),
                                   ('Yamaha YTR 4435 SII C trombita'),
                                   ('Yamaha YTR 4435 II C trombita');
