CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS mikrofonok (
                                          id INT AUTO_INCREMENT PRIMARY KEY,
                                          name VARCHAR(255) NOT NULL
    );

INSERT INTO mikrofonok (name) VALUES
                                  ('RODE M5-MP kismembrános kondenzátormikrofon illesztett pár'),
                                  ('Sennheiser e 935 dinamikus énekmikrofon'),
                                  ('Universal Audio SD-1 nagymembrános dinamikus mikrofon'),
                                  ('RODE PodMic dinamikus podcast mikrofon'),
                                  ('RODE X XDM-100 USB dinamikus mikrofon'),
                                  ('Shure KSM8/N Dualdyne dupla-membrános kézi dinamikus énekmikrofon'),
                                  ('RODE PodMic USB dinamikus USB/XLR broadcast/podcast mikrofon'),
                                  ('Neumann KMS 104 Plus BK kondenzátor énekmikrofon'),
                                  ('RODE NT-USB+ professzionális USB kondenzátor mikrofon'),
                                  ('RODE NT1 5th Generation nagymembrános XLR/USB kondenzátormikrofon csomag - fekete');
