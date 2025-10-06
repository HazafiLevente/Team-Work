CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS trombita_tokok (
                                              id INT AUTO_INCREMENT PRIMARY KEY,
                                              name VARCHAR(255) NOT NULL
    );

INSERT INTO trombita_tokok (name) VALUES
                                      ('SKB Cases 1SKB-SC330 R Trombita tok (Csak kicsomagolt)'),
                                      ('SKB Cases 1SKB-330 R Trombita tok'),
                                      ('GEWA 255120 SPS Trombita tok');
