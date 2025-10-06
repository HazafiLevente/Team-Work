CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS trombita_fuvokak (
                                                id INT AUTO_INCREMENT PRIMARY KEY,
                                                name VARCHAR(255) NOT NULL
    );

INSERT INTO trombita_fuvokak (name) VALUES
                                        ('GEWA 3C Trombita fúvóka'),
                                        ('GEWA 1C Trombita fúvóka'),
                                        ('Denis Wick DW5882-4E-GD Trombita fúvóka');
