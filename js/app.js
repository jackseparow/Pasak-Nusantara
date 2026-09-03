<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Geoblock - Pasak Nusantara 3D</title>
  
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      background-color: #121218;
      color: #fff;
    }
    
    header {
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      z-index: 10;
    }
    .logo-container { display: flex; align-items: center; gap: 12px; }
    .header-logo { height: 38px; width: auto; }
    .title-group h1 { font-size: 1.1rem; font-weight: 700; }
    .title-group p { font-size: 0.75rem; opacity: 0.85; }

    .main-container { display: flex; flex: 1; height: calc(100vh - 58px); }
    
    #stock-panel {
      width: 280px;
      background-color: #1e1e28;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      border-right: 1px solid #2e2e3e;
      overflow-y: auto;
      user-select: none;
    }

    .stock-section {
      background-color: #252535;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #333346;
    }

    .stock-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: #4a82e8;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stock-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .stock-item {
      background-color: #1a1a24;
      border: 2px solid #3b3b52;
      border-radius: 8px;
      padding: 12px 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .stock-item:hover {
      border-color: #4a82e8;
      background-color: #2a2a3c;
      transform: translateY(-2px);
    }

    .stock-item.active {
      border-color: #4a82e8;
      background-color: #2a5298;
    }

    .stock-icon { font-size: 2rem; }
    .stock-label { font-size: 0.75rem; font-weight: 600; color: #ddd; text-align: center; }

    .param-group {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .param-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.8rem;
    }

    .param-row input {
      width: 60px;
      padding: 4px;
      border-radius: 4px;
      border: 1px solid #4a4a60;
      background: #121218;
      color: #fff;
      text-align: center;
    }

    #viewport {
      flex: 1;
      position: relative;
      background-color: #0d0d12;
      cursor: crosshair;
    }

    .phase-bar {
      position: absolute;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 8px;
      background: rgba(25, 25, 35, 0.85);
      padding: 6px;
      border-radius: 8px;
      backdrop-filter: blur(4px);
      border: 1px solid #3b3b52;
      z-index: 5;
    }

    .btn-phase {
      padding: 6px 14px;
      border: none;
      background: transparent;
      color: #aaa;
      font-weight: 600;
      font-size: 0.8rem;
      border-radius: 4px;
      cursor: pointer;
    }

    .btn-phase.active { background: #2a5298; color: #fff; }
    .btn-phase.shake.active { background: #d9534f; }

    .hint-box {
      font-size: 0.72rem;
      color: #aaa;
      margin-top: 10px;
      line-height: 1.35;
      background: rgba(0, 0, 0, 0.25);
      padding: 10px;
      border-radius: 6px;
      border-left: 3px solid #4a82e8;
    }

    /* Penjelasan Sumbu Koordinat */
    .axis-legend {
      font-size: 0.7rem;
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .axis-item { display: flex; align-items: center; gap: 6px; }
    .axis-color { width: 10px; height: 10px; border-radius: 2px; }
  </style>
</head>
<body>

  <header>
    <div class="logo-container">
      <img src="assets/logo-bbgtk.png" alt="BBGTK" class="header-logo" onerror="this.style.display='none'">
      <img src="assets/logo-taman-numerasi.png" alt="Taman Numerasi" class="header-logo" onerror="this.style.display='none'">
      <div class="title-group">
        <h1>GEOBLOCK 3D: PASAK NUSANTARA</h1>
        <p>Eksplorasi Geometri & Sambungan Kayu Tradisional</p>
      </div>
    </div>
  </header>

  <div class="main-container">
    <div id="stock-panel">
      
      <div class="stock-section">
        <div class="stock-title">📦 Stock Bahan</div>
        <div class="stock-grid">
          <div class="stock-item active" id="item-balok" onclick="pilihBahan('balok')">
            <div class="stock-icon">🪵</div>
            <div class="stock-label">Balok Kayu</div>
          </div>
          <div class="stock-item" id="item-silinder" onclick="pilihBahan('silinder')">
            <div class="stock-icon">🪵</div>
            <div class="stock-label">Silinder (Pasak)</div>
          </div>
        </div>

        <div id="formBalok" class="param-group">
          <div class="param-row"><label>Panjang (X):</label><input type="number" id="balokP" value="10" min="2" max="30" oninput="updateBentuk()"></div>
          <div class="param-row"><label>Lebar (Z):</label><input type="number" id="balokL" value="10" min="2" max="30" oninput="updateBentuk()"></div>
          <div class="param-row"><label>Tinggi (Y):</label><input type="number" id="balokT" value="30" min="2" max="50" oninput="updateBentuk()"></div>
        </div>

        <div id="formSilinder" class="param-group" style="display:none;">
          <div class="param-row"><label>Panjang/Tinggi (Y):</label><input type="number" id="silinderP" value="25" min="2" max="50" oninput="updateBentuk()"></div>
          <div class="param-row"><label>Diameter (D):</label><input type="number" id="silinderD" value="8" min="1" max="20" oninput="updateBentuk()"></div>
        </div>
      </div>

      <div class="stock-section">
        <div class="stock-title">🛠️ Stock Alat</div>
        <div class="stock-grid">
          <div class="stock-item active" id="item-gergaji" onclick="pilihAlat('gergaji')">
            <div class="stock-icon">🪚</div>
            <div class="stock-label">Gergaji</div>
          </div>
          <div class="stock-item" id="item-pahat" onclick="pilihAlat('pahat')">
            <div class="stock-icon">🪛</div>
            <div class="stock-label">Pahat</div>
          </div>
          <div class="stock-item" id="item-bor" onclick="pilihAlat('bor')">
            <div class="stock-icon">🔘</div>
            <div class="stock-label">Bor</div>
          </div>
        </div>
      </div>

      <div class="hint-box">
        📍 <strong>Sumbu Koordinat 3D:</strong>
        <div class="axis-legend">
          <div class="axis-item"><div class="axis-color" style="background:#00ff00;"></div> <span><strong>Sumbu Y (Hijau):</strong> Vertikal / Tinggi</span></div>
          <div class="axis-item"><div class="axis-color" style="background:#ff0000;"></div> <span><strong>Sumbu X (Merah):</strong> Horizontal / Panjang</span></div>
          <div class="axis-item"><div class="axis-color" style="background:#0000ff;"></div> <span><strong>Sumbu Z (Biru):</strong> Kedalaman / Lebar</span></div>
        </div>
      </div>

    </div>
