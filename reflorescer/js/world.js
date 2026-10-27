const WORLD_CONFIG = {
  cols: 72,
  rows: 40,
  tileSize: 24,
  continentId: "americas"
};

const CONTINENT_DEFINITIONS = [
  { id: "americas", name: "Américas", description: "América do Norte, Central e do Sul", accent: "americas", order: 0 },
  { id: "continent2", name: "Europa e África", description: "Europa, África e regiões vizinhas", accent: "continent2", order: 1 },
  { id: "continent3", name: "Ásia e Oceania", description: "Ásia, Sudeste Asiático e Oceania", accent: "continent3", order: 2 }
];

const LAND_POLYGONS = {
  americas: [
    [[0.39,0.00],[0.53,0.00],[0.61,0.08],[0.62,0.17],[0.57,0.24],[0.54,0.33],[0.50,0.41],[0.46,0.47],[0.41,0.43],[0.39,0.34],[0.35,0.30],[0.33,0.21],[0.35,0.11]],
    [[0.45,0.43],[0.52,0.43],[0.56,0.49],[0.55,0.56],[0.51,0.60],[0.48,0.55],[0.43,0.49]],
    [[0.51,0.55],[0.60,0.54],[0.65,0.59],[0.67,0.68],[0.65,0.78],[0.60,0.88],[0.60,1.00],[0.49,0.95],[0.50,0.84],[0.53,0.76],[0.51,0.67]]
  ],
  continent2: [
    [[0.40,0.16],[0.48,0.12],[0.57,0.14],[0.63,0.20],[0.62,0.29],[0.57,0.34],[0.51,0.31],[0.47,0.35],[0.41,0.31],[0.36,0.25]],
    [[0.43,0.34],[0.58,0.35],[0.61,0.46],[0.58,0.58],[0.54,0.69],[0.49,0.84],[0.43,0.82],[0.40,0.70],[0.38,0.55],[0.40,0.43]]
  ],
  continent3: [
    [[0.58,0.12],[0.70,0.08],[0.82,0.13],[0.88,0.22],[0.84,0.31],[0.75,0.34],[0.68,0.29],[0.60,0.31],[0.54,0.24]],
    [[0.62,0.38],[0.73,0.36],[0.81,0.43],[0.78,0.54],[0.69,0.58],[0.61,0.51]],
    [[0.75,0.64],[0.83,0.62],[0.88,0.69],[0.84,0.75],[0.76,0.73]]
  ]
};

function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / ((yj - yi) || Number.EPSILON) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

class Tile {
  constructor(x, y, type = "wasteland") {
    this.x = x;
    this.y = y;
    this.tipoSolo = type;
    this.fertility = 4 + Math.random() * 5;
    this.humidity = 7 + Math.random() * 7;
    this.vegetation = 0;
    this.tree = null;
    this.grass = false;
    this.animal = null;
    this.fish = null;
    this.water = 0;
    this.inPlanet = true;
    this.temperature = 28 + Math.random() * 5;
    this.hover = false;
    this.recovery = 0;
  }

  get hasTree() { return Boolean(this.tree); }

  updateEnvironment(dt, vegetationMultiplier = 1) {
    if (this.tree) {
      const influence = this.tree.data;
      const maturity = Math.min(1, this.tree.age / 78);
      this.fertility = Math.min(100, this.fertility + influence.fertility * maturity * dt);
      this.humidity = Math.min(100, this.humidity + influence.humidity * maturity * dt);
      this.vegetation = Math.min(100, this.vegetation + 0.08 * maturity * dt * vegetationMultiplier);
    } else if (this.grass) {
      this.vegetation = Math.min(60, this.vegetation + 0.035 * dt * vegetationMultiplier);
      this.fertility = Math.min(100, this.fertility + 0.008 * dt);
    } else {
      this.fertility = Math.max(0, this.fertility - 0.003 * dt);
      this.humidity = Math.max(0, this.humidity - 0.002 * dt);
      this.vegetation = Math.max(0, this.vegetation - 0.01 * dt);
    }
  }

  serialize() {
    return {
      x: this.x, y: this.y,
      tipoSolo: this.tipoSolo,
      fertility: this.fertility,
      humidity: this.humidity,
      vegetation: this.vegetation,
      tree: this.tree ? this.tree.serialize() : null,
      grass: this.grass,
      animal: this.animal,
      fish: this.fish,
      water: this.water,
      inPlanet: this.inPlanet,
      temperature: this.temperature,
      recovery: this.recovery
    };
  }

  static deserialize(data) {
    const tile = new Tile(data.x, data.y, data.tipoSolo || "wasteland");
    tile.fertility = data.fertility ?? 4;
    tile.humidity = data.humidity ?? 7;
    tile.vegetation = data.vegetation ?? 0;
    tile.water = data.water ?? 0;
    tile.temperature = data.temperature ?? 30;
    tile.tree = data.tree ? Tree.deserialize(data.tree) : null;
    tile.grass = Boolean(data.grass);
    tile.animal = data.animal || null;
    tile.fish = data.fish || null;
    tile.inPlanet = data.inPlanet !== false;
    const savedRecovery = Number(data.recovery);
    const derivedRecovery = data.tree ? 0.18 : data.water > 0.5 ? 0.30 : data.grass ? 0.08 : data.vegetation >= 25 ? 0.05 : 0;
    tile.recovery = Math.max(0, Math.min(1, Number.isFinite(savedRecovery) ? savedRecovery : derivedRecovery));
    return tile;
  }
}

class World {
  constructor(cols = WORLD_CONFIG.cols, rows = WORLD_CONFIG.rows, continentId = WORLD_CONFIG.continentId) {
    this.cols = cols;
    this.rows = rows;
    this.continentId = continentId;
    this.tiles = [];
    this.selected = null;
    this.seeded = false;
    this.mapStates = {};
    this.customAreas = 0;
    this.generate();
  }

  get continent() {
    return CONTINENT_DEFINITIONS.find(item => item.id === this.continentId) || CONTINENT_DEFINITIONS[0];
  }

  getContinentDefinition(id = this.continentId) {
    return CONTINENT_DEFINITIONS.find(item => item.id === id) || null;
  }

  isContinentUnlocked(id, progress = {}) {
    if (id === "americas") return true;
    if (id === "continent2") return Number(progress.americas ?? 0) >= 80;
    if (id === "continent3") return Number(progress.continent2 ?? 0) >= 80;
    return false;
  }

  switchContinent(id, progress = {}) {
    if (id === "custom") {
      if (this.continentId === "custom") return true;
      this.mapStates[this.continentId] = this.serializeState();
      this.continentId = "custom";
      this.customAreas = Math.max(1, Math.min(3, Number(progress.customAreas) || 1));
      this.cols = WORLD_CONFIG.cols;
      this.rows = WORLD_CONFIG.rows;
      this.generate();
      this.seeded = false;
      this.selected = null;
      return true;
    }
    const target = this.getContinentDefinition(id);
    if (!target || !this.isContinentUnlocked(id, progress) || target.id === this.continentId) return target && target.id === this.continentId;
    this.mapStates[this.continentId] = this.serializeState();
    const stored = this.mapStates[id];
    this.continentId = id;
    this.cols = WORLD_CONFIG.cols;
    this.rows = WORLD_CONFIG.rows;
    if (stored) this.loadState(stored);
    else { this.generate(); this.seeded = false; }
    this.selected = null;
    return true;
  }

  createCustomWorld(areaCount) {
    this.mapStates[this.continentId] = this.serializeState();
    this.continentId = "custom";
    this.customAreas = Math.max(1, Math.min(3, Number(areaCount) || 1));
    this.cols = WORLD_CONFIG.cols;
    this.rows = WORLD_CONFIG.rows;
    this.generate();
    this.seeded = false;
    this.selected = null;
    return true;
  }

  isUnlocked() {
    return this.continentId === "custom" || Boolean(this.continent);
  }

  isInsidePlanet(x, y) {
    const nx = (x + 0.5) / this.cols;
    const ny = (y + 0.5) / this.rows;
    if (this.continentId === "custom") {
      const zones = [
        [[0.10,0.16],[0.35,0.16],[0.40,0.42],[0.34,0.56],[0.12,0.51]],
        [[0.42,0.22],[0.68,0.14],[0.72,0.46],[0.61,0.57],[0.43,0.48]],
        [[0.70,0.50],[0.91,0.43],[0.94,0.78],[0.80,0.91],[0.67,0.76]]
      ];
      return zones.slice(0, this.customAreas).some(polygon => pointInPolygon(nx, ny, polygon));
    }
    const polygons = LAND_POLYGONS[this.continentId] || LAND_POLYGONS.americas;
    // Mantém o mapa com a mesma forma, mas ocupa um pouco mais da área disponível.
    // O fator é aplicado apenas ao desenho lógico do continente, sem alterar o tamanho
    // dos tiles nem a área útil do canvas.
    const mapScale = 1.12;
    return polygons.some(polygon => {
      const expanded = polygon.map(([px, py]) => [
        Math.max(0, Math.min(1, 0.5 + (px - 0.5) * mapScale)),
        Math.max(0, Math.min(1, 0.5 + (py - 0.5) * mapScale))
      ]);
      return pointInPolygon(nx, ny, expanded);
    });
  }

  generate() {
    this.tiles.length = 0;
    for (let y = 0; y < this.rows; y++) {
      const row = [];
      for (let x = 0; x < this.cols; x++) {
        const tile = new Tile(x, y, Math.random() < .18 ? "dry_soil" : "wasteland");
        tile.inPlanet = this.isInsidePlanet(x, y);
        tile.humidity += tile.inPlanet ? 5 : 0;
        row.push(tile);
      }
      this.tiles.push(row);
    }
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return null;
    return this.tiles[y][x];
  }

  neighbors(x, y, radius = 1) {
    const result = [];
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        const tile = this.get(x + dx, y + dy);
        if (tile) result.push(tile);
      }
    }
    return result;
  }

  plant(x, y, species = "common") {
    const tile = this.get(x, y);
    if (!tile || !tile.inPlanet || tile.tree || tile.animal || tile.water > 0.8) return false;
    tile.tree = new Tree(species);
    tile.vegetation = Math.max(tile.vegetation, 4);
    tile.recovery = Math.max(tile.recovery, 0.18);
    this.seeded = true;
    return true;
  }

  removeTree(x, y) {
    const tile = this.get(x, y);
    if (!tile || !tile.tree) return false;
    tile.tree = null;
    tile.vegetation = Math.max(0, tile.vegetation - 2);
    return true;
  }

  canPlaceGrass(tile) {
    return Boolean(tile && tile.inPlanet && tile.water < 0.5 && !tile.grass);
  }

  placeGrass(x, y) {
    const tile = this.get(x, y);
    if (!this.canPlaceGrass(tile)) return false;
    tile.grass = true;
    tile.vegetation = Math.max(tile.vegetation, 20);
    tile.recovery = Math.max(tile.recovery, 0.08);
    return true;
  }

  canPlaceRiver(tile) {
    return Boolean(tile && tile.inPlanet && !tile.tree && !tile.animal && !tile.grass && tile.water < 0.8);
  }

  createRiver(x, y) {
    const tile = this.get(x, y);
    if (!this.canPlaceRiver(tile)) return false;
    tile.water = 1;
    tile.humidity = Math.min(100, tile.humidity + 20);
    tile.recovery = Math.max(tile.recovery, 0.30);
    return true;
  }

  removeRiver(x, y) {
    const tile = this.get(x, y);
    if (!tile || tile.water < 0.5) return false;
    tile.water = 0;
    tile.fish = null;
    return true;
  }

  hasWater() {
    for (const row of this.tiles) {
      for (const tile of row) if (tile.water > 0.5) return true;
    }
    return false;
  }

  update(dt, growthMultiplier = 1, vegetationMultiplier = 1) {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const tile = this.tiles[y][x];
        tile.updateEnvironment(dt, vegetationMultiplier);
        if (tile.tree) tile.tree.update(dt, growthMultiplier, tile.fertility);
      }
    }
  }

  getStats() {
    let trees = 0, mature = 0, fertility = 0, vegetation = 0;
    let greenTiles = 0, grassTiles = 0, waterTiles = 0, planetTiles = 0;
    let recoveryPoints = 0;
    for (const row of this.tiles) {
      for (const tile of row) {
        if (tile.inPlanet) {
          planetTiles++;
          fertility += tile.fertility;
          vegetation += tile.vegetation;
          if (tile.vegetation >= 25 || tile.tree || tile.grass) greenTiles++;
          if (tile.grass) grassTiles++;
          if (tile.water > 0.5) waterTiles++;
          if (tile.tree) {
            trees++;
            if (tile.tree.mature) mature++;
          }
          // A recuperação representa a parte do território que foi realmente
          // restaurada. Cada tipo de intervenção tem um peso diferente: grama
          // ajuda menos, árvores ajudam mais e rios têm o maior impacto.
          // Assim, 10% do mapa coberto por árvores resulta em aproximadamente
          // 10% de área recuperada, enquanto a mesma área apenas com grama
          // recupera menos. Animais e peixes influenciam a biodiversidade, mas
          // não contam como recuperação principal do terreno.
          if (tile.grass) recoveryPoints += 0.40;
          if (tile.tree) recoveryPoints += tile.tree.mature ? 1.20 : 1.00;
          if (tile.water > 0.5) recoveryPoints += 1.50;
        }
      }
    }
    const count = this.cols * this.rows;
    const landCount = Math.max(1, planetTiles);
    const avgFertility = fertility / landCount;
    const avgVegetation = vegetation / landCount;
    const biodiversity = Math.min(100, trees * 0.95 + mature * 0.75 + avgFertility * 0.16 + avgVegetation * 0.18);
    return {
      trees, mature, avgFertility, avgVegetation, biodiversity,
      // Cobertura vegetal representa a parte do terreno jogável que já possui vegetação,
      // sem contar o oceano como área não recuperada.
      greenPercent: (greenTiles / landCount) * 100,
      grassTiles, waterTiles,
      recoveryPoints,
      // 1 ponto representa 1% de recuperação por tile do mapa. O valor é
      // calculado sobre todos os tiles de terra do continente, sem contar o oceano.
      recoveredPercent: planetTiles ? Math.min(100, (recoveryPoints / planetTiles) * 100) : 0
    };
  }

  serializeState() {
    return {
      cols: this.cols, rows: this.rows, seeded: this.seeded, continentId: this.continentId,
      customAreas: this.customAreas,
      tiles: this.tiles.flat().map(tile => tile.serialize())
    };
  }

  serialize() {
    return { ...this.serializeState(), maps: this.mapStates };
  }

  loadState(data = {}) {
    const oldCols = Number(data.cols) || WORLD_CONFIG.cols;
    const oldRows = Number(data.rows) || WORLD_CONFIG.rows;
    this.cols = WORLD_CONFIG.cols;
    this.rows = WORLD_CONFIG.rows;
    this.customAreas = Number(data.customAreas) || 0;
    this.tiles = Array.from({ length: this.rows }, () => Array(this.cols));
    if (oldCols !== this.cols || oldRows !== this.rows) this.migrateTiles(data);
    else {
      for (const item of data.tiles || []) {
        if (item.y >= 0 && item.y < this.rows && item.x >= 0 && item.x < this.cols) {
          this.tiles[item.y][item.x] = Tile.deserialize(item);
          this.tiles[item.y][item.x].inPlanet = this.isInsidePlanet(item.x, item.y);
        }
      }
      for (let y=0;y<this.rows;y++) for (let x=0;x<this.cols;x++) if (!this.tiles[y][x]) {
        this.tiles[y][x] = new Tile(x,y); this.tiles[y][x].inPlanet = this.isInsidePlanet(x,y);
      }
    }
    this.seeded = Boolean(data.seeded);
    this.selected = null;
  }

  migrateTiles(oldData) {
    const oldCols = Number(oldData.cols) || 48;
    const oldRows = Number(oldData.rows) || 27;
    const oldTiles = Array.isArray(oldData.tiles) ? oldData.tiles : [];
    const used = new Set();

    const placeMigratedTile = (item) => {
      const ox = Number(item.x), oy = Number(item.y);
      if (!Number.isInteger(ox) || !Number.isInteger(oy)) return;
      let x = Math.min(this.cols - 1, Math.floor((ox + 0.5) * this.cols / oldCols));
      let y = Math.min(this.rows - 1, Math.floor((oy + 0.5) * this.rows / oldRows));
      const key = `${x},${y}`;
      if (used.has(key)) return;

      if (!this.isInsidePlanet(x, y) && (item.tree || item.grass || item.animal || item.fish || item.water > 0.1)) {
        let best = null;
        let bestDistance = Infinity;
        for (let radius = 1; radius < Math.max(this.cols, this.rows); radius++) {
          const candidates = [
            [x + radius, y], [x - radius, y], [x, y + radius], [x, y - radius],
            [x + radius, y + radius], [x - radius, y - radius],
            [x + radius, y - radius], [x - radius, y + radius]
          ];
          for (const [cx, cy] of candidates) {
            if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) continue;
            if (!this.isInsidePlanet(cx, cy)) continue;
            const candidateKey = `${cx},${cy}`;
            if (used.has(candidateKey)) continue;
            const distance = Math.abs(cx - x) + Math.abs(cy - y);
            if (distance < bestDistance) {
              best = [cx, cy];
              bestDistance = distance;
            }
          }
          if (best) break;
        }
        if (best) [x, y] = best;
      }

      const finalKey = `${x},${y}`;
      if (used.has(finalKey)) return;
      const tile = Tile.deserialize(item);
      tile.x = x;
      tile.y = y;
      tile.inPlanet = this.isInsidePlanet(x, y);
      this.tiles[y][x] = tile;
      used.add(finalKey);
    };

    for (const item of oldTiles) placeMigratedTile(item);

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (!this.tiles[y][x]) {
          this.tiles[y][x] = new Tile(x, y);
          this.tiles[y][x].inPlanet = this.isInsidePlanet(x, y);
        }
      }
    }
    this.selected = null;
  }

  deserialize(data = {}) {
    this.continentId = data.continentId || "americas";
    this.customAreas = Number(data.customAreas) || 0;
    this.mapStates = data.maps && typeof data.maps === "object" ? data.maps : {};
    this.loadState(data);
    this.continentId = data.continentId || "americas";
  }

}
