CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS hangkartyak (
                                           id INT AUTO_INCREMENT PRIMARY KEY,
                                           name VARCHAR(255) NOT NULL
    );

INSERT INTO hangkartyak (name) VALUES
                                   ('Focusrite Scarlett Solo 4th Gen USB Audio interfész'),
                                   ('Behringer UM2 U-Phoria USB Audio interfész'),
                                   ('Focusrite Scarlett 2i2 4th Gen USB Audio interfész'),
                                   ('Focusrite Scarlett 4i4 4th Gen USB Audio interfész'),
                                   ('M-Audio AIR 192|4 USB Audio interfész'),
                                   ('M-Audio AIR 192|14 USB Audio interfész'),
                                   ('Presonus Quantum HD2 USB Audio interfész'),
                                   ('Presonus Quantum ES4 USB Audio interfész');
