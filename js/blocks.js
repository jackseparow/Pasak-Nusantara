/**
 * Definisi Blok Kustom Geoblock: Pasak Nusantara
 */

// 1. Blok Balok Kayu Dasar
Blockly.Blocks['balok_kayu'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Balok Kayu");
    this.appendValueInput("PANJANG")
        .setCheck("Number")
        .appendField("Panjang (X)");
    this.appendValueInput("LEBAR")
        .setCheck("Number")
        .appendField("Lebar (Y)");
    this.appendValueInput("TINGGI")
        .setCheck("Number")
        .appendField("Tinggi (Z)");
    this.setOutput(true, "3D_Shape");
    this.setColour(35);
    this.setTooltip("Membuat balok kayu dasar dengan ukuran tertentu");
    this.setHelpUrl("");
  }
};

// 2. Blok Sambung Pasak / Purus (Union)
Blockly.Blocks['gabung_purus'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Sambung Pasak (Union)");
    this.appendValueInput("OBJEK_A")
        .setCheck("3D_Shape")
        .appendField("Kayu Utama");
    this.appendValueInput("OBJEK_B")
        .setCheck("3D_Shape")
        .appendField("Ditambah Pasak");
    this.setOutput(true, "3D_Shape");
    this.setColour(160);
    this.setTooltip("Menggabungkan dua elemen kayu menjadi satu kesatuan");
    this.setHelpUrl("");
  }
};

// 3. Blok Pahat Lubang (Difference)
Blockly.Blocks['potong_lubang'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Pahat Lubang (Difference)");
    this.appendValueInput("OBJEK_A")
        .setCheck("3D_Shape")
        .appendField("Kayu Utama");
    this.appendValueInput("OBJEK_B")
        .setCheck("3D_Shape")
        .appendField("Dipotong Oleh");
    this.setOutput(true, "3D_Shape");
    this.setColour(0);
    this.setTooltip("Memotong kayu utama menggunakan bentuk pemotong");
    this.setHelpUrl("");
  }
};
