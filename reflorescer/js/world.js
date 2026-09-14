const WORLD_CONFIG = {
  cols: 72,
  rows: 40,
  tileSize: 24,
  continentId: "americas"
};

const CONTINENT_DEFINITIONS = [
  {
    id: "americas",
    name: "América",
    unlocked: true,
    description: "América do Norte, Central e do Sul",
    accent: "americas"
  },
  {
    id: "continent2",
    name: "Continente 2",
    unlocked: false,
    description: "Mapa reservado para uma futura região",
    accent: "locked"
  },
  {
    id: "continent3",
    name: "Continente 3",
    unlocked: false,
    description: "Mapa reservado para uma futura região",
    accent: "locked"
  }
];

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

const AMERICAS_LAND = [
  [[0.395,0.08],[0.525,0.07],[0.605,0.13],[0.615,0.21],[0.565,0.25],[0.535,0.32],[0.495,0.38],[0.455,0.43],[0.415,0.39],[0.395,0.31],[0.355,0.27],[0.335,0.20],[0.355,0.14]],
  [[0.465,0.39],[0.525,0.40],[0.555,0.46],[0.545,0.52],[0.505,0.56],[0.485,0.52],[0.445,0.47]],
  [[0.515,0.53],[0.595,0.52],[0.645,0.57],[0.665,0.65],[0.645,0.74],[0.595,0.83],[0.545,0.92],[0.495,0.88],[0.505,0.79],[0.535,0.72],[0.515,0.64]]
];

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
  }

  get hasTree() { return Boolean(this.tree); }

  updateEnvironment(dt, vegetationMultiplier = 1) {
    if (this.tree) {
      const influence = this.tree.data;
      const maturity = Math.min(1, this.tree.age / 78);
      this.fertility = Math.min(100, this.fertility + influence.fertility * maturity * dt);
      this.humidity = Math.min(100, this.humidity + influence.humidity * maturity * dt);
      this.vegetation = Math.min(100, this.vegetation + 0.12 * maturity * dt * vegetationMultiplier);
    } else if (this.grass) {
      this.vegetation = Math.min(60, this.vegetation + 0.05 * dt * vegetationMultiplier);
      this.fertility = Math.min(100, this.fertility + 0.01 * dt);
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
      temperature: this.temperature
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
    this.generate();
  }

  get continent() {
    return CONTINENT_DEFINITIONS.find(item => item.id === this.continentId) || CONTINENT_DEFINITIONS[0];
  }

  switchContinent(id) {
    const target = CONTINENT_DEFINITIONS.find(item => item.id === id);
    if (!target || !target.unlocked || target.id === this.continentId) return target && target.id === this.continentId;
    this.continentId = target.id;
    this.cols = WORLD_CONFIG.cols;
    this.rows = WORLD_CONFIG.rows;
    this.generate();
    this.seeded = false;
    this.selected = null;
    return true;
  }

  isUnlocked() {
    return Boolean(this.continent && this.continent.unlocked);
  }

  isInsidePlanet(x, y) {
    if (this.continentId !== "americas") return false;
    const nx = (x + 0.5) / this.cols;
    const ny = (y + 0.5) / this.rows;
    return AMERICAS_LAND.some(polygon => pointInPolygon(nx, ny, polygon));
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
    return true;
  }

  canPlaceRiver(tile) {
    return Boolean(tile && tile.inPlanet && !tile.tree && !tile.animal && tile.water < 0.8);
  }

  createRiver(x, y) {
    const tile = this.get(x, y);
    if (!this.canPlaceRiver(tile)) return false;
    tile.water = 1;
    tile.humidity = Math.min(100, tile.humidity + 20);
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
    let greenTiles = 0, grassTiles = 0, waterTiles = 0, planetTiles = 0, recoveredTiles = 0;
    for (const row of this.tiles) {
      for (const tile of row) {
        fertility += tile.fertility;
        vegetation += tile.vegetation;
        if (tile.vegetation >= 25 || tile.tree) greenTiles++;
        if (tile.grass) grassTiles++;
        if (tile.water > 0.5) waterTiles++;
        if (tile.tree) {
          trees++;
          if (tile.tree.mature) mature++;
        }
        if (tile.inPlanet) {
          planetTiles++;
          if (tile.tree || tile.grass || tile.vegetation >= 25) recoveredTiles++;
        }
      }
    }
    const count = this.cols * this.rows;
    const avgFertility = fertility / count;
    const avgVegetation = vegetation / count;
    const biodiversity = Math.min(100, trees * 0.95 + mature * 0.75 + avgFertility * 0.16 + avgVegetation * 0.18);
    return {
      trees, mature, avgFertility, avgVegetation, biodiversity,
      greenPercent: (greenTiles / count) * 100,
      grassTiles, waterTiles,
      recoveredPercent: planetTiles ? (recoveredTiles / planetTiles) * 100 : 0
    };
  }

  serialize() {
    return {
      cols: this.cols,
      rows: this.rows,
      seeded: this.seeded,
      continentId: this.continentId,
      tiles: this.tiles.flat().map(tile => tile.serialize())
    };
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

  deserialize(data) {
    const oldCols = Number(data?.cols) || WORLD_CONFIG.cols;
    const oldRows = Number(data?.rows) || WORLD_CONFIG.rows;
    this.continentId = data?.continentId || "americas";

    if (oldCols !== WORLD_CONFIG.cols || oldRows !== WORLD_CONFIG.rows) {
      this.cols = WORLD_CONFIG.cols;
      this.rows = WORLD_CONFIG.rows;
      this.tiles = Array.from({ length: this.rows }, () => Array(this.cols));
      this.migrateTiles(data || {});
    } else {
      this.cols = oldCols;
      this.rows = oldRows;
      this.tiles = Array.from({ length: this.rows }, () => Array(this.cols));
      for (const item of data.tiles || []) {
        if (item.y < this.rows && item.x < this.cols) {
          this.tiles[item.y][item.x] = Tile.deserialize(item);
          this.tiles[item.y][item.x].inPlanet = this.isInsidePlanet(item.x, item.y);
        }
      }
      for (let y = 0; y < this.rows; y++) {
        for (let x = 0; x < this.cols; x++) {
          if (!this.tiles[y][x]) {
            this.tiles[y][x] = new Tile(x, y);
            this.tiles[y][x].inPlanet = this.isInsidePlanet(x, y);
          }
        }
      }
    }
    this.seeded = Boolean(data?.seeded);
    this.selected = null;
  }
}
