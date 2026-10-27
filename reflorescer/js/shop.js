class ShopSystem {
  constructor(game) {
    this.game = game;
    this.items = [
      { id: "pine", name: "Pinheiro", description: "Cresce rápido e tolera solo seco.", icon: "🌲", cost: 8, species: "pine" },
      { id: "oak", name: "Carvalho", description: "Lento, robusto e excelente para o solo.", icon: "🌳", cost: 15, species: "oak" },
      { id: "ipê", name: "Ipê", description: "Grande valor ecológico e biodiversidade.", icon: "🌼", cost: 22, species: "ipê" },
      { id: "chicken", name: "Galinhas", description: "Desbloqueia com 5 árvores. Renda periódica.", icon: "🐔", cost: 100, animal: "chicken" },
      { id: "horse", name: "Cavalos", description: "Desbloqueia com 5 árvores. Renda periódica.", icon: "🐎", cost: 200, animal: "horse" },
      { id: "cow", name: "Vacas", description: "Desbloqueia com 5 árvores. Renda periódica.", icon: "🐄", cost: 300, animal: "cow" },
      { id: "trout", name: "Trutas", description: "Só podem ser soltas dentro de rios. Renda periódica.", icon: "🐟", cost: 80, fish: "trout" },
      { id: "koi", name: "Carpas", description: "Só podem ser soltas dentro de rios. Renda periódica.", icon: "🐠", cost: 150, fish: "koi" }
    ];
  }

  buy(itemId, { refresh = true, silent = false } = {}) {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return false;
    if (!this.game.player.spendCoins(item.cost)) return false;
    if (item.animal) {
      if (this.game.world.getStats().trees < 5) {
        this.game.player.addCoins(item.cost);
        if (!silent) this.game.ui.showToast("Ainda não é possível", "Animais exigem ao menos 5 árvores no planeta.");
        return false;
      }
      this.game.player.selectedAnimal = item.animal;
      this.game.player.selectedFish = null;
      this.game.player.selectedTool = "animalPlace";
      if (!silent) this.game.ui.showToast("Animal adquirido", `${item.name} pronto para ser colocado fora dos rios.`);
    } else if (item.fish) {
      if (!this.game.world.hasWater()) {
        this.game.player.addCoins(item.cost);
        if (!silent) this.game.ui.showToast("Ainda não é possível", "Crie um rio antes de comprar peixes.");
        return false;
      }
      this.game.player.selectedFish = item.fish;
      this.game.player.selectedAnimal = null;
      this.game.player.selectedTool = "fishPlace";
      if (!silent) this.game.ui.showToast("Peixe adquirido", `${item.name} prontos para serem soltos em um rio.`);
    } else {
      this.game.player.seeds += 1;
      this.game.player.selectedSpecies = item.species;
      if (!silent) this.game.ui.showToast("Semente adquirida", `${item.name} pronta para plantar.`);
    }
    if (refresh) this.game.ui.refresh();
    return true;
  }

  render(container) {
    container.innerHTML = this.items.map(item => {
      const selected = item.animal
        ? this.game.player.selectedAnimal === item.animal
        : item.fish
          ? this.game.player.selectedFish === item.fish
          : this.game.player.selectedSpecies === item.species;
      const disabled = this.game.player.coins < item.cost
        || (item.animal && this.game.world.getStats().trees < 5)
        || (item.fish && !this.game.world.hasWater());
      return `
        <div class="shop-item">
          <div class="shop-icon">${item.icon}</div>
          <div>
            <h3>${item.name}${selected ? " · selecionada" : ""}</h3>
            <p>${item.description}</p>
          </div>
          <div>
            <button class="buy-button" data-buy="${item.id}" ${item.cost === 0 ? "" : disabled ? "disabled" : ""}>
              ${item.cost === 0 ? "Usar" : "Comprar"}
            </button>
            <span class="price">${item.cost === 0 ? "gratuita" : `◉ ${item.cost}`}</span>
          </div>
        </div>`;
    }).join("");

    container.querySelectorAll("[data-buy]").forEach(button => {
      this.bindBuyButton(button);
    });
  }

  bindBuyButton(button) {
    const doBuy = ({ refresh = true, silent = false } = {}) => {
      const item = this.items.find(i => i.id === button.dataset.buy);
      if (!item) return false;
      if (item.cost === 0) {
        this.game.player.selectedSpecies = item.species;
        if (!silent) this.game.ui.showToast("Espécie selecionada", `${item.name} será usada no próximo plantio.`);
        if (refresh) this.game.ui.refresh();
        return true;
      }
      return this.buy(button.dataset.buy, { refresh, silent });
    };

    const mode = this.game.player.settings.buyMode;

    if (mode === "click") {
      button.addEventListener("click", () => doBuy());
      return;
    }

    // Segurar: compra somente enquanto o ponteiro estiver pressionando o botão.
    // A interface não é recriada a cada compra, evitando que o processo continue
    // depois que o botão original deixa de existir durante um refresh.
    const intervalMs = mode === "continuous" ? 120 : 380;
    let active = false;
    let holdInterval = null;
    let boughtAny = false;

    const stop = () => {
      if (!active) return;
      active = false;
      clearInterval(holdInterval);
      holdInterval = null;
      button.classList.remove("holding");
      if (boughtAny) {
        boughtAny = false;
        this.game.ui.refresh();
      }
    };

    const start = event => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      if (active) return;

      active = true;
      boughtAny = doBuy({ refresh: false, silent: false });
      if (!boughtAny) {
        stop();
        return;
      }

      button.classList.add("holding");
      try { button.setPointerCapture(event.pointerId); } catch (_) {}

      holdInterval = setInterval(() => {
        if (!active) return;
        const ok = doBuy({ refresh: false, silent: true });
        if (ok) {
          boughtAny = true;
        } else {
          // Sem moedas ou condição inválida: encerra a compra automaticamente.
          stop();
        }
      }, intervalMs);
    };

    button.addEventListener("pointerdown", start);
    button.addEventListener("pointerup", stop);
    button.addEventListener("pointercancel", stop);
    button.addEventListener("lostpointercapture", stop);
    window.addEventListener("pointerup", stop, { passive: true });
    window.addEventListener("pointercancel", stop, { passive: true });
    window.addEventListener("blur", stop);
  }}
