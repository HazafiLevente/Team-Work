CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS guitar (
                                      GuitarID INT AUTO_INCREMENT PRIMARY KEY,
                                      Name VARCHAR(255) NOT NULL,
                                      Modell VARCHAR(255) NOT NULL,
                                      Type VARCHAR(255) NOT NULL,
                                      Color VARCHAR(255) DEFAULT NULL
);
