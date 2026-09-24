function voltar(){
  window.location.href = "index.html";
}

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
    this.climate = new ClimateSystem(this);
    this.shop = new ShopSystem(this);
    this.missions = new MissionSystem(this);
    this.achievements = new AchievementSystem(this);
    this.events = new EventSystem(this);
    this.animals = new AnimalSystem(this);
    this.fish = new FishSystem(this);
    this.research = new ResearchSystem(this);
    this.audio = new AudioManager();
    this.ui = new UIManager(this);
    this.economy = new EconomySystem(this);
    this.save = new SaveSystem(this);

    this.lastTime = performance.now();
    this.uiAccumulator = 0;
    this.offlineSeconds = 0;
    this.loaded = false;

    this.paintSession = null;

    this.bindCanvas();
    this.load();
    this.canvasShell = this.canvas.closest(".canvas-shell");
    this.resizeCanvas();
    this.resizeObserver = new ResizeObserver(() => {
      if (this._resizeFrame) cancelAnimationFrame(this._resizeFrame);
      this._resizeFrame = requestAnimationFrame(() => {
        this._resizeFrame = null;
        this.resizeCanvas();
      });
    });
    if (this.canvasShell) this.resizeObserver.observe(this.canvasShell);
    window.addEventListener("resize", () => this.resizeCanvas());
    window.addEventListener("orientationchange", () => setTimeout(() => this.resizeCanvas(), 100));
    this.ui.refresh();
    requestAnimationFrame(time => this.loop(time));
  }

  bindCanvas() {
    this.canvas.addEventListener("pointermove", event => {
      const tile = this.getTileFromPointer(event);
      for (const row of this.world.tiles) for (const t of row) t.hover = false;
      if (tile) tile.hover = true;

      if (!this.paintSession || !tile) return;
      this.paintSession.tile = tile;

      if (this.paintSession.mode === "river") {
        // Pinta todos os tiles entre o último ponto e o atual.
        // Isso evita falhas quando o mouse se move rapidamente e pula vários tiles.
        const last = this.paintSession.lastTile;
        this.paintRiverSegment(last || tile, tile);
        this.paintSession.lastTile = { x: tile.x, y: tile.y };
      } else if (this.paintSession.mode === "continuous") {
        this.attemptAction(tile, { silent: true, skipSave: true });
      }
    });

    this.canvas.addEventListener("pointerleave", () => {
      for (const row of this.world.tiles) for (const t of row) t.hover = false;
    });

    this.canvas.addEventListener("pointerdown", event => {
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      try { this.canvas.setPointerCapture?.(event.pointerId); } catch (_) {}
      this.startCanvasAction(event);
    });

    window.addEventListener("pointerup", () => this.endCanvasAction());
    window.addEventListener("pointercancel", () => this.endCanvasAction());
    window.addEventListener("blur", () => this.endCanvasAction());
  }

  paintRiverSegment(from, to) {
    if (!from || !to) return;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      const x = Math.round(from.x + dx * t);
      const y = Math.round(from.y + dy * t);
      const tile = this.world.get(x, y);
      if (!tile) continue;

      const key = `${x},${y}`;
      if (this.paintSession.visited.has(key)) continue;
      this.paintSession.visited.add(key);

      // Rio só pinta terreno seco. Um rio existente não é removido durante o arraste.
      if (tile.water >= 0.5) continue;
      const ok = this.attemptAction(tile, { silent: true, skipSave: true });
      if (ok) this.paintSession.changedAny = true;
    }
  }

  getTileFromPointer(event) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const render = this.ui?.getWorldRenderMetrics?.() || {
      scaleX: this.canvas.width / (this.world.cols * WORLD_CONFIG.tileSize),
      scaleY: this.canvas.height / (this.world.rows * WORLD_CONFIG.tileSize),
      offsetX: 0, offsetY: 0
    };
    const px = (event.clientX - rect.left) / rect.width * this.canvas.width;
    const py = (event.clientY - rect.top) / rect.height * this.canvas.height;
    const logicalX = (px - render.offsetX) / render.scaleX;
    const logicalY = (py - render.offsetY) / render.scaleY;
    const tx = Math.floor(logicalX / WORLD_CONFIG.tileSize);
    const ty = Math.floor(logicalY / WORLD_CONFIG.tileSize);
    return this.world.get(tx, ty);
  }

  startCanvasAction(event) {
    const tile = this.getTileFromPointer(event);
    if (!tile) return;

    this.ui.selectTile(tile);
    const changed = this.attemptAction(tile, { silent: false, skipSave: true });
    if (changed) this.save.save();

    // O rio usa o arraste como ferramenta de pintura.
    // Clique em um rio existente continua removendo o rio normalmente.
    if (this.player.selectedTool === "river") {
      // O primeiro clique cria/remove normalmente. Depois disso, o arraste pinta
      // somente tiles novos, sem alternar o estado de um tile já visitado.
      if (tile.water >= 0.5) return;
      this.paintSession = {
        mode: "river",
        tile,
        changedAny: changed,
        lastTile: { x: tile.x, y: tile.y },
        visited: new Set([`${tile.x},${tile.y}`]),
        interval: null
      };
      return;
    }

    const mode = this.player.settings.plantMode;
    if (mode === "click") return;

    const intervalMs = mode === "continuous" ? 110 : 350;
    this.paintSession = { mode, tile, changedAny: changed, interval: null };
    this.paintSession.interval = setInterval(() => {
      const t = this.paintSession && this.paintSession.tile;
      if (!t) return;
      const ok = this.attemptAction(t, { silent: true, skipSave: true });
      if (ok) this.paintSession.changedAny = true;
    }, intervalMs);
  }

  endCanvasAction() {
    if (!this.paintSession) return;
    if (this.paintSession.interval) clearInterval(this.paintSession.interval);
    if (this.paintSession.changedAny) {
      this.ui.refresh();
      this.save.save();
    }
    this.paintSession = null;
  }

  // Executa a ferramenta selecionada em um tile, validando cada regra antes de alterar o mapa.
  // Retorna true quando algo mudou no mundo.
  attemptAction(tile, { silent = false, skipSave = false } = {}) {
    if (!tile) return false;
    const notify = (title, message) => { if (!silent) this.ui.showToast(title, message); };
    const finish = () => {
      if (!silent) { this.ui.refresh(); }
      if (!skipSave) this.save.save();
      return true;
    };

    const tool = this.player.selectedTool;

    if (tool === "grass") {
      if (!tile.inPlanet) { notify("Fora do planeta", "Escolha uma área dentro da esfera."); return false; }
      if (tile.water >= 0.5) { notify("Local inválido", "Não é possível cobrir água com grama."); return false; }
      if (tile.grass) { notify("Já tem grama", "Este tile já está coberto por grama."); return false; }
      if (this.player.coins < 3) { notify("Moedas insuficientes", "Cobrir com grama custa 3 moedas."); return false; }
      if (!this.world.placeGrass(tile.x, tile.y)) return false;
      this.player.spendCoins(3);
      notify("Solo coberto", "Uma nova área de grama nasceu.");
      return finish();
    }

    if (tool === "river") {
      if (!tile.inPlanet) { notify("Fora do planeta", "Escolha uma área dentro da esfera."); return false; }
      if (tile.water >= 0.5) {
        if (!this.world.removeRiver(tile.x, tile.y)) return false;
        notify("Rio removido", "A água deu lugar ao terreno novamente.");
        return finish();
      }
      if (tile.tree) { notify("Local ocupado", "Não é possível criar um rio sobre uma árvore."); return false; }
      if (tile.grass) { notify("Local ocupado", "Não é possível criar um rio sobre a grama."); return false; }
      if (tile.animal) { notify("Local ocupado", "Não é possível criar um rio sobre um animal."); return false; }
      if (tile.fish) { notify("Local ocupado", "Não é possível criar um rio sobre um peixe."); return false; }
      if (!this.player.spendCoins(50)) { notify("Moedas insuficientes", "Criar um rio custa 50 moedas."); return false; }
      if (!this.world.createRiver(tile.x, tile.y)) { this.player.addCoins(50); return false; }
      notify("Rio criado", "A água começa a devolver vida ao terreno.");
      return finish();
    }

    if (tool === "fishPlace") {
      if (!this.player.selectedFish) { notify("Escolha um peixe", "Compre trutas ou carpas na loja."); return false; }
      if (!this.fish.canPlace(tile)) {
        notify("Local inválido", tile.water < 0.5
          ? "Peixes só podem ser colocados dentro da água."
          : "Já existe um peixe nesse trecho do rio.");
        return false;
      }
      this.fish.place(tile, this.player.selectedFish);
      this.player.selectedFish = null;
      notify("Peixe solto", "O novo habitante agora nada livremente.");
      return finish();
    }

    if (tool === "animalPlace") {
      if (!this.player.selectedAnimal) { notify("Escolha um animal", "Compre uma galinha, cavalo ou vaca na loja."); return false; }
      if (!this.animals.canPlace(tile)) {
        notify("Local inválido", "Animais exigem 5 árvores, área seca e sem outro animal.");
        return false;
      }
      this.animals.place(tile, this.player.selectedAnimal);
      this.player.selectedAnimal = null;
      notify("Animal adicionado", "O novo habitante agora faz parte do planeta.");
      return finish();
    }

    if (tool === "fish") {
      if (!this.fish.remove(tile)) {
        notify("Nenhum peixe", "Clique em um tile que tenha um peixe para removê-lo.");
        return false;
      }
      notify("Peixe removido", "O peixe foi retirado do mapa.");
      return finish();
    }

    if (tool === "animal") {
      if (!this.animals.remove(tile)) {
        notify("Nenhum animal", "Clique em um tile que tenha um animal para removê-lo.");
        return false;
      }
      notify("Animal removido", "O animal foi retirado do mapa.");
      return finish();
    }

    if (tool === "plant") {
      if (!tile.inPlanet) { notify("Fora do planeta", "Escolha uma área dentro da esfera."); return false; }
      if (tile.tree) { notify("Tile ocupado", "Escolha um espaço sem árvore."); return false; }
      if (tile.water >= 0.8) { notify("Tile ocupado", "Não é possível plantar sobre um rio."); return false; }
      if (this.player.seeds <= 0) { notify("Sem sementes", "Compre mais sementes na loja."); return false; }
      if (this.player.coins < 5) { notify("Moedas insuficientes", "Cada plantio custa 5 moedas."); return false; }
      const species = this.player.selectedSpecies || "common";
      if (!this.world.plant(tile.x, tile.y, species)) return false;
      this.player.spendCoins(5);
      this.player.seeds -= 1;
      this.player.totalTreesPlanted += 1;
      this.audio.playPlant();
      notify("Um novo começo", `Uma ${TREE_SPECIES[species].name.toLowerCase()} foi plantada.`);
      return finish();
    }

    if (tool === "remove") {
      if (!this.world.removeTree(tile.x, tile.y)) return false;
      this.player.wood += 1;
      notify("Árvore removida", "+1 madeira");
      return finish();
    }

    return false;
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
    const target = this.canvasShell || this.canvas;
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));

    // O tamanho interno acompanha somente o tamanho real do painel.
    // Atualizações da interface (como plantar a primeira semente) não devem
    // provocar zoom ou alteração do enquadramento do mundo.
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
  }

  openCustomWorld() {
    const available = Object.values(this.player.mapCompleted).filter(Boolean).length;
    if (available < 3) return;
    const overlay = document.getElementById("customWorldOverlay");
    if (overlay) overlay.classList.remove("hidden");
  }

  createCustomWorld(areaCount) {
    const available = Object.values(this.player.mapCompleted).filter(Boolean).length;
    const count = Math.max(1, Math.min(available, Number(areaCount) || 1));
    if (available < 3) return false;
    const ok = this.world.createCustomWorld(count);
    if (!ok) return false;
    this.player.coins = 20;
    this.player.seeds = 1;
    this.player.wood = 0;
    this.player.selectedAnimal = null;
    this.player.selectedFish = null;
    this.player.selectedTool = "plant";
    this.climate.day = 1;
    this.climate.elapsed = 0;
    this.climate.seasonIndex = 0;
    document.getElementById("customWorldOverlay")?.classList.add("hidden");
    document.getElementById("mapsOverlay")?.classList.add("hidden");
    this.ui.onSeasonChange();
    this.ui.refresh();
    this.save.save();
    this.ui.showToast("Mundo personalizado criado", `${count} área(s) de plantio disponível(is).`);
    return true;
  }

  switchMap(id) {
    const oldId = this.world.continentId;
    this.updateMapProgress();
    const ok = this.world.switchContinent(id, {
      ...this.player.mapProgress,
      customAreas: Object.values(this.player.mapCompleted).filter(Boolean).length
    });
    if (!ok) return false;
    if (id !== oldId) {
      this.player.coins = 20;
      this.player.seeds = 1;
      this.player.wood = 0;
      this.player.selectedAnimal = null;
      this.player.selectedFish = null;
      this.player.selectedTool = "plant";
      this.climate.day = 1;
      this.climate.elapsed = 0;
      this.climate.seasonIndex = 0;
      this.ui.onSeasonChange();
    }
    this.ui.refresh();
    this.save.save();
    return true;
  }

  loop(time) {
    const dt = Math.min((time - this.lastTime) / 1000, .25);
    this.lastTime = time;

    this.update(dt);
    this.ui.drawWorld(time);
    requestAnimationFrame(next => this.loop(next));
  }

  update(dt) {
    this.events.update(dt);
    this.climate.update(dt);

    const growthMult = this.climate.getGrowthMultiplier();
    const vegMult = this.climate.getVegetationMultiplier();
    this.world.update(dt, growthMult, vegMult);

    this.economy.update(dt);
    this.animals.update(dt);
    this.fish.update(dt);
    this.missions.update();
    this.achievements.update();
    this.save.update(dt);
    this.updateMapProgress();

    this.uiAccumulator += dt;
    if (this.uiAccumulator >= .25) {
      this.uiAccumulator = 0;
      this.ui.refresh();
    }
  }

  updateMapProgress() {
    const id = this.world.continentId;
    if (!Object.prototype.hasOwnProperty.call(this.player.mapProgress, id)) return;
    const stats = this.world.getStats();
    const previous = Number(this.player.mapProgress[id]) || 0;
    // O progresso acompanha o estado atual do mapa. Ele não fica travado em
    // 100% por causa de um valor salvo anteriormente: ao remover elementos,
    // a porcentagem também pode diminuir de forma coerente.
    const current = Math.min(100, Math.max(0, stats.recoveredPercent));
    this.player.mapProgress[id] = current;

    if (previous < 80 && current >= 80) {
      if (id === "americas") {
        const achievement = this.achievements.items.find(item => item.id === "map_americas_unlock");
        if (achievement && !achievement.done) {
          achievement.done = true;
          this.ui.showAchievementCard("Novo horizonte", "Europa e África foram desbloqueados.");
        }
      }
      if (id === "continent2") {
        const achievement = this.achievements.items.find(item => item.id === "map_continent2_unlock");
        if (achievement && !achievement.done) {
          achievement.done = true;
          this.ui.showAchievementCard("Um novo continente", "Ásia e Oceania foram desbloqueados.");
        }
      }
    }
    if (current >= 100 && !this.player.mapCompleted[id]) {
      this.player.mapCompleted[id] = true;
      this.achievements.unlockMapCompletion(id);
    }
    this.player.customWorldUnlocked = Object.values(this.player.mapCompleted).filter(Boolean).length === 3;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.game = new Game();
});
