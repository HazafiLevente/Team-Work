CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS piccolo (
                                       id INT AUTO_INCREMENT PRIMARY KEY,
                                       name VARCHAR(255) NOT NULL
    );

INSERT INTO piccolo (name) VALUES
                               ('V. F. Červený VFC-TR6018TS Piccolo trombita'),
                               ('Yamaha YTR 6810 S Piccolo trombita'),
                               ('Yamaha YTR 9710 Piccolo trombita');
