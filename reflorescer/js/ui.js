function mixHexColor(hex, targetHex, t) {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(targetHex.slice(1), 16);
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bch = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bch})`;
}

const ANIMAL_LABELS = { chicken: "Galinhas", horse: "Cavalos", cow: "Vacas" };
const FISH_LABELS = { trout: "Trutas", koi: "Carpas" };

class UIManager {
  constructor(game) {
    this.game = game;
    this.canvas = document.getElementById("worldCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.toastStack = document.getElementById("toastStack");
    this.shopList = document.getElementById("shopList");
    this.selectedDetails = document.getElementById("selectionDetails");
    this.emptySelection = document.getElementById("emptySelection");
    this.lastStats = null;
    this.setupTools();
    this.setupActions();
    this.setupSettings();
    this.setupMaps();
  }

  setupTools() {
    document.querySelectorAll(".tool").forEach(button => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".tool").forEach(b => b.classList.remove("active"));
        button.classList.add("active");
        this.game.player.selectedTool = button.dataset.tool;
        this.updateHint();
      });
    });
  }

  setupActions() {
    document.getElementById("saveButton").addEventListener("click", () => this.game.save.save(false));
    document.getElementById("sellWoodButton")?.addEventListener("click", () => {
      if (this.game.player.wood <= 0) {
        this.showToast("Sem madeira", "Remova uma árvore para obter madeira.");
        return;
      }
      const amount = this.game.player.wood;
      this.game.player.wood = 0;
      this.game.player.addCoins(amount * 5);
      this.showToast("Madeira vendida", `+${amount * 5} moedas`);
      this.refresh();
      this.game.save.save();
    });
    document.getElementById("exportButton").addEventListener("click", () => this.game.save.export());
    document.getElementById("resetButton").addEventListener("click", () => {
      if (confirm("Resetar o planeta? Todo o progresso local será apagado.")) this.game.save.reset();
    });
    document.getElementById("importInput").addEventListener("change", event => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => this.game.save.import(reader.result);
      reader.readAsText(file);
      event.target.value = "";
    });

    const victoryClose = document.getElementById("victoryCloseButton");
    victoryClose?.addEventListener("click", () => {
      document.getElementById("victoryOverlay").classList.add("hidden");
    });
  }

  setupMaps() {
    const openBtn = document.getElementById("mapsButton");
    const chip = document.getElementById("mapChip");
    const overlay = document.getElementById("mapsOverlay");
    const closeBtn = document.getElementById("mapsCloseButton");
    if (!overlay) return;

    const open = () => {
      this.renderMapList();
      overlay.classList.remove("hidden");
    };

    openBtn?.addEventListener("click", open);
    chip?.addEventListener("click", open);
    closeBtn?.addEventListener("click", () => overlay.classList.add("hidden"));
    overlay.addEventListener("click", event => {
      if (event.target === overlay) overlay.classList.add("hidden");
    });
  }

  renderMapList() {
    const list = document.getElementById("mapList");
    if (!list) return;
    const selectedId = this.game.world.continentId;
    list.innerHTML = CONTINENT_DEFINITIONS.map(map => {
      const selected = map.id === selectedId;
      const disabled = !map.unlocked;
      return `
        <button class="map-card ${selected ? "selected" : ""} ${disabled ? "locked" : ""}"
          data-map-id="${map.id}" ${disabled ? "disabled" : ""}>
          <span class="map-preview ${map.accent}" aria-hidden="true">
            <span class="map-preview-land"></span>
            ${disabled ? '<span class="lock-badge">🔒</span>' : ""}
          </span>
          <span class="map-card-content">
            <strong>${map.name}</strong>
            <small>${disabled ? "Bloqueado" : selected ? "Mapa atual" : "Desbloqueado"}</small>
            <em>${map.description}</em>
          </span>
        </button>`;
    }).join("");

    list.querySelectorAll(".map-card:not(.locked)").forEach(button => {
      button.addEventListener("click", () => {
        const id = button.dataset.mapId;
        if (!this.game.world.switchContinent(id)) return;
        document.getElementById("mapsOverlay")?.classList.add("hidden");
        this.game.save.save();
        this.refresh();
        this.showToast("Mapa selecionado", this.game.world.continent.name);
      });
    });
  }

  refreshMapChip() {
    const chip = document.getElementById("mapChip");
    if (chip) chip.textContent = `🗺️ ${this.game.world.continent.name}`;
  }

  setupSettings() {
    const openBtn = document.getElementById("settingsButton");
    const overlay = document.getElementById("settingsOverlay");
    const closeBtn = document.getElementById("settingsCloseButton");
    if (!openBtn || !overlay) return;

    openBtn.addEventListener("click", () => {
      this.syncSettingsForm();
      overlay.classList.remove("hidden");
    });
    closeBtn?.addEventListener("click", () => overlay.classList.add("hidden"));
    overlay.addEventListener("click", event => {
      if (event.target === overlay) overlay.classList.add("hidden");
    });

    overlay.querySelectorAll('input[name="buyMode"]').forEach(input => {
      input.addEventListener("change", () => {
        if (input.checked) {
          this.game.player.settings.buyMode = input.value;
          this.game.save.save();
          this.refresh(); // re-bind shop buttons with the new buy mode
        }
      });
    });
    overlay.querySelectorAll('input[name="plantMode"]').forEach(input => {
      input.addEventListener("change", () => {
        if (input.checked) {
          this.game.player.settings.plantMode = input.value;
          this.game.save.save();
        }
      });
    });
  }

  syncSettingsForm() {
    const { buyMode, plantMode } = this.game.player.settings;
    const buyInput = document.querySelector(`input[name="buyMode"][value="${buyMode}"]`);
    if (buyInput) buyInput.checked = true;
    const plantInput = document.querySelector(`input[name="plantMode"][value="${plantMode}"]`);
    if (plantInput) plantInput.checked = true;
  }

  updateHint() {
    const hints = {
      plant: "Selecione Plantar e clique em um tile morto.",
      grass: "Clique em uma área seca para cobrir com grama · 3 moedas.",
      inspect: "Clique em um tile para analisar o terreno.",
      remove: "Clique em uma árvore para removê-la.",
      river: "Clique em um tile seco para criar um rio · 50 moedas. Clique num rio para removê-lo.",
      animal: "Compre um animal e clique em uma área seca dentro do planeta.",
      fish: "Compre um peixe e clique dentro de um rio para soltá-lo."
    };
    const icons = { plant: "🌱", grass: "🍃", inspect: "🔎", remove: "✋", river: "🌊", animal: "🐺", fish: "🐟" };
    const tool = this.game.player.selectedTool;
    document.getElementById("canvasHint").innerHTML = `<span>${icons[tool] || "🔎"}</span> ${hints[tool] || ""}`;
  }

  showToast(title, message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<strong>${title}</strong><span>${message}</span>`;
    this.toastStack.appendChild(toast);
    while (this.toastStack.children.length > 4) this.toastStack.removeChild(this.toastStack.firstChild);
    setTimeout(() => {
      toast.style.animation = "toast-out .25s ease forwards";
      setTimeout(() => toast.remove(), 260);
    }, 3400);
  }

  setSaveStatus(text) {
    document.getElementById("saveStatus").textContent = text;
  }

  onSeasonChange() {
    document.body.dataset.season = this.game.climate.season;
  }

  onEventChange() {
    this.refresh();
  }

  showVictory(stats) {
    const overlay = document.getElementById("victoryOverlay");
    if (!overlay) return;
    const detail = document.getElementById("victoryDetail");
    if (detail) detail.textContent = `${Math.floor(stats.recoveredPercent)}% da área foi recuperada — dia ${this.game.climate.day}.`;
    overlay.classList.remove("hidden");
  }

  refresh() {
    const player = this.game.player;
    const stats = this.game.world.getStats();
    this.lastStats = stats;
    this.refreshMapChip();

    document.getElementById("coinsValue").textContent = Math.floor(player.coins);
    document.getElementById("seedsValue").textContent = Math.floor(player.seeds);
    document.getElementById("woodValue").textContent = Math.floor(player.wood);
    document.getElementById("treesValue").textContent = stats.trees;
    document.getElementById("bioValue").textContent = `${Math.floor(stats.biodiversity)}%`;
    document.getElementById("soilMetric").textContent = `${Math.floor(stats.avgFertility)}%`;
    document.getElementById("vegetationMetric").textContent = `${Math.floor(stats.greenPercent)}%`;

    const recoveredEl = document.getElementById("recoveredMetric");
    if (recoveredEl) recoveredEl.textContent = `${Math.floor(stats.recoveredPercent)}%`;

    const level = this.getPlanetLevel(stats);
    document.getElementById("planetLevelText").textContent = `Nível ${level.level}`;
    document.getElementById("planetStage").textContent = level.name;
    document.getElementById("planetProgress").style.width = `${level.progress}%`;

    document.getElementById("worldCondition").textContent = level.name;
    document.getElementById("conditionOrb").textContent = level.level >= 3 ? "✦" : level.level === 2 ? "·" : "—";

    const missionData = this.game.missions.progress();
    document.getElementById("missionTitle").textContent = missionData.mission.title;
    document.getElementById("missionDescription").textContent = missionData.mission.description;
    document.getElementById("missionCounter").textContent = `${Math.floor(missionData.value)} / ${missionData.mission.target}`;
    document.getElementById("missionProgress").style.width = `${(missionData.value / missionData.mission.target) * 100}%`;

    this.refreshSeasonPanel();

    this.game.shop.render(this.shopList);
    this.renderSelection();
    this.updateHint();
  }

  refreshSeasonPanel() {
    const climate = this.game.climate;
    document.body.dataset.season = climate.season;
    const seasonPill = document.getElementById("seasonPill");
    if (seasonPill) {
      seasonPill.textContent = `${climate.data.icon} ${climate.data.name} · Dia ${climate.day}`;
    }
    const nextSeasonEl = document.getElementById("nextSeasonText");
    if (nextSeasonEl) {
      const days = climate.daysUntilNextSeason();
      nextSeasonEl.textContent = days <= 0 ? "" : `Próxima estação em ${days} dia${days > 1 ? "s" : ""}.`;
    }
    const effectsEl = document.getElementById("seasonEffects");
    if (effectsEl) effectsEl.textContent = climate.data.description;

    const eventBanner = document.getElementById("eventBanner");
    if (eventBanner) {
      const ev = this.game.events.active;
      if (ev) {
        const remaining = Math.max(0, Math.ceil(ev.duration - this.game.events.activeElapsed));
        eventBanner.classList.remove("hidden");
        eventBanner.textContent = `${ev.icon} ${ev.name} · ${remaining}s restantes`;
      } else {
        eventBanner.classList.add("hidden");
        eventBanner.textContent = "";
      }
    }
  }

  getPlanetLevel(stats) {
    const score = Math.max(stats.trees * 2.5, stats.biodiversity, stats.greenPercent * .9);
    const levels = [
      [0, "Terra devastada"],
      [8, "Primeiros brotos"],
      [20, "Campos começando a viver"],
      [38, "Florestas jovens"],
      [62, "Ecossistema equilibrado"],
      [82, "Planeta restaurado"]
    ];
    let current = levels[0];
    for (const item of levels) if (score >= item[0]) current = item;
    const next = levels.find(item => item[0] > score);
    const progress = next
      ? ((score - current[0]) / (next[0] - current[0])) * 100
      : 100;
    return { level: levels.indexOf(current) + 1, name: current[1], progress: Math.max(0, Math.min(100, progress)) };
  }

  selectTile(tile) {
    this.game.world.selected = tile;
    this.renderSelection();
  }

  renderSelection() {
    const tile = this.game.world.selected;
    if (!tile) {
      this.emptySelection.classList.remove("hidden");
      this.selectedDetails.classList.add("hidden");
      return;
    }
    this.emptySelection.classList.add("hidden");
    this.selectedDetails.classList.remove("hidden");
    const tree = tile.tree;
    this.selectedDetails.innerHTML = `
      <div class="tile-title">Tile ${tile.x + 1}, ${tile.y + 1} <small>· ${tile.tipoSolo === "wasteland" ? "solo degradado" : "solo seco"}</small></div>
      <div class="detail-grid">
        <div class="detail"><span>Fertilidade</span><strong>${tile.fertility.toFixed(1)}%</strong></div>
        <div class="detail"><span>Umidade</span><strong>${tile.humidity.toFixed(1)}%</strong></div>
        <div class="detail"><span>Vegetação</span><strong>${tile.vegetation.toFixed(1)}%</strong></div>
        <div class="detail"><span>Árvore</span><strong>${tree ? tree.data.name : "Nenhuma"}</strong></div>
        <div class="detail"><span>Grama</span><strong>${tile.grass ? "Sim" : "Não"}</strong></div>
        <div class="detail"><span>Água</span><strong>${tile.water > 0.5 ? "Rio" : "Seco"}</strong></div>
        <div class="detail"><span>Animal</span><strong>${tile.animal ? ANIMAL_LABELS[tile.animal] : "Nenhum"}</strong></div>
        <div class="detail"><span>Peixe</span><strong>${tile.fish ? FISH_LABELS[tile.fish] : "Nenhum"}</strong></div>
        <div class="detail"><span>Idade</span><strong>${tree ? `${Math.floor(tree.age)}%` : "—"}</strong></div>
        <div class="detail"><span>Estágio</span><strong>${tree ? tree.stage.name : "—"}</strong></div>
      </div>`;
  }

  getWorldRenderMetrics() {
    const canvas = this.canvas;
    const worldWidth = this.game.world.cols * WORLD_CONFIG.tileSize;
    const worldHeight = this.game.world.rows * WORLD_CONFIG.tileSize;
    const scale = Math.min(canvas.width / worldWidth, canvas.height / worldHeight);
    return {
      scaleX: scale,
      scaleY: scale,
      offsetX: (canvas.width - worldWidth * scale) / 2,
      offsetY: (canvas.height - worldHeight * scale) / 2
    };
  }

  drawWorld(time) {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const world = this.game.world;
    const season = this.game.climate.season;
    const metrics = this.getWorldRenderMetrics();
    const sx = WORLD_CONFIG.tileSize * metrics.scaleX;
    const sy = WORLD_CONFIG.tileSize * metrics.scaleY;
    const ox = metrics.offsetX;
    const oy = metrics.offsetY;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const oceanGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    oceanGradient.addColorStop(0, "#153c4c");
    oceanGradient.addColorStop(.5, "#0e2c3a");
    oceanGradient.addColorStop(1, "#081e2a");
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(ox, oy);

    for (let y = 0; y < world.rows; y++) {
      for (let x = 0; x < world.cols; x++) {
        const tile = world.get(x, y);
        const px = x * sx, py = y * sy;
        if (!tile.inPlanet) continue;
        const dryness = 1 - Math.min(1, tile.fertility / 100);
        const green = Math.min(1, tile.vegetation / 100 + (tile.tree ? .12 : 0));
        let r = Math.round(68 - green * 38 + dryness * 8);
        let g = Math.round(67 + green * 52 - dryness * 5);
        let b = Math.round(54 + green * 20 - dryness * 5);
        if (season === "autumn") { r += 10; g -= 4; }
        if (season === "winter") { r += 14; g += 10; b += 18; }
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(px, py, sx + .5, sy + .5);

        const noise = ((x * 17 + y * 31) % 7) / 7;
        ctx.fillStyle = `rgba(25,20,12,${.06 + noise * .035})`;
        ctx.fillRect(px + sx * .2, py + sy * .35, sx * .12, sy * .08);

        if (tile.water > 0.1) {
          ctx.fillStyle = `rgba(53,113,132,${.55 + tile.water * .3})`;
          ctx.fillRect(px, py, sx, sy);
        }

        if (season === "winter" && !tile.tree && tile.vegetation < 30 && ((x * 13 + y * 7) % 5 === 0)) {
          ctx.fillStyle = "rgba(255,255,255,.10)";
          ctx.fillRect(px + sx * .3, py + sy * .3, sx * .35, sy * .2);
        }

        if (tile.hover) {
          ctx.fillStyle = "rgba(255,255,255,.10)";
          ctx.fillRect(px, py, sx, sy);
        }
      }
    }

    this.drawMapDecorations(ctx, sx, sy, time);

    for (let y = 0; y < world.rows; y++) {
      for (let x = 0; x < world.cols; x++) {
        const tile = world.get(x, y);
        if (tile.vegetation < 10) continue;
        const px = x * sx, py = y * sy;
        const amount = Math.min(4, Math.floor(tile.vegetation / 22));
        ctx.strokeStyle = season === "autumn" ? "rgba(180,140,70,.55)" : season === "winter" ? "rgba(210,222,214,.5)" : "rgba(109,156,83,.55)";
        ctx.lineWidth = Math.max(1, sx * .035);
        for (let i = 0; i < amount; i++) {
          const gx = px + ((x * 13 + y * 7 + i * 11) % 100) / 100 * sx;
          const gy = py + sy * .78;
          ctx.beginPath();
          ctx.moveTo(gx, gy);
          ctx.lineTo(gx - sx * .05, gy - sy * .18);
          ctx.stroke();
        }
      }
    }

    for (let y = 0; y < world.rows; y++) {
      for (let x = 0; x < world.cols; x++) {
        const tile = world.get(x, y);
        if (!tile.tree) continue;
        const tree = tile.tree;
        this.drawTree(ctx, x * sx + sx / 2, y * sy + sy / 2, sx, sy, tree, time, season);
      }
    }

    for (let y = 0; y < world.rows; y++) {
      for (let x = 0; x < world.cols; x++) {
        const tile = world.get(x, y);
        if (!tile.fish || !tile.inPlanet) continue;
        this.drawFish(ctx, x * sx + sx / 2, y * sy + sy / 2, sx, sy, tile.fish, time);
      }
    }

    for (let y = 0; y < world.rows; y++) {
      for (let x = 0; x < world.cols; x++) {
        const tile = world.get(x, y);
        if (!tile.animal || !tile.inPlanet) continue;
        this.drawAnimal(ctx, x * sx + sx / 2, y * sy + sy / 2, sx, sy, tile.animal, time);
      }
    }

    if (world.selected) {
      const t = world.selected;
      ctx.strokeStyle = "rgba(198,236,205,.75)";
      ctx.lineWidth = Math.max(1.2, sx * .045);
      ctx.strokeRect(t.x * sx + 1, t.y * sy + 1, sx - 2, sy - 2);
    }

    ctx.restore();
    this.drawWeatherEffects(ctx, time);
  }

  drawMapDecorations(ctx, sx, sy, time) {
    const world = this.game.world;
    const w = world.cols * sx;
    const h = world.rows * sy;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const ocean = ctx.createLinearGradient(0, 0, w, h);
    ocean.addColorStop(0, "#102d3b");
    ocean.addColorStop(.55, "#0d2634");
    ocean.addColorStop(1, "#091d29");
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(158,214,226,.30)";
    ctx.lineWidth = Math.max(1, dpr);
    for (let y = 0; y < world.rows; y++) {
      for (let x = 0; x < world.cols; x++) {
        const tile = world.get(x, y);
        if (!tile.inPlanet) continue;
        const px = x * sx, py = y * sy;
        const top = !world.get(x, y - 1)?.inPlanet;
        const bottom = !world.get(x, y + 1)?.inPlanet;
        const left = !world.get(x - 1, y)?.inPlanet;
        const right = !world.get(x + 1, y)?.inPlanet;
        ctx.beginPath();
        if (top) { ctx.moveTo(px, py + .5); ctx.lineTo(px + sx, py + .5); }
        if (bottom) { ctx.moveTo(px, py + sy - .5); ctx.lineTo(px + sx, py + sy - .5); }
        if (left) { ctx.moveTo(px + .5, py); ctx.lineTo(px + .5, py + sy); }
        if (right) { ctx.moveTo(px + sx - .5, py); ctx.lineTo(px + sx - .5, py + sy); }
        ctx.stroke();
      }
    }

    ctx.fillStyle = "rgba(225,242,235,.48)";
    ctx.font = `${Math.max(9, Math.floor(10 * dpr))}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("AMÉRICA DO NORTE", w * .50, h * .17);
    ctx.fillText("AMÉRICA DO SUL", w * .50, h * .76);

    ctx.strokeStyle = "rgba(230,245,239,.35)";
    ctx.lineWidth = Math.max(1, dpr);
    ctx.beginPath();
    ctx.arc(w - 30 * dpr, 30 * dpr, 16 * dpr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w - 30 * dpr, 17 * dpr);
    ctx.lineTo(w - 30 * dpr, 43 * dpr);
    ctx.moveTo(w - 43 * dpr, 30 * dpr);
    ctx.lineTo(w - 17 * dpr, 30 * dpr);
    ctx.stroke();
    ctx.fillStyle = "rgba(230,245,239,.58)";
    ctx.font = `${Math.max(8, Math.floor(9 * dpr))}px system-ui, sans-serif`;
    ctx.fillText("N", w - 30 * dpr, 12 * dpr);

    const pulse = .5 + Math.sin(time * .0015) * .08;
    ctx.strokeStyle = `rgba(125,220,153,${pulse * .18})`;
    ctx.lineWidth = Math.max(2, 2 * dpr);
    ctx.strokeRect(2, 2, w - 4, h - 4);
    ctx.restore();
  }

  drawWeatherEffects(ctx, time) {
    const event = this.game.events.active;
    if (!event) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const mobile = window.matchMedia && window.matchMedia("(max-width: 700px)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const baseCount = mobile ? 34 : 62;
    const count = Math.min(baseCount, Math.max(20, Math.floor(w * h / (mobile ? 26000 : 18000))));
    const seed = Math.floor(time / 55);

    ctx.save();
    if (event.id === "rain" || event.id === "flood") {
      ctx.fillStyle = event.id === "flood" ? "rgba(70,125,150,.09)" : "rgba(70,105,135,.07)";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = event.id === "flood" ? "rgba(130,205,235,.42)" : "rgba(155,210,235,.48)";
      ctx.lineWidth = Math.max(1, dpr);
      for (let i = 0; i < count; i++) {
        const x = ((i * 83 + seed * 17) % (w + 80)) - 40;
        const y = ((i * 47 + seed * 31) % (h + 90)) - 90;
        const len = 8 + ((i * 13) % 9);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3 * dpr, y + len * dpr);
        ctx.stroke();
      }
      if (event.id === "flood") {
        ctx.strokeStyle = "rgba(165,220,235,.22)";
        for (let i = 0; i < 8; i++) {
          const x = ((i * 149 + seed * 2) % w);
          const y = ((i * 91 + seed * 3) % h);
          ctx.beginPath();
          ctx.ellipse(x, y, 6 + (i % 3) * 3, 2, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    } else if (event.id === "snow") {
      ctx.fillStyle = "rgba(220,235,240,.10)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(245,250,250,.72)";
      for (let i = 0; i < count; i++) {
        const x = (i * 97 + seed * 11) % w;
        const y = (i * 53 + seed * 7) % h;
        const r = (1.1 + (i % 3) * .65) * dpr;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (event.id === "fire") {
      ctx.fillStyle = "rgba(190,75,25,.055)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(246,150,57,.72)";
      for (let i = 0; i < Math.min(28, count); i++) {
        const x = (i * 137 + seed * 5) % w;
        const y = h - ((i * 61 + seed * 9) % Math.max(50, h * .65));
        const r = (1 + (i % 3) * .6) * dpr;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (event.id === "drought") {
      ctx.fillStyle = "rgba(235,178,76,.07)";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(235,194,105,.18)";
      ctx.lineWidth = Math.max(1, dpr);
      for (let i = 0; i < 7; i++) {
        const x = ((i * 173 + seed) % w);
        const y = h * (.25 + (i % 5) * .13);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 10, y + 6);
        ctx.lineTo(x + 5, y + 14);
        ctx.stroke();
      }
    } else if (event.id === "pollination" || event.id === "favorableSpring") {
      ctx.fillStyle = event.id === "pollination" ? "rgba(244,209,95,.68)" : "rgba(180,235,145,.52)";
      for (let i = 0; i < Math.min(24, count); i++) {
        const x = (i * 113 + seed * 7) % w;
        const y = (i * 67 + seed * 3) % h;
        const r = (1 + (i % 2) * .6) * dpr;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawTree(ctx, x, y, sx, sy, tree, time, season = "summer") {
    const stage = tree.stageIndex;
    const min = Math.min(sx, sy);
    const sway = Math.sin(time * .0017 + x * .08 + y * .05) * sx * (.008 + stage * .003);
    const growth = [.12, .22, .38, .58, .78][stage];
    const trunkH = sy * (.10 + growth * .28);
    const crown = min * (.24 + growth * .34);

    // Sombra macia no chão.
    ctx.save();
    ctx.fillStyle = "rgba(20, 28, 20, .20)";
    ctx.beginPath();
    ctx.ellipse(x + sx * .02, y + sy * .19, crown * .72, crown * .23, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tronco com dois tons para dar volume.
    if (stage > 0) {
      ctx.fillStyle = "#5b432d";
      ctx.fillRect(x - sx * .045, y + sy * .02 - trunkH, sx * .09, trunkH);
      ctx.fillStyle = "rgba(184, 132, 76, .55)";
      ctx.fillRect(x - sx * .012, y + sy * .02 - trunkH, sx * .024, trunkH);
    }

    if (stage === 0) {
      ctx.fillStyle = "#6fa95f";
      ctx.beginPath();
      ctx.ellipse(x, y - sy * .035, sx * .055, sy * .065, -.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    const cx = x + sway;
    const cy = y - trunkH;

    let crownColor = tree.data.color;
    let hiColor = tree.species === "ipê" ? "#79a95a" : "#6da15a";
    if (season === "autumn") {
      crownColor = mixHexColor(tree.data.color, "#c9812f", .55);
      hiColor = mixHexColor(hiColor, "#e0a53f", .55);
    } else if (season === "winter") {
      crownColor = mixHexColor(tree.data.color, "#dbe6e2", .35);
      hiColor = mixHexColor(hiColor, "#eef4f2", .35);
    } else if (season === "spring") {
      crownColor = mixHexColor(tree.data.color, "#8fe08f", .18);
    }

    // Pinheiro: camadas triangulares.
    if (tree.species === "pine") {
      const layers = stage >= 4 ? 4 : stage >= 2 ? 3 : 2;
      for (let i = 0; i < layers; i++) {
        const yy = cy - crown * .72 + i * crown * .40;
        const half = crown * (.45 + i * .12);
        ctx.fillStyle = season === "winter"
          ? (i % 2 ? mixHexColor("#286343", "#dbe6e2", .3) : mixHexColor("#347653", "#dbe6e2", .3))
          : (i % 2 ? "#286343" : "#347653");
        ctx.beginPath();
        ctx.moveTo(cx, yy - crown * .48);
        ctx.lineTo(cx - half, yy + crown * .38);
        ctx.lineTo(cx + half, yy + crown * .38);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // Copa orgânica em 3 massas, evitando o círculo único artificial.
      ctx.fillStyle = crownColor;
      const blobs = [
        [-.34, .06, .58], [.30, .04, .64], [0, -.30, .70], [0, .18, .58]
      ];
      for (const [ox, oy, r] of blobs) {
        ctx.beginPath();
        ctx.arc(cx + crown * ox, cy + crown * oy, crown * r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = hiColor;
      ctx.globalAlpha = .58;
      ctx.beginPath();
      ctx.arc(cx - crown * .23, cy - crown * .28, crown * .43, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Ipê ganha pequenas flores douradas quando adulto.
      if (tree.species === "ipê" && stage >= 3) {
        ctx.fillStyle = "#f2c95c";
        const flowers = stage === 4 ? 7 : 4;
        for (let i = 0; i < flowers; i++) {
          const a = i * 2.399 + x * .17;
          const rr = crown * (.35 + (i % 3) * .14);
          const fx = cx + Math.cos(a) * rr;
          const fy = cy + Math.sin(a) * rr * .72;
          ctx.beginPath();
          ctx.arc(fx, fy, Math.max(1.2, min * .035), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Folhas caindo no outono.
    if (season === "autumn" && stage >= 2) {
      ctx.fillStyle = "#e0a53f";
      for (let i = 0; i < 3; i++) {
        const a = (time * .0006 + i * 2.1 + x * .05) % (Math.PI * 2);
        const fx = cx + Math.cos(a) * crown * .9;
        const fy = cy + crown * .9 + ((time * .02 + i * 40) % (sy * .9));
        ctx.beginPath();
        ctx.arc(fx, fy, Math.max(1, min * .02), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Pequenos brilhos naturais em árvores maduras.
    if (stage >= 4) {
      ctx.fillStyle = "rgba(205, 231, 132, .48)";
      ctx.beginPath();
      ctx.arc(cx - crown * .28, cy - crown * .25, Math.max(1, min * .025), 0, Math.PI * 2);
      ctx.arc(cx + crown * .18, cy - crown * .05, Math.max(1, min * .022), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawFish(ctx, x, y, sx, sy, species, time) {
    const s = Math.min(sx, sy);
    const swim = Math.sin(time * .003 + x * .1) * s * .12;
    ctx.save();
    ctx.translate(x + swim, y);
    ctx.rotate(Math.sin(time * .003 + x * .1) * .25);
    ctx.fillStyle = species === "koi" ? "#e8703f" : "#8fb7c9";
    ctx.beginPath();
    ctx.ellipse(0, 0, s * .16, s * .08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-s * .16, 0);
    ctx.lineTo(-s * .26, -s * .07);
    ctx.lineTo(-s * .26, s * .07);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawAnimal(ctx, x, y, sx, sy, species, time) {
    const s = Math.min(sx, sy);
    const bob = Math.sin(time * .004 + x * .05) * s * .018;
    const scale = Math.max(.72, Math.min(1.18, s / 24));
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(scale, scale);

    // Sombra.
    ctx.fillStyle = "rgba(20, 28, 20, .18)";
    ctx.beginPath();
    ctx.ellipse(0, s * .22, s * .30, s * .09, 0, 0, Math.PI * 2);
    ctx.fill();

    if (species === "chicken") {
      // Corpo, cabeça, asa e crista.
      ctx.fillStyle = "#f2eee2";
      ctx.beginPath(); ctx.ellipse(-s*.03, s*.02, s*.22, s*.15, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(s*.18, -s*.10, s*.105, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#d95f4d";
      ctx.beginPath(); ctx.arc(s*.18, -s*.20, s*.045, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#e5a83b";
      ctx.beginPath(); ctx.moveTo(s*.27,-s*.08); ctx.lineTo(s*.37,-s*.04); ctx.lineTo(s*.27,0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#27372c";
      ctx.beginPath(); ctx.arc(s*.21,-s*.13, s*.018, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = "#b88332"; ctx.lineWidth = s*.025;
      ctx.beginPath(); ctx.moveTo(-s*.08,s*.13); ctx.lineTo(-s*.08,s*.23); ctx.moveTo(s*.08,s*.13); ctx.lineTo(s*.08,s*.23); ctx.stroke();
    } else if (species === "horse") {
      ctx.fillStyle = "#9a6a49";
      ctx.beginPath(); ctx.ellipse(-s*.02,s*.03,s*.28,s*.16,0,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s*.23,-s*.10,s*.12,s*.16,-.2,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#4c3429";
      ctx.beginPath(); ctx.moveTo(s*.15,-s*.22); ctx.lineTo(s*.07,-s*.35); ctx.lineTo(s*.18,-s*.28); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#2d352f";
      ctx.beginPath(); ctx.arc(s*.27,-s*.14,s*.018,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = "#604332"; ctx.lineWidth = s*.035;
      for (const lx of [-.18,-.02,.13,.25]) {
        ctx.beginPath(); ctx.moveTo(s*lx,s*.13); ctx.lineTo(s*lx,s*.25); ctx.stroke();
      }
    } else {
      // Vaca: corpo branco, manchas e chifres.
      ctx.fillStyle = "#eee8da";
      ctx.beginPath(); ctx.ellipse(-s*.03,s*.02,s*.30,s*.17,0,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(s*.25,-s*.08,s*.13,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#6b5145";
      ctx.beginPath(); ctx.arc(-s*.14,-s*.04,s*.09,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(s*.05,s*.07,s*.07,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#c79a92";
      ctx.beginPath(); ctx.ellipse(s*.29,s*.01,s*.07,s*.045,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = "#c7a76d"; ctx.lineWidth = s*.025;
      ctx.beginPath(); ctx.moveTo(s*.20,-s*.18); ctx.lineTo(s*.13,-s*.26); ctx.moveTo(s*.31,-s*.18); ctx.lineTo(s*.37,-s*.25); ctx.stroke();
      ctx.fillStyle = "#27372c";
      ctx.beginPath(); ctx.arc(s*.28,-s*.12,s*.018,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = "#6f5a4a"; ctx.lineWidth = s*.035;
      for (const lx of [-.18,-.02,.15]) {
        ctx.beginPath(); ctx.moveTo(s*lx,s*.14); ctx.lineTo(s*lx,s*.25); ctx.stroke();
      }
    }
    ctx.restore();
  }
}
