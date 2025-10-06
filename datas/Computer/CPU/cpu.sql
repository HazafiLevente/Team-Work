CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS processors (
                                          id INT AUTO_INCREMENT PRIMARY KEY,
                                          brand VARCHAR(50) NOT NULL,
                                          name VARCHAR(100) NOT NULL,
                                          cores INT NOT NULL,
                                          base_clock_ghz DECIMAL(3,1) NOT NULL,
                                          socket VARCHAR(20) NOT NULL,
                                          tdp_w INT NOT NULL,
                                          price_huf INT NOT NULL
);