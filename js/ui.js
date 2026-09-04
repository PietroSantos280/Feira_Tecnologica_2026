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
  }

  updateHint() {
    const hints = {
      plant: "Selecione Plantar e clique em um tile morto.",
      inspect: "Clique em um tile para analisar o terreno.",
      remove: "Clique em uma árvore para removê-la."
    };
    document.getElementById("canvasHint").innerHTML = `<span>${this.game.player.selectedTool === "plant" ? "🌱" : this.game.player.selectedTool === "remove" ? "✋" : "🔎"}</span> ${hints[this.game.player.selectedTool]}`;
  }

  showToast(title, message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<strong>${title}</strong><span>${message}</span>`;
    this.toastStack.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = "toast-out .25s ease forwards";
      setTimeout(() => toast.remove(), 260);
    }, 3000);
  }

  setSaveStatus(text) {
    document.getElementById("saveStatus").textContent = text;
  }

  refresh() {
    const player = this.game.player;
    const stats = this.game.world.getStats();
    this.lastStats = stats;

    document.getElementById("coinsValue").textContent = Math.floor(player.coins);
    document.getElementById("seedsValue").textContent = Math.floor(player.seeds);
    document.getElementById("woodValue").textContent = Math.floor(player.wood);
    document.getElementById("treesValue").textContent = stats.trees;
    document.getElementById("bioValue").textContent = `${Math.floor(stats.biodiversity)}%`;
    document.getElementById("soilMetric").textContent = `${Math.floor(stats.avgFertility)}%`;
    document.getElementById("vegetationMetric").textContent = `${Math.floor(stats.greenPercent)}%`;

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

    document.getElementById("dayValue").textContent = this.game.climate.day;

    this.game.shop.render(this.shopList);
    this.renderSelection();
    this.updateHint();
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
        <div class="detail"><span>Idade</span><strong>${tree ? `${Math.floor(tree.age)}%` : "—"}</strong></div>
        <div class="detail"><span>Estágio</span><strong>${tree ? tree.stage.name : "—"}</strong></div>
      </div>`;
  }

  drawWorld(time) {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const world = this.game.world;
    const scaleX = canvas.width / (world.cols * WORLD_CONFIG.tileSize);
    const scaleY = canvas.height / (world.rows * WORLD_CONFIG.tileSize);
    const sx = WORLD_CONFIG.tileSize * scaleX;
    const sy = WORLD_CONFIG.tileSize * scaleY;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Base: terreno morto com variação procedural sutil.
    for (let y = 0; y < world.rows; y++) {
      for (let x = 0; x < world.cols; x++) {
        const tile = world.get(x, y);
        const px = x * sx, py = y * sy;
        const dryness = 1 - Math.min(1, tile.fertility / 100);
        const green = Math.min(1, tile.vegetation / 100 + (tile.tree ? .12 : 0));
        const r = Math.round(68 - green * 38 + dryness * 8);
        const g = Math.round(67 + green * 52 - dryness * 5);
        const b = Math.round(54 + green * 20 - dryness * 5);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(px, py, sx + .5, sy + .5);

        // Ruído visual de solo.
        const noise = ((x * 17 + y * 31) % 7) / 7;
        ctx.fillStyle = `rgba(25,20,12,${.06 + noise * .035})`;
        ctx.fillRect(px + sx * .2, py + sy * .35, sx * .12, sy * .08);

        if (tile.water > 0.1) {
          ctx.fillStyle = `rgba(53,113,132,${.55 + tile.water * .3})`;
          ctx.fillRect(px, py, sx, sy);
        }

        if (tile.hover) {
          ctx.fillStyle = "rgba(255,255,255,.10)";
          ctx.fillRect(px, py, sx, sy);
        }
      }
    }

    // Gramíneas aparecem conforme a recuperação.
    for (let y = 0; y < world.rows; y++) {
      for (let x = 0; x < world.cols; x++) {
        const tile = world.get(x, y);
        if (tile.vegetation < 10) continue;
        const px = x * sx, py = y * sy;
        const amount = Math.min(4, Math.floor(tile.vegetation / 22));
        ctx.strokeStyle = "rgba(109,156,83,.55)";
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

    // Árvores em estilo pixel-art suave.
    for (let y = 0; y < world.rows; y++) {
      for (let x = 0; x < world.cols; x++) {
        const tile = world.get(x, y);
        if (!tile.tree) continue;
        const tree = tile.tree;
        const px = x * sx + sx / 2;
        const py = y * sy + sy / 2;
        this.drawTree(ctx, px, py, sx, sy, tree, time);
      }
    }

    // Seleção.
    if (world.selected) {
      const t = world.selected;
      ctx.strokeStyle = "rgba(198,236,205,.75)";
      ctx.lineWidth = Math.max(1.2, sx * .045);
      ctx.strokeRect(t.x * sx + 1, t.y * sy + 1, sx - 2, sy - 2);
    }
  }

  drawTree(ctx, x, y, sx, sy, tree, time) {
    const stage = tree.stageIndex;
    const sway = Math.sin(time * .0018 + x * .03) * sx * (.015 + stage * .004);
    const scale = [.16, .25, .42, .64, .82][stage];
    const trunkH = sy * .18 * (0.55 + scale);
    const crown = Math.min(sx, sy) * .52 * scale;

    ctx.fillStyle = "rgba(0,0,0,.22)";
    ctx.beginPath();
    ctx.ellipse(x + sx*.03, y + sy*.18, crown*.78, crown*.28, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = "#5d4a34";
    ctx.fillRect(x - sx*.035, y + sy*.02 - trunkH, sx*.07, trunkH);

    if (stage === 0) {
      ctx.fillStyle = "#7aa75e";
      ctx.fillRect(x - sx*.035, y - sy*.05, sx*.07, sy*.06);
      return;
    }

    ctx.fillStyle = tree.data.color;
    ctx.beginPath();
    ctx.arc(x + sway, y - trunkH, crown, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = "rgba(119,175,98,.45)";
    ctx.beginPath();
    ctx.arc(x - crown*.25 + sway, y - trunkH - crown*.18, crown*.54, 0, Math.PI*2);
    ctx.fill();

    if (stage >= 4) {
      ctx.fillStyle = "rgba(206,220,127,.45)";
      ctx.fillRect(x - crown*.45 + sway, y - trunkH - crown*.05, crown*.15, crown*.11);
      ctx.fillRect(x + crown*.2 + sway, y - trunkH + crown*.1, crown*.12, crown*.09);
    }
  }
}
