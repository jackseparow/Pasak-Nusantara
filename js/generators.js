/**
 * Generator Kode JavaScript / OpenSCAD untuk Geoblock: Pasak Nusantara
 */

Blockly.JavaScript['balok_kayu'] = function(block) {
  var p = Blockly.JavaScript.valueToCode(block, 'PANJANG', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  var l = Blockly.JavaScript.valueToCode(block, 'LEBAR', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  var t = Blockly.JavaScript.valueToCode(block, 'TINGGI', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  
  var code = `cube([${p}, ${l}, ${t}]);\n`;
  return [code, Blockly.JavaScript.ORDER_NONE];
};

Blockly.JavaScript['gabung_purus'] = function(block) {
  var objA = Blockly.JavaScript.valueToCode(block, 'OBJEK_A', Blockly.JavaScript.ORDER_ATOMIC) || '';
  var objB = Blockly.JavaScript.valueToCode(block, 'OBJEK_B', Blockly.JavaScript.ORDER_ATOMIC) || '';
  
  var code = `union() {\n  ${objA.trim().replace(/\n/g, '\n  ')}\n  ${objB.trim().replace(/\n/g, '\n  ')}\n}\n`;
  return [code, Blockly.JavaScript.ORDER_NONE];
};

Blockly.JavaScript['potong_lubang'] = function(block) {
  var objA = Blockly.JavaScript.valueToCode(block, 'OBJEK_A', Blockly.JavaScript.ORDER_ATOMIC) || '';
  var objB = Blockly.JavaScript.valueToCode(block, 'OBJEK_B', Blockly.JavaScript.ORDER_ATOMIC) || '';
  
  var code = `difference() {\n  ${objA.trim().replace(/\n/g, '\n  ')}\n  ${objB.trim().replace(/\n/g, '\n  ')}\n}\n`;
  return [code, Blockly.JavaScript.ORDER_NONE];
};
