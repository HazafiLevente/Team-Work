CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS kornett_fuvokak (
                                               id INT AUTO_INCREMENT PRIMARY KEY,
                                               name VARCHAR(255) NOT NULL
    );

INSERT INTO kornett_fuvokak (name) VALUES
                                       ('Vincent Bach 349 3D Kornett fúvóka'),
                                       ('GEWA 710026 10 1/2 C Kornett fúvóka'),
                                       ('Yamaha MPCR11C4S Kornett fúvóka');
