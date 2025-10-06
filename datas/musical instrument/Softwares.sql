CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS szoftverek (
                                          id INT AUTO_INCREMENT PRIMARY KEY,
                                          name VARCHAR(255) NOT NULL
    );

INSERT INTO szoftverek (name) VALUES
                                  ('Spectrasonics Omnisphere 2.6 szoftver szintetizátor plugin'),
                                  ('Spectrasonics Keyscape virtuális billentyűs hangszer szoftver plugin'),
                                  ('Steinberg Cubase Artist 13 DAW szoftver - oktatási változat'),
                                  ('Arturia Pigments 6 szoftver szintetizátor plugin - letölthető változat'),
                                  ('ABLETON Live 12 Standard (Digitális termék)'),
                                  ('ABLETON Live 12 Suite (Digitális termék)'),
                                  ('ABLETON Live 12 Intro (Digitális termék)'),
                                  ('ABLETON Live 12 Suite EDU (Digitális termék)'),
                                  ('Image Line FL Studio Producer Edition (Digitális termék)'),
                                  ('Image Line FL Studio All Plugins Edition (Digitális termék)'),
                                  ('Image Line FL Studio Fruity Edition (Digitális termék)'),
                                  ('Image Line FL Studio Signature Bundle (Digitális termék)'),
                                  ('Steinberg Cubase Elements 14 Upgrade AI (Digitális termék)'),
                                  ('Steinberg Cubase Elements 14 EDU (Digitális termék)'),
                                  ('Steinberg Cubase Elements 14 (Digitális termék)'),
                                  ('Steinberg Cubase Elements 14 Upgrade LE (Digitális termék)'),
                                  ('AVID Pro Tools Ultimate Perpetual License (Digitális termék)'),
                                  ('Presonus Studio One Pro 7 Academic (Digitális termék)'),
                                  ('Native Instruments Traktor Pro 4 (Digitális termék)');
