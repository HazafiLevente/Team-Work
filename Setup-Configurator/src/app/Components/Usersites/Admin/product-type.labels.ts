export const PRODUCT_TYPE_LABELS_HU: Record<string, string> = {
  // PC parts
  pc: 'PC',
  pc_part: 'PC alkatrész',
  cpu: 'CPU',
  cpu_desktop: 'CPU (asztali)',
  gpu: 'Videókártya (GPU)',
  motherboard: 'Alaplap',
  ram: 'Memória (RAM)',
  psu: 'Tápegység (PSU)',
  cpu_cooler: 'CPU hűtő',
  soundcard: 'Hangkártya',
  server_desktop: 'Szerver / Storage',

  // Network
  network_switch: 'Hálózati switch',

  // Home theater / audio
  receiver: 'AV erősítő (Receiver)',
  audio_processor: 'Audio processzor',
  portable_speaker: 'Hordozható hangszóró',
  soundbar: 'Soundbar',
  front_speaker: 'Front hangfal',
  back_speaker: 'Hátsó hangfal',
  side_speaker: 'Oldalsó hangfal',
  center_speaker: 'Center hangfal',
  floor_speaker: 'Álló hangfal',
  ceiling_speaker: 'Mennyezeti hangfal',
  subwoofer: 'Mélynyomó (Subwoofer)',
  bass_amplifier: 'Bass amplifier',
  bass_shaker: 'Bass shaker',
  studio_monitor: 'Stúdió monitor',

  // Instruments
  acoustic_drums: 'Akusztikus dob',
  acoustic_guitar: 'Akusztikus gitár',
  trumpet: 'Trombita',
  saxophone: 'Szaxofon',
};

export function huTypeLabel(type: string | null | undefined): string {
  const raw = String(type ?? '').trim();
  if (!raw) return 'Ismeretlen';
  const key = raw.toLowerCase();
  return PRODUCT_TYPE_LABELS_HU[key] ?? raw;
}

