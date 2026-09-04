const WORLD_CONFIG = {
  cols: 48,
  rows: 27,
  tileSize: 24
};

class Tile {
  constructor(x, y, type = "wasteland") {
    this.x = x;
    this.y = y;
    this.tipoSolo = type;
    this.fertility = 4 + Math.random() * 5;
    this.humidity = 7 + Math.random() * 7;
    this.vegetation = 0;
    this.tree = null;
    this.water = 0;
    this.temperature = 28 + Math.random() * 5;
    this.hover = false;
  }

  get hasTree() { return Boolean(this.tree); }

  updateEnvironment(dt) {
    if (this.tree) {
      const influence = this.tree.data;
      const maturity = Math.min(1, this.tree.age / 78);
      this.fertility = Math.min(100, this.fertility + influence.fertility * maturity * dt);
      this.humidity = Math.min(100, this.humidity + influence.humidity * maturity * dt);
      this.vegetation = Math.min(100, this.vegetation + 0.12 * maturity * dt);
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
      water: this.water,
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
    return tile;
  }
}

class World {
  constructor(cols = WORLD_CONFIG.cols, rows = WORLD_CONFIG.rows) {
    this.cols = cols;
    this.rows = rows;
    this.tiles = [];
    this.selected = null;
    this.seeded = false;
    this.generate();
  }

  generate() {
    this.tiles.length = 0;
    for (let y = 0; y < this.rows; y++) {
      const row = [];
      for (let x = 0; x < this.cols; x++) {
        let type = "wasteland";
        const edge = x < 3 || y < 2 || x >= this.cols - 3 || y >= this.rows - 2;
        if (edge && Math.random() < .42) type = "dry_soil";
        row.push(new Tile(x, y, type));
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
    if (!tile || tile.tree || tile.water > 0.8) return false;
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

  update(dt, climate) {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const tile = this.tiles[y][x];
        tile.updateEnvironment(dt);
        if (tile.tree) tile.tree.update(dt, climate.getGrowthMultiplier(), tile.fertility);
      }
    }
  }

  getStats() {
    let trees = 0;
    let mature = 0;
    let fertility = 0;
    let vegetation = 0;
    let greenTiles = 0;

    for (const row of this.tiles) {
      for (const tile of row) {
        fertility += tile.fertility;
        vegetation += tile.vegetation;
        if (tile.vegetation >= 25 || tile.tree) greenTiles++;
        if (tile.tree) {
          trees++;
          if (tile.tree.mature) mature++;
        }
      }
    }

    const count = this.cols * this.rows;
    const avgFertility = fertility / count;
    const avgVegetation = vegetation / count;
    const biodiversity = Math.min(100,
      trees * 0.95 +
      mature * 0.75 +
      avgFertility * 0.16 +
      avgVegetation * 0.18
    );

    return {
      trees,
      mature,
      avgFertility,
      avgVegetation,
      biodiversity,
      greenPercent: (greenTiles / count) * 100
    };
  }

  serialize() {
    return {
      cols: this.cols,
      rows: this.rows,
      seeded: this.seeded,
      tiles: this.tiles.flat().map(tile => tile.serialize())
    };
  }

  deserialize(data) {
    this.cols = data.cols || WORLD_CONFIG.cols;
    this.rows = data.rows || WORLD_CONFIG.rows;
    this.seeded = Boolean(data.seeded);
    this.tiles = Array.from({ length: this.rows }, () => Array(this.cols));
    for (const item of data.tiles || []) {
      if (item.y < this.rows && item.x < this.cols) this.tiles[item.y][item.x] = Tile.deserialize(item);
    }
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (!this.tiles[y][x]) this.tiles[y][x] = new Tile(x, y);
      }
    }
  }
}
