/**
 * Inisialisasi Aplikasi dan Handler Real-Time Update
 */

// Inisialisasi Workspace Blockly
var workspace = Blockly.inject('blocklyDiv', {
  toolbox: document.getElementById('toolbox'),
  scrollbars: true,
  trashcan: true,
  zoom: {
    controls: true,
    wheel: true,
    startScale: 1.0,
    maxScale: 3,
    minScale: 0.3,
    scaleSpeed: 1.2
  }
});

// Update Output Kode secara Real-time
function updateCode() {
  var code = Blockly.JavaScript.workspaceToCode(workspace);
  var outputElement = document.getElementById('codeOutput');
  
  if (code.trim() === '') {
    outputElement.textContent = '// Susun blok di sebelah kiri untuk merancang Pasak Nusantara...';
  } else {
    outputElement.textContent = code;
  }
}

// Event Listener untuk setiap perubahan di workspace
workspace.addChangeListener(updateCode);
