const UNIFIED_PRODUCT_TABLES = ["porducts", "products", "product"];

const PRODUCT_TYPE_TO_TABLE = {
    cpu_desktop: "processors",
    gpu: "video_cards",
    motherboard: "motherboard",
    ram: "ram",
    psu: "psu",
    cpu_cooler: "cpu_coolers",
    soundcard: "soundcards",
    receiver: "home_theater",
    audio_processor: "audio_processors",
    portable_speaker: "portable_speakers",
    front_speaker: "front_speaker",
    back_speaker: "back_speaker",
    side_speaker: "side_speaker",
    center_speaker: "center_speakers",
    floor_speaker: "floor_speakers",
    ceiling_speaker: "ceiling_speakers",
    subwoofer: "subwoofer",
    bass_amplifier: "bass_amplifier",
    bass_shaker: "bass_shaker",
    studio_monitor: "studio_monitor_speakers",
    acoustic_drums: "acoustic_drums",
    acoustic_guitar: "acoustic_guitars",
    trumpet: "c_trumpets",
    saxophone: "alt_saxophone",
    network_switch: "switches",
    server_desktop: "storages",
    soundbar: "home_theater",
};

const CATEGORY_ALIASES = {
    all: [],
    car: ["car", "cars", "cabrio_cars", "coupe_cars", "crossover_cars", "hatchback_cars", "mpv_cars", "pickup_cars", "wagon_cars"],
    computer: ["computer", "computers", "pc", "pcs", "processors", "video_cards", "ram", "storage", "psu", "motherboard", "cpu", "cpu_coolers", "soundcards", "storages"],
    ht: [
        "ht",
        "home theater",
        "home_theater",
        "home-theater",
        "receiver",
        "receivers",
        "speaker",
        "speakers",
        "subwoofer",
        "audio_processor",
        "audio_processors",
        "portable_speakers",
        "front_speaker",
        "back_speaker",
        "side_speaker",
        "center_speakers",
        "floor_speakers",
        "ceiling_speakers",
        "bass_amplifier",
        "bass_shaker",
        "studio_monitor_speakers"
    ],
    instrument: [
        "inst",
        "instrument",
        "instruments",
        "accessory",
        "accessories",
        "drum",
        "drums",
        "guitar",
        "guitars",
        "trumpet",
        "trumpets",
        "saxophone",
        "saxophones",
        "acoustic_drums",
        "acoustic_guitar",
        "acoustic_guitars",
        "c_trumpets",
        "alt_saxophone"
    ],
};
const TABLE_NAME_TO_PRODUCT_TYPES = Object.entries(PRODUCT_TYPE_TO_TABLE).reduce((acc, [productType, tableName]) => {
    if (!acc[tableName]) acc[tableName] = [];
    acc[tableName].push(productType);
    return acc;
}, {});

TABLE_NAME_TO_PRODUCT_TYPES.products = [];

module.exports = {
    UNIFIED_PRODUCT_TABLES,
    PRODUCT_TYPE_TO_TABLE,
    CATEGORY_ALIASES,
    TABLE_NAME_TO_PRODUCT_TYPES,
};
