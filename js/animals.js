class AnimalSystem {
  constructor(game) {
    this.game = game;
    this.animals = [];
  }

  update() {
    // Fauna será habilitada na Fase 3, quando habitats e rios existirem.
  }

  serialize() { return this.animals; }
}
