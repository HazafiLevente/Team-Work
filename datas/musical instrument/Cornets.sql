CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS kornettek (
                                         id INT AUTO_INCREMENT PRIMARY KEY,
                                         name VARCHAR(255) NOT NULL
    );

INSERT INTO kornettek (name) VALUES
                                 ('Bach CR651S Bb Kornett'),
                                 ('Yamaha YCR 2330 III Kornett'),
                                 ('Jupiter JCR700Q Kornett');
