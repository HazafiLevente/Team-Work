CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS effektek_effektpedal (
                                                    id INT AUTO_INCREMENT PRIMARY KEY,
                                                    name VARCHAR(255) NOT NULL
    );

INSERT INTO effektek_effektpedal (name) VALUES
                                            ('BOSS RC-1 Loop Station effektpedál'),
                                            ('BOSS RC-500 Loop Station effektpedál'),
                                            ('BOSS OC-5 Octave effektpedál'),
                                            ('BOSS BD-2 Blues Driver effektpedál'),
                                            ('BOSS DS-2 Turbo Distortion effektpedál'),
                                            ('TC Electronic Flashback 2 Delay effektpedál'),
                                            ('BOSS MT-2 Metal Zone effektpedál'),
                                            ('BOSS CS-3 Compressor effektpedál'),
                                            ('BOSS SD-1W Waza Craft Super Overdrive effektpedál');
