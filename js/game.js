class AudioManager {
  playRain() {}
  playBird() {}
  playWind() {}
  playUnlock() {}
  playPlant() {}
}

class Game {
  constructor() {
    this.canvas = document.getElementById("worldCanvas");
    this.world = new World();
    this.player = new Player();
    this.climate = new ClimateSystem();
    this.shop = new ShopSystem(this);
    this.missions = new MissionSystem(this);
    this.achievements = new AchievementSystem(this);
    this.events = new EventSystem(this);
    this.animals = new AnimalSystem(this);
    this.research = new ResearchSystem(this);
    this.audio = new AudioManager();
    this.ui = new UIManager(this);
    this.economy = new EconomySystem(this);
    this.save = new SaveSystem(this);

    this.lastTime = performance.now();
    this.uiAccumulator = 0;
    this.offlineSeconds = 0;
    this.loaded = false;

    this.bindCanvas();
    this.load();
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
    this.ui.refresh();
    requestAnimationFrame(time => this.loop(time));
  }

  bindCanvas() {
    this.canvas.addEventListener("pointermove", event => {
      const tile = this.getTileFromPointer(event);
      for (const row of this.world.tiles) for (const t of row) t.hover = false;
      if (tile) tile.hover = true;
    });

    this.canvas.addEventListener("pointerleave", () => {
      for (const row of this.world.tiles) for (const t of row) t.hover = false;
    });

    this.canvas.addEventListener("pointerdown", event => this.handleCanvasClick(event));
  }

  getTileFromPointer(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * this.canvas.width;
    const y = (event.clientY - rect.top) / rect.height * this.canvas.height;
    const tx = Math.floor(x / (this.canvas.width / this.world.cols));
    const ty = Math.floor(y / (this.canvas.height / this.world.rows));
    return this.world.get(tx, ty);
  }

  handleCanvasClick(event) {
    const tile = this.getTileFromPointer(event);
    if (!tile) return;

    this.ui.selectTile(tile);

    const tool = this.player.selectedTool;
    if (tool === "plant") {
      if (tile.tree) {
        this.ui.showToast("Tile ocupado", "Escolha um espaço sem árvore.");
        return;
      }
      if (this.player.seeds <= 0) {
        this.ui.showToast("Sem sementes", "Compre mais sementes na loja.");
        return;
      }
      const species = this.player.selectedSpecies || "common";
      if (this.world.plant(tile.x, tile.y, species)) {
        this.player.seeds -= 1;
        this.player.totalTreesPlanted += 1;
        this.audio.playPlant();
        this.ui.showToast("Um novo começo", `Uma ${TREE_SPECIES[species].name.toLowerCase()} foi plantada.`);
        this.ui.refresh();
        this.save.save();
      }
    } else if (tool === "remove") {
      if (this.world.removeTree(tile.x, tile.y)) {
        this.player.wood += 1;
        this.ui.showToast("Árvore removida", "+1 madeira");
        this.ui.refresh();
        this.save.save();
      }
    }
  }

  load() {
    this.loaded = this.save.load();
    if (this.loaded) {
      const raw = localStorage.getItem(this.save.key);
      const data = raw ? JSON.parse(raw) : null;
      if (data && data.savedAt) {
        const elapsed = Math.max(0, (Date.now() - data.savedAt) / 1000);
        this.applyOfflineProgress(Math.min(elapsed, 8 * 60 * 60));
      }
    }
  }

  applyOfflineProgress(seconds) {
    if (seconds < 10) return;
    let income = 0;
    let matured = 0;
    const maxDt = Math.min(seconds, 8 * 60 * 60);

    for (const row of this.world.tiles) {
      for (const tile of row) {
        if (!tile.tree) continue;
        const wasMature = tile.tree.mature;
        tile.tree.update(maxDt, 1, tile.fertility);
        income += tile.tree.collectProduction();
        if (!wasMature && tile.tree.mature) matured++;
        tile.updateEnvironment(maxDt);
      }
    }

    this.player.addCoins(income);
    this.offlineSeconds = seconds;
    if (income > 0 || matured > 0) {
      this.ui.showToast("Enquanto você esteve fora", `+${income} moedas · ${matured} árvores amadureceram`);
    }
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  }

  loop(time) {
    const dt = Math.min((time - this.lastTime) / 1000, .25);
    this.lastTime = time;

    this.update(dt);
    this.ui.drawWorld(time);
    requestAnimationFrame(next => this.loop(next));
  }

  update(dt) {
    this.world.update(dt, this.climate);
    this.climate.update(dt);
    this.economy.update(dt);
    this.events.update(dt);
    this.animals.update(dt);
    this.missions.update();
    this.achievements.update();
    this.save.update(dt);

    this.uiAccumulator += dt;
    if (this.uiAccumulator >= .25) {
      this.uiAccumulator = 0;
      this.ui.refresh();
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.game = new Game();
});
