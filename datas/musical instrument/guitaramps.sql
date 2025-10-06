CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS gitarerositok (
                                             id INT AUTO_INCREMENT PRIMARY KEY,
                                             name VARCHAR(255) NOT NULL
    );

INSERT INTO gitarerositok (name) VALUES
                                     ('Line 6 Spider IV 75'),
                                     ('Fender Mustang LT50'),
                                     ('Roland JC-40 Jazz Chorus'),
                                     ('Blackstar Debut 15E Cream'),
                                     ('Fender Tone Master Deluxe Reverb'),
                                     ('Line 6 Catalyst 200'),
                                     ('BOSS Katana-50 Gen 3'),
                                     ('Blackstar Series One 412A'),
                                     ('BOSS Katana-50 EX Gen 3');
